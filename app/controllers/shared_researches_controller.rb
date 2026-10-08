class SharedResearchesController < ApplicationController
  include PagesHelper
  include PublicPageTranslations

  layout "public"

  def show
    @research = DeepResearch.find_by!(share_token: params[:token], status: "completed")
    @collection = @research.collection
    @result = JSON.parse(@research.result) rescue nil
    all_cars = @research.cars.to_a
    ranking = @result&.dig("ranking") || []
    @cars = all_cars.sort_by { |c| ranking.find { |r| r["car_id"] == c.id }&.dig("place") || 999 }

    return render plain: "Research data unavailable", status: :not_found unless @result

    @server_only = true

    @locale = detect_locale
    load_translations

    # UI labels in the collection owner's language
    owner_lang = @collection.user&.language || "en"
    @ui = ui_for_language(owner_lang)

    @meta = {
      title: "#{@research.title || 'AI Car Research'} — Garageview.ai",
      description: (@result["bottom_line"] || "AI-powered car comparison and analysis").truncate(200),
      canonical: "https://garageview.ai/s/r/#{@research.share_token}",
      hreflang_suffix: "",
      noindex: true
    }
  rescue ActiveRecord::RecordNotFound
    render plain: "Research not found or no longer shared", status: :not_found
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
