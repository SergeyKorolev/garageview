class AddDefaultToBuckets < ActiveRecord::Migration[8.0]
  def up
    add_column :buckets, :default, :boolean, default: false, null: false

    # Backfill: create a "Favorites" bucket for every user that doesn't have one
    User.find_each do |user|
      unless user.buckets.exists?(default: true)
        user.buckets.create!(name: "Favorites", default: true)
      end
    end
  end

  def down
    remove_column :buckets, :default
  end
end
