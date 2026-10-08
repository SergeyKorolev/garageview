FactoryBot.define do
  factory :deep_research do
    collection
    car_ids { [ Faker::Number.number(digits: 4), Faker::Number.number(digits: 4) ] }
    status { "pending" }
    title { "Research: #{Faker::Vehicle.make} comparison" }
    result { nil }
  end
end
