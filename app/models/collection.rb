class Collection < ApplicationRecord
  belongs_to :user
  has_many :collection_cars, dependent: :destroy
  has_many :cars, through: :collection_cars
  has_many :search_filters, dependent: :destroy
  has_many :deep_researches, dependent: :destroy
  has_many :collection_members, dependent: :destroy
  has_many :member_users, through: :collection_members, source: :user

  validates :name, presence: true

  before_destroy :prevent_default_deletion
  before_update :prevent_default_rename
  after_create :create_owner_membership

  scope :accessible_by, ->(user) {
    where(id:
      where(user_id: user.id)
        .or(where(id: CollectionMember.where(user_id: user.id, status: :accepted).select(:collection_id)))
        .select(:id)
    )
  }

  scope :editable_by, ->(user) {
    where(id:
      where(user_id: user.id)
        .or(where(id: CollectionMember.where(user_id: user.id, status: :accepted, role: [ :owner, :editor ]).select(:collection_id)))
        .select(:id)
    )
  }

  def role_for(user)
    return "owner" if user_id == user.id
    collection_members.active.find_by(user_id: user.id)&.role
  end

  def join_via_compare_link!(joining_user)
    with_lock do
      return if user_id == joining_user.id
      return if collection_members.active.exists?(user_id: joining_user.id)

      member = collection_members.find_or_initialize_by(invited_email: joining_user.email)
      member.assign_attributes(role: compare_role || "viewer", invited_by: user)
      member.accept!(joining_user)
    end
  end

  private

  def prevent_default_deletion
    if self.default?
      errors.add(:base, "Cannot delete the default Favorites collection")
      throw(:abort)
    end
  end

  def create_owner_membership
    collection_members.create!(
      user: user,
      invited_email: user.email,
      invited_by: user,
      role: :owner,
      status: :accepted,
      accepted_at: Time.current
    )
  end

  def prevent_default_rename
    if self.default? && name_changed?
      errors.add(:name, "Cannot rename the default Favorites collection")
      throw(:abort)
    end
  end

  public

  def self.ransackable_attributes(auth_object = nil)
    %w[id name user_id created_at updated_at]
  end

  def self.ransackable_associations(auth_object = nil)
    %w[user collection_cars cars search_filters deep_researches]
  end

  def generate_share_token!
    update!(share_token: SecureRandom.urlsafe_base64(16))
    share_token
  end

  def revoke_share_token!
    update!(share_token: nil)
  end

  def shared?
    share_token.present?
  end

  def share_url
    "https://garageview.ai/s/c/#{share_token}" if shared?
  end

  def generate_compare_token!
    update!(compare_token: SecureRandom.urlsafe_base64(16))
    compare_token
  end

  def revoke_compare_token!
    update!(compare_token: nil)
  end

  def compare_shared?
    compare_token.present?
  end

  def compare_url
    "https://garageview.ai/s/j/#{compare_token}" if compare_shared?
  end

  def effective_location
    if latitude.present? && longitude.present?
      { latitude: latitude, longitude: longitude, location_name: location_name }
    elsif user.latitude.present? && user.longitude.present?
      { latitude: user.latitude, longitude: user.longitude, location_name: user.location_name }
    end
  end
end
