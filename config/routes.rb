require "sidekiq/web"

Rails.application.routes.draw do
  devise_for :admin_users, ActiveAdmin::Devise.config
  ActiveAdmin.routes(self)
  devise_for :users, controllers: { omniauth_callbacks: "users/omniauth_callbacks" }

  authenticate :admin_user do
    mount Sidekiq::Web => "/sidekiq"
  end

  get "up" => "rails/health#show", as: :rails_health_check
  get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker
  get "manifest" => "rails/pwa#manifest", as: :pwa_manifest

  namespace :api do
    namespace :v1 do
      get "csrf", to: "csrf#show"
      resource :me, controller: "users", only: [ :show, :update, :destroy ] do
        get :export
      end

      resources :collections do
        member do
          post :create_compare_link
          delete :revoke_compare_link
          post :share
          delete :share, action: :unshare
        end
        resources :members, controller: "collection_members", only: [ :index, :create, :update, :destroy ]
        resources :cars, controller: "collection_cars", only: [ :index, :create, :update, :destroy ] do
          collection { post :ai_rate }
          member do
            post :share
            delete :share, action: :unshare
          end
        end
        resources :search_filters, only: [ :index, :create, :update, :destroy ] do
          member { post :refresh }
        end
        resources :deep_researches, only: [ :index, :show, :create, :destroy ] do
          member do
            post :chat
            post :share
            delete :share, action: :unshare
          end
        end
      end

      # AI Agent
      post "agent/chat", to: "agent#chat"
      get "agent/conversations", to: "agent#conversations"
      get "agent/conversations/:id", to: "agent#show_conversation"
      delete "agent/conversations/:id", to: "agent#destroy_conversation"

      resources :cars, only: [ :show ] do
        collection do
          post :lookup
          get :check
        end
      end

      post "travel_time", to: "travel_times#compute"

      # Public (no auth) endpoints
      get "public/collections/:token", to: "public_collections#show"
    end
  end

  # Public pages — served with static HTML for crawlers/parsers
  constraints locale: /en|de|fr|es|it|pl|uk/ do
    get ":locale", to: "pages#landing", as: :locale_landing
    get ":locale/privacy", to: "pages#privacy", as: :locale_privacy
    get ":locale/terms", to: "pages#terms", as: :locale_terms
    get ":locale/extension", to: "pages#extension", as: :locale_extension
  end

  get ":locale/guides", to: "guides#missing"
  get ":locale/guides/*path", to: "guides#missing"

  # Print pages (authenticated)
  get "print/car/:collection_id/:car_id", to: "print#car", as: :print_car
  get "print/research/:collection_id/:research_id", to: "print#research", as: :print_research

  # Public shared pages
  get "s/r/:token", to: "shared_researches#show", as: :shared_research
  get "s/v/:token", to: "shared_cars#show", as: :shared_car
  get "s/c/:token", to: "shared_collections#show", as: :shared_collection
  get "s/c/:token/:view", to: "shared_collections#show"
  get "s/j/:token", to: "compare_invites#show", as: :compare_invite
  post "s/j/:token/join", to: "compare_invites#join", as: :compare_invite_join

  # Invitation acceptance (HTML, non-API)
  get "invitations/:token/accept", to: "invitations#accept", as: :accept_invitation

  # SPA catch-all for authenticated routes
  get "*path", to: "frontend#index", constraints: ->(req) {
    !req.xhr? && (req.format.html? || req.format == "*/*" || !req.path.include?(".")) && !req.path.start_with?("/rails/") && !req.path.start_with?("/sidekiq") && !req.path.start_with?("/admin")
  }
  root "pages#landing", defaults: { locale: "en" }
end
