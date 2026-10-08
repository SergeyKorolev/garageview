class AddShareTokenToCars < ActiveRecord::Migration[8.0]
  def change
    add_column :cars, :share_token, :string
    add_index :cars, :share_token, unique: true
  end
end
