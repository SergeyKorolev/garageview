require "rails_helper"

RSpec.describe ScrapeCarJob, type: :job do
  let(:car) { create(:car, status: "pending", listing_url: "https://www.mobile.de/test/123456", last_scraped_at: nil) }
  let(:api_client) { instance_double(Apify::Client) }
  let(:normalizer) { instance_double(Normalizers::MobileDe, call: nil) }

  before do
    allow(Apify::Client).to receive(:new).and_return(api_client)
    allow(ListingSource).to receive(:normalizer).and_return(normalizer)
    allow(AiCarAnalysisJob).to receive(:perform_later)
    allow(TravelTimeCalculator).to receive(:new).and_return(instance_double(TravelTimeCalculator, call: {}))
  end

  it "scrapes the car and updates status to ready" do
    allow(api_client).to receive(:fetch_listing).and_return([ { "url" => car.listing_url, "price" => { "amount" => 10_000 } } ])

    described_class.perform_now(car.id)
    expect(car.reload.status).to eq("ready")
  end

  it "uses the actor and normalizer matching the car's source" do
    otomoto_car = create(:car, source: "otomoto", external_id: "6I1kUb", status: "pending",
                               listing_url: "https://www.otomoto.pl/osobowe/oferta/vw-ID6I1kUb.html", last_scraped_at: nil)
    allow(api_client).to receive(:fetch_listing).and_return([ { "url" => otomoto_car.listing_url, "details" => { "make" => "VW" } } ])

    described_class.perform_now(otomoto_car.id)

    expect(Apify::Client).to have_received(:new).with(actor_id: "ivanvs~otomoto-scraper")
    expect(ListingSource).to have_received(:normalizer).with("otomoto")
  end

  it "sets status to scraping before fetching" do
    allow(api_client).to receive(:fetch_listing) do
      expect(car.reload.status).to eq("scraping")
      [ { "url" => car.listing_url, "price" => { "amount" => 10_000 } } ]
    end
    described_class.perform_now(car.id)
  end

  it "enqueues AI analysis after successful scrape" do
    allow(api_client).to receive(:fetch_listing).and_return([ { "url" => car.listing_url, "price" => { "amount" => 10_000 } } ])

    described_class.perform_now(car.id)
    expect(AiCarAnalysisJob).to have_received(:perform_later).with(car.id)
  end

  it "sets status to error when Apify returns no items" do
    allow(api_client).to receive(:fetch_listing).and_return([])
    described_class.perform_now(car.id)
    expect(car.reload.status).to eq("error")
  end

  it "keeps cached data when the listing was removed from the site" do
    car.update!(title: "BMW 320d", price_cents: 1_500_000)
    allow(api_client).to receive(:fetch_listing).and_return([ { "title" => "Listing does not exists anymore", "url" => car.listing_url } ])

    described_class.perform_now(car.id)

    expect(normalizer).not_to have_received(:call)
    expect(car.reload).to have_attributes(status: "ready", title: "BMW 320d", price_cents: 1_500_000)
    expect(car.last_scraped_at).to be_present
  end

  it "sets status to error on exception" do
    allow(api_client).to receive(:fetch_listing).and_raise(StandardError, "Some failure")
    described_class.perform_now(car.id)
    expect(car.reload.status).to eq("error")
  end

  it "retries transient network timeouts instead of permanently failing the car" do
    original_adapter = ActiveJob::Base.queue_adapter
    ActiveJob::Base.queue_adapter = :test
    allow(api_client).to receive(:fetch_listing).and_raise(Net::ReadTimeout)

    expect { described_class.perform_now(car.id) }.to have_enqueued_job(described_class).with(car.id)
    expect(car.reload.status).to eq("scraping")
  ensure
    ActiveJob::Base.queue_adapter = original_adapter
  end

  it "skips scraping if car was recently scraped and ready" do
    car.update!(status: "ready", last_scraped_at: 30.minutes.ago)
    allow(api_client).to receive(:fetch_listing)

    described_class.perform_now(car.id)
    expect(api_client).not_to have_received(:fetch_listing)
  end
end
