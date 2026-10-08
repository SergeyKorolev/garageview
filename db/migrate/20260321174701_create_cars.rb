class CreateCars < ActiveRecord::Migration[7.2]
  def change
    create_table :cars do |t|
      t.string :mobile_de_id, null: false
      t.string :title
      t.string :listing_url
      t.integer :price_cents
      t.string :price_currency, default: "EUR"
      t.integer :mileage_km
      t.date :first_registration
      t.integer :power_kw
      t.string :fuel_type
      t.string :transmission
      t.integer :co2_emissions
      t.string :seller_name
      t.string :seller_type
      t.string :seller_address
      t.decimal :seller_latitude, precision: 10, scale: 7
      t.decimal :seller_longitude, precision: 10, scale: 7
      t.text :photos, array: true, default: []
      t.text :features, array: true, default: []
      t.jsonb :raw_data, default: {}
      t.datetime :last_scraped_at

      t.timestamps
    end

    add_index :cars, :mobile_de_id, unique: true
    add_index :cars, :fuel_type
    add_index :cars, :transmission
    add_index :cars, [ :seller_latitude, :seller_longitude ]
  end
end
