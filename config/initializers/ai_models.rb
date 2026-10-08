module AiModels
  # Central configuration for all AI model names and API keys.
  # Override any model via environment variables.

  # API key: use OPENAI_API_KEY_PRODUCTION / OPENAI_API_KEY_STAGING
  # in their respective environments, falls back to OPENAI_API_KEY.
  def self.api_key
    env_specific = "OPENAI_API_KEY_#{Rails.env.upcase}"
    ENV[env_specific].presence || ENV.fetch("OPENAI_API_KEY", nil)
  end

  def self.api_key?
    api_key.present?
  end

  def self.default
    ENV.fetch("AI_MODEL_DEFAULT", "gpt-4o-mini")
  end

  def self.advanced
    ENV.fetch("AI_MODEL_ADVANCED", "gpt-4o")
  end

  # Per-service overrides (fall back to default/advanced)
  def self.agent
    ENV.fetch("AI_MODEL_AGENT", default)
  end

  def self.car_rating
    ENV.fetch("AI_MODEL_CAR_RATING", default)
  end

  def self.deep_research
    ENV.fetch("AI_MODEL_DEEP_RESEARCH", default)
  end

  def self.deep_research_verdict
    ENV.fetch("AI_MODEL_DEEP_RESEARCH_VERDICT", advanced)
  end

  def self.deep_research_chat
    ENV.fetch("AI_MODEL_DEEP_RESEARCH_CHAT", advanced)
  end

  def self.travel_time
    ENV.fetch("AI_MODEL_TRAVEL_TIME", default)
  end
end
