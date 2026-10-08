require "rails_helper"

RSpec.describe Normalizers::MobileDe do
  let(:car) { build(:car, source: "mobile_de", external_id: "428493206") }

  let(:item) do
    {
      "title" => "Porsche Taycan 4S",
      "url" => "https://suchen.mobile.de/fahrzeuge/details.html?id=428493206",
      "price" => { "amount" => 59_990, "currency" => "EUR" },
      "properties" => {
        "milage" => "10.600 km", "gearbox" => "Automatik", "fuelType" => "Elektro",
        "power" => "420 kW (571 hp)", "firstRegistration" => "2020-08-01"
      },
      "dealer" => {
        "name" => "EM Automobile e.K.", "sellerType" => "Dealer",
        "addesses" => [ "Demler Str. 5", "50189 Elsdorf" ],
        "location" => { "latitude" => 50.936, "longitude" => 6.567 }
      },
      "images" => [ "https://img.mobile.de/1.jpg" ],
      "features" => [ "LED headlights", "Navigation" ]
    }
  end

  it "maps every field onto the car with canonical fuel/gearbox" do
    described_class.new.call(item, car)
    car.reload

    expect(car.title).to eq("Porsche Taycan 4S")
    expect(car.price_cents).to eq(59_990 * 100)
    expect(car.mileage_km).to eq(10_600)
    expect(car.first_registration).to eq(Date.new(2020, 8, 1))
    expect(car.power_kw).to eq(420)
    expect(car.fuel_type).to eq("electric")
    expect(car.transmission).to eq("automatic")
    expect(car.seller_name).to eq("EM Automobile e.K.")
    expect(car.seller_type).to eq("dealer")
    expect(car.seller_address).to eq("Demler Str. 5, 50189 Elsdorf")
    expect(car.seller_latitude).to eq(50.936)
    expect(car.seller_longitude).to eq(6.567)
    expect(car.photos).to eq([ "https://img.mobile.de/1.jpg" ])
    expect(car.features).to eq([ "LED headlights", "Navigation" ])
    expect(car.raw_data.except("attributes")).to eq(item)
    expect(car.raw_data["attributes"]).to eq("Fuel" => "Electric")
  end

  it "derives electric fuel from driveType when the actor omits fuelType (EVs)" do
    ev = item.deep_merge("properties" => { "fuelType" => nil, "driveType" => "Electric motor" })
    described_class.new.call(ev, car)

    expect(car.fuel_type).to eq("electric")
    expect(car.raw_data["attributes"]["Fuel"]).to eq("Electric")
  end

  it "keeps the actor's own Fuel attribute when present" do
    with_attrs = item.merge("attributes" => { "Fuel" => "Petrol", "Mileage" => "10,600 km" })
    described_class.new.call(with_attrs, car)

    expect(car.raw_data["attributes"]).to eq("Fuel" => "Petrol", "Mileage" => "10,600 km")
  end

  it "preserves the car's existing attributes when the item has none" do
    car.raw_data = { "attributes" => { "Mileage" => "10,600 km", "Colour" => "Grey" } }
    car.save!
    described_class.new.call(item, car)

    expect(car.raw_data["attributes"]).to include("Mileage" => "10,600 km", "Colour" => "Grey", "Fuel" => "Electric")
  end

  it "keeps unknown fuel values as downcased passthrough" do
    described_class.new.call(item.deep_merge("properties" => { "fuelType" => "Ethanol" }), car)
    expect(car.fuel_type).to eq("ethanol")
  end

  it "handles missing dealer and price gracefully" do
    described_class.new.call(item.except("dealer", "price"), car)

    expect(car.price_cents).to be_nil
    expect(car.seller_type).to eq("private")
    expect(car.seller_address).to eq("")
  end
end
