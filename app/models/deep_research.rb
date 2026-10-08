class DeepResearch < ApplicationRecord
  belongs_to :collection

  validates :car_ids, presence: true
  validates :status, inclusion: { in: %w[pending processing completed failed] }

  scope :shared, -> { where.not(share_token: nil) }

  def self.ransackable_attributes(auth_object = nil)
    %w[id title collection_id status created_at updated_at]
  end

  def self.ransackable_associations(auth_object = nil)
    %w[collection]
  end

  def cars
    collection.cars.where(id: car_ids)
  end

  def generate_share_token!
    update!(share_token: SecureRandom.urlsafe_base64(16), shared_at: Time.current)
    share_token
  end

  def revoke_share_token!
    update!(share_token: nil, shared_at: nil)
  end

  def shared?
    share_token.present?
  end

  def public_url
    "https://garageview.ai/s/r/#{share_token}" if shared?
  end
end
