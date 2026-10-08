class SharedCarsController < ApplicationController
  include PagesHelper
  include PublicPageTranslations

  layout "public"

  def show
    @server_only = true
    @car = Car.find_by!(share_token: params[:token], status: "ready")
    @ai_analysis = @car.ai_analysis || {}
    @attributes = @car.raw_data&.dig("attributes") || {}
    @features = @car.features || []

    @locale = detect_locale
    load_translations

    # UI labels in the car owner's language
    owner = @car.collection_cars.first&.collection&.user
    owner_lang = owner&.language || "en"
    @ui = ui_for_language(owner_lang)

    @meta = {
      title: "#{@car.title || 'Car'} — Garageview.ai",
      description: (@ai_analysis["summary"] || "AI-analyzed car on Garageview.ai").truncate(200),
      canonical: "https://garageview.ai/s/v/#{@car.share_token}",
      hreflang_suffix: "",
      noindex: true
    }
  rescue ActiveRecord::RecordNotFound
    render plain: "Car not found or no longer shared", status: :not_found
  end

  private

  LOCALE_TRANSLATIONS = PagesHelper::LOCALE_CODES.each_with_object({}) { |code, h|
    path = Rails.root.join("app/javascript/i18n/locales/#{code}.json")
    h[code] = JSON.parse(File.read(path)).freeze
  }.freeze

  def detect_locale
    preferred = request.headers["Accept-Language"]&.scan(/[a-z]{2}/)&.first
    PagesHelper::LOCALE_CODES.include?(preferred) ? preferred : "en"
  end

  def load_translations
    @t = LOCALE_TRANSLATIONS.fetch(@locale, LOCALE_TRANSLATIONS["en"])
  end
end
