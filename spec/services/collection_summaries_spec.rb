require "rails_helper"

RSpec.describe CollectionSummaries do
  it "computes counts, ranges, pending state and the first five previews" do
    collection = create(:collection)
    6.times do |i|
      car = create(:car, price_cents: (i + 1) * 100, mileage_km: i * 1000,
        photos: [ "photo-#{i}" ], status: i.zero? ? "scraping" : "ready")
      create(:collection_car, collection: collection, car: car, ai_rating: i.zero? ? nil : i)
    end
    create(:search_filter, collection: collection, expected_count: 8)
    summary = described_class.new([ collection.id ]).call.fetch(collection.id)
    expect(summary).to include(
      cars_count: 6, ai_rated_count: 5, search_filters_count: 1,
      preview_photos: (0..4).map { |i| "photo-#{i}" }, is_fetching: true,
      expected_cars: 9, ready_cars: 5,
      price_min: 100, price_max: 600, mileage_min: 0, mileage_max: 5000
    )
  end

  it "uses a constant number of queries as collections grow" do
    collections = create_list(:collection, 5)
    collections.each { |collection| create(:collection_car, collection: collection) }
    count_queries = lambda do |ids|
      statements = []
      subscriber = ->(*args) { statements << args.last[:sql] if args.last[:sql].match?(/\ASELECT/i) }
      ActiveSupport::Notifications.subscribed(subscriber, "sql.active_record") do
        ActiveRecord::Base.uncached { described_class.new(ids).call }
      end
      statements.size
    end
    expect(count_queries.call(collections.map(&:id))).to eq(count_queries.call([ collections.first.id ]))
  end
end
