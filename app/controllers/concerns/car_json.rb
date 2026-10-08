module CarJson
  private

  # Whitelisted car payload shared by every endpoint that renders a car.
  # raw_data must never be exposed directly — only the digs below.
  def car_json(car)
    {
      id: car.id,
      external_id: car.external_id,
      source: car.source,
      title: car.title,
      listing_url: car.listing_url,
      price_cents: car.price_cents,
      price_currency: car.price_currency,
      mileage_km: car.mileage_km,
      first_registration: car.first_registration,
      power_kw: car.power_kw,
      fuel_type: car.fuel_type,
      transmission: car.transmission,
      co2_emissions: car.co2_emissions,
      seller_name: car.seller_name,
      seller_type: car.seller_type,
      seller_address: car.seller_address,
      seller_latitude: car.seller_latitude,
      seller_longitude: car.seller_longitude,
      photos: car.photos,
      features: car.features,
      attributes: car.raw_data&.dig("attributes") || {},
      price_rating: car.raw_data&.dig("priceRating"),
      ai_analysis: car.ai_analysis,
      ai_analyzed_at: car.ai_analyzed_at,
      last_scraped_at: car.last_scraped_at,
      created_at: car.created_at,
      status: car.status || "ready"
    }
  end
end
