FactoryBot.define do
  factory :collection do
    name { Faker::Lorem.words(number: 2).join(" ").titleize }
    user
    default { false }
  end
end
