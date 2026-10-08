module Normalizers
  # Maps an item from the ivanvs~otomoto-scraper Apify actor onto a Car.
  # Actor item structure:
  #   id ("ID1I2dh4"), url, title, images[], price (numeric), currency ("PLN"),
  #   details: {make, model, version, year, mileage, fuel_type (Polish), engine_power ("306 KM"),
  #             gearbox (Polish), transmission (drive type), color, body_type, vin, new_used, ...},
  #   seller: {name, type (PROFESSIONAL/private), location: {address, city, postal code, latitude, longitude}},
  #   equipment: [{key: "comfort_and_addons", values: ["air_conditioning_type", ...]}, ...]
  class Otomoto < Base
    DRIVE_MAP = {
      "4x4 (stały)" => "4x4 (permanent)", "4x4 (dołączany automatycznie)" => "4x4 (automatic)",
      "4x4 (dołączany ręcznie)" => "4x4 (manual)", "na przednie koła" => "Front wheel drive",
      "na tylne koła" => "Rear wheel drive"
    }.freeze

    COUNTRY_MAP = {
      "polska" => "Poland", "niemcy" => "Germany", "francja" => "France", "belgia" => "Belgium",
      "holandia" => "Netherlands", "szwajcaria" => "Switzerland", "austria" => "Austria",
      "włochy" => "Italy", "szwecja" => "Sweden", "dania" => "Denmark",
      "stany zjednoczone" => "United States", "hiszpania" => "Spain"
    }.freeze

    def call(item, car)
      details = item["details"] || {}
      seller = item["seller"] || {}
      location = seller.is_a?(Hash) ? (seller["location"] || {}) : {}

      year = extract_number(details["year"])
      price = item["price"].is_a?(Numeric) ? item["price"] : extract_number(item["price"])

      car.assign_attributes(
        title: item["title"].presence || [ details["make"], details["model"], details["version"] ].compact.join(" "),
        listing_url: item["url"] || car.listing_url,
        price_cents: ExchangeRate.eur_cents(price, item["currency"] || "PLN"),
        price_currency: "EUR",
        mileage_km: extract_number(details["mileage"]),
        first_registration: year ? Date.new(year, 1, 1) : nil,
        power_kw: power_kw_from(details["engine_power"]),
        fuel_type: canonical_fuel(details["fuel_type"]),
        transmission: canonical_gearbox(details["gearbox"]),
        seller_name: seller.is_a?(Hash) ? seller["name"] : nil,
        seller_type: seller.is_a?(Hash) && seller["type"].to_s.casecmp("PROFESSIONAL").zero? ? "dealer" : "private",
        seller_address: [ location["address"], location["postal code"], location["city"] ].compact.reject(&:blank?).join(", "),
        seller_latitude: location["latitude"]&.to_f,
        seller_longitude: location["longitude"]&.to_f,
        photos: Array(item["images"]).first(20),
        features: equipment_features(item["equipment"]),
        raw_data: item.merge("attributes" => build_attributes(details)),
        last_scraped_at: Time.current
      )
      car.save!
      car
    end

    private

    # Otomoto reports power in Polish horsepower notation, e.g. "306 KM"
    def power_kw_from(value)
      hp = extract_number(value)
      hp ? kw_from_hp(hp) : nil
    end

    # Builds the display attributes hash in the same label vocabulary the
    # mobile.de actor emits, so the compare/detail views align across sources.
    def build_attributes(details)
      fuel = canonical_fuel(details["fuel_type"])

      {
        "Vehicle condition" => condition_attribute(details),
        "Category" => translate(BODY_MAP, details["body_type"]),
        "Generation" => details["generation"],
        "First Registration" => details["first_registration"].presence || details["year"],
        "Mileage" => formatted_km(details["mileage"]),
        "Power" => power_attribute(details["engine_power"]),
        "Cubic Capacity" => formatted_ccm(details["engine_capacity"]),
        "Fuel" => fuel_display(fuel),
        "Transmission" => gearbox_display(canonical_gearbox(details["gearbox"])),
        "Drive type" => drive_type_display(fuel),
        "Drivetrain" => translate(DRIVE_MAP, details["transmission"]),
        "Colour" => colour_attribute(details),
        "Number of Seats" => details["nr_seats"],
        "Door Count" => details["door_count"],
        "CO₂ emissions (comb.)" => details["co2_emissions"],
        "Fuel consumption (urban)" => details["urban_consumption"],
        "Fuel consumption (extra urban)" => details["extra_urban_consumption"],
        "Origin" => translate(COUNTRY_MAP, details["country_origin"]),
        "Service history" => yes_no(details["service_record"]),
        "Number of Vehicle Owners" => details["original_owner"].to_s.casecmp("tak").zero? ? "1" : nil,
        "VIN" => details["vin"]
      }.compact
    end

    # mobile.de folds accident status into the condition value
    def condition_attribute(details)
      condition = translate(CONDITION_MAP, details["new_used"])
      return condition unless condition == "Used vehicle" && yes_no(details["no_accident"]) == "Yes"

      "Used vehicle, Accident-free"
    end

    def yes_no(raw)
      { "tak" => "Yes", "nie" => "No" }[clean_token(raw)]
    end

    def power_attribute(value)
      hp = extract_number(value)
      hp ? "#{kw_from_hp(hp)} kW (#{hp} hp)" : nil
    end

    def colour_attribute(details)
      colour = translate(COLOR_MAP, details["color"])
      return nil unless colour

      clean_token(details["colour_type"]) == "metalik" ? "#{colour} Metallic" : colour
    end

    # Equipment arrives as groups of stable snake_case tokens; humanize the
    # tokens and drop the group keys.
    def equipment_features(equipment)
      groups = case equipment
      when Hash then equipment.values
      when Array then equipment.map { |g| g.is_a?(Hash) ? g["values"] : g }
      else []
      end

      groups.flatten.filter_map { |token| token.to_s.tr("_", " ").strip.presence&.upcase_first }
    end
  end
end
