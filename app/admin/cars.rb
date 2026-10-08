# frozen_string_literal: true

ActiveAdmin.register Car do
  menu priority: 4

  index do
    selectable_column
    id_column
    column :title
    column :price do |c|
      c.price_cents ? number_to_currency(c.price_cents / 100.0, unit: "€") : "—"
    end
    column :mileage_km
    column :first_registration
    column :fuel_type
    column :transmission
    column :ai_rating
    column :status
    column :listing_url do |c|
      c.listing_url ? link_to(ListingSource.label(c.source), c.listing_url, target: "_blank") : "—"
    end
    column :created_at
    actions
  end

  show do
    attributes_table do
      row :id
      row :external_id
      row :source
      row :title
      row :price do |c|
        c.price_cents ? number_to_currency(c.price_cents / 100.0, unit: "€") : "—"
      end
      row :mileage_km
      row :first_registration
      row :power_kw
      row :power_ps
      row :fuel_type
      row :transmission
      row :condition
      row :seller_name
      row :seller_address
      row :seller_type
      row :rating
      row :ai_rating
      row :ai_rating_explanation
      row :status
      row :listing_url do |c|
        c.listing_url ? link_to(c.listing_url, c.listing_url, target: "_blank") : "—"
      end
      row :last_scraped_at
      row :created_at
      row :updated_at
    end

    panel "Description" do
      desc = resource.raw_data&.values_at("description", "Description", "seller_description", "fahrzeugbeschreibung", "Fahrzeugbeschreibung")&.compact&.first
      if desc.present?
        div style: "max-height: 400px; overflow: auto; white-space: pre-wrap; font-size: 13px; line-height: 1.6; padding: 10px;" do
          simple_format(desc)
        end
      else
        para "No description found in raw data."
      end
    end

    panel "Raw Data" do
      if resource.raw_data.present?
        pre style: "max-height: 400px; overflow: auto; background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;" do
          JSON.pretty_generate(resource.raw_data)
        end
      else
        para "No raw data."
      end
    end

    panel "Features" do
      if resource.features.present?
        ul do
          resource.features.each { |f| li f }
        end
      else
        para "No features."
      end
    end

    panel "Collections" do
      table_for resource.collections do
        column(:name) { |b| link_to b.name, admin_collection_path(b) }
        column(:user) { |b| link_to (b.user.name || b.user.email), admin_user_path(b.user) }
      end
    end
  end

  filter :title
  filter :price_cents
  filter :mileage_km
  filter :fuel_type
  filter :transmission
  filter :status
  filter :ai_rating
  filter :seller_name
  filter :created_at
end
