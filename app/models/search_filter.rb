class SearchFilter < ApplicationRecord
  belongs_to :collection
  has_many :collection_cars, dependent: :nullify

  validates :search_url, presence: true

  def self.ransackable_attributes(auth_object = nil)
    %w[id collection_id active last_refreshed_at created_at updated_at]
  end

  def self.ransackable_associations(auth_object = nil)
    %w[collection collection_cars]
  end

  scope :active, -> { where(active: true) }
  scope :due_for_refresh, -> {
    active.where("last_refreshed_at IS NULL OR last_refreshed_at < ?", 6.hours.ago)
  }
end
