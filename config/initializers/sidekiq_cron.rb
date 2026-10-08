if defined?(Sidekiq::Cron) && !ENV["SECRET_KEY_BASE_DUMMY"]
  Rails.application.config.after_initialize do
    Sidekiq::Cron::Job.create(
      name: "Refresh all search filters - every 6 hours",
      cron: "0 */6 * * *",
      class: "RefreshAllFiltersJob"
    )
  end
end
