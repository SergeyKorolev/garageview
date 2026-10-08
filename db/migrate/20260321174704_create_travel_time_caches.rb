class CreateTravelTimeCaches < ActiveRecord::Migration[7.2]
  def change
    create_table :travel_time_caches do |t|
      t.decimal :origin_lat, precision: 10, scale: 7, null: false
      t.decimal :origin_lng, precision: 10, scale: 7, null: false
      t.decimal :dest_lat, precision: 10, scale: 7, null: false
      t.decimal :dest_lng, precision: 10, scale: 7, null: false
      t.integer :driving_seconds
      t.integer :flying_seconds
      t.integer :distance_km

      t.datetime :computed_at, null: false
    end

    add_index :travel_time_caches, [ :origin_lat, :origin_lng, :dest_lat, :dest_lng ],
              unique: true, name: "index_travel_time_caches_on_coords"
  end
end
