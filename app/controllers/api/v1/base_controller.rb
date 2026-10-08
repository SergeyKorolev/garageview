class Api::V1::BaseController < ApplicationController
  protect_from_forgery with: :exception
  before_action :authenticate_user!
  respond_to :json

  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from ActiveRecord::RecordInvalid, with: :unprocessable
  rescue_from ActionController::InvalidAuthenticityToken do
    render json: { error: "Invalid CSRF token" }, status: :unprocessable_entity
  end

  private

  def valid_request_origin?
    # Extension requests still require a valid session CSRF token.
    request.origin.to_s.match?(/\Achrome-extension:\/\/[a-p]{32}\z/) || super
  end

  def not_found
    render json: { error: "Not found" }, status: :not_found
  end

  def unprocessable(exception)
    render json: { error: exception.record.errors.full_messages }, status: :unprocessable_entity
  end

  def authenticate_user!
    unless current_user
      render json: { error: "Unauthorized" }, status: :unauthorized
    end
  end
end
