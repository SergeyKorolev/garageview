class Api::V1::PublicCollectionsController < Api::V1::BaseController
  skip_before_action :authenticate_user!

  def show
    collection = Collection.find_by!(share_token: params[:token])
    owner = collection.user

    collection_cars = collection.collection_cars.includes(:car).where(cars: { status: "ready" })
    cars = collection_cars.map do |cc|
      car = cc.car
      raw = car.raw_data || {}
      attrs = raw["attributes"] || {}

      {
        id: car.id,
        external_id: car.external_id,
        source: car.source,
        title: car.title,
        listing_url: car.listing_url,
        price_cents: car.price_cents,
        price_currency: car.price_currency || "EUR",
        mileage_km: car.mileage_km,
        first_registration: car.first_registration,
        power_kw: car.power_kw,
        fuel_type: car.fuel_type,
        transmission: car.transmission,
        co2_emissions: car.co2_emissions,
        seller_name: car.seller_name,
        seller_type: car.seller_type,
        seller_address: car.seller_address,
        seller_latitude: car.seller_latitude,
        seller_longitude: car.seller_longitude,
        photos: car.photos || [],
        features: car.features || [],
        attributes: attrs,
        price_rating: raw["priceRating"],
        rating: cc.rating || 0,
        ai_rating: cc.ai_rating,
        ai_explanation: cc.ai_explanation,
        ai_analysis: car.ai_analysis,
        ai_analyzed_at: car.ai_analyzed_at,
        last_scraped_at: car.last_scraped_at,
        created_at: car.created_at,
        status: car.status,
        travel_time: nil
      }
    end.sort_by { |c| c[:ai_rating] || 999 }

    deep_researches = collection.deep_researches.where(status: "completed").order(created_at: :desc).map do |r|
      {
        id: r.id,
        collection_id: collection.id,
        car_ids: r.car_ids,
        title: r.title,
        status: r.status,
        result: r.result.present? ? (JSON.parse(r.result) rescue nil) : nil,
        share_token: r.share_token,
        public_url: r.share_token ? "https://garageview.ai/s/r/#{r.share_token}" : nil,
        created_at: r.created_at
      }
    end

    render json: {
      collection: {
        id: collection.id,
        name: collection.name,
        owner_name: owner&.name || "Anonymous",
        cars_count: cars.size,
        created_at: collection.created_at
      },
      cars: cars,
      deep_researches: deep_researches
    }
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Collection not found or no longer shared" }, status: :not_found
  end
end
