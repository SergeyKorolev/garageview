require "rails_helper"

RSpec.describe "API V1 Collection Members", type: :request do
  let(:owner) { create(:user, password: "password123!") }
  let(:collection) { create(:collection, user: owner) }
  let(:other_user) { create(:user, password: "password123!") }

  def sign_in_as(u)
    post user_session_path, params: { user: { email: u.email, password: "password123!" } }
  end

  describe "GET /api/v1/collections/:collection_id/members" do
    before { sign_in_as(owner) }

    it "returns the list of members" do
      get api_v1_collection_members_path(collection)
      expect(response).to have_http_status(:ok)
      json = response.parsed_body
      expect(json).to have_key("members")
      # Owner membership is auto-created
      expect(json["members"].size).to be >= 1
    end

    it "includes member details" do
      get api_v1_collection_members_path(collection)
      member = response.parsed_body["members"].first
      expect(member).to have_key("id")
      expect(member).to have_key("role")
      expect(member).to have_key("status")
      expect(member).to have_key("email")
    end

    it "returns 404 for a collection the user cannot access" do
      other_collection = create(:collection, user: other_user)
      get api_v1_collection_members_path(other_collection)
      expect(response).to have_http_status(:not_found)
    end

    context "when unauthenticated" do
      it "returns 401" do
        get api_v1_collection_members_path(collection)
        # Not signed in since we didn't call sign_in_as
      end
    end
  end

  describe "POST /api/v1/collections/:collection_id/members" do
    before do
      sign_in_as(owner)
      allow(SendCollectionInviteJob).to receive(:perform_later)
    end

    it "invites a new member by email" do
      # Force collection to be created before counting
      collection
      expect {
        post api_v1_collection_members_path(collection), params: { email: "invited@example.com", role: "editor" }
      }.to change(CollectionMember, :count).by(1)
      expect(response).to have_http_status(:created)
      expect(SendCollectionInviteJob).to have_received(:perform_later)
    end

    it "rejects invalid email" do
      post api_v1_collection_members_path(collection), params: { email: "notanemail", role: "viewer" }
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "rejects self-invitation" do
      post api_v1_collection_members_path(collection), params: { email: owner.email, role: "viewer" }
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to include("yourself")
    end

    it "rejects invalid role" do
      post api_v1_collection_members_path(collection), params: { email: "new@example.com", role: "admin" }
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to include("Invalid role")
    end

    it "rejects sharing the default collection" do
      default_collection = owner.collections.find_by(default: true)
      post api_v1_collection_members_path(default_collection), params: { email: "new@example.com", role: "viewer" }
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "rejects duplicate accepted members" do
      create(:collection_member, collection: collection, user: other_user, invited_email: other_user.email, status: "accepted")
      post api_v1_collection_members_path(collection), params: { email: other_user.email, role: "viewer" }
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to include("already a member")
    end

    it "re-sends invitation for pending members with updated role" do
      pending_member = create(:collection_member, collection: collection, invited_email: "pending@example.com", status: "pending", role: "viewer")
      post api_v1_collection_members_path(collection), params: { email: "pending@example.com", role: "editor" }
      expect(response).to have_http_status(:created)
      expect(pending_member.reload.role).to eq("editor")
      expect(SendCollectionInviteJob).to have_received(:perform_later)
    end

    it "rate limits invitations" do
      # Create 20 recent invites
      20.times do |i|
        create(:collection_member, collection: collection, invited_email: "user#{i}@example.com", role: "viewer", status: "pending", created_at: 30.minutes.ago)
      end

      post api_v1_collection_members_path(collection), params: { email: "onemore@example.com", role: "viewer" }
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to include("Too many")
    end

    it "returns 404 for a non-owned collection" do
      other_collection = create(:collection, user: other_user)
      post api_v1_collection_members_path(other_collection), params: { email: "new@example.com", role: "viewer" }
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "PATCH /api/v1/collections/:collection_id/members/:id" do
    before { sign_in_as(owner) }

    it "updates a member's role" do
      member = create(:collection_member, collection: collection, user: other_user, invited_email: other_user.email, status: "accepted", role: "viewer")
      patch api_v1_collection_member_path(collection, member), params: { role: "editor" }
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["role"]).to eq("editor")
    end

    it "rejects changing the owner's role" do
      owner_member = collection.collection_members.find_by(role: "owner")
      patch api_v1_collection_member_path(collection, owner_member), params: { role: "editor" }
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "rejects invalid role" do
      member = create(:collection_member, collection: collection, user: other_user, invited_email: other_user.email, status: "accepted", role: "viewer")
      patch api_v1_collection_member_path(collection, member), params: { role: "admin" }
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "DELETE /api/v1/collections/:collection_id/members/:id" do
    it "allows owner to remove a member" do
      sign_in_as(owner)
      member = create(:collection_member, collection: collection, user: other_user, invited_email: other_user.email, status: "accepted", role: "editor")
      expect {
        delete api_v1_collection_member_path(collection, member)
      }.to change(CollectionMember, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end

    it "allows a member to leave (remove themselves)" do
      member = create(:collection_member, collection: collection, user: other_user, invited_email: other_user.email, status: "accepted", role: "editor")
      sign_in_as(other_user)
      delete api_v1_collection_member_path(collection, member)
      expect(response).to have_http_status(:no_content)
    end

    it "prevents the owner from leaving" do
      sign_in_as(owner)
      owner_member = collection.collection_members.find_by(role: "owner")
      delete api_v1_collection_member_path(collection, owner_member)
      expect(response).to have_http_status(:forbidden)
    end

    it "prevents a non-owner from removing another member" do
      third_user = create(:user, password: "password123!")
      member = create(:collection_member, collection: collection, user: other_user, invited_email: other_user.email, status: "accepted", role: "editor")
      third_member = create(:collection_member, collection: collection, user: third_user, invited_email: third_user.email, status: "accepted", role: "viewer")
      sign_in_as(third_user)
      delete api_v1_collection_member_path(collection, member)
      expect(response).to have_http_status(:forbidden)
    end
  end
end
