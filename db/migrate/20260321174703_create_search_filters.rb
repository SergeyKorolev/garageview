class CreateSearchFilters < ActiveRecord::Migration[7.2]
  def change
    create_table :search_filters do |t|
      t.references :bucket, null: false, foreign_key: true
      t.text :search_url, null: false
      t.string :name
      t.jsonb :params, default: {}
      t.datetime :last_refreshed_at
      t.integer :refresh_interval_hours, default: 6
      t.boolean :active, default: true

      t.timestamps
    end
  end
end
