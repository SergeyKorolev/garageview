class ComputeTravelTimesJob < ApplicationJob
  queue_as :default

  def perform(collection_id)
    collection = Collection.find(collection_id)
    location = collection.effective_location
    return unless location

    collection.cars.where.not(seller_latitude: nil, seller_longitude: nil).find_each do |car|
      TravelTimeCalculator.new.call(
        origin_lat: location[:latitude],
        origin_lng: location[:longitude],
        dest_lat: car.seller_latitude,
        dest_lng: car.seller_longitude
      )
    end
  end
end
