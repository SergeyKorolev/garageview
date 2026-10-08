class Api::V1::CollectionCarsController < Api::V1::BaseController
  include CollectionAccessible
  include CarJson

  before_action :set_accessible_collection, only: [ :index ]
  before_action :set_editable_collection, only: [ :create, :update, :destroy, :ai_rate, :share, :unshare ]

  def index
    cars = @collection.cars
    cars = cars.by_fuel_type(params[:fuel_type])
    cars = cars.by_transmission(params[:transmission])
    cars = cars.price_between(params[:price_min], params[:price_max])
    cars = cars.mileage_between(params[:mileage_min], params[:mileage_max])
    cars = apply_sort(cars).order("cars.id ASC")

    page = [ (params[:page] || 1).to_i, 1 ].max
    per_page = (params[:per_page] || 50).to_i.clamp(1, 200)
    total = cars.count
    records = cars.offset((page - 1) * per_page).limit(per_page)

    location = @collection.effective_location
    cars_with_travel = records.map { |car| car_json(car, location) }

    # Add placeholder entries for expected cars not yet created
    pending_filter = @collection.search_filters.where(active: true, last_refreshed_at: nil).first
    expected = pending_filter&.expected_count || 0
    placeholders_needed = [ expected - total, 0 ].max
    offset = (page - 1) * per_page
    placeholder_start = [ offset - total, 0 ].max
    placeholder_count = [ per_page - cars_with_travel.size, placeholders_needed - placeholder_start ].min.clamp(0, per_page)
    placeholder_count.times do |i|
      cars_with_travel << { id: -(placeholder_start + i + 1), status: "placeholder" }
    end

    render json: {
      cars: cars_with_travel,
      total: total + placeholders_needed,
      page: page,
      per_page: per_page,
      total_pages: ((total + placeholders_needed).to_f / per_page).ceil
    }
  end

  def create
    url = params[:url].to_s
    source = ListingSource.detect(url)
    unless source
      return render json: { error: "Unsupported listing URL. Supported sites: mobile.de, otomoto.pl, autoscout24." }, status: :unprocessable_entity
    end

    external_id = ListingSource.extract_external_id(url) || SecureRandom.hex(8)
    car = Car.find_or_initialize_by(source: source, external_id: external_id)
    already_ready = car.persisted? && car.status == "ready"
    car.assign_attributes(listing_url: url, status: "pending") unless already_ready
    car.save!

    @collection.collection_cars.find_or_create_by!(car: car, added_via: "manual")

    # Only scrape if the car hasn't been fetched yet
    ScrapeCarJob.perform_later(car.id) unless already_ready

    render json: car_json(car, @collection.effective_location), status: :created
  end

  def update
    collection_car = @collection.collection_cars.find_by!(car_id: params[:id])
    collection_car.update!(rating: params[:rating].to_i)
    render json: car_json(collection_car.car, @collection.effective_location)
  end

  def destroy
    collection_car = @collection.collection_cars.find_by!(car_id: params[:id])
    collection_car.destroy!
    head :no_content
  end

  def ai_rate
    AiCarRatingJob.perform_later(@collection.id)
    render json: { status: "ok" }
  end

  def share
    cc = @collection.collection_cars.find_by!(car_id: params[:id])
    car = cc.car
    car.generate_share_token! unless car.shared?
    render json: { share_token: car.share_token, share_url: car.share_url }
  end

  def unshare
    cc = @collection.collection_cars.find_by!(car_id: params[:id])
    cc.car.revoke_share_token!
    render json: { success: true }
  end

  private

  def set_accessible_collection
    @collection = accessible_collections.find(params[:collection_id])
  end

  def set_editable_collection
    @collection = editable_collections.find(params[:collection_id])
  end

  def apply_sort(cars)
    case params[:sort_by]
    when "price"
      cars.order(price_cents: sort_direction)
    when "mileage"
      cars.order(mileage_km: sort_direction)
    when "feature_count"
      cars.order(Arel.sql("array_length(features, 1) #{sort_direction == :asc ? 'ASC' : 'DESC'} NULLS LAST"))
    else
      cars.order(created_at: :desc)
    end
  end

  def sort_direction
    params[:sort_dir] == "desc" ? :desc : :asc
  end

  def collection_car_record(car)
    @collection_car_cache ||= {}
    @collection_car_cache[car.id] ||= @collection.collection_cars.find_by(car: car)
  end

  def car_json(car, location = nil)
    json = super(car).merge(
      rating: collection_car_record(car)&.rating || 0,
      ai_rating: collection_car_record(car)&.ai_rating,
      ai_explanation: collection_car_record(car)&.ai_explanation
    )

    if location && car.seller_latitude && car.seller_longitude
      # Only use cached travel times — never block the request with API calls
      cached = TravelTimeCache.lookup(
        origin_lat: location[:latitude],
        origin_lng: location[:longitude],
        dest_lat: car.seller_latitude,
        dest_lng: car.seller_longitude
      )
      json[:travel_time] = TravelTimeCalculator.new.format_result(cached) if cached
    end

    json
  end
end
