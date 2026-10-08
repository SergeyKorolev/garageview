module MobileDe
  class ListingFetcher
    class InvalidUrl < StandardError; end

    ALLOWED_HOSTS = %w[mobile.de www.mobile.de suchen.mobile.de].freeze
    USER_AGENTS = [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ].freeze

    def call(url)
      validate_url!(url)
      external_id = extract_id_from_url(url)
      existing = Car.find_by(source: "mobile_de", external_id: external_id) if external_id
      return existing if existing && existing.last_scraped_at && existing.last_scraped_at > 1.hour.ago

      data = scrape_listing(url)
      normalize_and_save(data, url, external_id)
    end

    # Save car data from an Apify ivanvs~mobile-de-scraper item onto an existing Car record
    def save_from_apify(apify_data, car)
      Normalizers::MobileDe.new.call(apify_data, car)
    end

    private

    def validate_url!(url)
      uri = URI.parse(url.to_s)
      unless uri.is_a?(URI::HTTPS) && ALLOWED_HOSTS.include?(uri.host&.downcase) && uri.port == 443 && uri.userinfo.nil?
        raise InvalidUrl, "Use an HTTPS mobile.de listing URL"
      end
    rescue URI::InvalidURIError
      raise InvalidUrl, "Use an HTTPS mobile.de listing URL"
    end

    def scrape_listing(url)
      response = HTTParty.get(url, headers: {
        "User-Agent" => USER_AGENTS.sample,
        "Accept" => "text/html,application/xhtml+xml",
        "Accept-Language" => "en-US,en;q=0.9,de;q=0.8"
      }, follow_redirects: false, timeout: 15)

      if response.code.between?(300, 399)
        raise InvalidUrl, "Use the final mobile.de listing URL; redirects are not supported"
      end

      raise "Failed to fetch listing: HTTP #{response.code}" unless response.success?

      doc = Nokogiri::HTML(response.body)
      parse_html(doc, response.body)
    end

    def parse_html(doc, raw_html)
      # Try JSON-LD first
      json_ld = extract_json_ld(doc)

      # Extract from HTML as fallback/supplement
      {
        "title" => json_ld&.dig("name") || doc.at_css("h1#ad-title, h1.h2, [data-testid='ad-title']")&.text&.strip,
        "price" => extract_price_from_doc(doc, json_ld),
        "mileage" => extract_text_value(doc, "Mileage", "Kilometerstand"),
        "firstRegistration" => extract_text_value(doc, "First Registration", "Erstzulassung"),
        "powerKw" => extract_power_from_doc(doc),
        "fuelType" => json_ld&.dig("fuelType") || extract_text_value(doc, "Fuel", "Kraftstoff"),
        "transmission" => json_ld&.dig("vehicleTransmission") || extract_text_value(doc, "Transmission", "Getriebe"),
        "seller" => extract_seller(doc, json_ld),
        "images" => extract_images(doc, json_ld),
        "features" => extract_features(doc),
        "json_ld" => json_ld
      }
    end

    def extract_json_ld(doc)
      doc.css('script[type="application/ld+json"]').each do |script|
        data = JSON.parse(script.text) rescue next
        # Could be array or single object
        items = data.is_a?(Array) ? data : [ data ]
        items.each do |item|
          return item if item["@type"]&.include?("Car") || item["@type"]&.include?("Vehicle") || item["@type"] == "Product"
        end
      end
      nil
    end

    def extract_price_from_doc(doc, json_ld)
      price_str = json_ld&.dig("offers", "price") || json_ld&.dig("offers", 0, "price")
      return price_str.to_f if price_str

      el = doc.at_css("[data-testid='prime-price'], .h3.rbt-prime-price, .seller-currency")
      return nil unless el
      el.text.gsub(/[^\d]/, "").to_f
    end

    def extract_power_from_doc(doc)
      text = extract_text_value(doc, "Power", "Leistung")
      return nil unless text
      match = text.match(/(\d+)\s*kW/)
      match ? match[1].to_i : nil
    end

    def extract_text_value(doc, *labels)
      labels.each do |label|
        doc.css("dt, .key, .label, th").each do |dt|
          if dt.text.strip.downcase.include?(label.downcase)
            dd = dt.next_element
            return dd&.text&.strip if dd
          end
        end
      end
      nil
    end

    def extract_seller(doc, json_ld)
      seller_el = doc.at_css("[data-testid='seller-info'], .seller-info, .rbt-seller-info")
      {
        "name" => json_ld&.dig("offers", "seller", "name") || seller_el&.at_css("h2, .seller-name, a")&.text&.strip,
        "type" => doc.at_css(".dealer-badge, .rbt-dealer-badge") ? "dealer" : "private",
        "address" => seller_el&.at_css("address, .seller-address, p")&.text&.strip
      }
    end

    def extract_images(doc, json_ld)
      images = json_ld&.dig("image")
      images = [ images ] if images.is_a?(String)
      return images if images&.any?

      doc.css("img[data-testid='gallery-image'], .gallery-img img, .image-gallery img").map do |img|
        img["src"] || img["data-src"]
      end.compact.uniq.first(20)
    end

    def extract_features(doc)
      features = []
      doc.css("[data-testid='feature'], .feature-item, .rbt-feature, .equipment-item, .checklist-icon + span").each do |el|
        text = el.text.strip
        features << text if text.present? && text.length < 100
      end
      features.uniq
    end

    def extract_id_from_url(url)
      url[/id=(\d+)/, 1] || url[/details\.html.*?(\d{6,})/, 1] || url[/\/(\d{6,})/, 1]
    end

    def normalize_and_save(data, original_url, external_id)
      external_id ||= extract_id_from_url(original_url) || SecureRandom.hex(8)

      Car.find_or_initialize_by(source: "mobile_de", external_id: external_id).tap do |car|
        mileage_str = data["mileage"]
        mileage_km = mileage_str.is_a?(String) ? mileage_str.gsub(/[^\d]/, "").to_i : mileage_str&.to_i

        reg_str = data["firstRegistration"]
        first_reg = parse_date(reg_str)

        seller = data["seller"] || {}

        car.assign_attributes(
          title: data["title"],
          listing_url: original_url,
          price_cents: data["price"] ? (data["price"].to_f * 100).round : nil,
          mileage_km: mileage_km,
          first_registration: first_reg,
          power_kw: data["powerKw"]&.to_i,
          fuel_type: (data["fuelType"] || "").downcase.strip,
          transmission: (data["transmission"] || "").downcase.strip,
          seller_name: seller["name"],
          seller_type: (seller["type"] || "").downcase,
          seller_address: seller["address"],
          photos: data["images"] || [],
          features: data["features"] || [],
          raw_data: data,
          last_scraped_at: Time.current
        )
        car.save!
      end
    end

    def parse_date(str)
      return nil unless str.is_a?(String) && str.present?
      Date.parse(str) rescue nil
    end
  end
end
