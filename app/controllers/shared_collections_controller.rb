class SharedCollectionsController < ApplicationController
  layout "application"

  def show
    collection = Collection.find_by!(share_token: params[:token])
    cars_count = collection.collection_cars.joins(:car).where(cars: { status: "ready" }).count

    # Set meta tags for social sharing / OG crawlers
    @page_title = "#{collection.name} — #{cars_count} cars — Garageview.ai"
    @page_description = "Browse #{cars_count} cars in this shared collection on Garageview.ai. AI-analyzed with ratings, pros, cons, and hidden concerns."
    @page_canonical = "https://garageview.ai/s/c/#{collection.share_token}"
    @page_noindex = true

    # React SPA handles rendering — just serve the shell
    render inline: "", layout: "application"
  rescue ActiveRecord::RecordNotFound
    render plain: "Collection not found or no longer shared", status: :not_found
  end
end
