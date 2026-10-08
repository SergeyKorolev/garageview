# frozen_string_literal: true

ActiveAdmin.register Collection do
  menu priority: 3

  permit_params :name, :user_id

  index do
    selectable_column
    id_column
    column :name
    column :user do |b|
      link_to (b.user.name || b.user.email), admin_user_path(b.user)
    end
    column :cars do |b|
      b.collection_cars.count
    end
    column :search_filters do |b|
      b.search_filters.count
    end
    column :deep_researches do |b|
      b.deep_researches.count
    end
    column :created_at
    actions
  end

  show do
    attributes_table do
      row :id
      row :name
      row :user do |b|
        link_to (b.user.name || b.user.email), admin_user_path(b.user)
      end
      row :created_at
      row :updated_at
    end

    panel "Cars (#{resource.collection_cars.count})" do
      table_for resource.collection_cars.includes(:car).order(created_at: :desc) do
        column(:car) { |cc| link_to (cc.car.title || "Car ##{cc.car.id}"), admin_car_path(cc.car) }
        column(:price) { |cc| cc.car.price_cents ? number_to_currency(cc.car.price_cents / 100.0, unit: "€") : "—" }
        column(:mileage) { |cc| cc.car.mileage_km ? "#{number_with_delimiter(cc.car.mileage_km)} km" : "—" }
        column(:ai_rating) { |cc| cc.ai_rating || "—" }
        column(:added_via) { |cc| cc.added_via }
        column(:added_at) { |cc| cc.created_at.strftime("%b %d, %Y %H:%M") }
      end
    end

    panel "Search Filters" do
      table_for resource.search_filters.order(created_at: :desc) do
        column(:id)
        column(:search_url) { |f| link_to f.search_url.truncate(80), f.search_url, target: "_blank" }
        column(:active)
        column(:last_refreshed_at)
      end
    end

    panel "Deep Researches" do
      table_for resource.deep_researches.order(created_at: :desc) do
        column(:title) { |r| link_to (r.title || "Research ##{r.id}"), admin_deep_research_path(r) }
        column(:created_at)
      end
    end
  end

  action_item :force_ai_rate, only: :show do
    link_to "Force AI Re-Rate", force_ai_rate_admin_collection_path(resource), method: :post,
      data: { confirm: "This will clear all existing AI ratings and re-analyze every car. Continue?" }
  end

  member_action :force_ai_rate, method: :post do
    AiCarRatingJob.perform_later(resource.id, force: true)
    redirect_to admin_collection_path(resource), notice: "Force AI re-rating started for all #{resource.collection_cars.count} cars."
  end

  filter :name
  filter :user
  filter :created_at
end
