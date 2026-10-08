require "rails_helper"

RSpec.describe "API V1 Public Collections", type: :request do
  describe "GET /api/v1/public/collections/:token" do
    it "returns collection data for a valid share token" do
      user = create(:user, password: "password123!")
      collection = create(:collection, user: user)
      collection.generate_share_token!

      car = create(:car, status: "ready")
      create(:collection_car, collection: collection, car: car)

      get "/api/v1/public/collections/#{collection.share_token}"
      expect(response).to have_http_status(:ok)
      json = response.parsed_body
      expect(json).to have_key("collection")
      expect(json).to have_key("cars")
      expect(json).to have_key("deep_researches")
      expect(json["collection"]["name"]).to eq(collection.name)
    end

    it "returns cars sorted by ai_rating" do
      user = create(:user, password: "password123!")
      collection = create(:collection, user: user)
      collection.generate_share_token!

      car1 = create(:car, status: "ready")
      car2 = create(:car, status: "ready")
      create(:collection_car, collection: collection, car: car1, ai_rating: 85)
      create(:collection_car, collection: collection, car: car2, ai_rating: 92)

      get "/api/v1/public/collections/#{collection.share_token}"
      car_ids = response.parsed_body["cars"].map { |c| c["id"] }
      # Sorted ascending by ai_rating (lower = better = first)
      expect(car_ids).to eq([ car1.id, car2.id ])
    end

    it "includes completed deep researches" do
      user = create(:user, password: "password123!")
      collection = create(:collection, user: user)
      collection.generate_share_token!
      create(:deep_research, collection: collection, status: "completed", result: '{"summary":"test"}')
      create(:deep_research, collection: collection, status: "pending")

      get "/api/v1/public/collections/#{collection.share_token}"
      expect(response.parsed_body["deep_researches"].size).to eq(1)
    end

    it "returns 404 for an invalid token" do
      get "/api/v1/public/collections/nonexistent_token"
      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body["error"]).to include("not found")
    end

    it "does not require authentication" do
      user = create(:user, password: "password123!")
      collection = create(:collection, user: user)
      collection.generate_share_token!

      # No sign-in, should still work
      get "/api/v1/public/collections/#{collection.share_token}"
      expect(response).to have_http_status(:ok)
    end
  end
end
