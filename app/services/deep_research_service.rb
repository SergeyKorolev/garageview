class DeepResearchService
  include LanguageAware
  include ParallelMap

  def self.run(deep_research)
    new(deep_research).execute
  end

  def initialize(deep_research)
    @research = deep_research
    @collection = deep_research.collection
  end

  def execute
    return unless AiModels.api_key?

    @research.update!(status: "processing")

    cars = @research.cars.where(status: "ready")
    return @research.update!(status: "failed", result: "Cars not found") if cars.size < 2

    cars_data = cars.each_with_index.map { |car, i| build_car_profile(car, i + 1) }

    # Build car label mapping: Car #1 = "VW ID.3 GTX ...", Car #2 = ...
    @car_labels = cars_data.map { |c| { number: c[:car_number], id: c[:id], title: c[:title] } }

    # Phase 1: Parallel per-car analysis (description audit + individual assessment)
    car_analyses = parallel_map(cars_data) { |c| analyze_single_car(c) }.compact

    return @research.update!(status: "failed", result: "Car analysis failed") if car_analyses.size < 2

    # Update car_labels to only include cars that succeeded analysis
    successful_ids = car_analyses.map { |a| a["car_id"] }.to_set
    @car_labels = @car_labels.select { |l| successful_ids.include?(l[:id]) }

    # Phase 2: Parallel comparison sections using car summaries
    sections = %w[value_for_money mechanical_specs equipment_comparison condition_history seller_assessment]
    section_titles = {
      "value_for_money" => "Value for Money",
      "mechanical_specs" => "Mechanical Specs",
      "equipment_comparison" => "Equipment Comparison",
      "condition_history" => "Condition & History",
      "seller_assessment" => "Seller Assessment"
    }

    summaries_text = car_analyses.map { |a| "Car ##{a["car_number"]} — #{a["title"]}\n#{a["summary"]}" }.join("\n\n---\n\n")

    # Phase 2 + 3: Run section analyses AND merge/rank in parallel (both only need Phase 1)
    phase2_results = parallel_map(sections + [ :merge_and_rank ]) do |task|
      if task == :merge_and_rank
        merge_and_rank(car_analyses, summaries_text)
      else
        analyze_section(task, section_titles[task], summaries_text, car_analyses)
      end
    end
    merge_result = phase2_results.pop
    section_results = phase2_results.compact

    # Build ranking-based renumbering map: old_car_number → new_car_number (ranking place)
    ranking = merge_result&.dig("ranking") || []
    renumber = {}
    ranking.each { |r| renumber[r["car_number"]] = r["place"] if r["car_number"] && r["place"] }

    # Helper to renumber a car_number (falls back to original if not in ranking)
    remap = ->(n) { renumber[n] || n }

    # Renumber ranking entries
    renumbered_ranking = ranking.map do |r|
      r.merge("car_number" => remap.call(r["car_number"]))
    end

    # Renumber comparison sections
    renumbered_sections = section_results.map do |section|
      next section unless section["per_car"]
      section.merge("per_car" => section["per_car"].map { |c| c.merge("car_number" => remap.call(c["car_number"])) })
    end

    # Renumber car_labels, per_car_analysis, description_audit
    renumbered_labels = @car_labels.map { |l| { "car_number" => remap.call(l[:number]), "car_id" => l[:id], "car_title" => l[:title] } }

    # Assemble final result
    result = {
      "car_labels" => renumbered_labels,
      "per_car_analysis" => car_analyses.map { |a|
        { "car_id" => a["car_id"], "car_number" => remap.call(a["car_number"]), "car_title" => a["title"],
          "strengths" => a["strengths"] || [], "weaknesses" => a["weaknesses"] || [],
          "red_flags" => a["red_flags"] || [] }
      },
      "description_audit" => car_analyses.map { |a|
        { "car_id" => a["car_id"], "car_number" => remap.call(a["car_number"]), "car_title" => a["title"], "findings" => a["description_findings"] || [] }
      },
      "comparison_sections" => renumbered_sections,
      "hidden_concerns" => merge_result&.dig("hidden_concerns") || [],
      "ranking" => renumbered_ranking,
      "bottom_line" => merge_result&.dig("bottom_line") || ""
    }.to_json

    @research.update!(
      status: "completed",
      title: generate_title(cars),
      result: result
    )
  rescue StandardError => e
    Rails.logger.error("Deep Research error: #{e.message}")
    @research.update!(status: "failed", result: "Error: #{e.message}")
  end

  private

  def build_car_profile(car, number)
    bc = @collection.collection_cars.find_by(car: car)
    raw = car.raw_data || {}
    attrs = raw["attributes"] || {}
    features = car.features || []
    description = raw["description"] || ""

    {
      id: car.id,
      car_number: number,
      title: car.title,
      price: car.price_cents ? car.price_cents / 100 : nil,
      mileage: car.mileage_km,
      first_registration: car.first_registration,
      power_kw: car.power_kw,
      fuel_type: car.fuel_type,
      transmission: car.transmission,
      seller_name: car.seller_name,
      seller_type: car.seller_type,
      seller_address: car.seller_address,
      condition: attrs["Vehicle condition"],
      category: attrs["Category"],
      color: attrs["Colour"],
      interior: attrs["Interior Design"],
      drive_type: attrs["Drive type"],
      electric_range: attrs["Electric range"],
      range: attrs["Range"],
      battery_capacity: attrs["Battery capacity (in kWh)"],
      seats: attrs["Number of Seats"],
      doors: attrs["Door Count"],
      owners: attrs["Number of Vehicle Owners"],
      co2_emissions: attrs["CO₂ emissions (comb.)"],
      energy_consumption: attrs["Energy consumption (comb.)"],
      climatisation: attrs["Climatisation"],
      parking_sensors: attrs["Parking sensors"],
      airbags: attrs["Airbags"],
      emissions_sticker: attrs["Emissions Sticker"],
      price_rating: raw["priceRating"],
      features: features,
      feature_count: features.size,
      description: description.slice(0, 2000),
      all_attributes: attrs,
      user_rating: bc&.rating,
      ai_rating: bc&.ai_rating
    }
  end

  def analyze_single_car(car_data)
    prompt = <<~PROMPT
      Analyze this used car listing for a private buyer. Be thorough and specific.
      This car is labeled "Car ##{car_data[:car_number]}". Always refer to it as "Car ##{car_data[:car_number]}" (never use CAR ID or database IDs).

      CAR DATA:
      #{car_data.to_json}

      TASKS:
      1. DESCRIPTION AUDIT: Compare the dealer description text against the specs and feature list. Flag discrepancies — features mentioned in description but missing from features list, or specs that contradict the description.
      2. INDIVIDUAL ASSESSMENT: Summarize this car's strengths, weaknesses, and notable characteristics with specific numbers.

      WHAT MAKES A VALID WEAKNESS:
      A weakness must be a concrete, factual problem specific to THIS car. Valid examples: "Price is above the Good bracket", "High mileage for a 2023 model", "Missing adaptive cruise which is standard on this trim".

      NEVER include any of these as weaknesses:
      - Missing listing data ("no X specified/listed/provided", "battery capacity not mentioned"). A missing field is a data gap, not a car problem.
      - Fields irrelevant to the vehicle type. Electric cars have no fuel type/emissions. Combustion cars have no battery/range.
      - Number of owners as negative. Single/few owners is ALWAYS positive. Never spin it as "limited usage history".
      - The buyer's choices. They chose this model, fuel type, body style, seat count, color. "Only 4 seats" is not a weakness.
      - Generic observations: depreciation, resale value, running costs, energy costs, dealer markup, consumption.
      - Speculation ("may have wear", "could indicate"). State facts or say nothing.

      If you cannot find enough real weaknesses, return FEWER. An empty array is fine.

      Return ONLY valid JSON (no markdown):
      {
        "car_id": #{car_data[:id]},
        "car_number": #{car_data[:car_number]},
        "title": "#{car_data[:title]}",
        "description_findings": ["finding1", "finding2"],
        "summary": "4-5 sentence factual summary. Refer to this car as Car ##{car_data[:car_number]}. Cover: price positioning, mileage/age ratio, key specs, condition, seller type, notable features or missing features, any concerns. Include specific numbers.",
        "strengths": ["strength1 with numbers", "strength2"],
        "weaknesses": ["real weakness with numbers — or empty array"],
        "red_flags": ["deal-breaker if any — or empty array"]
      }
    PROMPT

    client = OpenAI::Client.new(access_token: AiModels.api_key, request_timeout: 120)
    response = ApiLog.log_call(
      service: "DeepResearch:analyze_car",
      model: AiModels.deep_research,
      user: @collection.user,
      record: @research,
      request_payload: { car_id: car_data[:id], title: car_data[:title] }
    ) do
      client.chat(parameters: {
        model: AiModels.deep_research,
        messages: [
          { role: "system", content: "You are a senior automotive analyst. #{date_instruction} Respond only with valid JSON. No markdown. #{language_instruction}" },
          { role: "user", content: prompt }
        ],
        temperature: 0.15,
        max_tokens: 1500
      })
    end

    parse_llm_json(response)
  rescue StandardError => e
    Rails.logger.error("Deep Research single car analysis failed for #{car_data[:id]}: #{e.message}")
    nil
  end

  def analyze_section(section_key, section_title, summaries_text, car_analyses)
    # Use actual car numbers from analyses (in case some failed and numbers are non-contiguous)
    car_labels = car_analyses.map { |a| "Car ##{a["car_number"]}" }.join(", ")
    prompt = <<~PROMPT
      You are comparing #{car_analyses.size} cars (#{car_labels}) for a private buyer. Focus ONLY on: #{section_title}.
      Always refer to cars as "Car #1", "Car #2", etc. Never use database IDs.

      CAR SUMMARIES:
      #{summaries_text}

      Provide a structured comparison for "#{section_title}".
      - Start with a 1-2 sentence overview.
      - Then list one bullet per car with key facts and numbers.
      - End with a 1-sentence verdict naming the winner for this category.

      Return ONLY valid JSON (no markdown):
      {
        "title": "#{section_title}",
        "overview": "1-2 sentence overview of this comparison dimension",
        "per_car": [
          {"car_number": 1, "points": ["key fact with number", "another fact"]},
          {"car_number": 2, "points": ["key fact with number", "another fact"]}
        ],
        "verdict": "1 sentence naming the winner with reason"
      }
    PROMPT

    client = OpenAI::Client.new(access_token: AiModels.api_key, request_timeout: 120)
    response = ApiLog.log_call(
      service: "DeepResearch:section",
      model: AiModels.deep_research,
      user: @collection.user,
      record: @research,
      request_payload: { section: section_key }
    ) do
      client.chat(parameters: {
        model: AiModels.deep_research,
        messages: [
          { role: "system", content: "You are a senior automotive analyst. #{date_instruction} Respond only with valid JSON. No markdown. #{language_instruction}" },
          { role: "user", content: prompt }
        ],
        temperature: 0.15,
        max_tokens: 1200
      })
    end

    parse_llm_json(response)
  rescue StandardError => e
    Rails.logger.error("Deep Research section #{section_key} failed: #{e.message}")
    { "title" => section_title, "overview" => "Analysis unavailable." }
  end

  def merge_and_rank(car_analyses, summaries_text)
    n = car_analyses.size
    prompt = <<~PROMPT
      You are ranking #{n} cars for a private buyer. Here are expert summaries:
      Always refer to cars as "Car #1", "Car #2", etc. Never use database IDs.

      #{summaries_text}

      TASKS:
      1. List HIDDEN CONCERNS — anything suspicious across all cars (unusually low price, high mileage for age, missing standard features, etc.). Use Car #N labels.
      2. RANK all #{n} cars from BEST BUY (place 1) to WORST (place #{n}) with clear reasoning.
      3. Give a 1-2 sentence BOTTOM LINE recommendation using Car #N labels.

      Return ONLY valid JSON (no markdown):
      {
        "hidden_concerns": ["concern1", "concern2"],
        "ranking": [
          {"place": 1, "car_id": 123, "car_number": 1, "car_title": "...", "reason": "2-3 sentence explanation using Car #N labels"},
          {"place": 2, "car_id": 456, "car_number": 2, "car_title": "...", "reason": "..."}
        ],
        "bottom_line": "1-2 sentence final advice using Car #N labels"
      }
    PROMPT

    client = OpenAI::Client.new(access_token: AiModels.api_key, request_timeout: 120)
    response = ApiLog.log_call(
      service: "DeepResearch:verdict",
      model: AiModels.deep_research_verdict,
      user: @collection.user,
      record: @research,
      request_payload: { car_count: n }
    ) do
      client.chat(parameters: {
        model: AiModels.deep_research_verdict,
        messages: [
          { role: "system", content: "You are a senior automotive analyst. #{date_instruction} Respond only with valid JSON. No markdown. #{language_instruction}" },
          { role: "user", content: prompt }
        ],
        temperature: 0.15,
        max_tokens: 2000
      })
    end

    parse_llm_json(response)
  rescue StandardError => e
    Rails.logger.error("Deep Research merge/rank failed: #{e.message}")
    nil
  end

  # Robust JSON extraction — handles markdown fences, leading text, and nested fences
  def parse_llm_json(response)
    content = response.dig("choices", 0, "message", "content").to_s.strip
    # Try direct parse first
    JSON.parse(content)
  rescue JSON::ParserError
    # Extract JSON from markdown code fences (handles ```json ... ``` and ``` ... ```)
    if content =~ /```(?:json)?\s*(\{.*?\})\s*```/m
      return JSON.parse($1)
    end
    # Last resort: find first { to last }
    start_idx = content.index("{")
    end_idx = content.rindex("}")
    if start_idx && end_idx && end_idx > start_idx
      return JSON.parse(content[start_idx..end_idx])
    end
    raise JSON::ParserError, "Could not extract JSON from LLM response"
  end

  def generate_title(cars)
    names = cars.map { |c| c.title&.split(" ")&.first(3)&.join(" ") }.compact
    "#{names.join(" vs ")} — #{Time.current.strftime('%d.%m.%Y %H:%M')}"
  end
end
