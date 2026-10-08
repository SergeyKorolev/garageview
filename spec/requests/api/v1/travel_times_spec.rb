require "rails_helper"

RSpec.describe "API V1 Travel Times", type: :request do
  let(:user) { create(:user, password: "password123!") }

  def sign_in_user
    post user_session_path, params: { user: { email: user.email, password: "password123!" } }
  end

  describe "POST /api/v1/travel_time" do
    before { sign_in_user }

    it "computes travel time between two points" do
      allow_any_instance_of(TravelTimeCalculator).to receive(:call).and_return({
        driving_seconds: 3600,
        distance_km: 100,
        route_cities: [ "Munich", "Stuttgart" ]
      })

      post api_v1_travel_time_path, params: {
        origin_lat: 48.1351, origin_lng: 11.582,
        dest_lat: 48.7758, dest_lng: 9.1829
      }
      expect(response).to have_http_status(:ok)
      json = response.parsed_body
      expect(json).to have_key("driving_seconds")
    end
  end

  context "when unauthenticated" do
    it "returns 401" do
      post api_v1_travel_time_path, params: {
        origin_lat: 48.1351, origin_lng: 11.582,
        dest_lat: 48.7758, dest_lng: 9.1829
      }
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "POST /api/v1/travel_time with cached result" do
    before { sign_in_user }

    it "returns the computed result" do
      allow_any_instance_of(TravelTimeCalculator).to receive(:call).and_return({
        driving_seconds: 7200,
        flying_seconds: 3600,
        distance_km: 500,
        route_cities: [ "Berlin", "Leipzig", "Munich" ]
      })

      post api_v1_travel_time_path, params: {
        origin_lat: 52.52, origin_lng: 13.405,
        dest_lat: 48.1351, dest_lng: 11.582
      }
      expect(response).to have_http_status(:ok)
    end
  end
end
