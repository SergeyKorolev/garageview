class CreateBuckets < ActiveRecord::Migration[7.2]
  def change
    create_table :buckets do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.text :description
      t.decimal :latitude, precision: 10, scale: 7
      t.decimal :longitude, precision: 10, scale: 7
      t.string :location_name

      t.timestamps
    end
  end
end
