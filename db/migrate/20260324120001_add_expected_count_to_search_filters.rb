class AddExpectedCountToSearchFilters < ActiveRecord::Migration[7.2]
  def change
    add_column :search_filters, :expected_count, :integer
  end
end
