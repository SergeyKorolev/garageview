class TravelTimeCalculator
  EARTH_RADIUS_KM = 6371.0
  FLIGHT_SPEED_KMH = 800.0
  FLIGHT_OVERHEAD_SECONDS = 7200
  FLIGHT_MIN_DISTANCE_KM = 300

  def call(origin_lat:, origin_lng:, dest_lat:, dest_lng:)
    cached = TravelTimeCache.lookup(
      origin_lat: origin_lat, origin_lng: origin_lng,
      dest_lat: dest_lat, dest_lng: dest_lng
    )
    return format_result(cached) if cached

    distance_km = haversine_distance(origin_lat, origin_lng, dest_lat, dest_lng)
    driving_result = fetch_driving_route(origin_lat, origin_lng, dest_lat, dest_lng)
    driving_seconds = driving_result[:duration]
    route_cities = driving_result[:route_cities]
    flying_seconds = estimate_flying_time(distance_km)

    # Get AI-generated travel description
    travel_desc = generate_travel_description(
      origin_lat, origin_lng, dest_lat, dest_lng,
      distance_km, driving_seconds, flying_seconds, route_cities
    )

    cache = TravelTimeCache.create!(
      origin_lat: origin_lat.round(2),
      origin_lng: origin_lng.round(2),
      dest_lat: dest_lat.round(2),
      dest_lng: dest_lng.round(2),
      driving_seconds: driving_seconds,
      flying_seconds: flying_seconds,
      distance_km: distance_km.round,
      route_cities: route_cities,
      origin_airport: travel_desc[:origin_airport],
      dest_airport: travel_desc[:dest_airport],
      last_mile_info: travel_desc[:last_mile_info],
      travel_description: travel_desc[:description],
      computed_at: Time.current
    )

    format_result(cache)
  rescue ActiveRecord::RecordNotUnique
    cached = TravelTimeCache.lookup(
      origin_lat: origin_lat, origin_lng: origin_lng,
      dest_lat: dest_lat, dest_lng: dest_lng
    )
    format_result(cached)
  end

  def format_result(cache)
    {
      driving_seconds: cache.driving_seconds,
      flying_seconds: cache.flying_seconds,
      distance_km: cache.distance_km,
      route_cities: cache.route_cities || [],
      origin_airport: cache.origin_airport,
      dest_airport: cache.dest_airport,
      last_mile_info: cache.last_mile_info,
      travel_description: cache.travel_description
    }
  end

  private

  def haversine_distance(lat1, lng1, lat2, lng2)
    dlat = to_rad(lat2 - lat1)
    dlng = to_rad(lng2 - lng1)
    a = Math.sin(dlat / 2)**2 +
        Math.cos(to_rad(lat1)) * Math.cos(to_rad(lat2)) * Math.sin(dlng / 2)**2
    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    EARTH_RADIUS_KM * c
  end

  def to_rad(deg)
    deg * Math::PI / 180.0
  end

  def fetch_driving_route(lat1, lng1, lat2, lng2)
    url = "https://router.project-osrm.org/route/v1/driving/#{lng1},#{lat1};#{lng2},#{lat2}?overview=full&steps=true&geometries=geojson"
    response = HTTParty.get(url, timeout: 15)
    data = JSON.parse(response.body)

    route = data.dig("routes", 0)
    duration = route&.dig("duration")&.to_i
    cities = extract_route_cities(route)

    { duration: duration, route_cities: cities }
  rescue StandardError => e
    Rails.logger.warn("OSRM API error: #{e.message}")
    { duration: nil, route_cities: [] }
  end

  def extract_route_cities(route)
    return [] unless route

    coords = route.dig("geometry", "coordinates") || []
    return [] if coords.size < 3

    num_points = [ coords.size, 3 ].min
    indices = (1..num_points).map { |i| (coords.size * i / (num_points + 1)).clamp(1, coords.size - 2) }
    indices.uniq!

    cities = []
    indices.each do |idx|
      lng, lat = coords[idx]
      city = reverse_geocode_city(lat, lng)
      cities << city if city.present? && !cities.include?(city)
      break if cities.size >= 3
    end

    cities
  rescue StandardError => e
    Rails.logger.warn("Route city extraction error: #{e.message}")
    []
  end

  def reverse_geocode_city(lat, lng)
    response = HTTParty.get(
      "https://nominatim.openstreetmap.org/reverse",
      query: { lat: lat, lon: lng, format: "json", zoom: 10 },
      headers: { "Accept-Language" => "en", "User-Agent" => "MobileDeExplorer/1.0" },
      timeout: 5
    )
    data = JSON.parse(response.body)
    addr = data["address"]
    addr&.dig("city") || addr&.dig("town") || addr&.dig("village")
  rescue StandardError
    nil
  end

  def estimate_flying_time(distance_km)
    return nil if distance_km < FLIGHT_MIN_DISTANCE_KM

    flight_time = (distance_km / FLIGHT_SPEED_KMH * 3600).round
    flight_time + FLIGHT_OVERHEAD_SECONDS
  end

  def generate_travel_description(origin_lat, origin_lng, dest_lat, dest_lng, distance_km, driving_seconds, flying_seconds, route_cities)
    return { origin_airport: nil, dest_airport: nil, last_mile_info: nil, description: nil } unless AiModels.api_key?

    origin_city = reverse_geocode_city(origin_lat, origin_lng) || "#{origin_lat.round(2)}, #{origin_lng.round(2)}"
    dest_city = reverse_geocode_city(dest_lat, dest_lng) || "#{dest_lat.round(2)}, #{dest_lng.round(2)}"

    prompt = <<~PROMPT
      I'm traveling from #{origin_city} to #{dest_city} (#{distance_km.round}km).
      Driving time: #{driving_seconds ? "#{(driving_seconds / 3600.0).round(1)}h" : "unknown"}.
      Route passes through: #{route_cities.any? ? route_cities.join(", ") : "unknown"}.

      Give me a JSON response with exactly these fields:
      - "drive_via": array of 2-3 major cities on the driving route (not start/end)
      - "origin_airport": nearest major airport to origin, format "City (IATA)"
      - "dest_airport": nearest major airport to destination, format "City (IATA)"
      - "last_mile": how to get from dest airport to final destination (e.g. "1h by train" or "30min by regional bus")
      - "fly_tip": one short sentence about the best flight connection

      Respond with ONLY valid JSON, no markdown, no explanation.
    PROMPT

    client = OpenAI::Client.new(access_token: AiModels.api_key)
    params = {
      model: AiModels.travel_time,
      messages: [ { role: "user", content: prompt } ],
      temperature: 0.3,
      max_tokens: 200
    }

    response = ApiLog.log_call(
      service: "TravelTimeCalculator",
      model: AiModels.travel_time,
      request_payload: { origin: "#{origin_lat},#{origin_lng}", dest: "#{dest_lat},#{dest_lng}" }
    ) do
      client.chat(parameters: params)
    end

    content = response.dig("choices", 0, "message", "content")
    data = JSON.parse(content)

    # Update route_cities with AI suggestions if our geocoded ones are poor
    if data["drive_via"].is_a?(Array) && data["drive_via"].size >= 2
      route_cities.replace(data["drive_via"])
    end

    {
      origin_airport: data["origin_airport"],
      dest_airport: data["dest_airport"],
      last_mile_info: data["last_mile"],
      description: data["fly_tip"]
    }
  rescue StandardError => e
    Rails.logger.warn("OpenAI travel description error: #{e.message}")
    { origin_airport: nil, dest_airport: nil, last_mile_info: nil, description: nil }
  end
end
