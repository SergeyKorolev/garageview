class InvitationsController < ApplicationController
  layout "invitation"

  def accept
    @member = CollectionMember.pending.find_by(token: params[:token])

    unless @member
      @title = t("invitations.invalid_title")
      @message = t("invitations.invalid_body")
      return render :error, status: :not_found
    end

    if @member.token_expires_at < Time.current
      @title = t("invitations.expired_title")
      @message = t("invitations.expired_body")
      return render :error, status: :gone
    end

    if current_user
      # User is logged in — verify email matches the invitation
      unless current_user.email.downcase == @member.invited_email.downcase
        @title = t("invitations.invalid_title")
        @message = t("invitations.email_mismatch_body", email: mask_email(@member.invited_email))
        return render :error, status: :forbidden
      end

      if @member.user_id.present? && @member.user_id != current_user.id
        @title = t("invitations.already_accepted_title")
        @message = t("invitations.already_accepted_body")
        return render :error, status: :unprocessable_entity
      end

      @member.accept!(current_user)
      redirect_to "/collections/#{@member.collection_id}"
    else
      # User is not logged in — store token and redirect to OAuth
      session[:pending_invite_token] = params[:token]
      redirect_to user_google_oauth2_omniauth_authorize_path
    end
  end

  private

  def mask_email(email)
    local, domain = email.split("@", 2)
    "#{local[0..2]}...@#{domain}"
  end
end
