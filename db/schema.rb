# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2026_07_09_163856) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "active_admin_comments", force: :cascade do |t|
    t.string "namespace"
    t.text "body"
    t.string "resource_type"
    t.bigint "resource_id"
    t.string "author_type"
    t.bigint "author_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["author_type", "author_id"], name: "index_active_admin_comments_on_author"
    t.index ["namespace"], name: "index_active_admin_comments_on_namespace"
    t.index ["resource_type", "resource_id"], name: "index_active_admin_comments_on_resource"
  end

  create_table "admin_users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_admin_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_admin_users_on_reset_password_token", unique: true
  end

  create_table "agent_conversations", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "title"
    t.string "conversation_type", default: "general", null: false
    t.jsonb "messages", default: [], null: false
    t.jsonb "metadata", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["conversation_type"], name: "index_agent_conversations_on_conversation_type"
    t.index ["user_id"], name: "index_agent_conversations_on_user_id"
  end

  create_table "api_logs", force: :cascade do |t|
    t.string "service", null: false
    t.string "provider", null: false
    t.string "model"
    t.string "endpoint"
    t.string "status", null: false
    t.integer "prompt_tokens"
    t.integer "completion_tokens"
    t.integer "total_tokens"
    t.float "duration_seconds"
    t.text "request_payload"
    t.text "response_payload"
    t.string "error_message"
    t.bigint "user_id"
    t.bigint "record_id"
    t.string "record_type"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_api_logs_on_created_at"
    t.index ["record_type", "record_id"], name: "index_api_logs_on_record_type_and_record_id"
    t.index ["service"], name: "index_api_logs_on_service"
    t.index ["status"], name: "index_api_logs_on_status"
    t.index ["user_id"], name: "index_api_logs_on_user_id"
  end

  create_table "cars", force: :cascade do |t|
    t.string "external_id", null: false
    t.string "title"
    t.string "listing_url"
    t.integer "price_cents"
    t.string "price_currency", default: "EUR"
    t.integer "mileage_km"
    t.date "first_registration"
    t.integer "power_kw"
    t.string "fuel_type"
    t.string "transmission"
    t.integer "co2_emissions"
    t.string "seller_name"
    t.string "seller_type"
    t.string "seller_address"
    t.decimal "seller_latitude", precision: 10, scale: 7
    t.decimal "seller_longitude", precision: 10, scale: 7
    t.text "photos", default: [], array: true
    t.text "features", default: [], array: true
    t.jsonb "raw_data", default: {}
    t.datetime "last_scraped_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "status", default: "ready"
    t.jsonb "ai_analysis"
    t.datetime "ai_analyzed_at"
    t.string "share_token"
    t.string "source", default: "mobile_de", null: false
    t.index ["fuel_type"], name: "index_cars_on_fuel_type"
    t.index ["seller_latitude", "seller_longitude"], name: "index_cars_on_seller_latitude_and_seller_longitude"
    t.index ["share_token"], name: "index_cars_on_share_token", unique: true
    t.index ["source", "external_id"], name: "index_cars_on_source_and_external_id", unique: true
    t.index ["transmission"], name: "index_cars_on_transmission"
  end

  create_table "collection_cars", force: :cascade do |t|
    t.bigint "collection_id", null: false
    t.bigint "car_id", null: false
    t.string "added_via", default: "manual"
    t.bigint "search_filter_id"
    t.datetime "created_at", null: false
    t.integer "rating", default: 0
    t.integer "ai_rating"
    t.text "ai_explanation"
    t.index ["car_id"], name: "index_collection_cars_on_car_id"
    t.index ["collection_id", "car_id"], name: "index_collection_cars_on_collection_id_and_car_id", unique: true
    t.index ["collection_id"], name: "index_collection_cars_on_collection_id"
    t.index ["search_filter_id"], name: "index_collection_cars_on_search_filter_id"
  end

  create_table "collection_members", force: :cascade do |t|
    t.bigint "collection_id", null: false
    t.bigint "user_id"
    t.bigint "invited_by_id", null: false
    t.string "role", default: "viewer", null: false
    t.string "invited_email", null: false
    t.string "status", default: "pending", null: false
    t.string "token"
    t.datetime "token_expires_at"
    t.datetime "accepted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["collection_id", "invited_email"], name: "index_collection_members_on_collection_and_email", unique: true
    t.index ["collection_id"], name: "index_collection_members_on_collection_id"
    t.index ["invited_by_id"], name: "index_collection_members_on_invited_by_id"
    t.index ["invited_email"], name: "index_collection_members_on_invited_email"
    t.index ["token"], name: "index_collection_members_on_token", unique: true, where: "(token IS NOT NULL)"
    t.index ["user_id", "status"], name: "index_collection_members_on_user_id_and_status"
    t.index ["user_id"], name: "index_collection_members_on_user_id"
  end

  create_table "collections", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", null: false
    t.text "description"
    t.decimal "latitude", precision: 10, scale: 7
    t.decimal "longitude", precision: 10, scale: 7
    t.string "location_name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "default", default: false, null: false
    t.string "compare_token"
    t.string "compare_role", default: "viewer"
    t.string "share_token"
    t.index ["compare_token"], name: "index_collections_on_compare_token", unique: true
    t.index ["share_token"], name: "index_collections_on_share_token", unique: true
    t.index ["user_id"], name: "index_collections_on_user_id"
  end

  create_table "deep_researches", force: :cascade do |t|
    t.bigint "collection_id", null: false
    t.integer "car_ids", default: [], array: true
    t.string "title"
    t.text "result"
    t.string "status", default: "pending"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "share_token"
    t.datetime "shared_at"
    t.index ["collection_id"], name: "index_deep_researches_on_collection_id"
    t.index ["share_token"], name: "index_deep_researches_on_share_token", unique: true
  end

  create_table "search_filters", force: :cascade do |t|
    t.bigint "collection_id", null: false
    t.text "search_url", null: false
    t.string "name"
    t.jsonb "params", default: {}
    t.datetime "last_refreshed_at"
    t.integer "refresh_interval_hours", default: 6
    t.boolean "active", default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "expected_count"
    t.index ["collection_id"], name: "index_search_filters_on_collection_id"
  end

  create_table "travel_time_caches", force: :cascade do |t|
    t.decimal "origin_lat", precision: 10, scale: 7, null: false
    t.decimal "origin_lng", precision: 10, scale: 7, null: false
    t.decimal "dest_lat", precision: 10, scale: 7, null: false
    t.decimal "dest_lng", precision: 10, scale: 7, null: false
    t.integer "driving_seconds"
    t.integer "flying_seconds"
    t.integer "distance_km"
    t.datetime "computed_at", null: false
    t.text "route_cities", default: [], array: true
    t.string "origin_airport"
    t.string "dest_airport"
    t.string "last_mile_info"
    t.text "travel_description"
    t.index ["origin_lat", "origin_lng", "dest_lat", "dest_lng"], name: "index_travel_time_caches_on_coords", unique: true
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.string "provider"
    t.string "uid"
    t.string "name"
    t.string "avatar_url"
    t.decimal "latitude", precision: 10, scale: 7
    t.decimal "longitude", precision: 10, scale: 7
    t.string "location_name"
    t.string "theme", default: "light"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "currency", default: "EUR", null: false
    t.string "language", default: "en", null: false
    t.boolean "onboarded", default: false, null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["provider", "uid"], name: "index_users_on_provider_and_uid", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "agent_conversations", "users"
  add_foreign_key "api_logs", "users"
  add_foreign_key "collection_cars", "cars"
  add_foreign_key "collection_cars", "collections"
  add_foreign_key "collection_cars", "search_filters"
  add_foreign_key "collection_members", "collections"
  add_foreign_key "collection_members", "users"
  add_foreign_key "collection_members", "users", column: "invited_by_id"
  add_foreign_key "collections", "users"
  add_foreign_key "deep_researches", "collections"
  add_foreign_key "search_filters", "collections"
end
