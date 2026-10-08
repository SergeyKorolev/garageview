class PrintController < ApplicationController
  before_action :authenticate_user!

  layout "print"

  def car
    collection = Collection.accessible_by(current_user).find(params[:collection_id])
    cc = collection.collection_cars.includes(:car).find_by!(car_id: params[:car_id])
    @car = cc.car
    @ai_explanation = cc.ai_explanation.present? ? (JSON.parse(cc.ai_explanation) rescue nil) : nil
    @ai_analysis = @car.ai_analysis || {}
    @attributes = @car.raw_data&.dig("attributes") || {}
    @features = @car.features || []

    @meta = { title: "#{@car.title} — Garageview.ai" }
  end

  def research
    collection = Collection.accessible_by(current_user).find(params[:collection_id])
    @research = collection.deep_researches.find(params[:research_id])
    @result = JSON.parse(@research.result) rescue nil
    @cars = @research.cars.where(status: "ready").to_a

    return render plain: "Research not available", status: :not_found unless @result

    @meta = { title: "#{@research.title || 'Deep Research'} — Garageview.ai" }
  end
end
