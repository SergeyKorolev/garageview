class CreateApiLogs < ActiveRecord::Migration[7.2]
  def change
    create_table :api_logs do |t|
      t.string :service, null: false         # e.g. "AiCarRatingService", "DeepResearchService"
      t.string :provider, null: false         # e.g. "openai"
      t.string :model                         # e.g. "gpt-4o"
      t.string :endpoint                      # e.g. "chat/completions"
      t.string :status, null: false           # "success", "error"
      t.integer :prompt_tokens
      t.integer :completion_tokens
      t.integer :total_tokens
      t.float :duration_seconds               # wall-clock time of the API call
      t.text :request_payload                  # full request (prompt, params)
      t.text :response_payload                 # full response or error
      t.string :error_message
      t.references :user, foreign_key: true, null: true
      t.bigint :record_id                      # polymorphic: bucket_id, deep_research_id, etc.
      t.string :record_type                    # e.g. "Bucket", "DeepResearch"
      t.timestamps
    end

    add_index :api_logs, :service
    add_index :api_logs, :status
    add_index :api_logs, [ :record_type, :record_id ]
    add_index :api_logs, :created_at
  end
end
