# frozen_string_literal: true

ActiveAdmin.register User do
  menu priority: 2

  permit_params :name, :email, :location_name, :latitude, :longitude, :currency, :theme, :language, :onboarded

  index do
    selectable_column
    id_column
    column :name
    column :email
    column :provider
    column :location_name
    column :currency
    column :language
    column :onboarded
    column :collections do |u|
      u.collections.count
    end
    column :created_at
    actions
  end

  show do
    attributes_table do
      row :id
      row :name
      row :email
      row :provider
      row :uid
      row :avatar_url do |u|
        u.avatar_url ? image_tag(u.avatar_url, style: "width:40px;height:40px;border-radius:50%") : "—"
      end
      row :location_name
      row :latitude
      row :longitude
      row :currency
      row :language
      row :onboarded
      row :theme
      row :created_at
      row :updated_at
    end

    panel "Collections" do
      table_for resource.collections.order(created_at: :desc) do
        column(:name) { |b| link_to b.name, admin_collection_path(b) }
        column(:cars) { |b| b.collection_cars.count }
        column :created_at
      end
    end
  end

  filter :email
  filter :name
  filter :provider
  filter :location_name
  filter :currency
  filter :created_at
end
