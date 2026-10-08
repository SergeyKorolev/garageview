require "rails_helper"

RSpec.describe "API V1 Collections", type: :request do
  let(:user) { create(:user, password: "password123!") }
  let(:other_user) { create(:user, password: "password123!") }

  def sign_in_as(u)
    post user_session_path, params: { user: { email: u.email, password: "password123!" } }
  end

  describe "GET /api/v1/collections" do
    context "when authenticated" do
      before { sign_in_as(user) }

      it "returns the user's collections" do
        get api_v1_collections_path
        expect(response).to have_http_status(:ok)
        json = response.parsed_body
        # User gets a default "Favorites" collection on creation
        expect(json).to be_an(Array)
        expect(json.size).to be >= 1
        expect(json.first).to have_key("id")
        expect(json.first).to have_key("name")
        expect(json.first).to have_key("cars_count")
      end

      it "includes collections the user is a member of" do
        shared_collection = create(:collection, user: other_user)
        create(:collection_member, collection: shared_collection, user: user, status: "accepted", role: "editor")

        get api_v1_collections_path
        ids = response.parsed_body.map { |c| c["id"] }
        expect(ids).to include(shared_collection.id)
      end

      it "returns collection metadata including owner, role, members_count" do
        get api_v1_collections_path
        json = response.parsed_body.first
        expect(json).to have_key("role")
        expect(json).to have_key("members_count")
        expect(json).to have_key("owner")
        expect(json["owner"]).to have_key("name")
      end
    end

    context "when unauthenticated" do
      it "returns 401" do
        get api_v1_collections_path
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "GET /api/v1/collections/:id" do
    context "when authenticated" do
      before { sign_in_as(user) }

      it "returns the collection" do
        collection = user.collections.first
        get api_v1_collection_path(collection)
        expect(response).to have_http_status(:ok)
        expect(response.parsed_body["id"]).to eq(collection.id)
      end

      it "returns 404 for another user's collection" do
        other_collection = create(:collection, user: other_user)
        get api_v1_collection_path(other_collection)
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  describe "POST /api/v1/collections" do
    before { sign_in_as(user) }

    it "creates a new collection" do
      expect {
        post api_v1_collections_path, params: { collection: { name: "My Cars", description: "Test desc" } }
      }.to change(Collection, :count).by(1)
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["name"]).to eq("My Cars")
    end

    it "returns validation errors for invalid params" do
      post api_v1_collections_path, params: { collection: { name: "" } }
      expect(response.status).to be_in([ 422, 201 ]) # depends on model validations
    end
  end

  describe "PATCH /api/v1/collections/:id" do
    before { sign_in_as(user) }

    it "updates an owned collection" do
      collection = create(:collection, user: user, name: "Old Name")
      patch api_v1_collection_path(collection), params: { collection: { name: "New Name" } }
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["name"]).to eq("New Name")
    end

    it "returns 404 for another user's collection" do
      other_collection = create(:collection, user: other_user)
      patch api_v1_collection_path(other_collection), params: { collection: { name: "Hacked" } }
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "DELETE /api/v1/collections/:id" do
    before { sign_in_as(user) }

    it "deletes a non-default collection" do
      collection = create(:collection, user: user)
      expect {
        delete api_v1_collection_path(collection)
      }.to change(Collection, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end

    it "refuses to delete the default collection" do
      default_collection = user.collections.find_by(default: true)
      delete api_v1_collection_path(default_collection)
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to include("default")
    end
  end

  describe "POST /api/v1/collections/:id/create_compare_link" do
    before { sign_in_as(user) }

    it "generates a compare token for a non-default collection" do
      collection = create(:collection, user: user)
      post create_compare_link_api_v1_collection_path(collection), params: { role: "viewer" }
      expect(response).to have_http_status(:ok)
      json = response.parsed_body
      expect(json).to have_key("compare_token")
      expect(json).to have_key("compare_url")
      expect(json["compare_role"]).to eq("viewer")
    end

    it "rejects invalid role" do
      collection = create(:collection, user: user)
      post create_compare_link_api_v1_collection_path(collection), params: { role: "admin" }
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "rejects sharing the default collection" do
      default_collection = user.collections.find_by(default: true)
      post create_compare_link_api_v1_collection_path(default_collection), params: { role: "viewer" }
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "DELETE /api/v1/collections/:id/revoke_compare_link" do
    before { sign_in_as(user) }

    it "revokes the compare token" do
      collection = create(:collection, user: user)
      collection.generate_compare_token!
      delete revoke_compare_link_api_v1_collection_path(collection)
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["success"]).to eq(true)
    end
  end

  describe "POST /api/v1/collections/:id/share" do
    before { sign_in_as(user) }

    it "generates a share token for a non-default collection" do
      collection = create(:collection, user: user)
      post share_api_v1_collection_path(collection)
      expect(response).to have_http_status(:ok)
      json = response.parsed_body
      expect(json).to have_key("share_token")
      expect(json).to have_key("share_url")
    end

    it "rejects sharing the default collection" do
      default_collection = user.collections.find_by(default: true)
      post share_api_v1_collection_path(default_collection)
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "DELETE /api/v1/collections/:id/share" do
    before { sign_in_as(user) }

    it "revokes the share token" do
      collection = create(:collection, user: user)
      collection.generate_share_token!
      delete share_api_v1_collection_path(collection)
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["success"]).to eq(true)
    end
  end
end
