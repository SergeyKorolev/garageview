require "rails_helper"

RSpec.describe LanguageAware do
  let(:test_class) do
    Class.new do
      include LanguageAware

      def initialize(collection)
        @collection = collection
      end

      # Expose private methods for testing
      public :user_language, :language_name, :language_instruction
    end
  end

  describe "#user_language" do
    it "returns the user language from the collection" do
      user = create(:user, language: "de")
      collection = create(:collection, user: user)
      service = test_class.new(collection)
      expect(service.user_language).to eq("de")
    end

    it "defaults to 'en' when user language is 'en'" do
      user = create(:user, language: "en")
      collection = create(:collection, user: user)
      service = test_class.new(collection)
      expect(service.user_language).to eq("en")
    end
  end

  describe "#language_name" do
    it "returns the full language name" do
      user = create(:user, language: "fr")
      collection = create(:collection, user: user)
      service = test_class.new(collection)
      expect(service.language_name).to eq("French")
    end
  end

  describe "#language_instruction" do
    it "returns empty string for English" do
      user = create(:user, language: "en")
      collection = create(:collection, user: user)
      service = test_class.new(collection)
      expect(service.language_instruction).to eq("")
    end

    it "returns instruction for non-English language" do
      user = create(:user, language: "sk")
      collection = create(:collection, user: user)
      service = test_class.new(collection)
      expect(service.language_instruction).to include("Slovak")
    end
  end
end
