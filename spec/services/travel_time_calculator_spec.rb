require "rails_helper"

RSpec.describe TravelTimeCalculator do
  subject(:calculator) { described_class.new }

  let(:origin_lat) { 48.14 }
  let(:origin_lng) { 11.58 }
  let(:dest_lat) { 52.52 }
  let(:dest_lng) { 13.40 }

  let(:osrm_response) do
    {
      "routes" => [ {
        "duration" => 18000,
        "geometry" => {
          "coordinates" => [ [ 11.58, 48.14 ], [ 12.0, 50.0 ], [ 12.5, 51.0 ], [ 13.40, 52.52 ] ]
        }
      } ]
    }
  end

  let(:nominatim_response) do
    { "address" => { "city" => "Leipzig" } }
  end

  let(:openai_travel_response) do
    {
      "choices" => [ {
        "message" => {
          "content" => {
            "drive_via" => [ "Nuremberg", "Leipzig" ],
            "origin_airport" => "Munich (MUC)",
            "dest_airport" => "Berlin (BER)",
            "last_mile" => "30min by S-Bahn",
            "fly_tip" => "Direct flights from MUC to BER take about 1h."
          }.to_json
        }
      } ]
    }
  end

  before do
    stub_request(:get, /router\.project-osrm\.org/).to_return(
      status: 200, body: osrm_response.to_json, headers: { "Content-Type" => "application/json" }
    )
    stub_request(:get, /nominatim\.openstreetmap\.org/).to_return(
      status: 200, body: nominatim_response.to_json, headers: { "Content-Type" => "application/json" }
    )
    stub_request(:post, /api\.openai\.com/).to_return(
      status: 200, body: openai_travel_response.to_json, headers: { "Content-Type" => "application/json" }
    )
    allow(AiModels).to receive(:api_key?).and_return(true)
    allow(AiModels).to receive(:api_key).and_return("test-key")
    allow(AiModels).to receive(:travel_time).and_return("gpt-4o-mini")
  end

  describe "#call" do
    context "when no cached result exists" do
      it "fetches driving route from OSRM" do
        result = calculator.call(origin_lat: origin_lat, origin_lng: origin_lng, dest_lat: dest_lat, dest_lng: dest_lng)
        expect(result[:driving_seconds]).to eq(18000)
      end

      it "calculates distance via haversine" do
        result = calculator.call(origin_lat: origin_lat, origin_lng: origin_lng, dest_lat: dest_lat, dest_lng: dest_lng)
        expect(result[:distance_km]).to be_a(Integer)
        expect(result[:distance_km]).to be > 0
      end

      it "creates a TravelTimeCache record" do
        expect {
          calculator.call(origin_lat: origin_lat, origin_lng: origin_lng, dest_lat: dest_lat, dest_lng: dest_lng)
        }.to change(TravelTimeCache, :count).by(1)
      end

      it "includes AI-generated airport and travel info" do
        result = calculator.call(origin_lat: origin_lat, origin_lng: origin_lng, dest_lat: dest_lat, dest_lng: dest_lng)
        expect(result[:origin_airport]).to eq("Munich (MUC)")
        expect(result[:dest_airport]).to eq("Berlin (BER)")
      end
    end

    context "when a cached result exists" do
      let!(:cache) do
        create(:travel_time_cache,
          origin_lat: origin_lat.round(2),
          origin_lng: origin_lng.round(2),
          dest_lat: dest_lat.round(2),
          dest_lng: dest_lng.round(2),
          driving_seconds: 17500,
          flying_seconds: 10800,
          distance_km: 590
        )
      end

      it "returns the cached result without external calls" do
        result = calculator.call(origin_lat: origin_lat, origin_lng: origin_lng, dest_lat: dest_lat, dest_lng: dest_lng)
        expect(result[:driving_seconds]).to eq(17500)
        expect(a_request(:get, /router\.project-osrm\.org/)).not_to have_been_made
      end
    end

    context "when OSRM API fails" do
      before do
        stub_request(:get, /router\.project-osrm\.org/).to_return(status: 500)
      end

      it "still creates a cache entry with nil driving seconds" do
        expect {
          calculator.call(origin_lat: origin_lat, origin_lng: origin_lng, dest_lat: dest_lat, dest_lng: dest_lng)
        }.to change(TravelTimeCache, :count).by(1)
      end
    end

    context "when API key is not configured" do
      before do
        allow(AiModels).to receive(:api_key?).and_return(false)
      end

      it "skips AI travel description and still creates cache" do
        result = calculator.call(origin_lat: origin_lat, origin_lng: origin_lng, dest_lat: dest_lat, dest_lng: dest_lng)
        expect(result[:origin_airport]).to be_nil
        expect(result[:travel_description]).to be_nil
      end
    end
  end

  describe "#format_result" do
    it "formats a cache record into a result hash" do
      cache = build(:travel_time_cache, driving_seconds: 7200, flying_seconds: 5400, distance_km: 500, route_cities: [ "Leipzig" ])
      result = calculator.format_result(cache)
      expect(result[:driving_seconds]).to eq(7200)
      expect(result[:flying_seconds]).to eq(5400)
      expect(result[:distance_km]).to eq(500)
      expect(result[:route_cities]).to eq([ "Leipzig" ])
    end
  end

  describe "flying time estimation" do
    it "returns nil for distances below 300km" do
      result = calculator.send(:estimate_flying_time, 200)
      expect(result).to be_nil
    end

    it "calculates flying time with overhead for distances above 300km" do
      result = calculator.send(:estimate_flying_time, 800)
      expect(result).to be > 7200 # overhead alone is 7200
    end
  end
end
