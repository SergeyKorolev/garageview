require "rails_helper"

RSpec.describe AiCarAnalysisJob, type: :job do
  let(:car) { create(:car, status: "ready") }

  before do
    allow(AiCarAnalysisService).to receive(:analyze)
  end

  it "calls AiCarAnalysisService.analyze for ready cars" do
    described_class.perform_now(car.id)
    expect(AiCarAnalysisService).to have_received(:analyze).with(car, force: false)
  end

  it "skips non-ready cars" do
    car.update!(status: "pending")
    described_class.perform_now(car.id)
    expect(AiCarAnalysisService).not_to have_received(:analyze)
  end

  it "does not raise on service errors" do
    allow(AiCarAnalysisService).to receive(:analyze).and_raise(StandardError, "AI error")
    expect { described_class.perform_now(car.id) }.not_to raise_error
  end
end
