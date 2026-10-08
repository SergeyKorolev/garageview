module MobileDe
  class UrlParser
    def call(url)
      uri = URI.parse(url)
      params = Rack::Utils.parse_query(uri.query)

      {
        name: generate_name(params),
        params: params
      }
    rescue URI::InvalidURIError
      { name: "Search Filter", params: {} }
    end

    private

    def generate_name(params)
      parts = []
      parts << params["ms"]&.split(";")&.first if params["ms"]
      parts << "#{params['minPrice']}-#{params['maxPrice']}EUR" if params["minPrice"] || params["maxPrice"]
      parts << "max #{params['maxMileage']}km" if params["maxMileage"]
      parts.empty? ? "Search Filter" : parts.join(" | ")
    end
  end
end
