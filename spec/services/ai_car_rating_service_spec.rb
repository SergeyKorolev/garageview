require "rails_helper"

RSpec.describe AiCarRatingService do
  let(:user) { create(:user, language: "en") }
  let(:collection) { create(:collection, user: user) }

  let(:openai_analysis_response) do
    {
      "choices" => [ {
        "message" => {
          "content" => {
            "id" => 1,
            "pros" => [ "Low mileage" ],
            "cons" => [ "High price" ],
            "red_flags" => [],
            "market_price_label" => "Good",
            "negotiation_points" => [ "Price above market average" ],
            "test_drive_checklist" => [ "Check brakes" ],
            "summary" => "A well-maintained car with low mileage."
          }.to_json
        }
      } ],
      "usage" => { "prompt_tokens" => 100, "completion_tokens" => 200, "total_tokens" => 300 }
    }
  end

  let(:openai_ranking_response) do
    {
      "choices" => [ {
        "message" => {
          "content" => [
            { "id" => nil, "place" => 1, "verdict" => "Best value overall." },
            { "id" => nil, "place" => 2, "verdict" => "Good but overpriced." }
          ].to_json
        }
      } ],
      "usage" => { "prompt_tokens" => 50, "completion_tokens" => 100, "total_tokens" => 150 }
    }
  end

  before do
    allow(AiModels).to receive(:api_key?).and_return(true)
    allow(AiModels).to receive(:api_key).and_return("test-key")
    allow(AiModels).to receive(:car_rating).and_return("gpt-4o-mini")
    stub_request(:post, /api\.openai\.com/).to_return(
      status: 200, body: openai_analysis_response.to_json, headers: { "Content-Type" => "application/json" }
    )
  end

  describe ".rate_collection" do
    it "returns nil when API key is not configured" do
      allow(AiModels).to receive(:api_key?).and_return(false)
      expect(AiCarRatingService.rate_collection(collection)).to be_nil
    end

    it "returns nil when collection has no ready cars" do
      expect(AiCarRatingService.rate_collection(collection)).to be_nil
    end

    context "with a single car" do
      let!(:car) { create(:car, status: "ready", ai_analysis: nil) }
      let!(:collection_car) { create(:collection_car, collection: collection, car: car) }

      it "assigns rank 1 to the single car" do
        AiCarRatingService.rate_collection(collection)
        collection_car.reload
        expect(collection_car.ai_rating).to eq(1)
        expect(collection_car.ai_explanation).to be_present
      end

      it "triggers per-car analysis if ai_analysis is blank" do
        AiCarRatingService.rate_collection(collection)
        car.reload
        expect(car.ai_analysis).to be_present
      end
    end

    context "with multiple cars" do
      let!(:car1) { create(:car, status: "ready", ai_analysis: { "summary" => "Good car" }) }
      let!(:car2) { create(:car, status: "ready", ai_analysis: { "summary" => "Decent car" }) }
      let!(:bc1) { create(:collection_car, collection: collection, car: car1) }
      let!(:bc2) { create(:collection_car, collection: collection, car: car2) }

      before do
        # Second call returns ranking response
        ranking_response = {
          "choices" => [ {
            "message" => {
              "content" => [
                { "id" => bc1.id, "place" => 1, "verdict" => "Best value." },
                { "id" => bc2.id, "place" => 2, "verdict" => "Good but pricier." }
              ].to_json
            }
          } ],
          "usage" => { "prompt_tokens" => 50, "completion_tokens" => 100, "total_tokens" => 150 }
        }
        stub_request(:post, /api\.openai\.com/).to_return(
          status: 200, body: ranking_response.to_json, headers: { "Content-Type" => "application/json" }
        )
      end

      it "ranks multiple cars and assigns ratings" do
        AiCarRatingService.rate_collection(collection)
        bc1.reload
        bc2.reload
        expect(bc1.ai_rating).to eq(1)
        expect(bc2.ai_rating).to eq(2)
      end

      it "stores structured explanation JSON" do
        AiCarRatingService.rate_collection(collection)
        bc1.reload
        explanation = JSON.parse(bc1.ai_explanation)
        expect(explanation).to have_key("verdict")
        expect(explanation).to have_key("pros")
        expect(explanation).to have_key("cons")
      end
    end

    context "with force: true" do
      let!(:car1) { create(:car, status: "ready", ai_analysis: { "summary" => "Cached" }) }
      let!(:car2) { create(:car, status: "ready", ai_analysis: { "summary" => "Also cached" }) }
      let!(:bc1) { create(:collection_car, collection: collection, car: car1, ai_rating: 1, ai_explanation: "old") }
      let!(:bc2) { create(:collection_car, collection: collection, car: car2, ai_rating: 2, ai_explanation: "old") }

      before do
        ranking_response = {
          "choices" => [ {
            "message" => {
              "content" => [
                { "id" => bc1.id, "place" => 2, "verdict" => "Reversed." },
                { "id" => bc2.id, "place" => 1, "verdict" => "Now first." }
              ].to_json
            }
          } ],
          "usage" => { "prompt_tokens" => 50, "completion_tokens" => 100, "total_tokens" => 150 }
        }
        stub_request(:post, /api\.openai\.com/).to_return(
          status: 200, body: ranking_response.to_json, headers: { "Content-Type" => "application/json" }
        )
      end

      it "clears existing ratings and re-rates" do
        AiCarRatingService.rate_collection(collection, force: true)
        bc1.reload
        bc2.reload
        expect(bc1.ai_rating).to eq(2)
        expect(bc2.ai_rating).to eq(1)
      end
    end

    context "when OpenAI ranking fails" do
      let!(:car1) { create(:car, status: "ready", ai_analysis: { "summary" => "Good" }) }
      let!(:car2) { create(:car, status: "ready", ai_analysis: { "summary" => "Fine" }) }
      let!(:bc1) { create(:collection_car, collection: collection, car: car1) }
      let!(:bc2) { create(:collection_car, collection: collection, car: car2) }

      before do
        stub_request(:post, /api\.openai\.com/).to_return(
          status: 500, body: "Internal Server Error"
        )
      end

      it "handles API errors gracefully and does not update ratings" do
        AiCarRatingService.rate_collection(collection)
        bc1.reload
        expect(bc1.ai_rating).to be_nil
      end
    end
  end
end
