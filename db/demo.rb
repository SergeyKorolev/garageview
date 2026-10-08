# Run explicitly with bin/rails runner db/demo.rb after registering locally.
abort "Demo data is only available in development" unless Rails.env.development?
email = ENV.fetch("DEMO_USER_EMAIL")
user = User.find_by!(email: email)
ActiveRecord::Base.transaction do
  collection = user.collections.find_or_create_by!(name: "Demo shortlist (fictional)")
  [
    [ "demo-family-hybrid", "Fictional family hybrid — used", 2_450_000, 42_000, "hybrid", [ "Parking sensors", "Heated seats" ] ],
    [ "demo-city-electric", "Fictional city electric — new", 3_100_000, 0, "electric", [ "Heat pump", "Adaptive cruise control" ] ],
    [ "demo-estate-petrol", "Fictional estate — used", 1_950_000, 78_000, "gasoline", [ "Roof rails", "Rear camera" ] ]
  ].each do |id, title, price, mileage, fuel, features|
    car = Car.find_or_initialize_by(source: "demo", external_id: id)
    car.assign_attributes(title: title, price_cents: price, price_currency: "EUR",
      mileage_km: mileage, fuel_type: fuel, transmission: "automatic", status: "ready",
      listing_url: "https://example.com/fictional-cars/#{id}", photos: [], features: features,
      seller_name: "Fictional seller", seller_address: "Fictional location", raw_data: {})
    car.save!
    collection.collection_cars.find_or_create_by!(car: car)
  end
end
puts "Fictional demo collection ready. No external services were called."
