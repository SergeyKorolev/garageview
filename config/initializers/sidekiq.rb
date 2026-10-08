Sidekiq.configure_server do |config|
  config.redis = { url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0") }

  # Scraper jobs hold a worker thread through multi-minute Apify sleep-poll
  # loops. A separate capsule caps them at 2 threads so they can never occupy
  # the default queue's workers (and vice versa).
  config.capsule("scraper") do |cap|
    cap.concurrency = 2
    cap.queues = %w[scraper]
  end
end

Sidekiq.configure_client do |config|
  config.redis = { url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0") }
end
