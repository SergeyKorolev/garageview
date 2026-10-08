require "rails_helper"

RSpec.describe "Compare invitations", type: :request do
  let(:collection) { create(:collection, compare_token: "join-token", compare_role: "viewer") }
  let(:user) { create(:user) }

  it "accepts an existing pending email invitation without duplicating it" do
    member = create(:collection_member, collection: collection, invited_email: user.email, role: "editor")
    sign_in user
    expect {
      post compare_invite_join_path(token: collection.compare_token)
    }.not_to change(CollectionMember, :count)
    expect(response).to redirect_to("/collections/#{collection.id}")
    expect(member.reload).to have_attributes(user_id: user.id, status: "accepted", role: "viewer", token: nil)
    post compare_invite_join_path(token: collection.compare_token)
    expect(response).to redirect_to("/collections/#{collection.id}")
  end

  it "preserves an accepted member's role" do
    member = create(:collection_member, collection: collection, user: user, invited_email: user.email, role: "editor", status: "accepted")
    collection.join_via_compare_link!(user)
    expect(member.reload.role).to eq("editor")
  end
end
