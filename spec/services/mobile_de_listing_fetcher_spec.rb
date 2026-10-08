require "rails_helper"

RSpec.describe MobileDe::ListingFetcher do
  subject(:fetcher) { described_class.new }

  it "rejects unsupported URLs before making a request" do
    urls = [
      "http://127.0.0.1:3000/admin", "https://mobile.de.evil.test/",
      "https://evil.test/?id=123456", "http://www.mobile.de/",
      "https://user:pass@www.mobile.de/", "https://www.mobile.de:8443/", "invalid URL"
    ]
    urls.each do |url|
      expect { fetcher.call(url) }.to raise_error(described_class::InvalidUrl)
    end
    expect(WebMock).not_to have_requested(:get, /./)
  end

  it "does not follow redirects to internal services" do
    url = "https://www.mobile.de/listing"
    stub_request(:get, url).to_return(status: 302, headers: { "Location" => "http://127.0.0.1/admin" })
    expect { fetcher.call(url) }.to raise_error(described_class::InvalidUrl)
    expect(WebMock).not_to have_requested(:get, "http://127.0.0.1/admin")
  end

  it "fetches a supported HTTPS listing" do
    url = "https://suchen.mobile.de/fahrzeuge/details.html?id=123456789"
    stub_request(:get, url).to_return(body: '<h1 id="ad-title">Example car</h1>')
    expect(fetcher.call(url).title).to eq("Example car")
  end
end
