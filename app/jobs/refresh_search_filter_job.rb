class RefreshSearchFilterJob < ApplicationJob
  queue_as :scraper

  def perform(search_filter_id)
    filter = SearchFilter.find(search_filter_id)
    return unless filter.active?

    source = ListingSource.detect(filter.search_url) || "mobile_de"

    # Phase 1: Fetch all results from Apify
    client = Apify::Client.new(actor_id: ListingSource.actor_id(source))
    items = client.fetch_search_results(filter.search_url)
    Rails.logger.info("Search filter #{filter.id}: got #{items.size} results from Apify")

    # Save expected count immediately so the UI can show placeholders
    filter.update!(expected_count: items.size)

    # Phase 2: Create stub cars immediately (UI sees placeholders via polling)
    stubs = items.filter_map do |item|
      url = item["url"] || item["detailUrl"]
      external_id = (url && ListingSource.extract_external_id(url)) || item["id"]&.to_s&.delete_prefix("ID").presence
      next unless external_id

      car = Car.find_or_initialize_by(source: source, external_id: external_id)
      car.listing_url = url if url
      car.title ||= item["shortTitle"] || item["title"]
      car.status = "scraping" unless car.status == "ready"
      car.save!

      filter.collection.collection_cars.find_or_create_by(car: car) do |bc|
        bc.added_via = "search_filter"
        bc.search_filter = filter
      end

      { car: car, data: item }
    end

    Rails.logger.info("Search filter #{filter.id}: created #{stubs.size} stub cars")

    # Phase 3: Fill in full data for each car (UI updates as each completes)
    normalizer = ListingSource.normalizer(source)
    success_count = 0
    stubs.each do |stub|
      next if stub[:car].status == "ready" && stub[:car].last_scraped_at.present?

      begin
        normalizer.call(stub[:data], stub[:car])
        stub[:car].update!(status: "ready")
        success_count += 1
      rescue StandardError => e
        stub[:car].update!(status: "error")
        Rails.logger.warn("Failed to update car #{stub[:car].id}: #{e.message}")
      end
    end

    filter.update!(last_refreshed_at: Time.current, active: false)
    Rails.logger.info("Search filter #{filter.id}: completed, #{success_count}/#{stubs.size} cars succeeded.")

    # Only compute travel times if at least one car succeeded
    if success_count > 0
      ComputeTravelTimesJob.perform_later(filter.collection_id)
      Rails.logger.info("Search filter #{filter.id}: enqueued travel time computation.")
    end
  end
end
