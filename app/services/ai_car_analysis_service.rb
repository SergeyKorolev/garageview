class AiCarAnalysisService
  include LanguageAware

  def self.analyze(car, user: nil, force: false)
    new(car, user: user).call(force: force)
  end

  def initialize(car, user: nil)
    @car = car
    @user = user || car.collections.includes(:user).first&.user
    @collection = @user&.collections&.first # LanguageAware expects @collection
  end

  def call(force: false)
    return unless AiModels.api_key?
    return unless @user
    return if @car.ai_analysis.present? && !force

    result = analyze_car
    return unless result

    @car.update!(ai_analysis: result, ai_analyzed_at: Time.current)
    result
  end

  private

  def analyze_car
    car_text = format_car_for_prompt(extract_car_data)

    prompt = <<~PROMPT
      Analyze this used car listing for a private buyer. Be specific with numbers.

      #{car_text}

      WHAT MAKES A VALID CON:
      A con must be a concrete, actionable problem specific to THIS car that could affect the buying decision.
      Valid examples: "Price is €3,000 above the Good bracket maximum", "High mileage of 120,000 km for a 2021 model (40,000 km/year)", "Missing adaptive cruise control which is standard on this trim level".

      NEVER include any of these as cons — they are NOT weaknesses:
      - Missing listing data ("no X specified/listed/provided", "battery capacity not mentioned", "no fuel type listed"). A field missing from the listing is a data gap, not a car problem.
      - Fields irrelevant to the vehicle type. Electric cars: no fuel type, no emissions, no fuel economy. Combustion cars: no battery, no range. This is obvious.
      - Number of owners. Single owner / few owners is ALWAYS positive. Never spin it negatively ("limited usage history").
      - The buyer's choices. They already chose this model, body style, fuel type, seat count, and color. "Only 4 seats" or "beige interior" are not cons.
      - Generic used car observations: depreciation, resale value, running costs, energy costs, dealer markup, consumption figures.
      - Speculation or hedging ("may have wear", "could indicate", "might suggest"). State facts or say nothing.

      If you cannot find enough real cons, return FEWER. An empty cons array is better than a padded one. Return 0-5 cons max.

      PROS: 5-10 specific strengths with numbers. Be generous — highlight everything genuinely good about this car.
      NEGOTIATION POINTS: Reference specific data from THIS listing (price vs market rating, mileage anomalies, cosmetic issues).

      Return ONLY valid JSON (no markdown):
      {
        "id": #{@car.id},
        "pros": ["specific strength with numbers"],
        "cons": ["specific real weakness — or empty array if none found"],
        "red_flags": ["deal-breakers if any, empty array if none"],
        "market_price_label": "mobile.de price rating as provided",
        "negotiation_points": ["specific leverage with € amounts based on THIS listing's data"],
        "test_drive_checklist": ["model-specific checks"],
        "summary": "2-3 sentence factual summary: price, mileage, key specs, condition, notable features or concerns"
      }
    PROMPT

    client = OpenAI::Client.new(access_token: AiModels.api_key, request_timeout: 120)
    response = ApiLog.log_call(
      service: "AiCarAnalysisService",
      model: AiModels.car_rating,
      user: @user,
      record: @car,
      request_payload: { car_id: @car.id, title: @car.title }
    ) do
      client.chat(parameters: {
        model: AiModels.car_rating,
        messages: [
          { role: "system", content: "You are a senior automotive analyst. #{date_instruction} Respond only with valid JSON. No markdown. #{language_instruction}" },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1500
      })
    end

    content = response.dig("choices", 0, "message", "content")
    content = content.gsub(/\A```json\s*/, "").gsub(/\s*```\z/, "").strip
    JSON.parse(content)
  rescue StandardError => e
    Rails.logger.error("AiCarAnalysisService failed for car #{@car.id}: #{e.message}")
    nil
  end

  def extract_car_data
    raw = @car.raw_data || {}
    attrs = raw.dig("attributes") || @car.attributes || {}
    props = raw.dig("properties") || {}
    price_rating = raw.dig("priceRating") || {}
    battery = raw.dig("batteryInformation") || {}
    description = raw.dig("description")&.slice(0, 500)

    reg_str = @car.first_registration.is_a?(Date) ? @car.first_registration.strftime("%m/%Y") : @car.first_registration.to_s
    reg_year = reg_str.match(/(\d{4})/)&.[](1)&.to_i
    km_per_year = if @car.mileage_km && reg_year && reg_year > 0
                    years = [ Date.current.year - reg_year, 1 ].max
                    (@car.mileage_km.to_f / years).round(0)
    end

    {
      id: @car.id,
      title: @car.title,
      price_eur: @car.price_cents ? (@car.price_cents / 100.0).round(0) : nil,
      mileage_km: @car.mileage_km,
      km_per_year: km_per_year,
      first_registration: reg_str.presence,
      power_kw: @car.power_kw,
      fuel_type: @car.fuel_type,
      transmission: @car.transmission,
      seller_type: @car.seller_type,
      seller_name: @car.seller_name,
      features_count: @car.features&.size || 0,
      features: (@car.features || []).first(30).join(", "),
      vehicle_condition: attrs["Vehicle condition"],
      num_owners: attrs["Number of Vehicle Owners"],
      category: attrs["Category"],
      colour: attrs["Colour"],
      interior: attrs["Interior Design"],
      climatisation: attrs["Climatisation"],
      parking_sensors: attrs["Parking sensors"],
      airbags: attrs["Airbags"],
      electric_range: attrs["Electric range"] || attrs["Range"],
      energy_consumption: attrs["Energy consumption (comb.)"],
      energy_cost_yearly: attrs["Energy costs for 15,000 km annual mileage"],
      vehicle_tax: attrs["Vehicle tax"],
      co2_class: attrs["CO₂ class"],
      emissions_sticker: attrs["Emissions Sticker"],
      battery_capacity: attrs["Battery capacity (in kWh)"],
      battery_warranty: battery["warrentyInfo"],
      seats: props["seats"],
      doors: props["doors"],
      mobile_de_price_rating: price_rating["rating"],
      mobile_de_price_ranges: price_rating["priceRanges"],
      description_excerpt: description
    }
  end

  def format_car_for_prompt(c)
    lines = []
    lines << "CAR ID:#{c[:id]} — #{c[:title]}"
    lines << "  Price: #{c[:price_eur]}€" if c[:price_eur]
    lines << "  mobile.de market rating: #{c[:mobile_de_price_rating]}" if c[:mobile_de_price_rating]
    if c[:mobile_de_price_ranges]
      ranges = c[:mobile_de_price_ranges].map { |r| "#{r["label"]}: #{r["min"]}–#{r["max"]}€" }.join(", ")
      lines << "  Price brackets: #{ranges}"
    end
    lines << "  Mileage: #{c[:mileage_km]} km (#{c[:km_per_year]} km/year)" if c[:mileage_km]
    lines << "  First registration: #{c[:first_registration]}" if c[:first_registration]
    lines << "  Power: #{c[:power_kw]} kW" if c[:power_kw]
    lines << "  Fuel: #{c[:fuel_type]}" if c[:fuel_type]
    lines << "  Transmission: #{c[:transmission]}" if c[:transmission]
    lines << "  Condition: #{c[:vehicle_condition]}" if c[:vehicle_condition]
    lines << "  Owners: #{c[:num_owners]}" if c[:num_owners]
    lines << "  Seller: #{c[:seller_type]} — #{c[:seller_name]}" if c[:seller_type]
    lines << "  Category: #{c[:category]}" if c[:category]
    lines << "  Colour: #{c[:colour]}, Interior: #{c[:interior]}" if c[:colour]
    lines << "  Seats: #{c[:seats]}, Doors: #{c[:doors]}" if c[:seats]
    lines << "  Climatisation: #{c[:climatisation]}" if c[:climatisation]
    lines << "  Parking: #{c[:parking_sensors]}" if c[:parking_sensors]
    lines << "  Electric range: #{c[:electric_range]}" if c[:electric_range]
    lines << "  Energy consumption: #{c[:energy_consumption]}" if c[:energy_consumption]
    lines << "  Energy cost/year: #{c[:energy_cost_yearly]}" if c[:energy_cost_yearly]
    lines << "  Vehicle tax: #{c[:vehicle_tax]}" if c[:vehicle_tax]
    lines << "  Battery: #{c[:battery_capacity]}, warranty: #{c[:battery_warranty]}" if c[:battery_capacity]
    lines << "  CO₂ class: #{c[:co2_class]}" if c[:co2_class]
    lines << "  #{c[:features_count]} features: #{c[:features]}" if c[:features].present?
    lines << "  Description excerpt: #{c[:description_excerpt]}" if c[:description_excerpt].present?
    lines.join("\n")
  end
end
