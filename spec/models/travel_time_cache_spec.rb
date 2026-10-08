require "rails_helper"

RSpec.describe TravelTimeCache, type: :model do
  describe ".lookup" do
    it "finds a cached entry with rounded coordinates" do
      cache = create(:travel_time_cache, origin_lat: 48.14, origin_lng: 11.58, dest_lat: 52.52, dest_lng: 13.40)
      result = TravelTimeCache.lookup(origin_lat: 48.135, origin_lng: 11.582, dest_lat: 52.519, dest_lng: 13.399)
      expect(result).to eq(cache)
    end

    it "returns nil when no matching cache exists" do
      result = TravelTimeCache.lookup(origin_lat: 48.14, origin_lng: 11.58, dest_lat: 52.52, dest_lng: 13.40)
      expect(result).to be_nil
    end

    it "does not match when rounded coordinates differ" do
      create(:travel_time_cache, origin_lat: 48.14, origin_lng: 11.58, dest_lat: 52.52, dest_lng: 13.40)
      result = TravelTimeCache.lookup(origin_lat: 49.00, origin_lng: 11.58, dest_lat: 52.52, dest_lng: 13.40)
      expect(result).to be_nil
    end
  end
end
