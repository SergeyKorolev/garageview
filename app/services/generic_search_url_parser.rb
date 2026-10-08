# Names search filters for sources without a dedicated parser, from
# recognizable URL path segments (e.g. otomoto.pl/osobowe/bmw/seria-1 or
# autoscout24.de/lst/bmw/118) plus price bounds when present.
class GenericSearchUrlParser
  SKIP_SEGMENTS = %w[osobowe lst search].freeze

  def call(url, source)
    uri = URI.parse(url)
    params = Rack::Utils.parse_query(uri.query)

    parts = uri.path.to_s.split("/")
      .reject(&:blank?)
      .reject { |segment| SKIP_SEGMENTS.include?(segment) }
      .first(2)
      .map { |segment| segment.tr("-", " ").split.map(&:capitalize).join(" ") }

    min = params["pricefrom"] || params["search[filter_float_price:from]"]
    max = params["priceto"] || params["search[filter_float_price:to]"]
    parts << "#{min}-#{max}" if min || max

    name = parts.join(" | ").presence || "#{ListingSource.label(source)} search"
    { name: name, params: params }
  rescue URI::InvalidURIError
    { name: "#{ListingSource.label(source)} search", params: {} }
  end
end
