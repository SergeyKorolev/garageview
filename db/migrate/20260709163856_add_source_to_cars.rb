class AddSourceToCars < ActiveRecord::Migration[8.0]
  def change
    add_column :cars, :source, :string, null: false, default: "mobile_de"
    remove_index :cars, name: "index_cars_on_mobile_de_id"
    rename_column :cars, :mobile_de_id, :external_id
    add_index :cars, [ :source, :external_id ], unique: true
  end
end
