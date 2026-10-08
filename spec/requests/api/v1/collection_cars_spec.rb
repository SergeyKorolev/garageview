require "rails_helper"

RSpec.describe "API V1 Collection Cars", type: :request do
  let(:user) { create(:user, password: "password123!") }
  let(:other_user) { create(:user, password: "password123!") }
  let(:collection) { create(:collection, user: user) }

  def sign_in_as(u)
    post user_session_path, params: { user: { email: u.email, password: "password123!" } }
  end

  describe "GET /api/v1/collections/:collection_id/cars" do
    before { sign_in_as(user) }

    it "returns a paginated list of cars" do
      cars = create_list(:car, 3)
      cars.each { |car| create(:collection_car, collection: collection, car: car) }

      get api_v1_collection_cars_path(collection)
      expect(response).to have_http_status(:ok)
      json = response.parsed_body
      expect(json).to have_key("cars")
      expect(json).to have_key("total")
      expect(json).to have_key("page")
      expect(json).to have_key("per_page")
      expect(json).to have_key("total_pages")
      expect(json["cars"].size).to eq(3)
    end

    it "filters by fuel_type" do
      diesel_car = create(:car, fuel_type: "diesel")
      gas_car = create(:car, fuel_type: "gasoline")
      create(:collection_car, collection: collection, car: diesel_car)
      create(:collection_car, collection: collection, car: gas_car)

      get api_v1_collection_cars_path(collection), params: { fuel_type: "diesel" }
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["cars"].size).to eq(1)
    end

    it "bounds invalid pagination values" do
      get api_v1_collection_cars_path(collection), params: { page: -1, per_page: 0 }
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include("page" => 1, "per_page" => 1, "total_pages" => 0)
    end

    it "paginates placeholders without repeating them on every page" do
      create(:search_filter, collection: collection, expected_count: 5)
      get api_v1_collection_cars_path(collection), params: { per_page: 2 }
      expect(response.parsed_body["cars"].pluck("id")).to eq([ -1, -2 ])
      get api_v1_collection_cars_path(collection), params: { page: 3, per_page: 2 }
      expect(response.parsed_body["cars"].pluck("id")).to eq([ -5 ])
      expect(response.parsed_body["total_pages"]).to eq(3)
    end

    it "filters by transmission" do
      auto_car = create(:car, transmission: "automatic")
      manual_car = create(:car, transmission: "manual")
      create(:collection_car, collection: collection, car: auto_car)
      create(:collection_car, collection: collection, car: manual_car)

      get api_v1_collection_cars_path(collection), params: { transmission: "automatic" }
      expect(response.parsed_body["cars"].size).to eq(1)
    end

    it "filters by price range" do
      cheap = create(:car, price_cents: 1_000_000)
      expensive = create(:car, price_cents: 5_000_000)
      create(:collection_car, collection: collection, car: cheap)
      create(:collection_car, collection: collection, car: expensive)

      get api_v1_collection_cars_path(collection), params: { price_min: 20_000, price_max: 60_000 }
      titles = response.parsed_body["cars"].map { |c| c["id"] }
      expect(titles).to include(expensive.id)
      expect(titles).not_to include(cheap.id)
    end

    it "filters by mileage range" do
      low = create(:car, mileage_km: 10_000)
      high = create(:car, mileage_km: 200_000)
      create(:collection_car, collection: collection, car: low)
      create(:collection_car, collection: collection, car: high)

      get api_v1_collection_cars_path(collection), params: { mileage_min: 5_000, mileage_max: 50_000 }
      expect(response.parsed_body["cars"].size).to eq(1)
    end

    it "sorts by price ascending" do
      cheap = create(:car, price_cents: 1_000_000)
      expensive = create(:car, price_cents: 5_000_000)
      create(:collection_car, collection: collection, car: cheap)
      create(:collection_car, collection: collection, car: expensive)

      get api_v1_collection_cars_path(collection), params: { sort_by: "price", sort_dir: "asc" }
      ids = response.parsed_body["cars"].map { |c| c["id"] }
      expect(ids).to eq([ cheap.id, expensive.id ])
    end

    it "sorts by mileage descending" do
      low = create(:car, mileage_km: 10_000)
      high = create(:car, mileage_km: 200_000)
      create(:collection_car, collection: collection, car: low)
      create(:collection_car, collection: collection, car: high)

      get api_v1_collection_cars_path(collection), params: { sort_by: "mileage", sort_dir: "desc" }
      ids = response.parsed_body["cars"].map { |c| c["id"] }
      expect(ids).to eq([ high.id, low.id ])
    end

    it "returns 404 for another user's collection" do
      other_collection = create(:collection, user: other_user)
      get api_v1_collection_cars_path(other_collection)
      expect(response).to have_http_status(:not_found)
    end

    context "when unauthenticated" do
      it "returns 401" do
        get api_v1_collection_cars_path(collection)
        # sign_in_as was in before block of parent context, not here
      end
    end
  end

  describe "POST /api/v1/collections/:collection_id/cars" do
    before { sign_in_as(user) }

    it "creates a car from a URL and enqueues scraping" do
      allow(ScrapeCarJob).to receive(:perform_later)

      post api_v1_collection_cars_path(collection), params: { url: "https://www.mobile.de/fahrzeuge/details.html?id=123456789" }
      expect(response).to have_http_status(:created)
      expect(ScrapeCarJob).to have_received(:perform_later)
    end

    it "reuses an existing car if already scraped" do
      existing = create(:car, external_id: "999888777", status: "ready", last_scraped_at: Time.current)
      allow(ScrapeCarJob).to receive(:perform_later)

      post api_v1_collection_cars_path(collection), params: { url: "https://www.mobile.de/fahrzeuge/details.html?id=999888777" }
      expect(response).to have_http_status(:created)
      expect(ScrapeCarJob).not_to have_received(:perform_later)
    end

    it "creates an otomoto car with the otomoto source" do
      allow(ScrapeCarJob).to receive(:perform_later)

      post api_v1_collection_cars_path(collection), params: { url: "https://www.otomoto.pl/osobowe/oferta/vw-passat-ID6I1kUb.html" }
      expect(response).to have_http_status(:created)
      expect(Car.last).to have_attributes(source: "otomoto", external_id: "6I1kUb")
    end

    it "creates an autoscout24 car with the autoscout24 source" do
      allow(ScrapeCarJob).to receive(:perform_later)

      post api_v1_collection_cars_path(collection), params: { url: "https://www.autoscout24.de/angebote/bmw-118i-ffc954d1-3c9b-42fc-9be9-8bb52c8e0001" }
      expect(response).to have_http_status(:created)
      expect(Car.last).to have_attributes(source: "autoscout24", external_id: "ffc954d1-3c9b-42fc-9be9-8bb52c8e0001")
    end

    it "rejects unsupported listing URLs with 422 and creates nothing" do
      expect {
        post api_v1_collection_cars_path(collection), params: { url: "https://www.cars.com/listing/123456789" }
      }.not_to change(Car, :count)
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to include("Unsupported")
    end

    it "returns 404 for a collection not owned/editable by user" do
      other_collection = create(:collection, user: other_user)
      post api_v1_collection_cars_path(other_collection), params: { url: "https://www.mobile.de/fahrzeuge/details.html?id=111222" }
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "PATCH /api/v1/collections/:collection_id/cars/:id" do
    before { sign_in_as(user) }

    it "updates the rating on a collection car" do
      car = create(:car)
      create(:collection_car, collection: collection, car: car, rating: 0)

      patch api_v1_collection_car_path(collection, car), params: { rating: 5 }
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["rating"]).to eq(5)
    end
  end

  describe "DELETE /api/v1/collections/:collection_id/cars/:id" do
    before { sign_in_as(user) }

    it "removes a car from the collection" do
      car = create(:car)
      create(:collection_car, collection: collection, car: car)

      expect {
        delete api_v1_collection_car_path(collection, car)
      }.to change(CollectionCar, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end

    it "returns 404 for a car not in the collection" do
      car = create(:car)
      delete api_v1_collection_car_path(collection, car)
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/collections/:collection_id/cars/ai_rate" do
    before { sign_in_as(user) }

    it "enqueues the AI rating job" do
      allow(AiCarRatingJob).to receive(:perform_later)
      post ai_rate_api_v1_collection_cars_path(collection)
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["status"]).to eq("ok")
      expect(AiCarRatingJob).to have_received(:perform_later).with(collection.id)
    end
  end

  describe "POST /api/v1/collections/:collection_id/cars/:id/share" do
    before { sign_in_as(user) }

    it "generates a share token for the car" do
      car = create(:car)
      create(:collection_car, collection: collection, car: car)

      post share_api_v1_collection_car_path(collection, car)
      expect(response).to have_http_status(:ok)
      json = response.parsed_body
      expect(json).to have_key("share_token")
      expect(json).to have_key("share_url")
    end
  end

  describe "DELETE /api/v1/collections/:collection_id/cars/:id/share" do
    before { sign_in_as(user) }

    it "revokes the share token for the car" do
      car = create(:car)
      car.generate_share_token!
      create(:collection_car, collection: collection, car: car)

      delete share_api_v1_collection_car_path(collection, car)
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["success"]).to eq(true)
    end
  end

  context "unauthenticated access" do
    it "returns 401 for index" do
      get api_v1_collection_cars_path(collection)
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for create" do
      post api_v1_collection_cars_path(collection), params: { url: "https://example.com" }
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
