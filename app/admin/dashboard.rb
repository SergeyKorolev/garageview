# frozen_string_literal: true

ActiveAdmin.register_page "Dashboard" do
  menu priority: 1, label: proc { I18n.t("active_admin.dashboard") }

  content title: proc { I18n.t("active_admin.dashboard") } do
    columns do
      column do
        panel "Overview" do
          ul do
            li "Users: #{User.count}"
            li "Collections: #{Collection.count}"
            li "Cars: #{Car.count}"
            li "Deep Researches: #{DeepResearch.count}"
            li "Search Filters: #{SearchFilter.count}"
          end
        end
      end

      column do
        panel "Recent Users" do
          table_for User.order(created_at: :desc).limit(10) do
            column(:name) { |u| link_to u.name || u.email, admin_user_path(u) }
            column(:email)
            column(:collections) { |u| u.collections.count }
            column(:joined) { |u| u.created_at.strftime("%b %d, %Y") }
          end
        end
      end
    end

    columns do
      column do
        panel "Recent Collections" do
          table_for Collection.order(created_at: :desc).limit(10) do
            column(:name) { |b| link_to b.name, admin_collection_path(b) }
            column(:user) { |b| link_to b.user.name || b.user.email, admin_user_path(b.user) }
            column(:cars) { |b| b.collection_cars.count }
            column(:created) { |b| b.created_at.strftime("%b %d, %Y %H:%M") }
          end
        end
      end

      column do
        panel "Recent Deep Researches" do
          table_for DeepResearch.order(created_at: :desc).limit(10) do
            column(:title) { |r| link_to (r.title || "Research ##{r.id}"), admin_deep_research_path(r) }
            column(:collection) { |r| link_to r.collection.name, admin_collection_path(r.collection) }
            column(:created) { |r| r.created_at.strftime("%b %d, %Y %H:%M") }
          end
        end
      end
    end
  end
end
