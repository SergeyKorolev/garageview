class CollectionCar < ApplicationRecord
  belongs_to :collection
  belongs_to :car
  belongs_to :search_filter, optional: true

  validates :collection_id, uniqueness: { scope: :car_id }
end
