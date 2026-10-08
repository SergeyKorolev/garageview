module Normalizers
  # Maps an item from the ivanvs~mobile-de-scraper Apify actor onto a Car.
  # Actor item structure:
  #   title, price: {amount, currency}, properties: {milage, gearbox, fuelType, power, firstRegistration},
  #   dealer: {name, addesses (sic), location: {latitude, longitude}}, images: [url, ...], features: [str, ...]
  class MobileDe < Base
    def call(item, car)
      props = item["properties"] || {}
      dealer = item["dealer"] || {}

      price_amount = item.dig("price", "amount") || extract_number(item["price"])
      mileage = extract_number(props["milage"] || props["mileage"] || item["mileage"])
      first_reg = parse_date(props["firstRegistration"] || item["firstRegistration"])
      power_kw = power_from_str(props["power"])
      # The actor leaves fuelType nil for EVs and signals them via driveType
      fuel = canonical_fuel(props["fuelType"] || item["fuelType"]) || fuel_from_drive_type(props["driveType"])
      transmission = canonical_gearbox(props["gearbox"] || item["gearbox"])

      # Attributes are actor source data (not derivable); if the item lacks
      # them, keep whatever the car already has rather than wiping it.
      attributes = item["attributes"].presence || car.raw_data&.dig("attributes") || {}
      attributes = attributes.merge("Fuel" => fuel_display(fuel)) if fuel && !attributes.key?("Fuel")

      images = item["images"] || []
      images = [ images ] if images.is_a?(String)

      seller_name = dealer.is_a?(Hash) ? dealer["name"] : nil
      seller_type = if dealer.is_a?(Hash)
        (dealer["sellerType"] || "").downcase.include?("dealer") ? "dealer" : "private"
      else
        "private"
      end
      seller_address = if dealer.is_a?(Hash)
        # Apify uses "addesses" (typo) as an array of address lines
        addrs = dealer["addesses"] || dealer["addresses"] || []
        addrs.is_a?(Array) ? addrs.join(", ") : addrs.to_s
      else
        ""
      end
      location = dealer.is_a?(Hash) ? (dealer["location"] || {}) : {}
      seller_lat = location.is_a?(Hash) ? location["latitude"]&.to_f : nil
      seller_lng = location.is_a?(Hash) ? location["longitude"]&.to_f : nil

      car.assign_attributes(
        title: item["title"],
        listing_url: item["url"] || car.listing_url,
        price_cents: price_amount ? (price_amount.to_f * 100).round : nil,
        mileage_km: mileage,
        first_registration: first_reg,
        power_kw: power_kw,
        fuel_type: fuel,
        transmission: transmission,
        seller_name: seller_name,
        seller_type: seller_type,
        seller_address: seller_address,
        seller_latitude: seller_lat,
        seller_longitude: seller_lng,
        photos: images.first(20),
        features: item["features"] || [],
        raw_data: item.merge("attributes" => attributes),
        last_scraped_at: Time.current
      )
      car.save!
      car
    end

    private

    # Parse power from strings like "420 kW (571 hp)" or "420 kW"
    def power_from_str(pw)
      return nil unless pw
      return pw.to_i if pw.is_a?(Numeric)

      match = clean_token(pw).match(/(\d+)\s*kw/)
      match ? match[1].to_i : nil
    end

    def fuel_from_drive_type(drive)
      clean_token(drive).include?("electric") ? "electric" : nil
    end
  end
end
