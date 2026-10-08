require "rails_helper"

RSpec.describe DeepResearchJob, type: :job do
  let(:research) { create(:deep_research) }

  before do
    allow(DeepResearchService).to receive(:run)
  end

  it "calls DeepResearchService.run with the research" do
    described_class.perform_now(research.id)
    expect(DeepResearchService).to have_received(:run).with(research)
  end

  it "raises if research not found" do
    expect { described_class.perform_now(-1) }.to raise_error(ActiveRecord::RecordNotFound)
  end
end
