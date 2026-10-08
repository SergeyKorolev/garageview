require "rails_helper"

RSpec.describe AiRateThenResearchJob, type: :job do
  let(:collection) { create(:collection) }
  let(:research) { create(:deep_research, collection: collection) }

  before do
    allow(AiCarRatingService).to receive(:rate_collection)
    allow(DeepResearchService).to receive(:run)
  end

  it "rates the collection first, then runs deep research" do
    described_class.perform_now(collection.id, research.id)
    expect(AiCarRatingService).to have_received(:rate_collection).with(collection).ordered
    expect(DeepResearchService).to have_received(:run).with(research).ordered
  end

  it "raises if collection not found" do
    expect { described_class.perform_now(-1, research.id) }.to raise_error(ActiveRecord::RecordNotFound)
  end

  it "raises if research not found" do
    expect { described_class.perform_now(collection.id, -1) }.to raise_error(ActiveRecord::RecordNotFound)
  end
end
