module MobileDe
  class SearchFetcher
    def call(search_url, max_items: 100)
      client = Apify::Client.new(actor_id: ListingSource.actor_id("mobile_de"))
      items = client.fetch_search_results(search_url, max_items: max_items)
      fetcher = ListingFetcher.new

      items.filter_map do |item|
        url = item["url"] || item["detailUrl"]
        external_id = url&.match(/\/(\d{6,})/)&.send(:[], 1) || item["id"]&.to_s
        next unless external_id

        begin
          car = Car.find_or_initialize_by(source: "mobile_de", external_id: external_id)
          car.listing_url = url if url
          car.status ||= "pending"
          fetcher.save_from_apify(item, car)
          car.update!(status: "ready")
          car
        rescue StandardError => e
          Rails.logger.warn("Failed to save car from search: #{e.message}")
          nil
        end
      end
    end
  end
end
