require "rails_helper"

RSpec.describe CollectionAccessible, type: :controller do
  controller(ApplicationController) do
    include CollectionAccessible

    def index
      render json: accessible_collections.pluck(:id)
    end

    def edit
      render json: editable_collections.pluck(:id)
    end

    def show
      render json: owned_collections.pluck(:id)
    end
  end

  let(:user) { create(:user) }
  let(:other_user) { create(:user) }
  let!(:owned_collection) { create(:collection, user: user) }
  let!(:other_collection) { create(:collection, user: other_user) }

  before do
    routes.draw do
      get "index" => "anonymous#index"
      get "edit" => "anonymous#edit"
      get "show" => "anonymous#show"
    end
    sign_in user
  end

  describe "#accessible_collections" do
    it "returns collections the user owns or has accepted membership in" do
      create(:collection_member,
        collection: other_collection,
        user: user,
        invited_email: user.email,
        role: :viewer,
        status: :accepted
      )
      get :index
      ids = response.parsed_body
      expect(ids).to include(owned_collection.id)
      expect(ids).to include(other_collection.id)
    end
  end

  describe "#editable_collections" do
    it "excludes collections where user is only a viewer" do
      create(:collection_member,
        collection: other_collection,
        user: user,
        invited_email: user.email,
        role: :viewer,
        status: :accepted
      )
      get :edit
      ids = response.parsed_body
      expect(ids).to include(owned_collection.id)
      expect(ids).not_to include(other_collection.id)
    end
  end

  describe "#owned_collections" do
    it "returns only collections owned by the current user" do
      get :show
      ids = response.parsed_body
      expect(ids).to include(owned_collection.id)
      expect(ids).not_to include(other_collection.id)
    end
  end
end
