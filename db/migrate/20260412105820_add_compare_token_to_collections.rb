class AddCompareTokenToCollections < ActiveRecord::Migration[8.0]
  def change
    add_column :collections, :compare_token, :string
    add_index :collections, :compare_token, unique: true
    add_column :collections, :compare_role, :string, default: "viewer"
  end
end
