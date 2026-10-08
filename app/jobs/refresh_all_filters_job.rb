class RefreshAllFiltersJob < ApplicationJob
  queue_as :default

  def perform
    SearchFilter.due_for_refresh.find_each.with_index do |filter, index|
      RefreshSearchFilterJob.set(wait: (index * 30).seconds).perform_later(filter.id)
    end
  end
end
