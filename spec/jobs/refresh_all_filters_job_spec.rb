require "rails_helper"

RSpec.describe RefreshAllFiltersJob, type: :job do
  before do
    allow(RefreshSearchFilterJob).to receive(:perform_later)
    # Allow set() to return a double that responds to perform_later
    allow(RefreshSearchFilterJob).to receive(:set).and_return(RefreshSearchFilterJob)
  end

  it "enqueues RefreshSearchFilterJob for each due filter" do
    collection = create(:collection)
    filter1 = create(:search_filter, collection: collection, active: true, last_refreshed_at: 25.hours.ago)
    filter2 = create(:search_filter, collection: collection, active: true, last_refreshed_at: 25.hours.ago)

    described_class.perform_now
    expect(RefreshSearchFilterJob).to have_received(:set).at_least(:once)
  end

  it "does not enqueue for recently refreshed filters" do
    collection = create(:collection)
    create(:search_filter, collection: collection, active: true, last_refreshed_at: 1.hour.ago)

    described_class.perform_now
    # No filter should be due for refresh
    expect(RefreshSearchFilterJob).not_to have_received(:set)
  end

  it "handles no due filters gracefully" do
    expect { described_class.perform_now }.not_to raise_error
  end
end
