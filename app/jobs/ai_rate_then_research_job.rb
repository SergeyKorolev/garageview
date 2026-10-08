class AiRateThenResearchJob < ApplicationJob
  queue_as :default

  def perform(collection_id, deep_research_id)
    collection = Collection.find(collection_id)
    AiCarRatingService.rate_collection(collection)
    DeepResearchService.run(DeepResearch.find(deep_research_id))
  end
end
