class Api::V1::TravelTimesController < Api::V1::BaseController
  def compute
    result = TravelTimeCalculator.new.call(
      origin_lat: params[:origin_lat].to_f,
      origin_lng: params[:origin_lng].to_f,
      dest_lat: params[:dest_lat].to_f,
      dest_lng: params[:dest_lng].to_f
    )
    render json: result
  end
end
