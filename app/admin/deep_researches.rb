# frozen_string_literal: true

ActiveAdmin.register DeepResearch do
  menu priority: 5

  index do
    selectable_column
    id_column
    column :title
    column :collection do |r|
      link_to r.collection.name, admin_collection_path(r.collection)
    end
    column :user do |r|
      u = r.collection.user
      link_to (u.name || u.email), admin_user_path(u)
    end
    column :created_at
    actions
  end

  show do
    attributes_table do
      row :id
      row :title
      row :collection do |r|
        link_to r.collection.name, admin_collection_path(r.collection)
      end
      row :user do |r|
        u = r.collection.user
        link_to (u.name || u.email), admin_user_path(u)
      end
      row :created_at
      row :updated_at
    end

    panel "Result" do
      div style: "white-space: pre-wrap; font-family: monospace; font-size: 12px; max-height: 600px; overflow-y: auto;" do
        resource.result.present? ? simple_format(resource.result) : "No result yet."
      end
    end
  end

  filter :title
  filter :collection

  filter :created_at
end
