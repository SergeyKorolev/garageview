import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import ListView from "@/components/views/ListView";
import type { Car } from "@/types/car";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

vi.mock("@/hooks/useFormatPrice", () => ({
  useFormatPrice: () => (cents: number) => `${(cents / 100).toFixed(0)} EUR`,
}));

function makeCar(id: number, title: string): Car {
  return {
    id,
    external_id: `md-${id}`,
    title,
    listing_url: `https://mobile.de/${id}`,
    price_cents: 2000000,
    price_currency: "EUR",
    mileage_km: 80000,
    first_registration: "2020-01-01",
    power_kw: 110,
    fuel_type: "diesel",
    transmission: "automatic",
    co2_emissions: 120,
    seller_name: "AutoHaus Berlin",
    seller_type: "dealer",
    seller_address: "Berlin",
    seller_latitude: 52.52,
    seller_longitude: 13.405,
    photos: [],
    features: ["Navigation"],
    rating: 3,
    ai_rating: 7,
    ai_explanation: null,
    ai_analysis: null,
    ai_analyzed_at: null,
    last_scraped_at: "2024-01-01",
    created_at: "2024-01-01",
    status: "ready",
  };
}

describe("ListView", () => {
  it("renders a table with car data", () => {
    const cars = [makeCar(1, "BMW 320d"), makeCar(2, "Audi A4")];

    renderWithProviders(
      <ListView cars={cars} isLoading={false} />
    );

    expect(screen.getByText("BMW 320d")).toBeInTheDocument();
    expect(screen.getByText("Audi A4")).toBeInTheDocument();
    // Table headers
    expect(screen.getByText("Car")).toBeInTheDocument();
    expect(screen.getByText("Price")).toBeInTheDocument();
  });

  it("shows empty state when no cars", () => {
    renderWithProviders(
      <ListView cars={[]} isLoading={false} />
    );

    expect(screen.getByText("No cars yet")).toBeInTheDocument();
  });
});
