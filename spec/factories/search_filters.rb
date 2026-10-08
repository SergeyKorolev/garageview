FactoryBot.define do
  factory :search_filter do
    collection
    search_url { "https://www.mobile.de/search?#{Faker::Internet.slug}" }
    name { "#{Faker::Vehicle.make} search" }
    params { { make: Faker::Vehicle.make, model: Faker::Vehicle.model } }
    active { true }
    last_refreshed_at { nil }
  end
end
