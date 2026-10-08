class Api::V1::CarsController < Api::V1::BaseController
  include CollectionAccessible
  include CarJson

  def show
    car = accessible_cars.find(params[:id])
    render json: car_json(car)
  end

  def lookup
    car = MobileDe::ListingFetcher.new.call(params[:url])
    render json: car_json(car)
  rescue MobileDe::ListingFetcher::InvalidUrl => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  # Check if a car URL is already in one of the user's collections
  def check
    url = params[:url].to_s
    source = ListingSource.detect(url)
    external_id = source && ListingSource.extract_external_id(url)
    return render(json: { found: false }) unless external_id

    car = Car.find_by(source: source, external_id: external_id)
    return render(json: { found: false }) unless car

    collection_ids = CollectionCar.joins(:collection)
      .where(car: car, collections: { user_id: current_user.id })
      .pluck(:collection_id)

    if collection_ids.any?
      render json: { found: true, collection_ids: collection_ids, car_id: car.id }
    else
      render json: { found: false }
    end
  end
end
