class ScrapeCarJob < ApplicationJob
  queue_as :scraper

  TRANSIENT_ERRORS = [ Net::OpenTimeout, Net::ReadTimeout, Errno::ECONNRESET, SocketError ].freeze

  retry_on(*TRANSIENT_ERRORS, wait: :polynomially_longer, attempts: 3) do |job, error|
    Car.find_by(id: job.arguments.first)&.update(status: "error")
    Rails.logger.error("ScrapeCarJob gave up for car #{job.arguments.first}: #{error.message}")
  end

  def perform(car_id)
    car = Car.find(car_id)
    return if car.status == "ready" && car.last_scraped_at.present? && car.last_scraped_at > 1.hour.ago

    car.update!(status: "scraping")

    begin
      client = Apify::Client.new(actor_id: ListingSource.actor_id(car.source))
      items = client.fetch_listing(car.listing_url)
      if items.is_a?(Array) && items.any? && !tombstone?(items.first)
        ListingSource.normalizer(car.source).call(items.first, car)
        car.reload
        car.update!(status: "ready")
        # Run per-car AI analysis (skips if already analyzed)
        AiCarAnalysisJob.perform_later(car.id)
        # Compute travel times for this car in all its collections
        compute_travel_for_car(car)
      elsif items.is_a?(Array) && items.any?
        # Listing removed from the site — keep the cached data instead of
        # overwriting it with the "not found" stub
        Rails.logger.warn("ScrapeCarJob: listing gone for car #{car_id}, keeping cached data")
        car.update!(status: car.price_cents.present? ? "ready" : "error", last_scraped_at: Time.current)
      else
        Rails.logger.error("ScrapeCarJob: Apify returned no items for car #{car_id}")
        car.update!(status: "error")
      end
    rescue *TRANSIENT_ERRORS
      # Leave status "scraping" and let retry_on re-run the job
      raise
    rescue => e
      car.update!(status: "error")
      Rails.logger.error("ScrapeCarJob failed for car #{car_id}: #{e.message}\n#{e.backtrace&.first(5)&.join("\n")}")
    end
  end

  private

  # Actors return a stub item for removed listings ("Listing does not exists
  # anymore" on mobile.de, "AD not found" on otomoto) with no spec payload.
  def tombstone?(item)
    return false unless item.is_a?(Hash)

    item["properties"].blank? && item["details"].blank? &&
      item["price"].blank? && item["rawPrice"].blank?
  end

  def compute_travel_for_car(car)
    return unless car.seller_latitude && car.seller_longitude

    car.collection_cars.includes(collection: :user).each do |bc|
      location = bc.collection.effective_location
      next unless location

      # Skip if already cached
      next if TravelTimeCache.lookup(
        origin_lat: location[:latitude],
        origin_lng: location[:longitude],
        dest_lat: car.seller_latitude,
        dest_lng: car.seller_longitude
      )

      TravelTimeCalculator.new.call(
        origin_lat: location[:latitude],
        origin_lng: location[:longitude],
        dest_lat: car.seller_latitude,
        dest_lng: car.seller_longitude
      )
    end
  rescue => e
    Rails.logger.warn("Travel computation failed for car #{car.id}: #{e.message}")
  end
end
