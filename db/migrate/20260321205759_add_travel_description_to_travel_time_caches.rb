class AddTravelDescriptionToTravelTimeCaches < ActiveRecord::Migration[7.2]
  def change
    add_column :travel_time_caches, :travel_description, :text
  end
end
