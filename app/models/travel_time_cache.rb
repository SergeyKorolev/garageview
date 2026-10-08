class TravelTimeCache < ApplicationRecord
  def self.lookup(origin_lat:, origin_lng:, dest_lat:, dest_lng:)
    find_by(
      origin_lat: origin_lat.round(2),
      origin_lng: origin_lng.round(2),
      dest_lat: dest_lat.round(2),
      dest_lng: dest_lng.round(2)
    )
  end
end
