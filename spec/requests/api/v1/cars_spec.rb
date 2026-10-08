require "rails_helper"

RSpec.describe "API V1 Cars", type: :request do
  let(:user) { create(:user, password: "password123!") }

  def sign_in_user
    post user_session_path, params: { user: { email: user.email, password: "password123!" } }
  end

  describe "GET /api/v1/cars/:id" do
    before { sign_in_user }

    it "returns a car in one of the user's collections" do
      car = create(:car, raw_data: { "secret" => "leak" })
      create(:collection_car, collection: user.collections.first, car: car)
      get api_v1_car_path(car)
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["id"]).to eq(car.id)
      expect(response.parsed_body).not_to have_key("raw_data")
      expect(response.parsed_body).not_to have_key("secret")
    end

    it "returns 404 for a car not in any of the user's collections" do
      other_user = create(:user, password: "password123!")
      car = create(:car)
      create(:collection_car, collection: other_user.collections.first, car: car)
      get api_v1_car_path(car)
      expect(response).to have_http_status(:not_found)
    end

    it "returns 404 for non-existent car" do
      get api_v1_car_path(id: 999999)
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/cars/lookup" do
    before { sign_in_user }

    it "returns a validation error for an unsupported URL" do
      post lookup_api_v1_cars_path, params: { url: "http://127.0.0.1/admin" }
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "looks up a car by URL without leaking raw_data" do
      car = create(:car, raw_data: { "secret" => "leak" })
      allow_any_instance_of(MobileDe::ListingFetcher).to receive(:call).and_return(car)

      post lookup_api_v1_cars_path, params: { url: "https://www.mobile.de/test" }
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["id"]).to eq(car.id)
      expect(response.parsed_body).not_to have_key("raw_data")
      expect(response.parsed_body).not_to have_key("secret")
    end
  end

  describe "GET /api/v1/cars/check" do
    before { sign_in_user }

    it "returns found: true when car exists in user's collection" do
      car = create(:car, external_id: "12345678")
      collection = user.collections.first
      create(:collection_car, collection: collection, car: car)

      get check_api_v1_cars_path, params: { url: "https://www.mobile.de/fahrzeuge/details.html?id=12345678" }
      expect(response).to have_http_status(:ok)
      json = response.parsed_body
      expect(json["found"]).to eq(true)
      expect(json["car_id"]).to eq(car.id)
      expect(json["collection_ids"]).to include(collection.id)
    end

    it "returns found: false when car does not exist" do
      get check_api_v1_cars_path, params: { url: "https://www.mobile.de/fahrzeuge/details.html?id=99999999" }
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["found"]).to eq(false)
    end
  end

  context "when unauthenticated" do
    it "returns 401 for check" do
      get check_api_v1_cars_path, params: { url: "https://example.com" }
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
