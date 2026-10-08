class Api::V1::CollectionMembersController < Api::V1::BaseController
  include CollectionAccessible

  before_action :set_accessible_collection, only: [ :index, :destroy ]
  before_action :set_owned_collection, only: [ :create, :update ]
  before_action :set_member, only: [ :update, :destroy ]

  def index
    members = @collection.collection_members.includes(:user, :invited_by).order(:created_at)

    render json: {
      members: members.map { |m| member_json(m) }
    }
  end

  def create
    email = params[:email]&.strip&.downcase

    unless email.present? && email.match?(URI::MailTo::EMAIL_REGEXP)
      return render json: { error: "Invalid email address" }, status: :unprocessable_entity
    end

    if email == current_user.email
      return render json: { error: "You cannot invite yourself" }, status: :unprocessable_entity
    end

    if @collection.default?
      return render json: { error: "Cannot share the default collection" }, status: :unprocessable_entity
    end

    unless %w[editor viewer].include?(params[:role])
      return render json: { error: "Invalid role" }, status: :unprocessable_entity
    end

    # Rate limit: 20 invites per collection per hour
    recent_invites = @collection.collection_members
      .where.not(role: :owner)
      .where(created_at: 1.hour.ago..)
      .count
    if recent_invites >= 20
      return render json: { error: "Too many invitations. Please wait before sending more." }, status: :unprocessable_entity
    end

    existing = @collection.collection_members.find_by(invited_email: email)
    if existing&.accepted?
      return render json: { error: "This person is already a member" }, status: :unprocessable_entity
    end

    invited_user = User.find_by(email: email)

    if existing&.pending?
      # Update role on existing pending invitation
      existing.update!(role: params[:role])
      SendCollectionInviteJob.perform_later(existing.id)
      return render json: member_json(existing.reload), status: :created
    end

    member = @collection.collection_members.create!(
      user: invited_user,
      invited_email: email,
      invited_by: current_user,
      role: params[:role],
      status: :pending
    )

    SendCollectionInviteJob.perform_later(member.id)

    render json: member_json(member), status: :created
  end

  def update
    if @member.owner?
      return render json: { error: "Cannot change the owner's role" }, status: :unprocessable_entity
    end

    unless %w[editor viewer].include?(params[:role])
      return render json: { error: "Invalid role" }, status: :unprocessable_entity
    end

    @member.update!(role: params[:role])
    render json: member_json(@member)
  end

  def destroy
    is_owner = @collection.user_id == current_user.id

    if @member.owner?
      return render json: { error: "Owner cannot leave. Delete the collection instead." }, status: :forbidden
    end

    # Non-owner can only delete their own membership (leave)
    unless is_owner || @member.user_id == current_user.id
      return render json: { error: "Forbidden" }, status: :forbidden
    end

    @member.destroy!
    head :no_content
  end

  private

  def set_accessible_collection
    @collection = accessible_collections.find(params[:collection_id])
  end

  def set_owned_collection
    @collection = owned_collections.find(params[:collection_id])
  end

  def set_member
    @member = @collection.collection_members.find(params[:id])
  end

  def member_json(member)
    user = member.user
    inviter = member.invited_by

    {
      id: member.id,
      user_id: user&.id,
      name: user&.name,
      email: member.invited_email,
      avatar_url: user&.avatar_url,
      role: member.role,
      status: member.status,
      created_at: member.created_at
    }
  end
end
