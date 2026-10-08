require "rails_helper"

RSpec.describe User, type: :model do
  describe "associations" do
    it { is_expected.to have_many(:collections).dependent(:destroy) }
    it { is_expected.to have_many(:collection_members).dependent(:destroy) }
    it { is_expected.to have_many(:shared_collections).through(:collection_members) }
    it { is_expected.to have_many(:agent_conversations).dependent(:destroy) }
    it { is_expected.to have_many(:api_logs).dependent(:nullify) }
  end

  describe "validations" do
    it { is_expected.to validate_inclusion_of(:language).in_array(User::SUPPORTED_LANGUAGES).allow_nil }
    it { is_expected.to validate_inclusion_of(:currency).in_array(User::SUPPORTED_CURRENCIES).allow_nil }
  end

  describe "callbacks" do
    describe "#create_default_collection" do
      it "creates a default Favorites collection after user creation" do
        user = create(:user)
        expect(user.collections.count).to eq(1)
        expect(user.collections.first.name).to eq("Favorites")
        expect(user.collections.first.default).to be true
      end
    end

    describe "#claim_pending_memberships" do
      it "claims pending memberships matching the user email on creation" do
        collection = create(:collection)
        email = "newuser@example.com"
        member = create(:collection_member, collection: collection, invited_email: email, status: :pending, user: nil)

        user = create(:user, email: email)
        member.reload
        expect(member.user_id).to eq(user.id)
      end

      it "does not claim memberships for a different email" do
        collection = create(:collection)
        member = create(:collection_member, collection: collection, invited_email: "other@example.com", status: :pending, user: nil)

        user = create(:user, email: "newuser@example.com")
        member.reload
        expect(member.user_id).to be_nil
      end
    end
  end

  describe ".from_omniauth" do
    let(:auth) do
      OpenStruct.new(
        provider: "google_oauth2",
        uid: "999888777",
        info: OpenStruct.new(
          email: "oauth@example.com",
          name: "OAuth User",
          image: "https://example.com/avatar.png"
        )
      )
    end

    it "creates a new user from OAuth data when one does not exist" do
      expect { User.from_omniauth(auth) }.to change(User, :count).by(1)
      user = User.last
      expect(user.email).to eq("oauth@example.com")
      expect(user.name).to eq("OAuth User")
      expect(user.provider).to eq("google_oauth2")
      expect(user.uid).to eq("999888777")
      expect(user.avatar_url).to eq("https://example.com/avatar.png")
    end

    it "returns an existing user if one matches provider and uid" do
      existing = create(:user, provider: "google_oauth2", uid: "999888777", email: "oauth@example.com")
      user = User.from_omniauth(auth)
      expect(user.id).to eq(existing.id)
    end
  end
end
