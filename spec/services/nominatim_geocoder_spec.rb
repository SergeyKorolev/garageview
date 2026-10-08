require "rails_helper"

RSpec.describe NominatimGeocoder do
  before { Rails.cache.clear }

  it "returns coordinates for a resolvable address" do
    stub_request(:get, %r{nominatim\.openstreetmap\.org/search})
      .to_return(status: 200, body: [ { lat: "51.0619", lon: "13.8523" } ].to_json)

    expect(described_class.coordinates("An der Prießnitzaue 9, 01328 Dresden")).to eq(
      latitude: 51.0619, longitude: 13.8523
    )
  end

  it "returns nil for blank addresses without calling the API" do
    expect(described_class.coordinates("")).to be_nil
    expect(a_request(:get, %r{nominatim})).not_to have_been_made
  end

  it "returns nil when the API fails or finds nothing" do
    stub_request(:get, %r{nominatim\.openstreetmap\.org/search}).to_return(status: 200, body: "[]")
    expect(described_class.coordinates("Nowhere 123")).to be_nil

    stub_request(:get, %r{nominatim\.openstreetmap\.org/search}).to_return(status: 500)
    expect(described_class.coordinates("Elsewhere 456")).to be_nil
  end
end
