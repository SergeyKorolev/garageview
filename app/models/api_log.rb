class ApiLog < ApplicationRecord
  belongs_to :user, optional: true

  scope :recent, -> { order(created_at: :desc) }
  scope :errors, -> { where(status: "error") }
  scope :slow, -> { where("duration_seconds > ?", 10) }

  def self.ransackable_attributes(auth_object = nil)
    %w[id service provider model endpoint status prompt_tokens completion_tokens total_tokens
       duration_seconds error_message user_id record_id record_type created_at updated_at]
  end

  def self.ransackable_associations(auth_object = nil)
    %w[user]
  end

  def self.log_call(service:, provider: "openai", model: nil, endpoint: "chat/completions",
                    user: nil, record: nil, request_payload: nil)
    log = new(
      service: service,
      provider: provider,
      model: model,
      endpoint: endpoint,
      user_id: user&.id,
      record_id: record&.id,
      record_type: record&.class&.name,
      request_payload: request_payload.is_a?(String) ? request_payload : request_payload&.to_json
    )

    start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    begin
      result = yield
      elapsed = Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time

      log.status = "success"
      log.duration_seconds = elapsed.round(3)

      if result.is_a?(Hash)
        usage = result.dig("usage") || result.dig(:usage)
        if usage
          log.prompt_tokens = usage["prompt_tokens"] || usage[:prompt_tokens]
          log.completion_tokens = usage["completion_tokens"] || usage[:completion_tokens]
          log.total_tokens = usage["total_tokens"] || usage[:total_tokens]
        end
        log.response_payload = result.to_json rescue result.to_s
      end

      log.save rescue Rails.logger.warn("Failed to save API log: #{$!.message}")
      result
    rescue => e
      elapsed = Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time
      log.status = "error"
      log.duration_seconds = elapsed.round(3)
      log.error_message = e.message
      log.response_payload = e.message
      log.save rescue Rails.logger.warn("Failed to save API log: #{$!.message}")
      raise
    end
  end
end
