require "rails_helper"

RSpec.describe "API V1 Deep Researches", type: :request do
  let(:user) { create(:user, password: "password123!") }
  let(:other_user) { create(:user, password: "password123!") }
  let(:collection) { create(:collection, user: user) }

  def sign_in_as(u)
    post user_session_path, params: { user: { email: u.email, password: "password123!" } }
  end

  describe "GET /api/v1/collections/:collection_id/deep_researches" do
    before { sign_in_as(user) }

    it "returns the list of deep researches" do
      create(:deep_research, collection: collection, status: "completed", result: "Some result")
      get api_v1_collection_deep_researches_path(collection)
      expect(response).to have_http_status(:ok)
      json = response.parsed_body
      expect(json).to be_an(Array)
      expect(json.size).to eq(1)
      expect(json.first).to have_key("id")
      expect(json.first).to have_key("status")
    end

    it "returns 404 for another user's collection" do
      other_collection = create(:collection, user: other_user)
      get api_v1_collection_deep_researches_path(other_collection)
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "GET /api/v1/collections/:collection_id/deep_researches/:id" do
    before { sign_in_as(user) }

    it "returns a specific deep research" do
      research = create(:deep_research, collection: collection, status: "completed", result: '{"summary":"test"}')
      get api_v1_collection_deep_research_path(collection, research)
      expect(response).to have_http_status(:ok)
      json = response.parsed_body
      expect(json["id"]).to eq(research.id)
      expect(json["result"]).to be_present
    end

    it "returns nil result for pending research" do
      research = create(:deep_research, collection: collection, status: "pending")
      get api_v1_collection_deep_research_path(collection, research)
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["result"]).to be_nil
    end
  end

  describe "POST /api/v1/collections/:collection_id/deep_researches" do
    before do
      sign_in_as(user)
      allow(AiRateThenResearchJob).to receive(:perform_later)
    end

    it "creates a deep research with valid car_ids" do
      cars = create_list(:car, 3)
      cars.each { |car| create(:collection_car, collection: collection, car: car) }
      car_ids = cars.map(&:id)

      expect {
        post api_v1_collection_deep_researches_path(collection), params: { car_ids: car_ids }
      }.to change(DeepResearch, :count).by(1)
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["status"]).to eq("pending")
      expect(AiRateThenResearchJob).to have_received(:perform_later)
    end

    it "rejects fewer than 2 car_ids" do
      post api_v1_collection_deep_researches_path(collection), params: { car_ids: [ 1 ] }
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to include("2-20")
    end

    it "rejects cars outside the collection without enqueueing research" do
      cars = create_list(:car, 2)
      cars.each { |car| create(:collection_car, collection: other_user.collections.first, car: car) }
      expect {
        post api_v1_collection_deep_researches_path(collection), params: { car_ids: cars.map(&:id) }
      }.not_to change(DeepResearch, :count)
      expect(response).to have_http_status(:unprocessable_entity)
      expect(AiRateThenResearchJob).not_to have_received(:perform_later)
    end

    it "rejects missing car_ids with 422" do
      post api_v1_collection_deep_researches_path(collection)
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to include("car_ids")
    end

    it "rejects non-array car_ids with 422" do
      post api_v1_collection_deep_researches_path(collection), params: { car_ids: "1" }
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "rejects more than 20 car_ids" do
      ids = (1..21).to_a
      post api_v1_collection_deep_researches_path(collection), params: { car_ids: ids }
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "deduplicates car_ids" do
      cars = create_list(:car, 2)
      cars.each { |car| create(:collection_car, collection: collection, car: car) }
      car_ids = [ cars[0].id, cars[0].id, cars[1].id ]
      post api_v1_collection_deep_researches_path(collection), params: { car_ids: car_ids }
      expect(response).to have_http_status(:created)
    end
  end

  describe "POST /api/v1/collections/:collection_id/deep_researches/:id/chat" do
    before { sign_in_as(user) }

    it "sends a chat message and returns a reply" do
      research = create(:deep_research, collection: collection, status: "completed", result: "Some research result")
      allow(DeepResearchChatService).to receive(:chat).and_return({ reply: "This is a reply" })

      post chat_api_v1_collection_deep_research_path(collection, research), params: { message: "Tell me more" }
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["reply"]).to eq("This is a reply")
    end

    it "rejects empty message" do
      research = create(:deep_research, collection: collection, status: "completed", result: "data")
      post chat_api_v1_collection_deep_research_path(collection, research), params: { message: "" }
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns error from service" do
      research = create(:deep_research, collection: collection, status: "completed", result: "data")
      allow(DeepResearchChatService).to receive(:chat).and_return({ error: "Service unavailable" })

      post chat_api_v1_collection_deep_research_path(collection, research), params: { message: "test" }
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to eq("Service unavailable")
    end
  end

  describe "DELETE /api/v1/collections/:collection_id/deep_researches/:id" do
    before { sign_in_as(user) }

    it "deletes a deep research" do
      research = create(:deep_research, collection: collection)
      expect {
        delete api_v1_collection_deep_research_path(collection, research)
      }.to change(DeepResearch, :count).by(-1)
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["success"]).to eq(true)
    end
  end

  describe "POST /api/v1/collections/:collection_id/deep_researches/:id/share" do
    before { sign_in_as(user) }

    it "generates a share token for completed research" do
      research = create(:deep_research, collection: collection, status: "completed", result: "data")
      post share_api_v1_collection_deep_research_path(collection, research)
      expect(response).to have_http_status(:ok)
      json = response.parsed_body
      expect(json).to have_key("share_token")
      expect(json).to have_key("public_url")
    end

    it "rejects sharing non-completed research" do
      research = create(:deep_research, collection: collection, status: "pending")
      post share_api_v1_collection_deep_research_path(collection, research)
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "DELETE /api/v1/collections/:collection_id/deep_researches/:id/share" do
    before { sign_in_as(user) }

    it "revokes the share token" do
      research = create(:deep_research, collection: collection, status: "completed", result: "data")
      research.generate_share_token!
      delete share_api_v1_collection_deep_research_path(collection, research)
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["success"]).to eq(true)
    end
  end

  context "unauthenticated" do
    it "returns 401 for index" do
      get api_v1_collection_deep_researches_path(collection)
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
