FactoryBot.define do
  factory :collection_car do
    collection
    car
    rating { 0 }
    ai_rating { nil }
    ai_explanation { nil }
    added_via { "manual" }
  end
end
