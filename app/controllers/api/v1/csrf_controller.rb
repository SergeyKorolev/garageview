class Api::V1::CsrfController < Api::V1::BaseController
  def show
    response.headers["Cache-Control"] = "no-store"
    render json: { csrf_token: form_authenticity_token }
  end
end
