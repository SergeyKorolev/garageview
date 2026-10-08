require "rails_helper"

RSpec.describe Collection, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:user) }
    it { is_expected.to have_many(:collection_cars).dependent(:destroy) }
    it { is_expected.to have_many(:cars).through(:collection_cars) }
    it { is_expected.to have_many(:search_filters).dependent(:destroy) }
    it { is_expected.to have_many(:deep_researches).dependent(:destroy) }
    it { is_expected.to have_many(:collection_members).dependent(:destroy) }
    it { is_expected.to have_many(:member_users).through(:collection_members) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:name) }
  end

  describe "callbacks" do
    describe "#prevent_default_deletion" do
      it "prevents deletion of a default collection" do
        user = create(:user)
        default_collection = user.collections.find_by(default: true)
        expect(default_collection.destroy).to be false
        expect(default_collection.errors[:base]).to include("Cannot delete the default Favorites collection")
      end

      it "allows deletion of a non-default collection" do
        collection = create(:collection, default: false)
        expect { collection.destroy }.to change(Collection, :count).by(-1)
      end
    end

    describe "#prevent_default_rename" do
      it "prevents renaming the default collection" do
        user = create(:user)
        default_collection = user.collections.find_by(default: true)
        default_collection.name = "New Name"
        expect(default_collection.save).to be false
        expect(default_collection.errors[:name]).to include("Cannot rename the default Favorites collection")
      end

      it "allows renaming a non-default collection" do
        collection = create(:collection, default: false)
        collection.name = "Renamed Collection"
        expect(collection.save).to be true
      end
    end

    describe "#create_owner_membership" do
      it "creates an owner membership after collection creation" do
        collection = create(:collection)
        membership = collection.collection_members.first
        expect(membership).to be_present
        expect(membership.role).to eq("owner")
        expect(membership.status).to eq("accepted")
        expect(membership.user).to eq(collection.user)
      end
    end
  end

  describe "scopes" do
    let(:owner) { create(:user) }
    let(:viewer) { create(:user) }
    let(:editor) { create(:user) }
    let(:stranger) { create(:user) }
    let!(:owned_collection) { create(:collection, user: owner) }

    before do
      create(:collection_member,
        collection: owned_collection,
        user: viewer,
        invited_email: viewer.email,
        role: :viewer,
        status: :accepted)
      create(:collection_member,
        collection: owned_collection,
        user: editor,
        invited_email: editor.email,
        role: :editor,
        status: :accepted)
    end

    describe ".accessible_by" do
      it "includes collections owned by the user" do
        expect(Collection.accessible_by(owner)).to include(owned_collection)
      end

      it "includes collections where user is an accepted member" do
        expect(Collection.accessible_by(viewer)).to include(owned_collection)
      end

      it "excludes collections where user has no membership" do
        expect(Collection.accessible_by(stranger)).not_to include(owned_collection)
      end
    end

    describe ".editable_by" do
      it "includes collections owned by the user" do
        expect(Collection.editable_by(owner)).to include(owned_collection)
      end

      it "includes collections where user is an editor" do
        expect(Collection.editable_by(editor)).to include(owned_collection)
      end

      it "excludes collections where user is only a viewer" do
        expect(Collection.editable_by(viewer)).not_to include(owned_collection)
      end
    end
  end

  describe "#role_for" do
    let(:collection) { create(:collection) }
    let(:viewer_user) { create(:user) }

    it "returns 'owner' for the collection owner" do
      expect(collection.role_for(collection.user)).to eq("owner")
    end

    it "returns the role for a member user" do
      create(:collection_member,
        collection: collection,
        user: viewer_user,
        invited_email: viewer_user.email,
        role: :viewer,
        status: :accepted)
      expect(collection.role_for(viewer_user)).to eq("viewer")
    end

    it "returns nil for a non-member user" do
      other = create(:user)
      expect(collection.role_for(other)).to be_nil
    end
  end

  describe "share tokens" do
    let(:collection) { create(:collection) }

    describe "#generate_share_token!" do
      it "generates and persists a share token" do
        token = collection.generate_share_token!
        expect(token).to be_present
        expect(collection.reload.share_token).to eq(token)
      end
    end

    describe "#revoke_share_token!" do
      it "clears the share token" do
        collection.generate_share_token!
        collection.revoke_share_token!
        expect(collection.reload.share_token).to be_nil
      end
    end

    describe "#shared?" do
      it "returns true when share_token is present" do
        collection.generate_share_token!
        expect(collection).to be_shared
      end

      it "returns false when share_token is nil" do
        expect(collection).not_to be_shared
      end
    end

    describe "#share_url" do
      it "returns the share URL when shared" do
        collection.generate_share_token!
        expect(collection.share_url).to eq("https://garageview.ai/s/c/#{collection.share_token}")
      end
    end
  end

  describe "compare tokens" do
    let(:collection) { create(:collection) }

    describe "#generate_compare_token!" do
      it "generates and persists a compare token" do
        token = collection.generate_compare_token!
        expect(token).to be_present
        expect(collection.reload.compare_token).to eq(token)
      end
    end

    describe "#revoke_compare_token!" do
      it "clears the compare token" do
        collection.generate_compare_token!
        collection.revoke_compare_token!
        expect(collection.reload.compare_token).to be_nil
      end
    end

    describe "#compare_shared?" do
      it "returns true when compare_token is present" do
        collection.generate_compare_token!
        expect(collection).to be_compare_shared
      end
    end

    describe "#compare_url" do
      it "returns the compare URL when compare_shared" do
        collection.generate_compare_token!
        expect(collection.compare_url).to eq("https://garageview.ai/s/j/#{collection.compare_token}")
      end
    end
  end

  describe "#effective_location" do
    it "returns the collection location when present" do
      collection = create(:collection, latitude: 48.13, longitude: 11.58, location_name: "Munich")
      result = collection.effective_location
      expect(result[:latitude]).to eq(48.13)
      expect(result[:location_name]).to eq("Munich")
    end

    it "falls back to user location when collection has no coordinates" do
      user = create(:user, latitude: 52.52, longitude: 13.40, location_name: "Berlin")
      collection = create(:collection, user: user, latitude: nil, longitude: nil)
      result = collection.effective_location
      expect(result[:latitude]).to eq(52.52)
      expect(result[:location_name]).to eq("Berlin")
    end

    it "returns nil when neither collection nor user has coordinates" do
      user = create(:user, latitude: nil, longitude: nil)
      collection = create(:collection, user: user, latitude: nil, longitude: nil)
      expect(collection.effective_location).to be_nil
    end
  end
end
