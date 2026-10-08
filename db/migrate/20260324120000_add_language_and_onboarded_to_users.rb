class AddLanguageAndOnboardedToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :language, :string, default: "en", null: false
    add_column :users, :onboarded, :boolean, default: false, null: false
  end
end
