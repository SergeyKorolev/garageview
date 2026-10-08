require "rails_helper"

RSpec.describe CollectionCar, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:collection) }
    it { is_expected.to belong_to(:car) }
    it { is_expected.to belong_to(:search_filter).optional }
  end

  describe "validations" do
    subject { create(:collection_car) }

    it { is_expected.to validate_uniqueness_of(:collection_id).scoped_to(:car_id) }
  end
end
