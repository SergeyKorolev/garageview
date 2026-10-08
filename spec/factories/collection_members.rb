FactoryBot.define do
  factory :collection_member do
    collection
    user { nil }
    invited_email { Faker::Internet.unique.email }
    invited_by { collection.user }
    role { "viewer" }
    status { "pending" }
  end
end
