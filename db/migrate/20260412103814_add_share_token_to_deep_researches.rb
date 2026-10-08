class AddShareTokenToDeepResearches < ActiveRecord::Migration[8.0]
  def change
    add_column :deep_researches, :share_token, :string
    add_index :deep_researches, :share_token, unique: true
    add_column :deep_researches, :shared_at, :datetime
  end
end
