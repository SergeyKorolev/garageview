require "rails_helper"

RSpec.describe "GET /api/v1/me/export", type: :request do
  let(:user) do
    User.create!(
      email: "test@example.com",
      password: "password123456",
      name: "Test User",
      provider: "google_oauth2",
      uid: "123456",
      avatar_url: "https://example.com/avatar.png",
      theme: "dark",
      currency: "EUR",
      language: "de",
      onboarded: true,
      latitude: 48.1351253,
      longitude: 11.5819806,
      location_name: "Munich, Germany"
    )
  end

  let(:collection) { user.collections.first } # default "Favorites" collection

  before do
    # Create a car and add it to the collection
    car = Car.create!(
      external_id: "test-123",
      title: "BMW 320d Touring",
      listing_url: "https://www.mobile.de/test",
      price_cents: 3_250_000,
      price_currency: "EUR",
      mileage_km: 45_000,
      fuel_type: "diesel",
      transmission: "automatic",
      status: "ready"
    )

    CollectionCar.create!(
      collection: collection,
      car: car,
      rating: 4,
      ai_rating: 78,
      ai_explanation: "Good value",
      added_via: "extension"
    )

    # Create a search filter
    SearchFilter.create!(
      collection: collection,
      name: "BMW Search",
      search_url: "https://suchen.mobile.de/fahrzeuge/search.html?test=1",
      params: { "makeId" => "3500" },
      active: true
    )

    # Create a deep research
    DeepResearch.create!(
      collection: collection,
      title: "BMW comparison",
      car_ids: [ car.id ],
      status: "completed",
      result: "Comparison result text"
    )

    # Create an agent conversation
    AgentConversation.create!(
      user: user,
      title: "Test conversation",
      conversation_type: "cars",
      messages: [ { "role" => "user", "content" => "Find BMW" } ],
      metadata: {}
    )
  end

  context "when authenticated" do
    before do
      post user_session_path, params: { user: { email: user.email, password: "password123456" } }
    end

    it "returns the full export JSON" do
      get export_api_v1_me_path

      expect(response).to have_http_status(:ok)
      json = response.parsed_body

      # Top-level keys
      expect(json).to have_key("exported_at")
      expect(json).to have_key("user")
      expect(json).to have_key("collections")
      expect(json).to have_key("agent_conversations")
      expect(json).to have_key("collection_memberships")

      # User data present, sensitive fields excluded
      user_data = json["user"]
      expect(user_data["email"]).to eq("test@example.com")
      expect(user_data["name"]).to eq("Test User")
      expect(user_data).not_to have_key("encrypted_password")
      expect(user_data).not_to have_key("reset_password_token")
      expect(user_data).not_to have_key("uid")

      # Collections with nested data
      expect(json["collections"].length).to eq(1)
      coll = json["collections"].first
      expect(coll["name"]).to eq("Favorites")
      expect(coll["cars"].length).to eq(1)
      expect(coll["search_filters"].length).to eq(1)
      expect(coll["deep_researches"].length).to eq(1)

      # Car data excludes raw_data
      car_data = coll["cars"].first["car"]
      expect(car_data["title"]).to eq("BMW 320d Touring")
      expect(car_data).not_to have_key("raw_data")

      # Collection car data
      cc_data = coll["cars"].first["collection_car"]
      expect(cc_data["rating"]).to eq(4)
      expect(cc_data["ai_rating"]).to eq(78)

      # Agent conversations
      expect(json["agent_conversations"].length).to eq(1)
      expect(json["agent_conversations"].first["title"]).to eq("Test conversation")

      # Collection memberships (owner membership auto-created)
      expect(json["collection_memberships"].length).to be >= 1
    end

    it "sets Content-Disposition header for download" do
      get export_api_v1_me_path

      expect(response.headers["Content-Disposition"]).to include("attachment")
      expect(response.headers["Content-Disposition"]).to include("garageview-export-")
    end
  end

  context "when unauthenticated" do
    it "returns 401 Unauthorized" do
      get export_api_v1_me_path

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
