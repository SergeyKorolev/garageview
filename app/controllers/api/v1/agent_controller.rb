class Api::V1::AgentController < Api::V1::BaseController
  def chat
    message = params[:message]&.strip
    return render(json: { error: "Message is required" }, status: :unprocessable_entity) if message.blank?

    conversation = if params[:conversation_id].present?
                     current_user.agent_conversations.find(params[:conversation_id])
    else
                     current_user.agent_conversations.create!(conversation_type: "general")
    end

    current_collection = current_user.collections.find_by(id: params[:current_collection_id]) if params[:current_collection_id].present?
    service = AiAgentService.new(current_user, conversation, current_collection: current_collection)
    result = service.chat(message)

    render json: {
      conversation_id: conversation.id,
      reply: result[:reply],
      actions: result[:actions],
      conversation_type: result[:conversation_type]
    }
  rescue => e
    Rails.logger.error("Agent chat error: #{e.message}\n#{e.backtrace.first(5).join("\n")}")
    render json: { error: "Something went wrong. Please try again." }, status: :internal_server_error
  end

  def conversations
    scope = current_user.agent_conversations.recent
    scope = scope.by_type(params[:type]) if params[:type].present?

    page = (params[:page] || 1).to_i
    per_page = 20
    total = scope.count
    records = scope.offset((page - 1) * per_page).limit(per_page)

    render json: {
      conversations: records.map { |c| conversation_summary(c) },
      total: total,
      page: page,
      total_pages: (total.to_f / per_page).ceil
    }
  end

  def show_conversation
    conversation = current_user.agent_conversations.find(params[:id])
    render json: conversation_detail(conversation)
  end

  def destroy_conversation
    conversation = current_user.agent_conversations.find(params[:id])
    conversation.destroy!
    head :no_content
  end

  private

  def conversation_summary(c)
    last_msg = c.messages&.last
    {
      id: c.id,
      title: c.title,
      conversation_type: c.conversation_type,
      last_message: last_msg&.dig("content")&.truncate(100),
      message_count: c.messages&.size || 0,
      created_at: c.created_at,
      updated_at: c.updated_at
    }
  end

  def conversation_detail(c)
    {
      id: c.id,
      title: c.title,
      conversation_type: c.conversation_type,
      messages: (c.messages || []).select { |m| m["role"].in?(%w[user assistant]) && m["content"].present? },
      metadata: c.metadata,
      created_at: c.created_at,
      updated_at: c.updated_at
    }
  end
end
