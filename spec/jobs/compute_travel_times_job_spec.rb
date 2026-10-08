require "rails_helper"

RSpec.describe ComputeTravelTimesJob, type: :job do
  let(:user) { create(:user, latitude: 48.1351, longitude: 11.582, location_name: "Munich") }
  let(:collection) { create(:collection, user: user) }
  let(:calculator) { instance_double(TravelTimeCalculator) }

  before do
    allow(TravelTimeCalculator).to receive(:new).and_return(calculator)
    allow(calculator).to receive(:call).and_return({ driving_seconds: 3600, distance_km: 100 })
  end

  it "computes travel times for all cars with seller coordinates" do
    car = create(:car, seller_latitude: 52.52, seller_longitude: 13.405)
    create(:collection_car, collection: collection, car: car)

    described_class.perform_now(collection.id)
    expect(calculator).to have_received(:call)
  end

  it "skips cars without seller coordinates" do
    car = create(:car, seller_latitude: nil, seller_longitude: nil)
    create(:collection_car, collection: collection, car: car)

    described_class.perform_now(collection.id)
    expect(calculator).not_to have_received(:call)
  end

  it "skips if collection has no effective location" do
    user_without_location = create(:user, latitude: nil, longitude: nil, location_name: nil)
    collection_no_loc = create(:collection, user: user_without_location, latitude: nil, longitude: nil)
    car = create(:car, seller_latitude: 52.52, seller_longitude: 13.405)
    create(:collection_car, collection: collection_no_loc, car: car)

    described_class.perform_now(collection_no_loc.id)
    expect(calculator).not_to have_received(:call)
  end

  it "raises if collection not found" do
    expect { described_class.perform_now(-1) }.to raise_error(ActiveRecord::RecordNotFound)
  end
end
