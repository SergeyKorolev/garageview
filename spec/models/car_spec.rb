require "rails_helper"

RSpec.describe Car, type: :model do
  describe "associations" do
    it { is_expected.to have_many(:collection_cars).dependent(:destroy) }
    it { is_expected.to have_many(:collections).through(:collection_cars) }
  end

  describe "validations" do
    subject { build(:car) }

    it { is_expected.to validate_presence_of(:external_id) }
    it { is_expected.to validate_uniqueness_of(:external_id).scoped_to(:source) }
  end

  describe "scopes" do
    let!(:diesel_car) { create(:car, fuel_type: "diesel", transmission: "automatic", price_cents: 2_000_000, mileage_km: 50_000) }
    let!(:electric_car) { create(:car, fuel_type: "electric", transmission: "automatic", price_cents: 4_000_000, mileage_km: 20_000) }
    let!(:gasoline_manual) { create(:car, fuel_type: "gasoline", transmission: "manual", price_cents: 1_000_000, mileage_km: 100_000) }

    describe ".by_fuel_type" do
      it "filters cars by fuel type" do
        expect(Car.by_fuel_type("diesel")).to contain_exactly(diesel_car)
      end

      it "returns all cars when fuel type is blank" do
        expect(Car.by_fuel_type(nil)).to contain_exactly(diesel_car, electric_car, gasoline_manual)
      end
    end

    describe ".by_transmission" do
      it "filters cars by transmission type" do
        expect(Car.by_transmission("manual")).to contain_exactly(gasoline_manual)
      end

      it "returns all cars when transmission is blank" do
        expect(Car.by_transmission("")).to contain_exactly(diesel_car, electric_car, gasoline_manual)
      end
    end

    describe ".price_between" do
      it "filters cars within a price range (in euros)" do
        expect(Car.price_between(15_000, 25_000)).to contain_exactly(diesel_car)
      end

      it "filters with only min price" do
        expect(Car.price_between(30_000, nil)).to contain_exactly(electric_car)
      end

      it "filters with only max price" do
        expect(Car.price_between(nil, 15_000)).to contain_exactly(gasoline_manual)
      end
    end

    describe ".mileage_between" do
      it "filters cars within a mileage range" do
        expect(Car.mileage_between(40_000, 60_000)).to contain_exactly(diesel_car)
      end

      it "filters with only min mileage" do
        expect(Car.mileage_between(80_000, nil)).to contain_exactly(gasoline_manual)
      end
    end
  end

  describe "#feature_count" do
    it "returns the number of features" do
      car = build(:car, features: %w[ABS ESP Leather])
      expect(car.feature_count).to eq(3)
    end

    it "returns 0 when features is nil" do
      car = build(:car, features: nil)
      expect(car.feature_count).to eq(0)
    end
  end

  describe "share tokens" do
    let(:car) { create(:car) }

    describe "#generate_share_token!" do
      it "generates and persists a share token" do
        token = car.generate_share_token!
        expect(token).to be_present
        expect(car.reload.share_token).to eq(token)
      end
    end

    describe "#revoke_share_token!" do
      it "clears the share token" do
        car.generate_share_token!
        car.revoke_share_token!
        expect(car.reload.share_token).to be_nil
      end
    end

    describe "#shared?" do
      it "returns true when share token is present" do
        car.generate_share_token!
        expect(car).to be_shared
      end

      it "returns false when share token is nil" do
        expect(car).not_to be_shared
      end
    end

    describe "#share_url" do
      it "returns the share URL when shared" do
        car.generate_share_token!
        expect(car.share_url).to eq("https://garageview.ai/s/v/#{car.share_token}")
      end

      it "returns nil when not shared" do
        expect(car.share_url).to be_nil
      end
    end
  end
end
