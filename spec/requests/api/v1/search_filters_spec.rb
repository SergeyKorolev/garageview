require "rails_helper"

RSpec.describe "API V1 Search Filters", type: :request do
  let(:user) { create(:user, password: "password123!") }
  let(:other_user) { create(:user, password: "password123!") }
  let(:collection) { create(:collection, user: user) }

  def sign_in_as(u)
    post user_session_path, params: { user: { email: u.email, password: "password123!" } }
  end

  describe "GET /api/v1/collections/:collection_id/search_filters" do
    before { sign_in_as(user) }

    it "returns the list of search filters" do
      create(:search_filter, collection: collection)
      get api_v1_collection_search_filters_path(collection)
      expect(response).to have_http_status(:ok)
      json = response.parsed_body
      expect(json).to be_an(Array)
      expect(json.size).to eq(1)
      expect(json.first).to have_key("id")
      expect(json.first).to have_key("name")
      expect(json.first).to have_key("search_url")
    end

    it "returns 404 for another user's collection" do
      other_collection = create(:collection, user: other_user)
      get api_v1_collection_search_filters_path(other_collection)
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/collections/:collection_id/search_filters" do
    before do
      sign_in_as(user)
      allow(RefreshSearchFilterJob).to receive(:perform_later)
      allow_any_instance_of(MobileDe::UrlParser).to receive(:call).and_return({ name: "BMW 3er", params: { "makeId" => "3500" } })
    end

    it "creates a search filter and enqueues refresh" do
      expect {
        post api_v1_collection_search_filters_path(collection), params: {
          search_filter: { search_url: "https://suchen.mobile.de/fahrzeuge/search.html?makeId=3500" }
        }
      }.to change(SearchFilter, :count).by(1)
      expect(response).to have_http_status(:created)
      expect(RefreshSearchFilterJob).to have_received(:perform_later)
    end

    it "uses parsed name when no name provided" do
      post api_v1_collection_search_filters_path(collection), params: {
        search_filter: { search_url: "https://suchen.mobile.de/fahrzeuge/search.html?makeId=3500" }
      }
      expect(response.parsed_body["name"]).to eq("BMW 3er")
    end

    it "creates a filter for an otomoto search URL with a generic name" do
      post api_v1_collection_search_filters_path(collection), params: {
        search_filter: { search_url: "https://www.otomoto.pl/osobowe/bmw/seria-1" }
      }
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["name"]).to eq("Bmw | Seria 1")
    end

    it "rejects unsupported search URLs with 422" do
      expect {
        post api_v1_collection_search_filters_path(collection), params: {
          search_filter: { search_url: "https://www.cars.com/shopping/results/" }
        }
      }.not_to change(SearchFilter, :count)
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/v1/collections/:collection_id/search_filters/:id" do
    before { sign_in_as(user) }

    it "updates the filter name and active state" do
      filter = create(:search_filter, collection: collection, name: "Old Name")
      patch api_v1_collection_search_filter_path(collection, filter), params: {
        search_filter: { name: "Updated Name", active: false }
      }
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["name"]).to eq("Updated Name")
      expect(response.parsed_body["active"]).to eq(false)
    end
  end

  describe "DELETE /api/v1/collections/:collection_id/search_filters/:id" do
    before { sign_in_as(user) }

    it "deletes the search filter" do
      filter = create(:search_filter, collection: collection)
      expect {
        delete api_v1_collection_search_filter_path(collection, filter)
      }.to change(SearchFilter, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end
  end

  describe "POST /api/v1/collections/:collection_id/search_filters/:id/refresh" do
    before { sign_in_as(user) }

    it "enqueues a refresh job" do
      filter = create(:search_filter, collection: collection)
      allow(RefreshSearchFilterJob).to receive(:perform_later)
      post refresh_api_v1_collection_search_filter_path(collection, filter)
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["status"]).to eq("refresh_queued")
      expect(RefreshSearchFilterJob).to have_received(:perform_later).with(filter.id)
    end
  end

  context "unauthenticated" do
    it "returns 401 for index" do
      get api_v1_collection_search_filters_path(collection)
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
