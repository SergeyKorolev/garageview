class AddRouteDetailsToTravelTimeCaches < ActiveRecord::Migration[7.2]
  def change
    add_column :travel_time_caches, :route_cities, :text, array: true, default: []
    add_column :travel_time_caches, :origin_airport, :string
    add_column :travel_time_caches, :dest_airport, :string
    add_column :travel_time_caches, :last_mile_info, :string
  end
end
