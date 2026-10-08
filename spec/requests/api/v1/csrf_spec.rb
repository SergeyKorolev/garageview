require "rails_helper"

RSpec.describe "API CSRF protection", type: :request do
  let(:user) { create(:user) }

  around do |example|
    previous = ActionController::Base.allow_forgery_protection
    ActionController::Base.allow_forgery_protection = true
    example.run
  ensure
    ActionController::Base.allow_forgery_protection = previous
  end

  it "requires authentication to issue a token" do
    get "/api/v1/csrf"
    expect(response).to have_http_status(:unauthorized)
  end

  it "rejects missing and invalid tokens without writing" do
    sign_in user
    [ nil, "invalid" ].each do |token|
      expect {
        post "/api/v1/collections", params: { collection: { name: "Forged" } },
          headers: { "X-CSRF-Token" => token }.compact, as: :json
      }.not_to change(Collection, :count)
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  it "allows extension writes with a token from the authenticated session" do
    sign_in user
    origin = "chrome-extension://#{'a' * 32}"
    get "/api/v1/csrf", headers: { "Origin" => origin }
    token = response.parsed_body.fetch("csrf_token")
    expect(response.headers["Cache-Control"]).to include("no-store")
    expect {
      post "/api/v1/collections", params: { collection: { name: "Extension" } },
        headers: { "X-CSRF-Token" => token, "Origin" => origin }, as: :json
    }.to change(Collection, :count).by(1)
    expect(response).to have_http_status(:created)
  end

  it "accepts the SPA token but rejects that token with an unrelated web origin" do
    sign_in user
    get "/api/v1/csrf"
    token = response.parsed_body.fetch("csrf_token")
    post "/api/v1/collections", params: { collection: { name: "SPA" } },
      headers: { "X-CSRF-Token" => token, "Origin" => "http://www.example.com" }, as: :json
    expect(response).to have_http_status(:created)

    expect {
      post "/api/v1/collections", params: { collection: { name: "Untrusted" } },
        headers: { "X-CSRF-Token" => token, "Origin" => "https://untrusted.example" }, as: :json
    }.not_to change(Collection, :count)
    expect(response).to have_http_status(:unprocessable_entity)
  end
end
