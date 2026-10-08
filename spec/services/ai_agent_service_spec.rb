require "rails_helper"

RSpec.describe AiAgentService do
  let(:user) { create(:user, language: "en") }
  let(:conversation) { create(:agent_conversation, user: user, messages: []) }

  let(:openai_text_response) do
    {
      "choices" => [ {
        "message" => {
          "content" => "Here is my response.",
          "tool_calls" => nil
        }
      } ],
      "usage" => { "prompt_tokens" => 100, "completion_tokens" => 50, "total_tokens" => 150 }
    }
  end

  before do
    allow(AiModels).to receive(:api_key).and_return("test-key")
    allow(AiModels).to receive(:agent).and_return("gpt-4o-mini")
    stub_request(:post, /api\.openai\.com/).to_return(
      status: 200, body: openai_text_response.to_json, headers: { "Content-Type" => "application/json" }
    )
  end

  describe "#chat" do
    it "returns a reply from the AI" do
      service = described_class.new(user, conversation)
      result = service.chat("Hello")
      expect(result[:reply]).to eq("Here is my response.")
    end

    it "adds user and assistant messages to the conversation" do
      service = described_class.new(user, conversation)
      service.chat("Hello")
      conversation.reload
      expect(conversation.messages.size).to eq(2)
      expect(conversation.messages.first["role"]).to eq("user")
      expect(conversation.messages.last["role"]).to eq("assistant")
    end

    it "creates an API log entry" do
      service = described_class.new(user, conversation)
      expect { service.chat("Hello") }.to change(ApiLog, :count).by(1)
    end

    context "with tool calls" do
      let(:tool_call_response) do
        {
          "choices" => [ {
            "message" => {
              "content" => nil,
              "tool_calls" => [ {
                "id" => "call_123",
                "type" => "function",
                "function" => {
                  "name" => "create_collection",
                  "arguments" => { "name" => "Test Collection" }.to_json
                }
              } ]
            }
          } ],
          "usage" => { "prompt_tokens" => 100, "completion_tokens" => 50, "total_tokens" => 150 }
        }
      end

      let(:final_response) do
        {
          "choices" => [ {
            "message" => {
              "content" => "I created the collection.",
              "tool_calls" => nil
            }
          } ],
          "usage" => { "prompt_tokens" => 150, "completion_tokens" => 30, "total_tokens" => 180 }
        }
      end

      before do
        stub_request(:post, /api\.openai\.com/).to_return(
          { status: 200, body: tool_call_response.to_json, headers: { "Content-Type" => "application/json" } },
          { status: 200, body: final_response.to_json, headers: { "Content-Type" => "application/json" } }
        )
      end

      it "executes tool calls and returns the final reply" do
        service = described_class.new(user, conversation)
        result = service.chat("Create a collection called Test")
        expect(result[:reply]).to eq("I created the collection.")
        expect(result[:actions]).to be_present
        expect(result[:actions].first[:type]).to eq("collection_created")
      end

      it "creates the collection via tool execution" do
        service = described_class.new(user, conversation)
        expect {
          service.chat("Create a collection called Test")
        }.to change(Collection, :count).by(1)
      end

      it "auto-classifies conversation type from tools used" do
        service = described_class.new(user, conversation)
        service.chat("Create a collection called Test")
        conversation.reload
        expect(conversation.conversation_type).to eq("collection")
      end
    end

    context "tool: list_collections" do
      let(:tool_call_response) do
        {
          "choices" => [ {
            "message" => {
              "content" => nil,
              "tool_calls" => [ {
                "id" => "call_list",
                "type" => "function",
                "function" => { "name" => "list_collections", "arguments" => "{}" }
              } ]
            }
          } ],
          "usage" => { "prompt_tokens" => 50, "completion_tokens" => 20, "total_tokens" => 70 }
        }
      end

      before do
        stub_request(:post, /api\.openai\.com/).to_return(
          { status: 200, body: tool_call_response.to_json, headers: { "Content-Type" => "application/json" } },
          { status: 200, body: openai_text_response.to_json, headers: { "Content-Type" => "application/json" } }
        )
      end

      it "lists the user collections" do
        service = described_class.new(user, conversation)
        result = service.chat("List my collections")
        expect(result[:reply]).to be_present
      end
    end

    context "tool: rate_cars" do
      let!(:collection) { create(:collection, user: user, name: "My Cars") }
      let(:tool_call_response) do
        {
          "choices" => [ {
            "message" => {
              "content" => nil,
              "tool_calls" => [ {
                "id" => "call_rate",
                "type" => "function",
                "function" => {
                  "name" => "rate_cars",
                  "arguments" => { "collection_name_or_id" => "My Cars" }.to_json
                }
              } ]
            }
          } ],
          "usage" => { "prompt_tokens" => 50, "completion_tokens" => 20, "total_tokens" => 70 }
        }
      end

      before do
        stub_request(:post, /api\.openai\.com/).to_return(
          { status: 200, body: tool_call_response.to_json, headers: { "Content-Type" => "application/json" } },
          { status: 200, body: openai_text_response.to_json, headers: { "Content-Type" => "application/json" } }
        )
      end

      it "queues rating job and records the action" do
        service = described_class.new(user, conversation)
        result = service.chat("Rate my cars")
        expect(result[:actions].first[:type]).to eq("rating_started")
      end
    end

    context "resolve_collection" do
      it "resolves by numeric ID" do
        coll = create(:collection, user: user, name: "BMW Search")
        service = described_class.new(user, conversation)
        resolved = service.send(:resolve_collection, coll.id.to_s)
        expect(resolved).to eq(coll)
      end

      it "resolves by name (case-insensitive partial match)" do
        coll = create(:collection, user: user, name: "BMW Search")
        service = described_class.new(user, conversation)
        resolved = service.send(:resolve_collection, "bmw")
        expect(resolved).to eq(coll)
      end

      it "raises RecordNotFound when no match" do
        service = described_class.new(user, conversation)
        expect {
          service.send(:resolve_collection, "nonexistent")
        }.to raise_error(ActiveRecord::RecordNotFound)
      end
    end

    context "max tool rounds" do
      it "returns fallback message after exceeding MAX_TOOL_ROUNDS" do
        tool_response = {
          "choices" => [ {
            "message" => {
              "content" => nil,
              "tool_calls" => [ {
                "id" => "call_x",
                "type" => "function",
                "function" => { "name" => "list_collections", "arguments" => "{}" }
              } ]
            }
          } ],
          "usage" => { "prompt_tokens" => 50, "completion_tokens" => 20, "total_tokens" => 70 }
        }

        stub_request(:post, /api\.openai\.com/).to_return(
          status: 200, body: tool_response.to_json, headers: { "Content-Type" => "application/json" }
        )

        service = described_class.new(user, conversation)
        result = service.chat("Keep looping")
        expect(result[:reply]).to eq("I completed the requested actions.")
      end
    end

    describe "language support" do
      it "adds language instruction for non-English users" do
        user.update!(language: "de")
        service = described_class.new(user, conversation)
        instruction = service.send(:language_instruction_for_user)
        expect(instruction).to include("German")
      end

      it "returns empty instruction for English users" do
        service = described_class.new(user, conversation)
        instruction = service.send(:language_instruction_for_user)
        expect(instruction).to eq("")
      end
    end
  end
end
