class CreateDeepResearches < ActiveRecord::Migration[7.2]
  def change
    create_table :deep_researches do |t|
      t.references :bucket, null: false, foreign_key: true
      t.integer :car_ids, array: true, default: []
      t.string :title
      t.text :result
      t.string :status, default: "pending"

      t.timestamps
    end
  end
end
