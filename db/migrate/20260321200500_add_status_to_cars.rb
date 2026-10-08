class AddStatusToCars < ActiveRecord::Migration[7.2]
  def change
    add_column :cars, :status, :string, default: "ready"
  end
end
