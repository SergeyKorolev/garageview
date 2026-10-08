FactoryBot.define do
  factory :travel_time_cache do
    origin_lat { Faker::Address.latitude.to_d.round(7) }
    origin_lng { Faker::Address.longitude.to_d.round(7) }
    dest_lat { Faker::Address.latitude.to_d.round(7) }
    dest_lng { Faker::Address.longitude.to_d.round(7) }
    driving_seconds { Faker::Number.between(from: 1800, to: 36000) }
    flying_seconds { Faker::Number.between(from: 3600, to: 14400) }
    distance_km { Faker::Number.between(from: 50, to: 2000) }
    route_cities { Array.new(rand(2..5)) { Faker::Address.city } }
    computed_at { Time.current }
  end
end
