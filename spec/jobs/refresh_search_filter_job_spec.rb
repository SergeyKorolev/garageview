require "rails_helper"

RSpec.describe RefreshSearchFilterJob, type: :job do
  let(:user) { create(:user) }
  let(:collection) { create(:collection, user: user) }
  let(:filter) { create(:search_filter, collection: collection, active: true) }
  let(:api_client) { instance_double(Apify::Client) }
  let(:normalizer) { instance_double(Normalizers::MobileDe) }

  before do
    allow(Apify::Client).to receive(:new).and_return(api_client)
    allow(ListingSource).to receive(:normalizer).and_return(normalizer)
    allow(ComputeTravelTimesJob).to receive(:perform_later)
  end

  it "fetches search results and creates cars" do
    items = [
      { "url" => "https://www.mobile.de/fahrzeuge/details/100001.html", "id" => "100001", "shortTitle" => "BMW 320d" },
      { "url" => "https://www.mobile.de/fahrzeuge/details/100002.html", "id" => "100002", "shortTitle" => "Audi A4" }
    ]
    allow(api_client).to receive(:fetch_search_results).and_return(items)
    allow(normalizer).to receive(:call)

    expect { described_class.perform_now(filter.id) }.to change(Car, :count).by(2)
  end

  it "updates expected_count on the filter" do
    items = [ { "url" => "https://www.mobile.de/fahrzeuge/details/200001.html", "id" => "200001" } ]
    allow(api_client).to receive(:fetch_search_results).and_return(items)
    allow(normalizer).to receive(:call)

    described_class.perform_now(filter.id)
    expect(filter.reload.expected_count).to eq(1)
  end

  it "deactivates the filter and sets last_refreshed_at on completion" do
    allow(api_client).to receive(:fetch_search_results).and_return([])
    described_class.perform_now(filter.id)
    filter.reload
    expect(filter.active).to eq(false)
    expect(filter.last_refreshed_at).to be_present
  end

  it "skips inactive filters" do
    filter.update!(active: false)
    allow(api_client).to receive(:fetch_search_results)
    described_class.perform_now(filter.id)
    expect(api_client).not_to have_received(:fetch_search_results)
  end

  it "handles errors for individual cars gracefully" do
    items = [
      { "url" => "https://www.mobile.de/fahrzeuge/details/300001.html", "id" => "300001" },
      { "url" => "https://www.mobile.de/fahrzeuge/details/300002.html", "id" => "300002" }
    ]
    allow(api_client).to receive(:fetch_search_results).and_return(items)
    call_count = 0
    allow(normalizer).to receive(:call) do
      call_count += 1
      raise StandardError, "Parse error" if call_count == 1
    end

    described_class.perform_now(filter.id)
    statuses = Car.where(external_id: %w[300001 300002]).pluck(:status)
    expect(statuses).to include("error")
  end

  it "enqueues travel time computation on success" do
    items = [ { "url" => "https://www.mobile.de/fahrzeuge/details/400001.html", "id" => "400001" } ]
    allow(api_client).to receive(:fetch_search_results).and_return(items)
    allow(normalizer).to receive(:call)

    described_class.perform_now(filter.id)
    expect(ComputeTravelTimesJob).to have_received(:perform_later).with(collection.id)
  end

  it "skips travel time computation when no cars succeeded" do
    allow(api_client).to receive(:fetch_search_results).and_return([])
    described_class.perform_now(filter.id)
    expect(ComputeTravelTimesJob).not_to have_received(:perform_later)
  end

  it "creates collection_car records linking cars to the collection" do
    items = [ { "url" => "https://www.mobile.de/fahrzeuge/details/500001.html", "id" => "500001" } ]
    allow(api_client).to receive(:fetch_search_results).and_return(items)
    allow(normalizer).to receive(:call)

    expect { described_class.perform_now(filter.id) }.to change(CollectionCar, :count).by(1)
  end
end
