class AddShareTokenToCollections < ActiveRecord::Migration[8.0]
  def change
    add_column :collections, :share_token, :string
    add_index :collections, :share_token, unique: true
  end
end
