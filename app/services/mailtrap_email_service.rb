class MailtrapEmailService
  FROM_EMAIL = "noreply@garageview.ai"
  FROM_NAME = "Garageview.ai"
  APP_URL = "https://garageview.ai"

  class << self
    def send_welcome(user)
      template_uuid = ENV["MAILTRAP_WELCOME_TEMPLATE_UUID"]
      return Rails.logger.warn("MailtrapEmailService: MAILTRAP_WELCOME_TEMPLATE_UUID not set, skipping welcome email") unless template_uuid.present?

      send_template(
        to: user.email,
        to_name: user.name,
        template_uuid: template_uuid,
        template_variables: {
          "user_name" => user.name || "there",
          "app_url" => APP_URL
        },
        category: "welcome_email"
      )
    end

    def send_collection_invite(membership)
      template_uuid = ENV["MAILTRAP_COLLECTION_INVITE_TEMPLATE_UUID"]
      return Rails.logger.warn("MailtrapEmailService: MAILTRAP_COLLECTION_INVITE_TEMPLATE_UUID not set, skipping collection invite email") unless template_uuid.present?

      inviter = membership.invited_by
      collection = membership.collection
      accept_url = "#{APP_URL}/invitations/#{membership.token}/accept"

      send_template(
        to: membership.invited_email,
        to_name: membership.invited_email,
        template_uuid: template_uuid,
        template_variables: {
          "inviter_name" => inviter.name || inviter.email,
          "collection_name" => collection.name,
          "role" => membership.role,
          "accept_url" => accept_url,
          "app_url" => APP_URL
        },
        category: "collection_invite"
      )
    end

    def send_account_deleted(email, name)
      template_uuid = ENV["MAILTRAP_DELETED_TEMPLATE_UUID"]
      return Rails.logger.warn("MailtrapEmailService: MAILTRAP_DELETED_TEMPLATE_UUID not set, skipping deleted email") unless template_uuid.present?

      send_template(
        to: email,
        to_name: name,
        template_uuid: template_uuid,
        template_variables: {
          "user_name" => name || "there"
        },
        category: "account_deleted"
      )
    end

    private

    def send_template(to:, to_name:, template_uuid:, template_variables:, category:)
      return unless api_key.present?

      mail = Mailtrap::Mail::FromTemplate.new(
        from: { email: FROM_EMAIL, name: FROM_NAME },
        to: [ { email: to, name: to_name } ],
        template_uuid: template_uuid,
        template_variables: template_variables
      )

      client.send(mail)
      Rails.logger.info("MailtrapEmailService: Sent #{category} email to #{to}")
    rescue StandardError => e
      Rails.logger.error("MailtrapEmailService: Failed to send #{category} email to #{to}: #{e.message}")
    end

    def client
      @client ||= if Rails.env.production?
        Mailtrap::Client.new(api_key: api_key)
      else
        Mailtrap::Client.new(api_key: api_key, sandbox: true, inbox_id: ENV.fetch("MAILTRAP_INBOX_ID", 3493497).to_i)
      end
    end

    def api_key
      ENV["MAILTRAP_API_TOKEN"]
    end
  end
end
