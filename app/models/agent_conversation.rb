class AgentConversation < ApplicationRecord
  belongs_to :user

  TYPES = %w[general collection cars research].freeze

  validates :conversation_type, inclusion: { in: TYPES }

  scope :recent, -> { order(updated_at: :desc) }
  scope :by_type, ->(type) { type.present? ? where(conversation_type: type) : all }

  def add_message(msg)
    self.messages = (messages || []) + [ msg.deep_stringify_keys ]
    save!
  end

  def add_messages(msgs)
    self.messages = (messages || []) + msgs.map(&:deep_stringify_keys)
    save!
  end

  def last_n_messages(n = 20)
    (messages || []).last(n)
  end

  def auto_title_from_actions(actions)
    return if title.present?

    titles = actions.filter_map do |a|
      case a[:type]
      when "collection_created" then "Created #{a[:name]}"
      when "cars_added" then "Added #{a[:cars_added]} cars to #{a[:collection_name]}"
      when "collection_from_search" then "Imported #{a[:name]}"
      when "research_launched" then "Research on #{a[:collection_name]}"
      when "rating_started" then "Rated #{a[:collection_name]}"
      end
    end

    update!(title: titles.first) if titles.any?
  end

  def auto_type_from_tools(tool_names)
    return if tool_names.empty?

    new_type = if tool_names.include?("create_collection") || tool_names.include?("create_collection_from_search")
                 "collection"
    elsif tool_names.include?("add_cars_to_collection")
                 "cars"
    elsif tool_names.include?("launch_deep_research") || tool_names.include?("rate_cars")
                 "research"
    else
                 "general"
    end

    update!(conversation_type: new_type) if new_type != conversation_type
  end
end
