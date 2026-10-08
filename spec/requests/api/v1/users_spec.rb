require "rails_helper"

RSpec.describe "API V1 Users (me)", type: :request do
  let(:user) { create(:user, password: "password123!") }

  def sign_in_user
    post user_session_path, params: { user: { email: user.email, password: "password123!" } }
  end

  describe "GET /api/v1/me" do
    context "when authenticated" do
      before { sign_in_user }

      it "returns the current user profile" do
        get api_v1_me_path
        expect(response).to have_http_status(:ok)
        json = response.parsed_body
        expect(json["id"]).to eq(user.id)
        expect(json["email"]).to eq(user.email)
        expect(json["name"]).to eq(user.name)
        expect(json["language"]).to eq(user.language)
        expect(json["currency"]).to eq(user.currency)
        expect(json["theme"]).to eq(user.theme)
        expect(json["onboarded"]).to eq(user.onboarded)
      end

      it "does not expose sensitive fields" do
        get api_v1_me_path
        json = response.parsed_body
        expect(json).not_to have_key("encrypted_password")
        expect(json).not_to have_key("reset_password_token")
        expect(json).not_to have_key("uid")
      end
    end

    context "when unauthenticated" do
      it "returns 401" do
        get api_v1_me_path
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "PATCH /api/v1/me" do
    context "when authenticated" do
      before { sign_in_user }

      it "updates allowed user attributes" do
        patch api_v1_me_path, params: { user: { language: "de", currency: "USD", theme: "dark" } }
        expect(response).to have_http_status(:ok)
        json = response.parsed_body
        expect(json["language"]).to eq("de")
        expect(json["currency"]).to eq("USD")
        expect(json["theme"]).to eq("dark")
      end

      it "updates location attributes" do
        patch api_v1_me_path, params: { user: { latitude: 52.52, longitude: 13.405, location_name: "Berlin" } }
        expect(response).to have_http_status(:ok)
        json = response.parsed_body
        expect(json["location_name"]).to eq("Berlin")
      end

      it "updates onboarded flag" do
        patch api_v1_me_path, params: { user: { onboarded: true } }
        expect(response).to have_http_status(:ok)
        expect(response.parsed_body["onboarded"]).to eq(true)
      end
    end

    context "when unauthenticated" do
      it "returns 401" do
        patch api_v1_me_path, params: { user: { language: "de" } }
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "DELETE /api/v1/me" do
    context "when authenticated" do
      before do
        sign_in_user
        allow(MailtrapEmailService).to receive(:send_account_deleted)
      end

      it "deletes the user account" do
        expect { delete api_v1_me_path }.to change(User, :count).by(-1)
        expect(response).to have_http_status(:ok)
        expect(response.parsed_body["message"]).to eq("Account deleted")
      end

      it "sends a goodbye email" do
        delete api_v1_me_path
        expect(MailtrapEmailService).to have_received(:send_account_deleted).with(user.email, user.name)
      end
    end

    context "when unauthenticated" do
      it "returns 401" do
        delete api_v1_me_path
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
