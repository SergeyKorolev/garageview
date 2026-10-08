module CollectionAccessible
  extend ActiveSupport::Concern

  private

  def accessible_collections
    Collection.accessible_by(current_user)
  end

  def accessible_cars
    Car.where(id: CollectionCar.where(collection_id: accessible_collections.select(:id)).select(:car_id))
  end

  def editable_collections
    Collection.editable_by(current_user)
  end

  def owned_collections
    current_user.collections
  end
end
