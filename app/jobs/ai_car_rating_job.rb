class AiCarRatingJob < ApplicationJob
  queue_as :default

  def perform(collection_id, force: false)
    collection = Collection.find(collection_id)
    AiCarRatingService.rate_collection(collection, force: force)
  end
end
