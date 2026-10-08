class AddAiRatingToBucketCars < ActiveRecord::Migration[7.2]
  def change
    add_column :bucket_cars, :ai_rating, :integer
    add_column :bucket_cars, :ai_explanation, :text
  end
end
