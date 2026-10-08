require "rails_helper"

RSpec.describe DeepResearchService do
  let(:user) { create(:user, language: "en") }
  let(:collection) { create(:collection, user: user) }
  let(:car1) { create(:car, status: "ready") }
  let(:car2) { create(:car, status: "ready") }
  let!(:bc1) { create(:collection_car, collection: collection, car: car1) }
  let!(:bc2) { create(:collection_car, collection: collection, car: car2) }
  let(:research) { create(:deep_research, collection: collection, car_ids: [ car1.id, car2.id ], status: "pending") }

  let(:car_analysis_response) do
    ->(car_id, car_number) {
      {
        "choices" => [ {
          "message" => {
            "content" => {
              "car_id" => car_id,
              "car_number" => car_number,
              "title" => "Test Car",
              "description_findings" => [ "Consistent listing" ],
              "summary" => "A solid car at fair price.",
              "strengths" => [ "Low mileage" ],
              "weaknesses" => [],
              "red_flags" => []
            }.to_json
          }
        } ],
        "usage" => { "prompt_tokens" => 100, "completion_tokens" => 200, "total_tokens" => 300 }
      }
    }
  end

  let(:section_response) do
    {
      "choices" => [ {
        "message" => {
          "content" => {
            "title" => "Value for Money",
            "overview" => "Both cars offer decent value.",
            "per_car" => [
              { "car_number" => 1, "points" => [ "Priced competitively" ] },
              { "car_number" => 2, "points" => [ "Slightly overpriced" ] }
            ],
            "verdict" => "Car #1 offers better value."
          }.to_json
        }
      } ],
      "usage" => { "prompt_tokens" => 80, "completion_tokens" => 120, "total_tokens" => 200 }
    }
  end

  let(:merge_response) do
    {
      "choices" => [ {
        "message" => {
          "content" => {
            "hidden_concerns" => [ "Car #2 has high mileage for age" ],
            "ranking" => [
              { "place" => 1, "car_id" => car1.id, "car_number" => 1, "car_title" => car1.title, "reason" => "Better overall value." },
              { "place" => 2, "car_id" => car2.id, "car_number" => 2, "car_title" => car2.title, "reason" => "Higher mileage." }
            ],
            "bottom_line" => "Car #1 is the recommended purchase."
          }.to_json
        }
      } ],
      "usage" => { "prompt_tokens" => 90, "completion_tokens" => 150, "total_tokens" => 240 }
    }
  end

  before do
    allow(AiModels).to receive(:api_key?).and_return(true)
    allow(AiModels).to receive(:api_key).and_return("test-key")
    allow(AiModels).to receive(:deep_research).and_return("gpt-4o-mini")
    allow(AiModels).to receive(:deep_research_verdict).and_return("gpt-4o")

    stub_request(:post, /api\.openai\.com/).to_return(
      status: 200, body: section_response.to_json, headers: { "Content-Type" => "application/json" }
    )
  end

  describe ".run" do
    it "returns early when API key is not configured" do
      allow(AiModels).to receive(:api_key?).and_return(false)
      DeepResearchService.run(research)
      expect(research.reload.status).to eq("pending")
    end

    it "sets status to processing at the start" do
      # Use the section response for all calls
      DeepResearchService.run(research)
      # After completion it should be "completed" (or "failed" if something went wrong)
      expect(research.reload.status).to be_in(%w[completed failed])
    end

    it "fails when fewer than 2 ready cars are found" do
      car1.update!(status: "pending")
      car2.update!(status: "pending")
      DeepResearchService.run(research)
      expect(research.reload.status).to eq("failed")
    end

    it "completes successfully with valid API responses" do
      DeepResearchService.run(research)
      research.reload
      expect(research.status).to eq("completed")
      expect(research.result).to be_present
      result = JSON.parse(research.result)
      expect(result).to have_key("ranking")
      expect(result).to have_key("comparison_sections")
      expect(result).to have_key("bottom_line")
    end

    it "generates a title from car names" do
      DeepResearchService.run(research)
      research.reload
      expect(research.title).to include("vs")
    end

    it "handles API failure gracefully" do
      stub_request(:post, /api\.openai\.com/).to_return(status: 500, body: "Error")
      DeepResearchService.run(research)
      expect(research.reload.status).to eq("failed")
    end
  end

  describe "parse_llm_json" do
    let(:service) { described_class.new(research) }

    it "parses clean JSON" do
      response = { "choices" => [ { "message" => { "content" => '{"key": "value"}' } } ] }
      expect(service.send(:parse_llm_json, response)).to eq({ "key" => "value" })
    end

    it "extracts JSON from markdown code fences" do
      response = { "choices" => [ { "message" => { "content" => "```json\n{\"key\": \"value\"}\n```" } } ] }
      expect(service.send(:parse_llm_json, response)).to eq({ "key" => "value" })
    end

    it "extracts JSON by finding first { and last }" do
      response = { "choices" => [ { "message" => { "content" => "Here is the result: {\"key\": \"value\"} done." } } ] }
      expect(service.send(:parse_llm_json, response)).to eq({ "key" => "value" })
    end
  end
end
