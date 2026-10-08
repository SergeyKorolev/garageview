require "rails_helper"

RSpec.describe "API V1 Agent", type: :request do
  let(:user) { create(:user, password: "password123!") }

  def sign_in_user
    post user_session_path, params: { user: { email: user.email, password: "password123!" } }
  end

  describe "POST /api/v1/agent/chat" do
    before { sign_in_user }

    it "creates a new conversation and returns a reply" do
      allow_any_instance_of(AiAgentService).to receive(:chat).and_return({
        reply: "Hello! How can I help?",
        actions: [],
        conversation_type: "general"
      })

      expect {
        post api_v1_agent_chat_path, params: { message: "Hi there" }
      }.to change(AgentConversation, :count).by(1)
      expect(response).to have_http_status(:ok)
      json = response.parsed_body
      expect(json).to have_key("conversation_id")
      expect(json["reply"]).to eq("Hello! How can I help?")
    end

    it "continues an existing conversation" do
      conversation = create(:agent_conversation, user: user)
      allow_any_instance_of(AiAgentService).to receive(:chat).and_return({
        reply: "Sure thing",
        actions: [],
        conversation_type: "general"
      })

      post api_v1_agent_chat_path, params: { message: "Follow up", conversation_id: conversation.id }
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["conversation_id"]).to eq(conversation.id)
    end

    it "rejects empty messages" do
      post api_v1_agent_chat_path, params: { message: "" }
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 500 on service error" do
      allow_any_instance_of(AiAgentService).to receive(:chat).and_raise(StandardError, "boom")

      post api_v1_agent_chat_path, params: { message: "test" }
      expect(response).to have_http_status(:internal_server_error)
    end
  end

  context "when unauthenticated" do
    it "returns 401 for chat" do
      post api_v1_agent_chat_path, params: { message: "test" }
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/agent/conversations" do
    before { sign_in_user }

    it "returns a paginated list of conversations" do
      create_list(:agent_conversation, 3, user: user)
      get api_v1_agent_conversations_path
      expect(response).to have_http_status(:ok)
      json = response.parsed_body
      expect(json).to have_key("conversations")
      expect(json).to have_key("total")
      expect(json).to have_key("page")
      expect(json["conversations"].size).to eq(3)
    end

    it "filters by conversation type" do
      create(:agent_conversation, user: user, conversation_type: "cars")
      create(:agent_conversation, user: user, conversation_type: "general")

      get api_v1_agent_conversations_path, params: { type: "cars" }
      expect(response.parsed_body["conversations"].size).to eq(1)
      expect(response.parsed_body["conversations"].first["conversation_type"]).to eq("cars")
    end
  end

  describe "GET /api/v1/agent/conversations/:id" do
    before { sign_in_user }

    it "returns conversation details with messages" do
      conversation = create(:agent_conversation, user: user, messages: [
        { "role" => "user", "content" => "Hello" },
        { "role" => "assistant", "content" => "Hi there" }
      ])
      get "/api/v1/agent/conversations/#{conversation.id}"
      expect(response).to have_http_status(:ok)
      json = response.parsed_body
      expect(json["id"]).to eq(conversation.id)
      expect(json["messages"].size).to eq(2)
    end
  end

  describe "DELETE /api/v1/agent/conversations/:id" do
    before { sign_in_user }

    it "deletes a conversation" do
      conversation = create(:agent_conversation, user: user)
      expect {
        delete "/api/v1/agent/conversations/#{conversation.id}"
      }.to change(AgentConversation, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end
  end
end
