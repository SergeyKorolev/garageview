module PagesHelper
  SUPPORTED_LOCALES = [
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
    { code: "fr", label: "Français" },
    { code: "es", label: "Español" },
    { code: "it", label: "Italiano" },
    { code: "pl", label: "Polski" },
    { code: "uk", label: "Українська" }
  ].freeze

  LOCALE_CODES = SUPPORTED_LOCALES.map { |l| l[:code] }.freeze

  def t_page(key)
    keys = key.split(".")
    keys.reduce(@t) { |hash, k| hash&.[](k) } || key
  end

  def og_locale_for(code)
    code == "en" ? "en_US" : "#{code}_#{code.upcase}"
  end
end
