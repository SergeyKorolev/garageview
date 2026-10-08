class Car < ApplicationRecord
  has_many :collection_cars, dependent: :destroy
  has_many :collections, through: :collection_cars

  validates :external_id, presence: true, uniqueness: { scope: :source }
  validates :source, presence: true

  scope :by_fuel_type, ->(type) { where(fuel_type: type) if type.present? }
  scope :by_transmission, ->(type) { where(transmission: type) if type.present? }
  scope :price_between, ->(min, max) {
    scope = all
    scope = scope.where("price_cents >= ?", min.to_i * 100) if min.present?
    scope = scope.where("price_cents <= ?", max.to_i * 100) if max.present?
    scope
  }
  scope :mileage_between, ->(min, max) {
    scope = all
    scope = scope.where("mileage_km >= ?", min.to_i) if min.present?
    scope = scope.where("mileage_km <= ?", max.to_i) if max.present?
    scope
  }

  def self.ransackable_attributes(auth_object = nil)
    %w[id title source external_id price_cents mileage_km fuel_type transmission status ai_rating seller_name created_at updated_at]
  end

  def self.ransackable_associations(auth_object = nil)
    %w[collections collection_cars]
  end

  def feature_count
    features&.length || 0
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
    "https://garageview.ai/s/v/#{share_token}" if shared?
  end
end
