module LanguageAware
  LANGUAGE_NAMES = {
    "en" => "English",
    "de" => "German",
    "fr" => "French",
    "es" => "Spanish",
    "it" => "Italian",
    "pt" => "Portuguese",
    "nl" => "Dutch",
    "pl" => "Polish",
    "cs" => "Czech",
    "sk" => "Slovak",
    "hu" => "Hungarian",
    "ro" => "Romanian",
    "bg" => "Bulgarian",
    "hr" => "Croatian",
    "sl" => "Slovenian",
    "et" => "Estonian",
    "lt" => "Lithuanian",
    "lv" => "Latvian",
    "fi" => "Finnish",
    "sv" => "Swedish",
    "da" => "Danish",
    "nb" => "Norwegian",
    "el" => "Greek",
    "ga" => "Irish",
    "uk" => "Ukrainian"
  }.freeze

  private

  def user_language
    @language ||= @collection.user.language || "en"
  end

  def language_name
    LANGUAGE_NAMES[user_language] || "English"
  end

  def language_instruction
    return "" if user_language == "en"
    "IMPORTANT: Respond entirely in #{language_name}."
  end

  # Models don't know the current date and otherwise misjudge registration
  # dates and vehicle ages against their training-era "now"
  def date_instruction
    "Today's date is #{Date.current.strftime("%B %-d, %Y")}."
  end
end
