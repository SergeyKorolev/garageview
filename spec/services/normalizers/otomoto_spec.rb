require "rails_helper"

RSpec.describe Normalizers::Otomoto do
  let(:car) { build(:car, source: "otomoto", external_id: "6I0Slp", listing_url: "https://www.otomoto.pl/osobowe/oferta/porsche-macan-ID6I0Slp.html") }

  # Mirrors the real actor output for otomoto.pl/osobowe/oferta/porsche-macan-ID6I0Slp.html
  let(:item) do
    {
      "id" => "ID6I0Slp",
      "url" => "https://www.otomoto.pl/osobowe/oferta/porsche-macan-ID6I0Slp.html",
      "title" => "Porsche Macan",
      "price" => 122_000,
      "currency" => "PLN",
      "images" => (1..25).map { |i| "https://img.otomoto.pl/#{i}.jpg" },
      "details" => {
        "make" => "Porsche", "model" => "Macan", "year" => "2017",
        "mileage" => "160 492 km", "fuel_type" => "Benzyna",
        "engine_power" => "360 KM", "engine_capacity" => "2 997 cm3",
        "gearbox" => "Automatyczna", "transmission" => "4x4 (stały)",
        "color" => "Złoty", "colour_type" => "Metalik", "body_type" => "SUV",
        "new_used" => "Używany", "nr_seats" => "5", "door_count" => "5",
        "co2_emissions" => "207 g/km", "urban_consumption" => "11.4 l/100km",
        "extra_urban_consumption" => "7.4 l/100km", "country_origin" => "Polska",
        "no_accident" => "Tak", "service_record" => "Tak", "original_owner" => "Tak",
        "generation" => "I (2014-)", "vin" => "WP1ZZZ95ZJLB71415"
      },
      "seller" => {
        "name" => "Radek", "type" => "private",
        "location" => { "address" => "Ochota", "city" => "Warszawa", "postal code" => "02-001",
                        "latitude" => 52.21, "longitude" => 20.97 }
      },
      "equipment" => [
        { "key" => "comfort_and_addons", "values" => [ "air_conditioning_type", "armrest_front" ] },
        { "key" => "security", "values" => [ "esp", "driver_airbag" ] }
      ]
    }
  end

  before do
    allow(ExchangeRate).to receive(:rate_to_eur).with("PLN").and_return(0.232)
  end

  it "maps every core column onto the car" do
    described_class.new.call(item, car)
    car.reload

    expect(car.title).to eq("Porsche Macan")
    expect(car.listing_url).to eq(item["url"])
    expect(car.price_cents).to eq((122_000 * 0.232 * 100).round)
    expect(car.price_currency).to eq("EUR")
    expect(car.mileage_km).to eq(160_492)
    expect(car.first_registration).to eq(Date.new(2017, 1, 1))
    expect(car.power_kw).to eq((360 * 0.7355).round)
    expect(car.fuel_type).to eq("gasoline")
    expect(car.transmission).to eq("automatic")
    expect(car.seller_name).to eq("Radek")
    expect(car.seller_type).to eq("private")
    expect(car.seller_address).to eq("Ochota, 02-001, Warszawa")
    expect(car.seller_latitude).to eq(52.21)
    expect(car.photos.size).to eq(20)
  end

  it "builds display attributes in the mobile.de label vocabulary with translated values" do
    described_class.new.call(item, car)
    attributes = car.raw_data["attributes"]

    expect(attributes).to include(
      "Vehicle condition" => "Used vehicle, Accident-free",
      "Category" => "SUV/Off-road Vehicle/Pickup Truck",
      "First Registration" => "2017",
      "Mileage" => "160,492 km",
      "Power" => "265 kW (360 hp)",
      "Cubic Capacity" => "2,997 ccm",
      "Fuel" => "Petrol",
      "Transmission" => "Automatic",
      "Drive type" => "Internal combustion engine",
      "Drivetrain" => "4x4 (permanent)",
      "Colour" => "Gold Metallic",
      "Number of Seats" => "5",
      "Door Count" => "5",
      "CO₂ emissions (comb.)" => "207 g/km",
      "Origin" => "Poland",
      "Service history" => "Yes",
      "Number of Vehicle Owners" => "1",
      "VIN" => "WP1ZZZ95ZJLB71415"
    )
    expect(car.raw_data["details"]).to eq(item["details"])
  end

  it "humanizes equipment tokens and drops group keys" do
    described_class.new.call(item, car)

    expect(car.features).to eq([ "Air conditioning type", "Armrest front", "Esp", "Driver airbag" ])
    expect(car.features).not_to include("Comfort and addons", "comfort_and_addons", "security")
  end

  it "passes unknown dictionary values through untranslated" do
    modified = item.deep_merge("details" => { "color" => "Tęczowy", "body_type" => "Pickup" })
    described_class.new.call(modified, car)
    attributes = car.raw_data["attributes"]

    expect(attributes["Colour"]).to eq("Tęczowy Metallic")
    expect(attributes["Category"]).to eq("Pickup")
  end

  it "builds the title from make/model when title is missing" do
    described_class.new.call(item.except("title"), car)
    expect(car.title).to eq("Porsche Macan")
  end

  it "handles missing optional data" do
    sparse = item.merge("seller" => { "name" => "Jan", "type" => "private" }, "equipment" => nil,
                        "details" => item["details"].except("year", "engine_power", "color"))
    described_class.new.call(sparse, car)

    expect(car.first_registration).to be_nil
    expect(car.power_kw).to be_nil
    expect(car.features).to eq([])
    expect(car.seller_latitude).to be_nil
    expect(car.raw_data["attributes"]).not_to have_key("Colour")
    expect(car.raw_data["attributes"]).not_to have_key("Power")
  end
end
