class BackfillOwnerCollectionMembers < ActiveRecord::Migration[8.0]
  def up
    execute <<-SQL
      INSERT INTO collection_members
        (collection_id, user_id, invited_by_id, role, invited_email, status, accepted_at, created_at, updated_at)
      SELECT
        c.id,
        c.user_id,
        c.user_id,
        'owner',
        u.email,
        'accepted',
        c.created_at,
        c.created_at,
        c.created_at
      FROM collections c
      INNER JOIN users u ON u.id = c.user_id
      WHERE NOT EXISTS (
        SELECT 1 FROM collection_members cm
        WHERE cm.collection_id = c.id AND cm.role = 'owner'
      )
    SQL
  end

  def down
    execute <<-SQL
      DELETE FROM collection_members WHERE role = 'owner'
    SQL
  end
end
