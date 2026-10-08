module ListingSource
  SOURCES = {
    "mobile_de" => {
      host: /(\A|\.)mobile\.de\z/,
      label: "mobile.de",
      default_actor: "ivanvs~mobile-de-scraper",
      actor_env: "MOBILE_DE_SCRAPER_ACTOR",
      id_from_url: ->(url) { url[/id=(\d+)/, 1] || url[/(\d{6,})/, 1] },
      search_url: ->(url) { url.include?("suchen.mobile.de") || url.match?(/mobile\.de.*fahrzeuge\/search/) }
    },
    "otomoto" => {
      host: /(\A|\.)otomoto\.pl\z/,
      label: "otomoto.pl",
      default_actor: "ivanvs~otomoto-scraper",
      actor_env: "OTOMOTO_SCRAPER_ACTOR",
      id_from_url: ->(url) { url[/-ID(\w+)\.html/, 1] },
      # Listing URLs end in "-ID<token>.html"; everything else is a search/category page
      search_url: ->(url) { !url.match?(/-ID\w+\.html/) }
    },
    "autoscout24" => {
      host: /(\A|\.)autoscout24\.(de|com|at|it|fr|es|nl|be)\z/,
      label: "autoscout24",
      default_actor: "ivanvs~autoscout-scraper",
      actor_env: "AUTOSCOUT_SCRAPER_ACTOR",
      # Listing URLs end with a UUID slug
      id_from_url: ->(url) { url[/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i, 1] },
      search_url: ->(url) { url.include?("/lst") || url.include?("/search") }
    }
  }.freeze

  KEYS = SOURCES.keys.freeze

  def self.detect(url)
    host = URI.parse(url.to_s).host&.downcase
    return nil unless host

    KEYS.find { |key| host.match?(SOURCES[key][:host]) }
  rescue URI::InvalidURIError
    nil
  end

  def self.extract_external_id(url)
    source = detect(url)
    return nil unless source

    SOURCES[source][:id_from_url].call(url.to_s)
  end

  def self.label(source)
    SOURCES.dig(source, :label) || source
  end

  def self.actor_id(source)
    config = SOURCES.fetch(source)
    ENV.fetch(config[:actor_env], config[:default_actor])
  end

  def self.search_url?(url)
    source = detect(url)
    return false unless source

    SOURCES[source][:search_url].call(url.to_s)
  end

  def self.normalizer(source)
    case source
    when "mobile_de" then Normalizers::MobileDe.new
    when "otomoto" then Normalizers::Otomoto.new
    when "autoscout24" then Normalizers::Autoscout24.new
    else raise ArgumentError, "Unknown listing source: #{source.inspect}"
    end
  end
end
