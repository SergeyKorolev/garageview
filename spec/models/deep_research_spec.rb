require "rails_helper"

RSpec.describe DeepResearch, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:collection) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:car_ids) }
    it { is_expected.to validate_inclusion_of(:status).in_array(%w[pending processing completed failed]) }
  end

  describe "scopes" do
    describe ".shared" do
      it "returns only deep researches with a share_token" do
        collection = create(:collection)
        shared = create(:deep_research, collection: collection, share_token: "abc123")
        not_shared = create(:deep_research, collection: collection, share_token: nil)

        expect(DeepResearch.shared).to include(shared)
        expect(DeepResearch.shared).not_to include(not_shared)
      end
    end
  end

  describe "#cars" do
    it "returns cars matching the car_ids" do
      car1 = create(:car)
      car2 = create(:car)
      car3 = create(:car)
      research = create(:deep_research, car_ids: [ car1.id, car2.id ])

      [ car1, car2 ].each { |car| create(:collection_car, collection: research.collection, car: car) }
      research.update!(car_ids: [ car1.id, car2.id, car3.id ])
      expect(research.cars).to contain_exactly(car1, car2)
      expect(research.cars).not_to include(car3)
    end
  end

  describe "share tokens" do
    let(:research) { create(:deep_research) }

    describe "#generate_share_token!" do
      it "generates a share token and sets shared_at" do
        token = research.generate_share_token!
        expect(token).to be_present
        expect(research.reload.share_token).to eq(token)
        expect(research.shared_at).to be_present
      end
    end

    describe "#revoke_share_token!" do
      it "clears the share token and shared_at" do
        research.generate_share_token!
        research.revoke_share_token!
        expect(research.reload.share_token).to be_nil
        expect(research.shared_at).to be_nil
      end
    end

    describe "#shared? and #public_url" do
      it "returns the public URL when shared" do
        research.generate_share_token!
        expect(research).to be_shared
        expect(research.public_url).to eq("https://garageview.ai/s/r/#{research.share_token}")
      end

      it "returns nil for public_url when not shared" do
        expect(research).not_to be_shared
        expect(research.public_url).to be_nil
      end
    end
  end
end
