require "rails_helper"

RSpec.describe ExchangeRate do
  before { Rails.cache.clear }

  describe ".eur_cents" do
    it "passes EUR amounts through" do
      expect(described_class.eur_cents(21_980, "EUR")).to eq(2_198_000)
    end

    it "returns nil for nil amounts" do
      expect(described_class.eur_cents(nil, "PLN")).to be_nil
    end

    it "converts using the fetched rate" do
      stub_request(:get, %r{api\.frankfurter\.dev/v1/latest})
        .to_return(status: 200, body: { rates: { EUR: 0.235 } }.to_json)

      expect(described_class.eur_cents(100_000, "PLN")).to eq(100_000 * 0.235 * 100)
    end

    it "falls back to the hardcoded rate when the API fails" do
      stub_request(:get, %r{api\.frankfurter\.dev/v1/latest}).to_return(status: 500)

      expect(described_class.eur_cents(1_000, "PLN")).to eq((1_000 * 0.23 * 100).round)
    end
  end
end
