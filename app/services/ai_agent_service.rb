class AiAgentService
  include LanguageAware

  MAX_TOOL_ROUNDS = 5

  TOOLS = [
    {
      type: "function",
      function: {
        name: "create_collection",
        description: "Create a new empty collection to organize cars",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name for the collection, e.g. 'BMW X3' or 'Family SUV'" }
          },
          required: [ "name" ]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "add_cars_to_collection",
        description: "Add one or more individual car listing URLs from mobile.de, otomoto.pl or autoscout24 to an existing collection. Use for URLs like mobile.de/fahrzeuge/details..., otomoto.pl/osobowe/oferta/...-ID....html or autoscout24.de/angebote/...",
        parameters: {
          type: "object",
          properties: {
            collection_name_or_id: { type: "string", description: "Collection name or numeric ID" },
            urls: { type: "array", items: { type: "string" }, description: "Array of car listing URLs (mobile.de, otomoto.pl or autoscout24)" }
          },
          required: [ "collection_name_or_id", "urls" ]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "create_collection_from_search",
        description: "Create a new collection and import all cars from a SEARCH results URL on mobile.de (https://suchen.mobile.de/...), otomoto.pl (e.g. otomoto.pl/osobowe/bmw) or autoscout24 (e.g. autoscout24.de/lst/bmw). Do NOT use for single car listing URLs.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name for the new collection" },
            search_url: { type: "string", description: "Search results URL on mobile.de, otomoto.pl or autoscout24" }
          },
          required: [ "name", "search_url" ]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "launch_deep_research",
        description: "Launch AI deep research analysis comparing cars in a collection",
        parameters: {
          type: "object",
          properties: {
            collection_name_or_id: { type: "string", description: "Collection name or numeric ID" }
          },
          required: [ "collection_name_or_id" ]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "rate_cars",
        description: "Start AI rating for all cars in a collection — analyzes pricing, condition, and features",
        parameters: {
          type: "object",
          properties: {
            collection_name_or_id: { type: "string", description: "Collection name or numeric ID" }
          },
          required: [ "collection_name_or_id" ]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "list_collections",
        description: "List all user's collections with car counts",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "get_collection_cars",
        description: "Get summary of cars in a specific collection",
        parameters: {
          type: "object",
          properties: {
            collection_name_or_id: { type: "string", description: "Collection name or numeric ID" }
          },
          required: [ "collection_name_or_id" ]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "calculate_travel_time",
        description: "Calculate travel time (driving and flying) from the user's location to a specific car's seller location. Use when the user asks about travel time, distance, or how to get to a car.",
        parameters: {
          type: "object",
          properties: {
            car_id: { type: "integer", description: "The car ID to calculate travel to" }
          },
          required: [ "car_id" ]
        }
      }
    }
  ].freeze

  def initialize(user, conversation = nil, current_collection: nil)
    @user = user
    @conversation = conversation
    @current_collection = current_collection
    @actions = []
    @tool_names_used = []
  end

  def chat(message)
    # Add user message to conversation
    user_msg = { role: "user", content: message }
    @conversation.add_message(user_msg)

    # Build messages for OpenAI
    openai_messages = build_messages

    # Tool-use loop
    rounds = 0
    loop do
      rounds += 1
      break if rounds > MAX_TOOL_ROUNDS

      response = call_openai(openai_messages)
      choice = response.dig("choices", 0, "message")
      break unless choice

      # If the model wants to call tools
      if choice["tool_calls"].present?
        # Save assistant message with tool_calls
        assistant_msg = { role: "assistant", content: choice["content"], tool_calls: choice["tool_calls"] }
        openai_messages << assistant_msg

        # Execute each tool and append results
        choice["tool_calls"].each do |tc|
          fn_name = tc.dig("function", "name")
          fn_args = parse_args(tc.dig("function", "arguments"))
          @tool_names_used << fn_name

          result = execute_tool(fn_name, fn_args)
          tool_msg = { role: "tool", tool_call_id: tc["id"], content: result.to_json }
          openai_messages << tool_msg
        end
      else
        # Final response — no more tool calls
        reply = choice["content"] || ""
        assistant_msg = { role: "assistant", content: reply }
        @conversation.add_message(assistant_msg)

        # Auto-classify conversation
        @conversation.auto_type_from_tools(@tool_names_used)
        @conversation.auto_title_from_actions(@actions)

        return { reply: reply, actions: @actions, conversation_type: @conversation.conversation_type }
      end
    end

    # Fallback if we exceeded max rounds
    fallback = "I completed the requested actions."
    @conversation.add_message({ role: "assistant", content: fallback })
    @conversation.auto_type_from_tools(@tool_names_used)
    @conversation.auto_title_from_actions(@actions)
    { reply: fallback, actions: @actions, conversation_type: @conversation.conversation_type }
  end

  private

  def build_messages
    collections_context = @user.collections.includes(collection_cars: :car).limit(15).map { |b|
      prices = b.collection_cars.filter_map { |bc| bc.car&.price_cents }.sort
      price_info = if prices.any?
        min_k = (prices.first / 100_000.0).round(1)
        max_k = (prices.last / 100_000.0).round(1)
        min_k == max_k ? "~#{min_k}k €" : "#{min_k}k–#{max_k}k €"
      end
      parts = [ "#{b.collection_cars.count} cars", price_info ].compact.join(", ")
      "- #{b.name} (#{parts})"
    }.join("\n")

    system_prompt = AiAgentPrompt.system_prompt(
      user: @user,
      collections_context: collections_context,
      current_collection_context: AiAgentPrompt.build_current_collection_context(@current_collection),
      user_location_context: AiAgentPrompt.build_user_location_context(@user),
      language_instruction: language_instruction_for_user
    )

    messages = [ { role: "system", content: system_prompt } ]
    messages + @conversation.last_n_messages(20)
  end

  def execute_tool(name, args)
    case name
    when "create_collection"
      tool_create_collection(args)
    when "add_cars_to_collection"
      tool_add_cars(args)
    when "create_collection_from_search"
      tool_create_from_search(args)
    when "launch_deep_research"
      tool_launch_research(args)
    when "rate_cars"
      tool_rate_cars(args)
    when "list_collections"
      tool_list_collections
    when "get_collection_cars"
      tool_get_collection_cars(args)
    when "calculate_travel_time"
      tool_calculate_travel(args)
    else
      { error: "Unknown tool: #{name}" }
    end
  rescue ActiveRecord::RecordNotFound => e
    { error: "Not found: #{e.message}" }
  rescue => e
    { error: e.message }
  end

  # --- Tool implementations ---

  def tool_create_collection(args)
    collection = @user.collections.create!(name: args["name"])
    action = { type: "collection_created", collection_id: collection.id, name: collection.name }
    @actions << action
    { collection_id: collection.id, name: collection.name, cars_count: 0 }
  end

  def tool_add_cars(args)
    collection = resolve_collection(args["collection_name_or_id"])
    urls = Array(args["urls"])
    added = 0

    skipped = []
    urls.each do |url|
      source = ListingSource.detect(url)
      unless source
        skipped << url
        next
      end

      external_id = ListingSource.extract_external_id(url) || SecureRandom.hex(8)
      car = Car.find_or_initialize_by(source: source, external_id: external_id)
      car.assign_attributes(listing_url: url, status: "pending") unless car.persisted? && car.status == "ready"
      car.save!
      collection.collection_cars.find_or_create_by!(car: car, added_via: "agent")
      ScrapeCarJob.perform_later(car.id)
      added += 1
    end

    action = { type: "cars_added", collection_id: collection.id, collection_name: collection.name, cars_added: added }
    @actions << action
    result = { collection_id: collection.id, collection_name: collection.name, cars_added: added }
    result[:skipped_unsupported_urls] = skipped if skipped.any?
    result
  end

  def tool_create_from_search(args)
    url = args["search_url"].to_s.strip
    source = ListingSource.detect(url)
    unless source
      return { error: "Unsupported search URL. Supported sites: mobile.de, otomoto.pl, autoscout24." }
    end
    # Validate this is actually a search URL, not a single car listing
    unless ListingSource.search_url?(url)
      return { error: "This URL looks like a single car listing, not a search URL. Use add_cars_to_collection instead to add it to an existing collection, or ask the user which collection to use." }
    end

    collection = @user.collections.create!(name: args["name"])
    parsed = source == "mobile_de" ? MobileDe::UrlParser.new.call(url) : GenericSearchUrlParser.new.call(url, source)
    filter = collection.search_filters.create!(
      search_url: url,
      name: parsed[:name],
      params: parsed[:params]
    )
    RefreshSearchFilterJob.perform_later(filter.id)

    action = { type: "collection_from_search", collection_id: collection.id, name: collection.name, filter_id: filter.id }
    @actions << action
    { collection_id: collection.id, collection_name: collection.name, filter_id: filter.id, status: "importing" }
  end

  def tool_launch_research(args)
    collection = resolve_collection(args["collection_name_or_id"])
    ready_cars = collection.cars.where(status: "ready").limit(20)
    return { error: "Need at least 2 ready cars for research" } if ready_cars.count < 2

    car_ids = ready_cars.pluck(:id)
    title = ready_cars.limit(3).pluck(:title).compact.map { |t| t.split.first(3).join(" ") }.join(" vs ")
    title += " — #{Time.current.strftime('%d.%m.%Y %H:%M')}"

    research = collection.deep_researches.create!(car_ids: car_ids, title: title, status: "pending")
    DeepResearchJob.perform_later(research.id)

    action = { type: "research_launched", collection_id: collection.id, collection_name: collection.name, research_id: research.id }
    @actions << action
    { research_id: research.id, collection_name: collection.name, car_count: car_ids.size, status: "pending" }
  end

  def tool_rate_cars(args)
    collection = resolve_collection(args["collection_name_or_id"])
    AiCarRatingJob.perform_later(collection.id)

    action = { type: "rating_started", collection_id: collection.id, collection_name: collection.name }
    @actions << action
    { status: "rating_started", collection_name: collection.name, car_count: collection.collection_cars.count }
  end

  def tool_list_collections
    @user.collections.includes(:collection_cars).map { |b|
      { id: b.id, name: b.name, cars_count: b.collection_cars.count }
    }
  end

  def tool_get_collection_cars(args)
    collection = resolve_collection(args["collection_name_or_id"])
    collection.cars.where(status: "ready").limit(20).map { |c|
      { id: c.id, title: c.title, price: c.price_cents && "€#{c.price_cents / 100}",
        mileage: c.mileage_km && "#{c.mileage_km.to_s.gsub(/(\d)(?=(\d{3})+$)/, '\\1.')} km",
        fuel: c.fuel_type, year: c.first_registration&.strftime("%m/%Y") }
    }
  end

  def tool_calculate_travel(args)
    car = Car.joins(collection_cars: :collection).where(collections: { user_id: @user.id }).find(args["car_id"])
    return { error: "Car has no seller location" } unless car.seller_latitude.present? && car.seller_longitude.present?
    return { error: "Your location is not set. Please set your location in settings." } unless @user.latitude.present? && @user.longitude.present?

    result = TravelTimeCalculator.new.call(
      origin_lat: @user.latitude.to_f,
      origin_lng: @user.longitude.to_f,
      dest_lat: car.seller_latitude.to_f,
      dest_lng: car.seller_longitude.to_f
    )

    driving_hours = result[:driving_seconds] ? (result[:driving_seconds] / 3600.0).round(1) : nil
    flying_hours = result[:flying_seconds] ? (result[:flying_seconds] / 3600.0).round(1) : nil

    {
      car_title: car.title,
      car_location: car.seller_address || "#{car.seller_latitude}, #{car.seller_longitude}",
      user_location: @user.location_name || "#{@user.latitude}, #{@user.longitude}",
      distance_km: result[:distance_km],
      driving_time_hours: driving_hours,
      flying_time_hours: flying_hours,
      route_cities: result[:route_cities],
      origin_airport: result[:origin_airport],
      dest_airport: result[:dest_airport],
      last_mile_info: result[:last_mile_info],
      travel_description: result[:travel_description]
    }
  end

  # --- Helpers ---

  def resolve_collection(name_or_id)
    if name_or_id.to_s =~ /^\d+$/
      return @user.collections.find(name_or_id.to_i)
    end
    sanitized = ActiveRecord::Base.sanitize_sql_like(name_or_id.to_s.downcase)
    @user.collections.where("LOWER(name) LIKE ?", "%#{sanitized}%").first ||
      raise(ActiveRecord::RecordNotFound, "No collection matching '#{name_or_id}'")
  end

  def call_openai(messages)
    client = OpenAI::Client.new(access_token: AiModels.api_key, request_timeout: 60)
    ApiLog.log_call(
      service: "AiAgent",
      model: AiModels.agent,
      user: @user,
      request_payload: { message_count: messages.size }
    ) do
      client.chat(parameters: {
        model: AiModels.agent,
        messages: messages,
        tools: TOOLS,
        temperature: 0.3,
        max_tokens: 1500
      })
    end
  end

  def parse_args(json_str)
    JSON.parse(json_str || "{}")
  rescue JSON::ParserError
    {}
  end

  def language_instruction_for_user
    lang = @user.language || "en"
    return "" if lang == "en"
    name = LanguageAware::LANGUAGE_NAMES[lang] || "English"
    "IMPORTANT: Respond entirely in #{name}."
  end
end
