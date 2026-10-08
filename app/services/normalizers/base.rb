module Normalizers
  class Base
    # Canonical fuel/gearbox tokens across sources (en/de/pl synonyms).
    # Unknown raw values pass through downcased so no information is lost.
    FUEL_MAP = {
      "petrol" => "gasoline", "benzin" => "gasoline", "gasoline" => "gasoline", "benzyna" => "gasoline",
      "diesel" => "diesel",
      "electric" => "electric", "elektro" => "electric", "elektrisch" => "electric", "elektryczny" => "electric",
      "hybrid" => "hybrid", "hybrid (petrol/electric)" => "hybrid", "hybrid (diesel/electric)" => "hybrid", "hybryda" => "hybrid",
      "plug-in hybrid" => "plug-in hybrid", "plug-in-hybrid" => "plug-in hybrid", "hybryda plug-in" => "plug-in hybrid",
      "lpg" => "lpg", "autogas" => "lpg", "benzyna+lpg" => "lpg",
      "cng" => "cng", "erdgas" => "cng", "natural gas" => "cng", "benzyna+cng" => "cng",
      "hydrogen" => "hydrogen", "wasserstoff" => "hydrogen", "wodór" => "hydrogen"
    }.freeze

    GEARBOX_MAP = {
      "automatic" => "automatic", "automatik" => "automatic", "automatic transmission" => "automatic", "automatyczna" => "automatic",
      "manual" => "manual", "schaltgetriebe" => "manual", "manual gearbox" => "manual", "manualna" => "manual",
      "semi-automatic" => "semi-automatic", "halbautomatik" => "semi-automatic", "półautomatyczna" => "semi-automatic"
    }.freeze

    HP_TO_KW = 0.7355

    # Display-value dictionaries (en/de/pl synonyms → mobile.de vocabulary)
    CONDITION_MAP = {
      "used" => "Used vehicle", "gebraucht" => "Used vehicle", "używany" => "Used vehicle",
      "new" => "New vehicle", "neu" => "New vehicle", "nowy" => "New vehicle"
    }.freeze

    COLOR_MAP = {
      "white" => "White", "weiß" => "White", "biały" => "White",
      "black" => "Black", "schwarz" => "Black", "czarny" => "Black",
      "grey" => "Grey", "gray" => "Grey", "grau" => "Grey", "szary" => "Grey",
      "silver" => "Silver", "silber" => "Silver", "srebrny" => "Silver",
      "blue" => "Blue", "blau" => "Blue", "niebieski" => "Blue",
      "red" => "Red", "rot" => "Red", "czerwony" => "Red",
      "green" => "Green", "grün" => "Green", "zielony" => "Green",
      "brown" => "Brown", "braun" => "Brown", "brązowy" => "Brown",
      "beige" => "Beige", "beżowy" => "Beige",
      "gold" => "Gold", "złoty" => "Gold",
      "yellow" => "Yellow", "gelb" => "Yellow", "żółty" => "Yellow",
      "orange" => "Orange", "pomarańczowy" => "Orange",
      "violet" => "Violet", "purple" => "Violet", "violett" => "Violet", "fioletowy" => "Violet",
      "maroon" => "Maroon", "bordowy" => "Maroon",
      "navy blue" => "Navy blue", "granatowy" => "Navy blue",
      "other" => "Other", "andere" => "Other", "inny kolor" => "Other"
    }.freeze

    # Category targets use the exact strings the mobile.de actor emits, so
    # compare rows merge across sources
    BODY_MAP = {
      "suv" => "SUV/Off-road Vehicle/Pickup Truck", "geländewagen" => "SUV/Off-road Vehicle/Pickup Truck",
      "kombi" => "Estate car", "estate car" => "Estate car", "station wagon" => "Estate car",
      "sedan" => "Saloon", "saloon" => "Saloon", "limousine" => "Saloon",
      "kleinwagen" => "Small Car", "auta małe" => "Small Car", "auta miejskie" => "Small Car",
      "coupe" => "Sports Car/Coupe", "coupé" => "Sports Car/Coupe", "sportwagen" => "Sports Car/Coupe",
      "kabriolet" => "Convertible/Roadster", "cabrio" => "Convertible/Roadster", "convertible" => "Convertible/Roadster",
      "minivan" => "Van/Minibus", "van" => "Van/Minibus", "transporter" => "Van/Minibus"
    }.freeze

    # Canonical internal token → mobile.de display value
    FUEL_DISPLAY = {
      "gasoline" => "Petrol", "diesel" => "Diesel", "electric" => "Electric",
      "hybrid" => "Hybrid", "plug-in hybrid" => "Plug-in hybrid",
      "lpg" => "LPG", "cng" => "CNG", "hydrogen" => "Hydrogen"
    }.freeze

    GEARBOX_DISPLAY = {
      "automatic" => "Automatic", "manual" => "Manual gearbox", "semi-automatic" => "Semi-automatic"
    }.freeze

    private

    def canonical_fuel(raw)
      cleaned = clean_token(raw)
      return nil if cleaned.blank?

      FUEL_MAP.fetch(cleaned, cleaned)
    end

    def canonical_gearbox(raw)
      cleaned = clean_token(raw)
      return nil if cleaned.blank?

      GEARBOX_MAP.fetch(cleaned, cleaned)
    end

    def clean_token(raw)
      raw.to_s.downcase.gsub(/\u00a0/, " ").strip
    end

    def extract_number(val)
      return nil if val.nil?
      return val.to_i if val.is_a?(Numeric)

      digits = val.to_s.gsub(/[^\d]/, "")
      digits.present? ? digits.to_i : nil
    end

    def kw_from_hp(hp)
      (hp.to_f * HP_TO_KW).round
    end

    def parse_date(str)
      return nil unless str.is_a?(String) && str.present?
      Date.parse(str) rescue nil
    end

    # "160 492 km" → "160,492 km" (the format the mobile.de actor emits)
    def formatted_km(value)
      n = extract_number(value)
      n ? "#{ActiveSupport::NumberHelper.number_to_delimited(n, delimiter: ",")} km" : nil
    end

    def translate(map, raw)
      map.fetch(clean_token(raw), raw.to_s.strip.presence)
    end

    def fuel_display(canonical)
      return nil if canonical.blank?

      FUEL_DISPLAY.fetch(canonical, canonical.capitalize)
    end

    def gearbox_display(canonical)
      return nil if canonical.blank?

      GEARBOX_DISPLAY.fetch(canonical, canonical.capitalize)
    end

    # mobile.de names the propulsion kind "Drive type"
    def drive_type_display(canonical_fuel)
      case canonical_fuel
      when "electric" then "Electric motor"
      when "plug-in hybrid" then "Plug-in-hybrid"
      when nil then nil
      else "Internal combustion engine"
      end
    end

    # "2 997 cm3" / "1.397 cm³" → "2,997 ccm" (mobile.de format; strip the
    # unit before digit extraction — "cm3" contains a digit)
    def formatted_ccm(value)
      n = extract_number(value.to_s.gsub(/cm3|cm³|ccm/i, ""))
      n ? "#{ActiveSupport::NumberHelper.number_to_delimited(n, delimiter: ",")} ccm" : nil
    end

    def flatten_features(value)
      case value
      when Hash then value.values.flat_map { |v| flatten_features(v) }
      when Array then value.flat_map { |v| flatten_features(v) }
      when String then value.strip.presence ? [ value.strip ] : []
      else []
      end
    end
  end
end
