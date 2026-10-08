FactoryBot.define do
  factory :user do
    email { Faker::Internet.unique.email }
    password { "password123!" }
    name { Faker::Name.name }
    provider { "google_oauth2" }
    uid { Faker::Number.unique.number(digits: 12).to_s }
    avatar_url { Faker::Internet.url }
    language { "en" }
    currency { "EUR" }
    latitude { Faker::Address.latitude.to_d.round(7) }
    longitude { Faker::Address.longitude.to_d.round(7) }
    location_name { Faker::Address.city }
    theme { "light" }
    onboarded { true }
  end
end
