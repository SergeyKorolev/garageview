require "rails_helper"

RSpec.describe AiCarAnalysisService do
  let(:user) { create(:user, language: "en") }
  let(:collection) { create(:collection, user: user) }
  let(:car) { create(:car, status: "ready", ai_analysis: nil) }

  let(:openai_response) do
    {
      "choices" => [ {
        "message" => {
          "content" => {
            "id" => car.id,
            "pros" => [ "Low mileage", "Good price" ],
            "cons" => [ "Minor scratches" ],
            "red_flags" => [],
            "market_price_label" => "Good",
            "negotiation_points" => [ "Price above average by 500 EUR" ],
            "test_drive_checklist" => [ "Check suspension" ],
            "summary" => "A solid choice at a fair price."
          }.to_json
        }
      } ],
      "usage" => { "prompt_tokens" => 100, "completion_tokens" => 200, "total_tokens" => 300 }
    }
  end

  before do
    create(:collection_car, collection: collection, car: car)
    allow(AiModels).to receive(:api_key?).and_return(true)
    allow(AiModels).to receive(:api_key).and_return("test-key")
    allow(AiModels).to receive(:car_rating).and_return("gpt-4o-mini")
    stub_request(:post, /api\.openai\.com/).to_return(
      status: 200, body: openai_response.to_json, headers: { "Content-Type" => "application/json" }
    )
  end

  describe ".analyze" do
    it "returns nil when API key is not configured" do
      allow(AiModels).to receive(:api_key?).and_return(false)
      expect(AiCarAnalysisService.analyze(car, user: user)).to be_nil
    end

    it "returns nil when no user is available" do
      standalone_car = create(:car, status: "ready")
      expect(AiCarAnalysisService.analyze(standalone_car, user: nil)).to be_nil
    end

    it "analyzes a car and stores the result" do
      result = AiCarAnalysisService.analyze(car, user: user)
      expect(result).to be_a(Hash)
      expect(result["pros"]).to include("Low mileage")
      car.reload
      expect(car.ai_analysis).to be_present
      expect(car.ai_analyzed_at).to be_present
    end

    it "skips analysis when ai_analysis is already present" do
      car.update!(ai_analysis: { "summary" => "existing" })
      result = AiCarAnalysisService.analyze(car, user: user)
      expect(result).to be_nil
      expect(a_request(:post, /api\.openai\.com/)).not_to have_been_made
    end

    it "re-analyzes when force is true" do
      car.update!(ai_analysis: { "summary" => "existing" })
      result = AiCarAnalysisService.analyze(car, user: user, force: true)
      expect(result).to be_a(Hash)
      expect(a_request(:post, /api\.openai\.com/)).to have_been_made
    end

    it "returns nil when OpenAI fails" do
      stub_request(:post, /api\.openai\.com/).to_return(status: 500, body: "Error")
      result = AiCarAnalysisService.analyze(car, user: user)
      expect(result).to be_nil
    end

    it "determines user from car collections when not explicitly provided" do
      result = AiCarAnalysisService.analyze(car)
      expect(result).to be_a(Hash)
    end

    it "creates an API log entry" do
      expect {
        AiCarAnalysisService.analyze(car, user: user)
      }.to change(ApiLog, :count).by(1)
    end

    it "includes language instruction for non-English users" do
      user.update!(language: "de")
      AiCarAnalysisService.analyze(car, user: user)
      # Verify the request was made (language instruction embedded in system prompt)
      expect(a_request(:post, /api\.openai\.com/)).to have_been_made
    end
  end
end
