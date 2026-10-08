require "rails_helper"

RSpec.describe ListingSource do
  describe ".detect" do
    it "detects mobile.de hosts" do
      expect(described_class.detect("https://www.mobile.de/fahrzeuge/details.html?id=123456")).to eq("mobile_de")
      expect(described_class.detect("https://suchen.mobile.de/fahrzeuge/search.html?ms=20100")).to eq("mobile_de")
    end

    it "detects otomoto.pl hosts" do
      expect(described_class.detect("https://www.otomoto.pl/osobowe/oferta/volkswagen-passat-ID6I1kUb.html")).to eq("otomoto")
      expect(described_class.detect("https://otomoto.pl/osobowe/bmw/seria-1")).to eq("otomoto")
    end

    it "detects autoscout24 hosts across TLDs" do
      expect(described_class.detect("https://www.autoscout24.de/angebote/bmw-118i-ffc954d1-3c9b-42fc-9be9-8bb52c8e0001")).to eq("autoscout24")
      expect(described_class.detect("https://www.autoscout24.com/lst/bmw/118")).to eq("autoscout24")
    end

    it "returns nil for unsupported hosts" do
      expect(described_class.detect("https://www.cars.com/listing/123456789")).to be_nil
      expect(described_class.detect("https://mobile.de.evil.com/id=123456")).to be_nil
      expect(described_class.detect("not a url")).to be_nil
      expect(described_class.detect(nil)).to be_nil
    end
  end

  describe ".extract_external_id" do
    it "extracts mobile.de numeric ids" do
      expect(described_class.extract_external_id("https://suchen.mobile.de/fahrzeuge/details.html?id=428493206")).to eq("428493206")
      expect(described_class.extract_external_id("https://www.mobile.de/fahrzeuge/details/428493206")).to eq("428493206")
    end

    it "extracts otomoto ID tokens" do
      expect(described_class.extract_external_id("https://www.otomoto.pl/osobowe/oferta/volkswagen-passat-ID6I1kUb.html")).to eq("6I1kUb")
    end

    it "extracts autoscout24 UUIDs" do
      url = "https://www.autoscout24.de/angebote/bmw-118i-sport-line-ffc954d1-3c9b-42fc-9be9-8bb52c8e0001"
      expect(described_class.extract_external_id(url)).to eq("ffc954d1-3c9b-42fc-9be9-8bb52c8e0001")
    end

    it "returns nil when no id is present or source unsupported" do
      expect(described_class.extract_external_id("https://www.otomoto.pl/osobowe/bmw/seria-1")).to be_nil
      expect(described_class.extract_external_id("https://www.cars.com/listing/123456789")).to be_nil
    end
  end

  describe ".search_url?" do
    it "recognizes search URLs per source" do
      expect(described_class.search_url?("https://suchen.mobile.de/fahrzeuge/search.html?ms=20100")).to be(true)
      expect(described_class.search_url?("https://www.otomoto.pl/osobowe/bmw/seria-1")).to be(true)
      expect(described_class.search_url?("https://www.autoscout24.de/lst/bmw/118?priceto=20000")).to be(true)
    end

    it "rejects listing URLs and unsupported hosts" do
      expect(described_class.search_url?("https://www.mobile.de/fahrzeuge/details.html?id=428493206")).to be(false)
      expect(described_class.search_url?("https://www.otomoto.pl/osobowe/oferta/volkswagen-passat-ID6I1kUb.html")).to be(false)
      expect(described_class.search_url?("https://www.cars.com/shopping/")).to be(false)
    end
  end

  describe ".label and .actor_id" do
    it "returns labels" do
      expect(described_class.label("mobile_de")).to eq("mobile.de")
      expect(described_class.label("otomoto")).to eq("otomoto.pl")
      expect(described_class.label("autoscout24")).to eq("autoscout24")
    end

    it "returns default actor ids with env override" do
      expect(described_class.actor_id("otomoto")).to eq("ivanvs~otomoto-scraper")

      allow(ENV).to receive(:fetch).and_call_original
      allow(ENV).to receive(:fetch).with("OTOMOTO_SCRAPER_ACTOR", anything).and_return("someone~other-actor")
      expect(described_class.actor_id("otomoto")).to eq("someone~other-actor")
    end
  end
end
