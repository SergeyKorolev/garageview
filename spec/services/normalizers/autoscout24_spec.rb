require "rails_helper"

RSpec.describe Normalizers::Autoscout24 do
  let(:car) do
    build(:car, source: "autoscout24", external_id: "ffc954d1-3c9b-42fc-9be9-8bb52c8e0001",
                listing_url: "https://www.autoscout24.de/angebote/renault-megane-ffc954d1-3c9b-42fc-9be9-8bb52c8e0001")
  end

  # Mirrors the real .de actor output (German values, comma-joined features)
  let(:item) do
    {
      "title" => "Renault Megane 1.4 BOSE Edition Grau",
      "mark" => "Renault", "model" => "Megane", "modelVersion" => "1.4 BOSE Edition",
      "url" => "https://www.autoscout24.de/angebote/renault-megane-ffc954d1-3c9b-42fc-9be9-8bb52c8e0001",
      "price" => "€ 2,480", "rawPrice" => 2_480, "currency" => "EUR",
      "milage" => "145.000 km", "firstRegistration" => "04/2013",
      "fuelType" => "Benzin", "power" => "96 kW (131 PS)", "gearbox" => "Schaltgetriebe",
      "state" => "Gebraucht", "bodyType" => "Kombi", "colour" => "Grau", "paint" => "Metallic",
      "manufacturerColour" => "STERNEN-SCHWARZ", "upholstery" => "Teilleder",
      "seller" => "Händler", "contactName" => "Verkaufsteam", "dealerName" => "",
      "location" => "Dresden/Weißig",
      "dealer" => { "address" => { "contry" => "DE", "postalCode" => "01328",
                                   "streetAddress" => "An der Prießnitzaue 9", "addressLocality" => "Dresden/Weißig" } },
      "doors" => "5", "seats" => "5", "gears" => "6", "engineSize" => "1.397 cm³",
      "emissionClass" => "Euro 5", "co2Emission" => "149 g/km (komb.)",
      "countryVersion" => "Deutsche Ausführung", "generalInspection" => "", "fuelConsumption" => "",
      "images" => [ "https://img.autoscout24.de/1.jpg" ],
      "comfort" => "Armlehne, Einparkhilfe Sensoren hinten, Klimaautomatik",
      "safety" => "ABS, ESP, Isofix",
      "extras" => "Alufelgen (16\"), Dachreling"
    }
  end

  before do
    allow(NominatimGeocoder).to receive(:coordinates).and_return({ latitude: 51.06, longitude: 13.85 })
  end

  it "maps the German .de payload onto core columns" do
    described_class.new.call(item, car)
    car.reload

    expect(car.title).to eq("Renault Megane 1.4 BOSE Edition Grau")
    expect(car.price_cents).to eq(2_480 * 100)
    expect(car.mileage_km).to eq(145_000)
    expect(car.first_registration).to eq(Date.new(2013, 4, 1))
    expect(car.power_kw).to eq(96)
    expect(car.fuel_type).to eq("gasoline")
    expect(car.transmission).to eq("manual")
    expect(car.seller_name).to eq("Verkaufsteam")
    expect(car.seller_type).to eq("dealer")
    expect(car.seller_address).to eq("An der Prießnitzaue 9, 01328 Dresden/Weißig, DE")
  end

  it "geocodes the dealer address for map and travel support" do
    described_class.new.call(item, car)

    expect(NominatimGeocoder).to have_received(:coordinates).with("An der Prießnitzaue 9, 01328 Dresden/Weißig, DE")
    expect(car.seller_latitude).to eq(51.06)
    expect(car.seller_longitude).to eq(13.85)
  end

  it "leaves coordinates nil when geocoding fails" do
    allow(NominatimGeocoder).to receive(:coordinates).and_return(nil)
    described_class.new.call(item, car)

    expect(car.seller_latitude).to be_nil
    expect(car.seller_longitude).to be_nil
  end

  it "splits comma-joined feature strings into individual features" do
    described_class.new.call(item, car)

    expect(car.features).to eq([
      "Armlehne", "Einparkhilfe Sensoren hinten", "Klimaautomatik",
      "ABS", "ESP", "Isofix",
      "Alufelgen (16\")", "Dachreling"
    ])
  end

  it "builds display attributes with translated German values" do
    described_class.new.call(item, car)

    expect(car.raw_data["attributes"]).to include(
      "Vehicle condition" => "Used vehicle",
      "Category" => "Estate car",
      "First Registration" => "04/2013",
      "Mileage" => "145,000 km",
      "Power" => "96 kW (131 hp)",
      "Cubic Capacity" => "1,397 ccm",
      "Fuel" => "Petrol",
      "Transmission" => "Manual gearbox",
      "Drive type" => "Internal combustion engine",
      "Colour" => "Grey Metallic",
      "Colour (Manufacturer)" => "STERNEN-SCHWARZ",
      "Interior Design" => "Part leather",
      "Climatisation" => "Automatic climatisation",
      "Parking sensors" => "Rear",
      "Emission Class" => "Euro5",
      "CO₂ emissions (comb.)" => "149 g/km",
      "Origin" => "German edition",
      "Gears" => "6"
    )
    expect(car.raw_data["attributes"]).not_to have_key("Drivetrain")
    expect(car.raw_data["attributes"]).not_to have_key("HU")
    expect(car.raw_data["attributes"]).not_to have_key("Energy consumption (comb.)")
  end

  it "prefers exact coordinates from the .com address object over geocoding" do
    with_coords = item.merge(
      "address" => { "street" => "Vaalserbergweg 305", "city" => "EINDHOVEN", "latitude" => 51.6657, "longitude" => 5.5012 },
      "co2Emission" => "0 g/km (comb.)", "upholsteryColour" => "Black", "upholstery" => "Full leather",
      "comfort" => "360° camera, Automatic climate control, Air suspension"
    )
    described_class.new.call(with_coords, car)

    expect(NominatimGeocoder).not_to have_received(:coordinates)
    expect(car.seller_latitude).to eq(51.6657)
    expect(car.seller_longitude).to eq(5.5012)
    expect(car.raw_data["attributes"]).to include(
      "CO₂ emissions (comb.)" => "0 g/km",
      "Interior Design" => "Full leather, Black",
      "Climatisation" => "Automatic climatisation",
      "Parking sensors" => "360° camera"
    )
  end

  it "handles the actor's documented English output shape" do
    english = {
      "title" => "BMW 118i", "url" => item["url"],
      "rawPrice" => 21_980, "currency" => "EUR",
      "milage" => "45,000 km", "firstRegistrtion" => "03/2020",
      "fuelType" => "Petrol", "power" => "103 kW (140 hp)", "gearbox" => "Manual",
      "seller" => "Dealer", "dealerName" => "Autohaus München", "location" => "München, DE",
      "comfort" => [ "Air conditioning" ], "safety" => [ "ABS", "ESP" ], "extras" => [ "Alloy wheels" ]
    }
    described_class.new.call(english, car)

    expect(car.first_registration).to eq(Date.new(2020, 3, 1))
    expect(car.fuel_type).to eq("gasoline")
    expect(car.seller_type).to eq("dealer")
    expect(car.seller_name).to eq("Autohaus München")
    expect(car.seller_address).to eq("München, DE")
    expect(car.features).to eq([ "Air conditioning", "ABS", "ESP", "Alloy wheels" ])
  end

  it "handles missing optional fields" do
    allow(NominatimGeocoder).to receive(:coordinates).and_return(nil)
    sparse = { "title" => "BMW", "url" => item["url"] }
    described_class.new.call(sparse, car)

    expect(car.price_cents).to be_nil
    expect(car.first_registration).to be_nil
    expect(car.power_kw).to be_nil
    expect(car.fuel_type).to be_nil
    expect(car.features).to eq([])
    expect(car.seller_latitude).to be_nil
  end
end
