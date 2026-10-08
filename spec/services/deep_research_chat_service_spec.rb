require "rails_helper"

RSpec.describe DeepResearchChatService do
  let(:user) { create(:user, language: "en") }
  let(:collection) { create(:collection, user: user) }
  let(:car1) { create(:car, status: "ready") }
  let(:car2) { create(:car, status: "ready") }
  let!(:bc1) { create(:collection_car, collection: collection, car: car1) }
  let!(:bc2) { create(:collection_car, collection: collection, car: car2) }
  let(:research) do
    create(:deep_research,
      collection: collection,
      car_ids: [ car1.id, car2.id ],
      status: "completed",
      result: { "ranking" => [], "bottom_line" => "Car 1 wins." }.to_json
    )
  end

  let(:openai_response) do
    {
      "choices" => [ {
        "message" => { "content" => "Based on the analysis, Car #1 is the better choice." }
      } ],
      "usage" => { "prompt_tokens" => 200, "completion_tokens" => 50, "total_tokens" => 250 }
    }
  end

  before do
    allow(AiModels).to receive(:api_key?).and_return(true)
    allow(AiModels).to receive(:api_key).and_return("test-key")
    allow(AiModels).to receive(:deep_research_chat).and_return("gpt-4o")
    stub_request(:post, /api\.openai\.com/).to_return(
      status: 200, body: openai_response.to_json, headers: { "Content-Type" => "application/json" }
    )
  end

  describe ".chat" do
    it "returns a reply based on the research context" do
      result = DeepResearchChatService.chat(research, "Which car should I buy?")
      expect(result[:reply]).to include("Car #1")
    end

    it "returns error when API key is not configured" do
      allow(AiModels).to receive(:api_key?).and_return(false)
      result = DeepResearchChatService.chat(research, "Hello")
      expect(result[:error]).to include("API key")
    end

    it "returns error when research is not completed" do
      research.update!(status: "pending")
      result = DeepResearchChatService.chat(research, "Hello")
      expect(result[:error]).to include("not completed")
    end

    it "includes conversation history in messages" do
      history = [
        { "role" => "user", "content" => "What about reliability?" },
        { "role" => "assistant", "content" => "Both cars have good reliability." }
      ]
      result = DeepResearchChatService.chat(research, "And fuel efficiency?", history)
      expect(result[:reply]).to be_present
    end

    it "creates an API log entry" do
      expect {
        DeepResearchChatService.chat(research, "Test question")
      }.to change(ApiLog, :count).by(1)
    end

    it "handles API failure gracefully" do
      stub_request(:post, /api\.openai\.com/).to_return(status: 500, body: "Error")
      result = DeepResearchChatService.chat(research, "Test")
      expect(result[:error]).to be_present
    end
  end
end
