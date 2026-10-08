class CollectionMember < ApplicationRecord
  belongs_to :collection
  belongs_to :user, optional: true
  belongs_to :invited_by, class_name: "User"

  enum :role, { owner: "owner", editor: "editor", viewer: "viewer" }
  enum :status, { pending: "pending", accepted: "accepted", declined: "declined" }

  validates :invited_email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :invited_email, uniqueness: { scope: :collection_id }
  validates :role, presence: true
  validates :status, presence: true

  before_create :generate_token, unless: -> { owner? }
  before_create :set_token_expiry, unless: -> { owner? }

  scope :active, -> { where(status: :accepted) }
  scope :pending_invites, -> { where(status: :pending) }

  def accept!(accepting_user)
    update!(
      user: accepting_user,
      status: :accepted,
      accepted_at: Time.current,
      token: nil
    )
  end

  private

  def generate_token
    self.token = SecureRandom.urlsafe_base64(32)
  end

  def set_token_expiry
    self.token_expires_at = 7.days.from_now
  end
end
