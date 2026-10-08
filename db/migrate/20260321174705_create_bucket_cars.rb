class CreateBucketCars < ActiveRecord::Migration[7.2]
  def change
    create_table :bucket_cars do |t|
      t.references :bucket, null: false, foreign_key: true
      t.references :car, null: false, foreign_key: true
      t.string :added_via, default: "manual"
      t.references :search_filter, foreign_key: true

      t.datetime :created_at, null: false
    end

    add_index :bucket_cars, [ :bucket_id, :car_id ], unique: true
  end
end
