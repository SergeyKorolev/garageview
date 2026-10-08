require "rails_helper"

RSpec.describe MailtrapEmailService do
  let(:user) { create(:user, name: "Test User", email: "test@example.com") }

  before do
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:[]).with("MAILTRAP_API_TOKEN").and_return("test-token")
    allow(ENV).to receive(:fetch).with("MAILTRAP_INBOX_ID", 3493497).and_return(3493497)
    # Reset the memoized client between examples to avoid leaking doubles
    described_class.instance_variable_set(:@client, nil)
  end

  describe ".send_welcome" do
    context "when template UUID is set" do
      before do
        allow(ENV).to receive(:[]).with("MAILTRAP_WELCOME_TEMPLATE_UUID").and_return("welcome-uuid-123")
      end

      it "sends a welcome email via Mailtrap" do
        client_double = instance_double(Mailtrap::Client)
        allow(Mailtrap::Client).to receive(:new).and_return(client_double)
        allow(client_double).to receive(:send)

        described_class.send_welcome(user)
        expect(client_double).to have_received(:send).once
      end
    end

    context "when template UUID is not set" do
      before do
        allow(ENV).to receive(:[]).with("MAILTRAP_WELCOME_TEMPLATE_UUID").and_return(nil)
      end

      it "logs a warning and does not send" do
        expect(Rails.logger).to receive(:warn).with(/MAILTRAP_WELCOME_TEMPLATE_UUID not set/)
        described_class.send_welcome(user)
      end
    end
  end

  describe ".send_collection_invite" do
    let(:collection) { create(:collection, user: user) }
    let(:membership) do
      create(:collection_member,
        collection: collection,
        invited_email: "invitee@example.com",
        invited_by: user,
        role: :editor
      )
    end

    context "when template UUID is set" do
      before do
        allow(ENV).to receive(:[]).with("MAILTRAP_COLLECTION_INVITE_TEMPLATE_UUID").and_return("invite-uuid-456")
      end

      it "sends a collection invite email" do
        client_double = instance_double(Mailtrap::Client)
        allow(Mailtrap::Client).to receive(:new).and_return(client_double)
        allow(client_double).to receive(:send)

        described_class.send_collection_invite(membership)
        expect(client_double).to have_received(:send).once
      end
    end

    context "when template UUID is not set" do
      before do
        allow(ENV).to receive(:[]).with("MAILTRAP_COLLECTION_INVITE_TEMPLATE_UUID").and_return(nil)
      end

      it "logs a warning and does not send" do
        expect(Rails.logger).to receive(:warn).with(/MAILTRAP_COLLECTION_INVITE_TEMPLATE_UUID not set/)
        described_class.send_collection_invite(membership)
      end
    end
  end

  describe ".send_account_deleted" do
    context "when template UUID is set" do
      before do
        allow(ENV).to receive(:[]).with("MAILTRAP_DELETED_TEMPLATE_UUID").and_return("deleted-uuid-789")
      end

      it "sends an account deleted email" do
        client_double = instance_double(Mailtrap::Client)
        allow(Mailtrap::Client).to receive(:new).and_return(client_double)
        allow(client_double).to receive(:send)

        described_class.send_account_deleted("test@example.com", "Test User")
        expect(client_double).to have_received(:send).once
      end
    end

    context "when template UUID is not set" do
      before do
        allow(ENV).to receive(:[]).with("MAILTRAP_DELETED_TEMPLATE_UUID").and_return(nil)
      end

      it "logs a warning and does not send" do
        expect(Rails.logger).to receive(:warn).with(/MAILTRAP_DELETED_TEMPLATE_UUID not set/)
        described_class.send_account_deleted("test@example.com", "Test User")
      end
    end
  end
end
