FactoryBot.define do
  factory :car do
    sequence(:external_id) { |n| "DE#{n}#{Faker::Number.number(digits: 6)}" }
    source { "mobile_de" }
    title { "#{Faker::Vehicle.make} #{Faker::Vehicle.model}" }
    listing_url { "https://www.mobile.de/listing/#{external_id}" }
    price_cents { Faker::Number.between(from: 500_000, to: 10_000_000) }
    price_currency { "EUR" }
    mileage_km { Faker::Number.between(from: 1_000, to: 300_000) }
    fuel_type { %w[gasoline diesel electric hybrid].sample }
    transmission { %w[automatic manual].sample }
    status { "ready" }
    seller_latitude { Faker::Address.latitude.to_d.round(7) }
    seller_longitude { Faker::Address.longitude.to_d.round(7) }
    seller_address { Faker::Address.full_address }
    features { Array.new(rand(3..8)) { Faker::Lorem.word } }
    raw_data { { source: "mobile.de" } }
    photos { Array.new(rand(1..5)) { Faker::Internet.url(host: "img.mobile.de") } }
  end
end
