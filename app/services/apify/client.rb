module Apify
  class Client
    BASE_URL = ENV.fetch("MOBILE_DE_SCRAPER_API_URL", "https://api.apify.com/v2")

    def initialize(actor_id:)
      @actor_id = actor_id
    end

    def api_key
      ENV.fetch("MOBILE_DE_SCRAPER_API_KEY", "")
    end

    def fetch_listing(listing_url)
      response = HTTParty.post(
        "#{BASE_URL}/acts/#{@actor_id}/runs",
        headers: auth_headers.merge("Content-Type" => "application/json"),
        body: {
          urls: [ { url: listing_url } ]
        }.to_json,
        timeout: 120
      )

      raise "Scraper API error: #{response.code} - #{response.body[0..200]}" unless response.success?
      parse_response(response)
    end

    def fetch_search_results(search_url, max_items: 100)
      response = HTTParty.post(
        "#{BASE_URL}/acts/#{@actor_id}/runs",
        headers: auth_headers.merge("Content-Type" => "application/json"),
        body: {
          urls: [ { url: search_url } ],
          maxRecords: max_items
        }.to_json,
        timeout: 300
      )

      raise "Scraper API error: #{response.code} - #{response.body[0..200]}" unless response.success?
      parse_response(response)
    end

    private

    # Apify accepts the API token as either `?token=` or `Authorization: Bearer <token>`.
    # Use the header form to keep secrets out of URLs (and thus logs/proxies).
    def auth_headers
      { "Authorization" => "Bearer #{api_key}" }
    end

    def parse_response(response)
      data = JSON.parse(response.body)
      run_id = data.dig("data", "id")
      return [] unless run_id

      Rails.logger.info("Apify run started: #{run_id}")
      poll_for_results(run_id)
    end

    def poll_for_results(run_id, max_attempts: 60)
      max_attempts.times do |i|
        sleep(5)
        status = HTTParty.get(
          "#{BASE_URL}/actor-runs/#{run_id}",
          headers: auth_headers
        )
        run_data = JSON.parse(status.body)
        run_status = run_data.dig("data", "status")

        Rails.logger.info("Apify run #{run_id} poll ##{i + 1}: #{run_status}")

        if run_status == "SUCCEEDED"
          dataset_id = run_data.dig("data", "defaultDatasetId")
          return fetch_dataset(dataset_id)
        elsif run_status == "FAILED" || run_status == "ABORTED"
          raise "Scraper run #{run_status}"
        end
      end

      raise "Scraper run timed out after #{max_attempts * 5}s"
    end

    def fetch_dataset(dataset_id)
      response = HTTParty.get(
        "#{BASE_URL}/datasets/#{dataset_id}/items",
        headers: auth_headers,
        query: { format: "json" }
      )
      JSON.parse(response.body)
    end
  end
end
