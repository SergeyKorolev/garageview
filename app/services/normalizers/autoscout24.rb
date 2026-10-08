module Normalizers
  # Maps an item from the ivanvs~autoscout-scraper Apify actor onto a Car.
  # Real .de output (differs from the actor's English docs): values are
  # localized German ("Gebraucht", "Grau", "Händler"), comfort/safety/extras
  # arrive as comma-joined strings, firstRegistration is spelled correctly,
  # and dealer.address carries the structured seller address. No coordinates.
  class Autoscout24 < Base
    UPHOLSTERY_MAP = {
      "teilleder" => "Part leather", "vollleder" => "Full leather", "leder" => "Leather",
      "stoff" => "Cloth", "kunstleder" => "Artificial leather", "alcantara" => "Alcantara",
      "velours" => "Velour"
    }.freeze

    ORIGIN_MAP = {
      "deutsche ausführung" => "German edition", "eu-ausführung" => "EU edition",
      "eu-import" => "EU edition", "us-import" => "US edition"
    }.freeze

    def call(item, car)
      price = item["rawPrice"] || extract_number(item["price"])
      address = dealer_address(item["dealer"]).presence || item["location"].to_s
      coordinates = provided_coordinates(item["address"]) || NominatimGeocoder.coordinates(address) || {}

      car.assign_attributes(
        title: item["title"].presence || [ item["mark"], item["model"], item["modelVersion"] ].compact.join(" "),
        listing_url: item["url"] || car.listing_url,
        price_cents: ExchangeRate.eur_cents(price, item["currency"] || "EUR"),
        price_currency: "EUR",
        mileage_km: extract_number(item["milage"] || item["mileage"]),
        first_registration: parse_month_year(item["firstRegistration"] || item["firstRegistrtion"]),
        power_kw: power_kw_from(item["power"]),
        fuel_type: canonical_fuel(item["fuelType"]),
        transmission: canonical_gearbox(item["gearbox"]),
        seller_name: item["dealerName"].presence || item["contactName"].presence,
        seller_type: seller_type(item["seller"]),
        seller_address: address,
        seller_latitude: coordinates[:latitude],
        seller_longitude: coordinates[:longitude],
        photos: Array(item["images"]).first(20),
        features: split_features([ item["comfort"], item["safety"], item["extras"] ]),
        raw_data: item.merge("attributes" => build_attributes(item)),
        last_scraped_at: Time.current
      )
      car.save!
      car
    end

    private

    # Builds the display attributes hash in the same label vocabulary the
    # mobile.de actor emits, so the compare/detail views align across sources.
    def build_attributes(item)
      fuel = canonical_fuel(item["fuelType"])
      features = split_features([ item["comfort"], item["safety"], item["extras"] ])

      {
        "Vehicle condition" => translate(CONDITION_MAP, item["state"]),
        "Category" => translate(BODY_MAP, item["bodyType"]),
        "First Registration" => (item["firstRegistration"] || item["firstRegistrtion"]).presence,
        "Mileage" => formatted_km(item["milage"] || item["mileage"]),
        "Power" => power_attribute(item["power"]),
        "Cubic Capacity" => formatted_ccm(item["engineSize"]),
        "Gears" => item["gears"].presence,
        "Fuel" => fuel_display(fuel),
        "Transmission" => gearbox_display(canonical_gearbox(item["gearbox"])),
        "Drive type" => drive_type_display(fuel),
        "Drivetrain" => item["drivetrain"].presence,
        "Colour" => colour_attribute(item),
        "Colour (Manufacturer)" => item["manufacturerColour"].presence,
        "Interior Design" => interior_design(item),
        "Climatisation" => climatisation_from(features),
        "Parking sensors" => parking_sensors_from(features),
        "Number of Seats" => item["seats"].presence,
        "Door Count" => item["doors"].presence,
        "Number of Vehicle Owners" => item["numberOfPreviousOwners"].presence,
        "Emission Class" => item["emissionClass"].presence&.gsub("Euro ", "Euro"),
        "CO₂ emissions (comb.)" => item["co2Emission"].presence&.sub(/\s*\((?:komb|comb)\.\)\z/, ""),
        "Energy consumption (comb.)" => item["fuelConsumption"].presence,
        "HU" => item["generalInspection"].presence,
        "Origin" => translate(ORIGIN_MAP, item["countryVersion"]),
        "Weight" => formatted_weight(item["emptyWeight"])
      }.compact
    end

    # "96 kW (131 PS)" → "96 kW (131 hp)" (mobile.de labels horsepower "hp")
    def power_attribute(value)
      kw = power_kw_from(value)
      return nil unless kw

      hp = clean_token(value)[/\((\d+)\s*(?:hp|ps|km)\)/, 1] || (kw / HP_TO_KW).round
      "#{kw} kW (#{hp} hp)"
    end

    # "1.395 kg" → "1,395 kg"
    def formatted_weight(value)
      n = extract_number(value)
      n ? "#{ActiveSupport::NumberHelper.number_to_delimited(n, delimiter: ",")} kg" : nil
    end

    def seller_type(value)
      clean_token(value).match?(/dealer|händler/) ? "dealer" : "private"
    end

    # .com listings ship exact dealer coordinates in the address object
    def provided_coordinates(address)
      return nil unless address.is_a?(Hash) && address["latitude"].present? && address["longitude"].present?

      { latitude: address["latitude"].to_f, longitude: address["longitude"].to_f }
    end

    # "Full leather" + upholsteryColour "Black" → "Full leather, Black" (mobile.de style)
    def interior_design(item)
      material = translate(UPHOLSTERY_MAP, item["upholstery"])
      return nil unless material

      colour = translate(COLOR_MAP, item["upholsteryColour"])
      [ material, colour ].compact.join(", ")
    end

    def climatisation_from(features)
      return "Automatic climatisation" if features.any? { |f| f.match?(/automatic climate control|klimaautomatik/i) }
      return "Air conditioning" if features.any? { |f| f.match?(/air conditioning|klimaanlage/i) }

      nil
    end

    # mobile.de style: "Rear, Front, 360° camera"
    def parking_sensors_from(features)
      parts = []
      parts << "Rear" if features.any? { |f| f.match?(/park.*rear|rear.*park|einparkhilfe.*hinten/i) }
      parts << "Front" if features.any? { |f| f.match?(/park.*front|front.*park|einparkhilfe.*vorne/i) }
      parts << "360° camera" if features.any? { |f| f.include?("360") }
      parts << "Camera" if !parts.include?("360° camera") && features.any? { |f| f.match?(/rear view camera|rückfahrkamera/i) }
      parts.presence&.join(", ")
    end

    def dealer_address(dealer)
      address = dealer.is_a?(Hash) ? dealer["address"] : nil
      return "" unless address.is_a?(Hash)

      [
        address["streetAddress"],
        [ address["postalCode"], address["addressLocality"] ].compact.reject(&:blank?).join(" "),
        address["contry"] || address["country"]
      ].compact.reject(&:blank?).join(", ")
    end

    def colour_attribute(item)
      colour = translate(COLOR_MAP, item["colour"])
      return nil unless colour

      clean_token(item["paint"]).include?("metallic") ? "#{colour} Metallic" : colour
    end

    # comfort/safety/extras arrive as comma-joined strings on .de (arrays in
    # the actor's documented English output) — support both.
    def split_features(values)
      Array(values).flat_map { |value| value.is_a?(String) ? value.split(/,\s*/) : flatten_features(value) }
        .map(&:strip).reject(&:blank?)
    end

    def parse_month_year(value)
      match = value.to_s.match(%r{(\d{1,2})/(\d{4})})
      return nil unless match

      Date.new(match[2].to_i, match[1].to_i, 1)
    rescue Date::Error
      nil
    end

    # "110 kW (150 hp)" or "96 kW (131 PS)" → 96; hp/PS-only fallback converts
    def power_kw_from(value)
      str = clean_token(value)
      return nil if str.blank?

      kw = str[/(\d+)\s*kw/, 1]
      return kw.to_i if kw

      hp = str[/(\d+)\s*(?:hp|ps|km)/, 1]
      hp ? kw_from_hp(hp.to_i) : nil
    end
  end
end
