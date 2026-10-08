class ExchangeRate
  # Approximate fallbacks if frankfurter.dev is unreachable (EUR per 1 unit)
  FALLBACK_EUR_RATES = {
    "PLN" => 0.23,
    "CHF" => 1.05,
    "GBP" => 1.17
  }.freeze

  # Converts an amount in the given currency to EUR cents.
  def self.eur_cents(amount, currency)
    return nil unless amount

    currency = currency.to_s.upcase
    return (amount.to_f * 100).round if currency == "EUR" || currency.blank?

    (amount.to_f * rate_to_eur(currency) * 100).round
  end

  def self.rate_to_eur(currency)
    Rails.cache.fetch("exchange_rate/#{currency}/EUR", expires_in: 24.hours) do
      response = HTTParty.get("https://api.frankfurter.dev/v1/latest?base=#{currency}&symbols=EUR", timeout: 10)
      response.success? ? JSON.parse(response.body).dig("rates", "EUR") : nil
    rescue StandardError => e
      Rails.logger.warn("ExchangeRate fetch failed for #{currency}: #{e.message}")
      nil
    end || FALLBACK_EUR_RATES.fetch(currency, 1.0)
  end
end
