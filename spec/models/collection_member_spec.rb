require "rails_helper"

RSpec.describe CollectionMember, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:collection) }
    it { is_expected.to belong_to(:user).optional }
    it { is_expected.to belong_to(:invited_by).class_name("User") }
  end

  describe "enums" do
    it { is_expected.to define_enum_for(:role).with_values(owner: "owner", editor: "editor", viewer: "viewer").backed_by_column_of_type(:string) }
    it { is_expected.to define_enum_for(:status).with_values(pending: "pending", accepted: "accepted", declined: "declined").backed_by_column_of_type(:string) }
  end

  describe "validations" do
    subject { create(:collection_member) }

    it { is_expected.to validate_presence_of(:invited_email) }
    it { is_expected.to validate_uniqueness_of(:invited_email).scoped_to(:collection_id) }
    it { is_expected.to validate_presence_of(:role) }
    it { is_expected.to validate_presence_of(:status) }

    it "validates email format" do
      member = build(:collection_member, invited_email: "not-an-email")
      expect(member).not_to be_valid
      expect(member.errors[:invited_email]).to be_present
    end
  end

  describe "callbacks" do
    describe "#generate_token" do
      it "generates a token for non-owner members on create" do
        member = create(:collection_member, role: :viewer)
        expect(member.token).to be_present
      end

      it "does not generate a token for owner members" do
        collection = create(:collection)
        owner_member = collection.collection_members.find_by(role: :owner)
        expect(owner_member.token).to be_nil
      end
    end

    describe "#set_token_expiry" do
      it "sets token_expires_at to 7 days from now for non-owner members" do
        member = create(:collection_member, role: :editor)
        expect(member.token_expires_at).to be_within(1.minute).of(7.days.from_now)
      end

      it "does not set token_expires_at for owner members" do
        collection = create(:collection)
        owner_member = collection.collection_members.find_by(role: :owner)
        expect(owner_member.token_expires_at).to be_nil
      end
    end
  end

  describe "scopes" do
    let!(:accepted_member) { create(:collection_member, status: :accepted, user: create(:user)) }
    let!(:pending_member) { create(:collection_member, status: :pending) }
    let!(:declined_member) { create(:collection_member, status: :declined) }

    describe ".active" do
      it "returns only accepted members" do
        expect(CollectionMember.active).to include(accepted_member)
        expect(CollectionMember.active).not_to include(pending_member, declined_member)
      end
    end

    describe ".pending_invites" do
      it "returns only pending members" do
        expect(CollectionMember.pending_invites).to include(pending_member)
        expect(CollectionMember.pending_invites).not_to include(accepted_member, declined_member)
      end
    end
  end

  describe "#accept!" do
    it "accepts the membership and updates user and timestamps" do
      member = create(:collection_member, status: :pending)
      accepting_user = create(:user)

      member.accept!(accepting_user)
      member.reload

      expect(member.user).to eq(accepting_user)
      expect(member.status).to eq("accepted")
      expect(member.accepted_at).to be_present
      expect(member.token).to be_nil
    end
  end
end
