class CompareInvitesController < ApplicationController
  include PagesHelper

  layout "public"

  def show
    @collection = Collection.find_by!(compare_token: params[:token])
    @owner = @collection.user
    @cars = @collection.cars.where(status: "ready").limit(6).to_a
    @cars_count = @collection.collection_cars.count
    @ai_rated_count = @collection.collection_cars.where.not(ai_rating: nil).count

    @server_only = true
    @locale = detect_locale
    load_translations

    @already_member = user_signed_in? && (
      @collection.user_id == current_user.id ||
      @collection.collection_members.active.exists?(user_id: current_user.id)
    )

    @meta = {
      title: "Join #{@collection.name} — Garageview.ai",
      description: "#{@owner.name} invited you to compare #{@cars_count} cars together on Garageview.ai",
      canonical: "https://garageview.ai/s/j/#{@collection.compare_token}",
      hreflang_suffix: "",
      noindex: true
    }
  rescue ActiveRecord::RecordNotFound
    render plain: "Collection not found or no longer shared", status: :not_found
  end

  def join
    collection = Collection.find_by!(compare_token: params[:token])

    unless user_signed_in?
      session[:pending_compare_token] = params[:token]
      redirect_to user_google_oauth2_omniauth_authorize_path
      return
    end

    if collection.user_id == current_user.id
      redirect_to "/collections/#{collection.id}"
      return
    end

    collection.join_via_compare_link!(current_user)

    redirect_to "/collections/#{collection.id}"
  rescue ActiveRecord::RecordNotFound
    render plain: "Collection not found or no longer shared", status: :not_found
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
