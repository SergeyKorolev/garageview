class CreateAgentConversations < ActiveRecord::Migration[7.2]
  def change
    create_table :agent_conversations do |t|
      t.references :user, null: false, foreign_key: true
      t.string :title
      t.string :conversation_type, default: "general", null: false
      t.jsonb :messages, default: [], null: false
      t.jsonb :metadata, default: {}, null: false

      t.timestamps
    end

    add_index :agent_conversations, :conversation_type
  end
end
