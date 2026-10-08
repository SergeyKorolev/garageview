require "rails_helper"

RSpec.describe AiCarRatingJob, type: :job do
  let(:collection) { create(:collection) }

  before do
    allow(AiCarRatingService).to receive(:rate_collection)
  end

  it "calls AiCarRatingService.rate_collection" do
    described_class.perform_now(collection.id)
    expect(AiCarRatingService).to have_received(:rate_collection).with(collection, force: false)
  end

  it "passes force flag when provided" do
    described_class.perform_now(collection.id, force: true)
    expect(AiCarRatingService).to have_received(:rate_collection).with(collection, force: true)
  end

  it "raises if collection not found" do
    expect { described_class.perform_now(-1) }.to raise_error(ActiveRecord::RecordNotFound)
  end
end
