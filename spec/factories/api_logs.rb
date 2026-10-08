FactoryBot.define do
  factory :api_log do
    service { %w[ai_rating deep_research car_analysis].sample }
    provider { "openai" }
    model { "gpt-4o" }
    status { "success" }
    duration_seconds { Faker::Number.decimal(l_digits: 1, r_digits: 3) }
    user { nil }
  end
end
