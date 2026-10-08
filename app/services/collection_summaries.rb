class CollectionSummaries
  def initialize(collection_ids)
    @ids = collection_ids
  end

  def call
    summaries = @ids.index_with do
      {
        cars_count: 0, ai_rated_count: 0, search_filters_count: 0,
        preview_photos: [], is_fetching: false, expected_cars: 0, ready_cars: 0,
        price_min: nil, price_max: nil, mileage_min: nil, mileage_max: nil
      }
    end
    return summaries if @ids.empty?

    cars = CollectionCar.where(collection_id: @ids).joins(:car)
    cars.group(:collection_id).pluck(:collection_id, Arel.sql(<<~SQL.squish)).each do |id, count, rated, pending, ready, price_min, price_max, mileage_min, mileage_max|
      COUNT(*), COUNT(collection_cars.ai_rating),
      COUNT(*) FILTER (WHERE cars.status IN ('pending', 'scraping')),
      COUNT(*) FILTER (WHERE cars.status = 'ready'),
      MIN(cars.price_cents), MAX(cars.price_cents), MIN(cars.mileage_km), MAX(cars.mileage_km)
    SQL
      summaries[id].merge!(
        cars_count: count, ai_rated_count: rated, is_fetching: pending > 0,
        expected_cars: pending, ready_cars: ready,
        price_min: price_min, price_max: price_max, mileage_min: mileage_min, mileage_max: mileage_max
      )
    end

    SearchFilter.where(collection_id: @ids).group(:collection_id)
      .pluck(:collection_id, Arel.sql(<<~SQL.squish)).each do |id, count, pending, expected|
        COUNT(*), COUNT(*) FILTER (WHERE active AND last_refreshed_at IS NULL),
        COALESCE(SUM(expected_count) FILTER (WHERE active AND last_refreshed_at IS NULL), 0)
      SQL
        summary = summaries.fetch(id)
        summary[:search_filters_count] = count
        summary[:is_fetching] ||= pending > 0
        summary[:expected_cars] += expected
      end

    previews = cars.where.not(cars: { photos: nil }).select(<<~SQL.squish)
      collection_id, cars.photos[1] AS photo,
      ROW_NUMBER() OVER (PARTITION BY collection_id ORDER BY collection_cars.created_at, collection_cars.id) AS position
    SQL
    CollectionCar.from("(#{previews.to_sql}) AS previews")
      .where("position <= 5").order(:collection_id, :position)
      .pluck(:collection_id, :photo).each do |id, photo|
        summaries[id][:preview_photos] << photo if photo
      end

    summaries.each_value do |summary|
      unless summary[:is_fetching]
        summary[:expected_cars] = 0
        summary[:ready_cars] = summary[:cars_count]
      end
    end
    summaries
  end
end
