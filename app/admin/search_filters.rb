# frozen_string_literal: true

ActiveAdmin.register SearchFilter do
  menu priority: 6

  index do
    selectable_column
    id_column
    column :collection do |f|
      link_to f.collection.name, admin_collection_path(f.collection)
    end
    column :search_url do |f|
      link_to f.search_url.truncate(60), f.search_url, target: "_blank"
    end
    column :active
    column :last_refreshed_at
    column :created_at
    actions
  end

  show do
    attributes_table do
      row :id
      row :collection do |f|
        link_to f.collection.name, admin_collection_path(f.collection)
      end
      row :search_url do |f|
        link_to f.search_url, f.search_url, target: "_blank"
      end
      row :active
      row :last_refreshed_at
      row :created_at
      row :updated_at
    end
  end

  filter :active
  filter :collection
  filter :last_refreshed_at
  filter :created_at
end
