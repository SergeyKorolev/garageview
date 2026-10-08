class CreateCollectionMembers < ActiveRecord::Migration[8.0]
  def change
    create_table :collection_members do |t|
      t.references :collection, null: false, foreign_key: true
      t.references :user, null: true, foreign_key: true
      t.references :invited_by, null: false, foreign_key: { to_table: :users }
      t.string :role, null: false, default: "viewer"
      t.string :invited_email, null: false
      t.string :status, null: false, default: "pending"
      t.string :token
      t.datetime :token_expires_at
      t.datetime :accepted_at

      t.timestamps
    end

    add_index :collection_members, [ :collection_id, :invited_email ], unique: true, name: "index_collection_members_on_collection_and_email"
    add_index :collection_members, :token, unique: true, where: "token IS NOT NULL", name: "index_collection_members_on_token"
    add_index :collection_members, :invited_email, name: "index_collection_members_on_invited_email"
    add_index :collection_members, [ :user_id, :status ], name: "index_collection_members_on_user_id_and_status"
  end
end
