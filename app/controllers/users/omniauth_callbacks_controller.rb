class Users::OmniauthCallbacksController < Devise::OmniauthCallbacksController
  def google_oauth2
    auth = request.env["omniauth.auth"]
    is_new_user = !User.exists?(provider: auth.provider, uid: auth.uid)
    @user = User.from_omniauth(auth)

    if @user.persisted?
      MailtrapEmailService.send_welcome(@user) if is_new_user
      sign_in @user, event: :authentication

      if session[:pending_invite_token].present?
        token = session.delete(:pending_invite_token)
        membership = CollectionMember.pending.find_by(token: token)
        if membership && membership.token_expires_at > Time.current &&
           @user.email.downcase == membership.invited_email.downcase
          membership.accept!(@user)
          redirect_to "/collections/#{membership.collection_id}" and return
        end
      end

      if session[:pending_compare_token].present?
        compare_token = session.delete(:pending_compare_token)
        collection = Collection.find_by(compare_token: compare_token)
        if collection && collection.user_id != @user.id
          collection.join_via_compare_link!(@user)
          redirect_to "/collections/#{collection.id}" and return
        end
      end

      redirect_to after_sign_in_path_for(@user)
    else
      session["devise.google_data"] = auth.except(:extra)
      redirect_to new_user_registration_url
    end
  end

  def failure
    redirect_to root_path
  end
end
