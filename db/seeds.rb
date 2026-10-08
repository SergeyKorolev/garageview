# Optional local admin; never install a shared default password.
if Rails.env.development? && ENV["SEED_ADMIN_EMAIL"].present?
  admin = AdminUser.find_or_initialize_by(email: ENV.fetch("SEED_ADMIN_EMAIL"))
  if admin.new_record?
    admin.password = ENV.fetch("SEED_ADMIN_PASSWORD")
    admin.save!
  end
end
