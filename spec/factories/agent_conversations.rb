FactoryBot.define do
  factory :agent_conversation do
    user
    conversation_type { "general" }
    title { Faker::Lorem.sentence(word_count: 4) }
    messages { [] }
    metadata { {} }
  end
end
