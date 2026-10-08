class AddRatingToBucketCars < ActiveRecord::Migration[7.2]
  def change
    add_column :bucket_cars, :rating, :integer, default: 0
  end
end
