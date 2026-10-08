class PagesController < ApplicationController
  include PagesHelper

  before_action :set_locale
  before_action :load_translations

  layout "public"

  def landing
    redirect_to "/collections", allow_other_host: false if user_signed_in?
    @meta = {
      title: t_page("landing.metaTitle"),
      description: t_page("landing.metaDescription"),
      canonical: "https://garageview.ai/#{@locale}",
      hreflang_suffix: ""
    }
  end

  def privacy
    @meta = {
      title: "Privacy Policy — Garageview.ai",
      description: "Privacy Policy for garageview.ai — how we collect, use, and protect your information.",
      canonical: "https://garageview.ai/#{@locale}/privacy",
      hreflang_suffix: "/privacy"
    }
  end

  def terms
    @meta = {
      title: "Terms of Service — Garageview.ai",
      description: "Terms of Service for garageview.ai — rules and guidelines for using the Service.",
      canonical: "https://garageview.ai/#{@locale}/terms",
      hreflang_suffix: "/terms"
    }
  end

  def extension
    @meta = {
      title: "Chrome Extension — Garageview.ai",
      description: "Save cars directly from mobile.de to your Garageview workspace with one click.",
      canonical: "https://garageview.ai/#{@locale}/extension",
      hreflang_suffix: "/extension"
    }
  end

  private

  def set_locale
    @locale = params[:locale].presence || "en"
    @locale = "en" unless LOCALE_CODES.include?(@locale)
  end

  # Pre-load all locale translations at boot — no File.read at request time
  LOCALE_TRANSLATIONS = LOCALE_CODES.each_with_object({}) { |code, h|
    path = Rails.root.join("app/javascript/i18n/locales/#{code}.json")
    h[code] = JSON.parse(File.read(path)).freeze # rubocop:disable Rails/FilePath
  }.freeze

  def load_translations
    @t = LOCALE_TRANSLATIONS.fetch(@locale, LOCALE_TRANSLATIONS["en"])
  end
end
