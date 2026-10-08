class Api::V1::UsersController < Api::V1::BaseController
  rate_limit to: 1, within: 1.hour, only: :export, by: -> { current_user&.id }

  def show
    render json: user_json(current_user)
  end

  def update
    current_user.update!(user_params)
    render json: user_json(current_user)
  end

  def export
    user = current_user
    collections = user.collections.includes(
      collection_cars: :car,
      search_filters: [],
      deep_researches: []
    )
    conversations = user.agent_conversations
    memberships = user.collection_members.includes(:collection)

    export_data = build_export(user, collections, conversations, memberships)

    response.headers["Content-Disposition"] = "attachment; filename=\"garageview-export-#{Date.current}.json\""
    render json: export_data
  end

  def destroy
    user = current_user
    email = user.email
    name = user.name

    # Skip default collection protection when deleting entire account
    Collection.skip_callback(:destroy, :before, :prevent_default_deletion)

    begin
      sign_out(user)
      user.destroy!
    ensure
      Collection.set_callback(:destroy, :before, :prevent_default_deletion)
    end

    # Send goodbye email after successful deletion
    MailtrapEmailService.send_account_deleted(email, name)

    render json: { message: "Account deleted" }
  end

  private

  def user_params
    params.require(:user).permit(:latitude, :longitude, :location_name, :theme, :currency, :language, :onboarded)
  end

  def build_export(user, collections, conversations, memberships)
    {
      exported_at: Time.current.iso8601,
      user: export_user(user),
      collections: collections.map { |c| export_collection(c) },
      agent_conversations: conversations.map { |c| export_conversation(c) },
      collection_memberships: memberships.map { |m| export_membership(m) }
    }
  end

  def export_user(user)
    {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      provider: user.provider,
      latitude: user.latitude,
      longitude: user.longitude,
      location_name: user.location_name,
      theme: user.theme,
      currency: user.currency,
      language: user.language,
      onboarded: user.onboarded,
      created_at: user.created_at,
      updated_at: user.updated_at
    }
  end

  def export_collection(collection)
    {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      default: collection.default,
      latitude: collection.latitude,
      longitude: collection.longitude,
      location_name: collection.location_name,
      created_at: collection.created_at,
      updated_at: collection.updated_at,
      cars: collection.collection_cars.map { |cc| export_collection_car(cc) },
      search_filters: collection.search_filters.map { |sf| export_search_filter(sf) },
      deep_researches: collection.deep_researches.map { |dr| export_deep_research(dr) }
    }
  end

  def export_collection_car(collection_car)
    car = collection_car.car
    {
      collection_car: {
        id: collection_car.id,
        rating: collection_car.rating,
        ai_rating: collection_car.ai_rating,
        ai_explanation: collection_car.ai_explanation,
        added_via: collection_car.added_via,
        search_filter_id: collection_car.search_filter_id,
        created_at: collection_car.created_at
      },
      car: {
        id: car.id,
        external_id: car.external_id,
        source: car.source,
        title: car.title,
        listing_url: car.listing_url,
        price_cents: car.price_cents,
        price_currency: car.price_currency,
        mileage_km: car.mileage_km,
        first_registration: car.first_registration,
        power_kw: car.power_kw,
        fuel_type: car.fuel_type,
        transmission: car.transmission,
        co2_emissions: car.co2_emissions,
        seller_name: car.seller_name,
        seller_type: car.seller_type,
        seller_address: car.seller_address,
        seller_latitude: car.seller_latitude,
        seller_longitude: car.seller_longitude,
        photos: car.photos,
        features: car.features,
        ai_analysis: car.ai_analysis,
        ai_analyzed_at: car.ai_analyzed_at,
        status: car.status,
        last_scraped_at: car.last_scraped_at,
        created_at: car.created_at,
        updated_at: car.updated_at
      }
    }
  end

  def export_search_filter(sf)
    {
      id: sf.id,
      name: sf.name,
      search_url: sf.search_url,
      params: sf.params,
      active: sf.active,
      refresh_interval_hours: sf.refresh_interval_hours,
      expected_count: sf.expected_count,
      last_refreshed_at: sf.last_refreshed_at,
      created_at: sf.created_at,
      updated_at: sf.updated_at
    }
  end

  def export_deep_research(dr)
    {
      id: dr.id,
      title: dr.title,
      car_ids: dr.car_ids,
      status: dr.status,
      result: dr.result,
      created_at: dr.created_at,
      updated_at: dr.updated_at
    }
  end

  def export_conversation(conversation)
    {
      id: conversation.id,
      title: conversation.title,
      conversation_type: conversation.conversation_type,
      messages: conversation.messages,
      metadata: conversation.metadata,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at
    }
  end

  def export_membership(membership)
    {
      id: membership.id,
      collection_id: membership.collection_id,
      collection_name: membership.collection&.name,
      role: membership.role,
      status: membership.status,
      invited_email: membership.invited_email,
      accepted_at: membership.accepted_at,
      created_at: membership.created_at
    }
  end

  def user_json(user)
    {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      latitude: user.latitude,
      longitude: user.longitude,
      location_name: user.location_name,
      theme: user.theme,
      currency: user.currency,
      language: user.language,
      onboarded: user.onboarded
    }
  end
end
