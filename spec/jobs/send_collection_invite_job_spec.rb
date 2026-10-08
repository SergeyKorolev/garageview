require "rails_helper"

RSpec.describe SendCollectionInviteJob, type: :job do
  before do
    allow(MailtrapEmailService).to receive(:send_collection_invite)
  end

  it "sends an invite email for a pending member" do
    member = create(:collection_member, status: "pending")
    described_class.perform_now(member.id)
    expect(MailtrapEmailService).to have_received(:send_collection_invite).with(member)
  end

  it "skips non-pending members" do
    member = create(:collection_member, status: "accepted")
    described_class.perform_now(member.id)
    expect(MailtrapEmailService).not_to have_received(:send_collection_invite)
  end

  it "raises if member not found" do
    expect { described_class.perform_now(-1) }.to raise_error(ActiveRecord::RecordNotFound)
  end
end
