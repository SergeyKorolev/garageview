class DeepResearchJob < ApplicationJob
  queue_as :default

  def perform(deep_research_id)
    research = DeepResearch.find(deep_research_id)
    DeepResearchService.run(research)
  end
end
