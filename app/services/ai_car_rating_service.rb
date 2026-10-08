class AiCarRatingService
  include LanguageAware
  include ParallelMap

  def self.rate_collection(collection, force: false)
    new(collection, force: force).rate_all
  end

  def initialize(collection, force: false)
    @collection = collection
    @force = force
  end

  def rate_all
    return unless AiModels.api_key?

    collection_cars = @collection.collection_cars.includes(:car).where(cars: { status: "ready" })
    return if collection_cars.empty?

    if @force
      collection_cars.update_all(ai_rating: nil, ai_explanation: nil)
    end

    n = collection_cars.size

    # Phase 1: Ensure all cars have per-car AI analysis (stored on Car record)
    cars_needing_analysis = collection_cars.select { |bc| bc.car.ai_analysis.blank? }
    if cars_needing_analysis.any?
      parallel_map(cars_needing_analysis.map(&:car)) do |car|
        AiCarAnalysisService.analyze(car, user: @collection.user, force: @force)
      end
    end

    # Reload cars analyzed above to pick up newly stored ai_analysis
    cars_needing_analysis.each { |bc| bc.car.reload }

    # Build summaries from cached car.ai_analysis
    analyses = collection_cars.filter_map do |bc|
      analysis = bc.car.ai_analysis
      next unless analysis

      analysis.merge("id" => bc.id, "car_id" => bc.car.id)
    end

    return if analyses.empty?

    if n == 1
      # Single car: assign rank 1, use its own summary as verdict
      bc = collection_cars.first
      analysis = analyses.first
      structured = {
        verdict: analysis&.dig("summary") || "Only car in collection",
        pros: analysis&.dig("pros") || [],
        cons: analysis&.dig("cons") || [],
        red_flags: analysis&.dig("red_flags") || [],
        market_price_label: analysis&.dig("market_price_label"),
        negotiation_points: analysis&.dig("negotiation_points") || [],
        test_drive_checklist: analysis&.dig("test_drive_checklist") || []
      }.to_json
      bc.update(ai_rating: 1, ai_explanation: structured)
      return
    end

    # Phase 2: Rank all cars (cheap single call using cached summaries)
    rankings = merge_and_rank(analyses, n)
    return unless rankings

    # Apply rankings to collection_cars
    apply_ratings(collection_cars, analyses, rankings, n)
  end

  private

  def merge_and_rank(analyses, total_count)
    summaries = analyses.map { |a| "CAR ID:#{a["id"]} — #{a["summary"]}" }.join("\n\n")

    prompt = <<~PROMPT
      You are ranking #{total_count} cars for a private buyer. Here are expert summaries of each:

      #{summaries}

      TASK: Rank from BEST BUY (place 1) to WORST (place #{total_count}). Consider value for money, condition, mileage, features, and seller reliability.

      Return ONLY a valid JSON array (no markdown):
      [
        {"id": <car_id>, "place": <1 to #{total_count}>, "verdict": "<2-3 sentences explaining ranking vs others>"}
      ]
      Sort from best to worst. No ties.
    PROMPT

    client = OpenAI::Client.new(access_token: AiModels.api_key, request_timeout: 120)
    response = ApiLog.log_call(
      service: "AiCarRatingService:rank",
      model: AiModels.car_rating,
      user: @collection.user,
      record: @collection,
      request_payload: { car_count: total_count, summaries_length: summaries.length }
    ) do
      client.chat(parameters: {
        model: AiModels.car_rating,
        messages: [
          { role: "system", content: "You are a senior automotive analyst. #{date_instruction} Respond only with valid JSON arrays. No markdown. #{language_instruction}" },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 3000
      })
    end

    content = response.dig("choices", 0, "message", "content")
    content = content.gsub(/\A```json\s*/, "").gsub(/\s*```\z/, "").strip
    JSON.parse(content)
  rescue StandardError => e
    Rails.logger.error("Merge ranking failed: #{e.message}")
    nil
  end

  def apply_ratings(collection_cars, analyses, rankings, total_count)
    rankings.each do |ranking|
      bc = collection_cars.find { |b| b.id == ranking["id"] }
      next unless bc

      # Find the per-car analysis to merge with ranking verdict
      car_analysis = analyses.find { |a| a["id"] == ranking["id"] }

      place = ranking["place"]&.to_i&.clamp(1, total_count)

      structured = {
        verdict: ranking["verdict"],
        pros: car_analysis&.dig("pros") || [],
        cons: car_analysis&.dig("cons") || [],
        red_flags: car_analysis&.dig("red_flags") || [],
        market_price_label: car_analysis&.dig("market_price_label"),
        negotiation_points: car_analysis&.dig("negotiation_points") || [],
        test_drive_checklist: car_analysis&.dig("test_drive_checklist") || []
      }.to_json

      bc.update(
        ai_rating: place,
        ai_explanation: structured
      )
    end
  end
end
