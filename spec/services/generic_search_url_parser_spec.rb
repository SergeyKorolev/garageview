require "rails_helper"

RSpec.describe GenericSearchUrlParser do
  it "names otomoto searches from path segments" do
    result = described_class.new.call("https://www.otomoto.pl/osobowe/bmw/seria-1", "otomoto")
    expect(result[:name]).to eq("Bmw | Seria 1")
  end

  it "names autoscout24 searches from path segments and price bounds" do
    result = described_class.new.call("https://www.autoscout24.de/lst/bmw/118?pricefrom=5000&priceto=20000", "autoscout24")
    expect(result[:name]).to eq("Bmw | 118 | 5000-20000")
    expect(result[:params]).to include("pricefrom" => "5000", "priceto" => "20000")
  end

  it "falls back to a source label name when the path has no segments" do
    result = described_class.new.call("https://www.otomoto.pl/", "otomoto")
    expect(result[:name]).to eq("otomoto.pl search")
  end
end
