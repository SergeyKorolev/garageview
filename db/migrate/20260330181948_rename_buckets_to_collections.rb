class RenameBucketsToCollections < ActiveRecord::Migration[8.0]
  def change
    rename_table :buckets, :collections
    rename_table :bucket_cars, :collection_cars
    rename_column :collection_cars, :bucket_id, :collection_id
    rename_column :search_filters, :bucket_id, :collection_id
    rename_column :deep_researches, :bucket_id, :collection_id
  end
end
