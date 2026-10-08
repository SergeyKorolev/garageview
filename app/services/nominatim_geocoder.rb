# Forward geocoding via OpenStreetMap Nominatim (the app already uses it for
# reverse geocoding in TravelTimeCalculator). Cached per address; throttled to
# respect Nominatim's 1 req/s usage policy during bulk imports.
class NominatimGeocoder
  def self.coordinates(address)
    return nil if address.blank?

    Rails.cache.fetch("geocode/#{Digest::MD5.hexdigest(address)}", expires_in: 30.days) do
      sleep(1) unless Rails.env.test?
      response = HTTParty.get(
        "https://nominatim.openstreetmap.org/search",
        query: { q: address, format: "json", limit: 1 },
        headers: { "User-Agent" => "garageview.ai" },
        timeout: 10
      )
      result = response.success? ? JSON.parse(response.body).first : nil
      result ? { latitude: result["lat"].to_f, longitude: result["lon"].to_f } : nil
    rescue StandardError => e
      Rails.logger.warn("Geocoding failed for #{address.inspect}: #{e.message}")
      nil
    end
  end
end
