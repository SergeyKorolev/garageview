class Api::V1::CollectionsController < Api::V1::BaseController
  include CollectionAccessible

  before_action :set_accessible_collection, only: [ :show ]
  before_action :set_owned_collection, only: [ :update, :destroy, :create_compare_link, :revoke_compare_link, :share, :unshare ]

  def index
    collections = accessible_collections
      .includes(:user)
      .order(Arel.sql("collections.\"default\" DESC, collections.updated_at DESC"))

    # Preload roles and member counts to avoid N+1
    collection_ids = collections.map(&:id)
    @summaries = CollectionSummaries.new(collection_ids).call
    roles = CollectionMember.where(user_id: current_user.id, status: :accepted, collection_id: collection_ids)
      .pluck(:collection_id, :role)
      .to_h
    member_counts = CollectionMember.where(collection_id: collection_ids, status: :accepted)
      .group(:collection_id)
      .count

    render json: collections.map { |c| collection_json(c, role: roles[c.id], members_count: member_counts[c.id] || 0) }
  end

  def show
    render json: collection_json(@collection)
  end

  def create
    collection = current_user.collections.create!(collection_params)
    render json: collection_json(collection), status: :created
  end

  def update
    @collection.update!(collection_params)
    render json: collection_json(@collection)
  end

  def destroy
    if @collection.default?
      render json: { error: "Cannot delete the default Favorites collection" }, status: :unprocessable_entity
      return
    end
    @collection.destroy!
    head :no_content
  end

  def create_compare_link
    if @collection.default?
      return render json: { error: "Cannot share the default collection" }, status: :unprocessable_entity
    end

    role = params[:role].presence || "viewer"
    unless %w[viewer editor].include?(role)
      return render json: { error: "Invalid role" }, status: :unprocessable_entity
    end

    @collection.update!(compare_role: role)
    @collection.generate_compare_token! unless @collection.compare_shared?
    render json: { compare_token: @collection.compare_token, compare_url: @collection.compare_url, compare_role: @collection.compare_role }
  end

  def revoke_compare_link
    @collection.revoke_compare_token!
    render json: { success: true }
  end

  def share
    if @collection.default?
      return render json: { error: "Cannot share the default collection" }, status: :unprocessable_entity
    end

    @collection.generate_share_token! unless @collection.shared?
    render json: { share_token: @collection.share_token, share_url: @collection.share_url }
  end

  def unshare
    @collection.revoke_share_token!
    render json: { success: true }
  end

  private

  def set_accessible_collection
    @collection = accessible_collections.find(params[:id])
  end

  def set_owned_collection
    @collection = owned_collections.find(params[:id])
  end

  def collection_params
    params.require(:collection).permit(:name, :description, :latitude, :longitude, :location_name)
  end

  def collection_json(collection, role: nil, members_count: nil)
    summary = (@summaries || CollectionSummaries.new([ collection.id ]).call).fetch(collection.id)

    computed_role = role || collection.role_for(current_user)
    computed_members_count = members_count || collection.collection_members.active.count
    owner = collection.user

    {
      id: collection.id,
      name: collection.name,
      default: collection.default?,
      description: collection.description,
      latitude: collection.latitude,
      longitude: collection.longitude,
      location_name: collection.location_name,
      **summary,
      created_at: collection.created_at,
      updated_at: collection.updated_at,
      role: computed_role,
      members_count: computed_members_count,
      owner: { id: owner.id, name: owner.name },
      compare_token: computed_role == "owner" ? collection.compare_token : nil,
      compare_url: computed_role == "owner" ? collection.compare_url : nil,
      compare_role: collection.compare_role,
      share_token: computed_role == "owner" ? collection.share_token : nil,
      share_url: computed_role == "owner" ? collection.share_url : nil
    }
  end
end
