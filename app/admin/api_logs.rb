# frozen_string_literal: true

ActiveAdmin.register ApiLog do
  menu priority: 6, label: "API Logs"

  actions :index, :show

  filter :service, as: :select, collection: -> { ApiLog.distinct.pluck(:service).sort }
  filter :model, as: :select, collection: -> { ApiLog.distinct.pluck(:model).compact.sort }
  filter :status, as: :select, collection: %w[success error]
  filter :user
  filter :duration_seconds
  filter :total_tokens
  filter :created_at

  scope :all, default: true
  scope("Errors") { |s| s.errors }
  scope("Slow (>10s)") { |s| s.slow }

  index default: true do
    id_column
    column :service
    column :model
    column :status do |log|
      status_tag log.status, class: log.status == "success" ? "ok" : "error"
    end
    column "Duration", :duration_seconds do |log|
      if log.duration_seconds
        color = log.duration_seconds > 30 ? "red" : log.duration_seconds > 10 ? "orange" : "green"
        span "#{log.duration_seconds.round(1)}s", style: "color: #{color}; font-weight: 600;"
      else
        "—"
      end
    end
    column "Tokens", :total_tokens do |log|
      log.total_tokens ? number_with_delimiter(log.total_tokens) : "—"
    end
    column "Prompt", :prompt_tokens do |log|
      log.prompt_tokens ? number_with_delimiter(log.prompt_tokens) : "—"
    end
    column "Completion", :completion_tokens do |log|
      log.completion_tokens ? number_with_delimiter(log.completion_tokens) : "—"
    end
    column :user do |log|
      log.user ? link_to(log.user.name || log.user.email, admin_user_path(log.user)) : "—"
    end
    column "Record" do |log|
      if log.record_type && log.record_id
        "#{log.record_type} ##{log.record_id}"
      else
        "—"
      end
    end
    column :error_message do |log|
      log.error_message.present? ? truncate(log.error_message, length: 60) : ""
    end
    column :created_at do |log|
      log.created_at.strftime("%b %d %H:%M:%S")
    end
  end

  show do
    attributes_table do
      row :id
      row :service
      row :provider
      row :model
      row :endpoint
      row :status do |log|
        status_tag log.status, class: log.status == "success" ? "ok" : "error"
      end
      row :duration_seconds do |log|
        log.duration_seconds ? "#{log.duration_seconds.round(3)} seconds" : "—"
      end
      row :prompt_tokens do |log|
        log.prompt_tokens ? number_with_delimiter(log.prompt_tokens) : "—"
      end
      row :completion_tokens do |log|
        log.completion_tokens ? number_with_delimiter(log.completion_tokens) : "—"
      end
      row :total_tokens do |log|
        log.total_tokens ? number_with_delimiter(log.total_tokens) : "—"
      end
      row :user do |log|
        log.user ? link_to(log.user.name || log.user.email, admin_user_path(log.user)) : "—"
      end
      row :record_type
      row :record_id
      row :error_message
      row :created_at
      row :updated_at
    end

    panel "Request Payload" do
      if resource.request_payload.present?
        begin
          parsed = JSON.parse(resource.request_payload)
          pre style: "max-height: 500px; overflow: auto; background: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 12px; white-space: pre-wrap;" do
            JSON.pretty_generate(parsed)
          end
        rescue
          pre style: "max-height: 500px; overflow: auto; background: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 12px; white-space: pre-wrap;" do
            resource.request_payload
          end
        end
      else
        para "No request payload recorded."
      end
    end

    panel "Response Payload" do
      if resource.response_payload.present?
        begin
          parsed = JSON.parse(resource.response_payload)
          pre style: "max-height: 600px; overflow: auto; background: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 12px; white-space: pre-wrap;" do
            JSON.pretty_generate(parsed)
          end
        rescue
          pre style: "max-height: 600px; overflow: auto; background: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 12px; white-space: pre-wrap;" do
            resource.response_payload
          end
        end
      else
        para "No response payload recorded."
      end
    end
  end

  sidebar "Stats", only: :index do
    logs = ApiLog.where("created_at > ?", 24.hours.ago)
    div do
      h4 "Last 24 hours"
      ul do
        li "Total calls: #{logs.count}"
        li "Errors: #{logs.errors.count}"
        li "Avg duration: #{logs.average(:duration_seconds)&.round(1) || 0}s"
        li "Total tokens: #{number_with_delimiter(logs.sum(:total_tokens))}"
        li "Avg tokens/call: #{logs.average(:total_tokens)&.round(0) || 0}"
      end
    end

    div style: "margin-top: 16px;" do
      h4 "By Service"
      logs.group(:service).count.each do |service, count|
        avg = logs.where(service: service).average(:duration_seconds)&.round(1) || 0
        li "#{service}: #{count} calls (avg #{avg}s)"
      end
    end
  end
end
