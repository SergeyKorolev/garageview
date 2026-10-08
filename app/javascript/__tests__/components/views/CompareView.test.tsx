import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import CompareView from "@/components/views/CompareView";
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

function makeCar(id: number, title: string, features: string[] = []): Car {
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
    seller_name: "AutoHaus",
    seller_type: "dealer",
    seller_address: "Berlin",
    seller_latitude: 52.52,
    seller_longitude: 13.405,
    photos: [],
    features,
    attributes: { "Colour": "Black", "Fuel type": "Diesel" },
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

describe("CompareView", () => {
  const cars = [
    makeCar(1, "BMW 320d", ["Navigation", "Heated Seats"]),
    makeCar(2, "Audi A4", ["Navigation", "Parking Sensors"]),
  ];

  const defaultProps = {
    cars,
    sortedCars: cars,
    attrKeys: ["Colour", "Fuel type"],
    allFeatures: ["Navigation", "Heated Seats", "Parking Sensors"],
    isLoading: false,
    collectionId: 1,
    fetchingFilter: false,
    onCarClick: vi.fn(),
    onRateCar: vi.fn(),
    selectedForResearch: new Set<number>(),
    onToggleResearch: vi.fn(),
  };

  it("renders car titles in comparison headers", () => {
    renderWithProviders(<CompareView {...defaultProps} />);

    expect(screen.getByText("BMW 320d")).toBeInTheDocument();
    expect(screen.getByText("Audi A4")).toBeInTheDocument();
  });

  it("renders attribute rows", () => {
    renderWithProviders(<CompareView {...defaultProps} />);

    expect(screen.getByText("Colour")).toBeInTheDocument();
    expect(screen.getByText("Fuel type")).toBeInTheDocument();
    // Values
    expect(screen.getAllByText("Black")).toHaveLength(2); // Both cars have Black
  });

  it("renders Equipment & Features separator", () => {
    renderWithProviders(<CompareView {...defaultProps} />);

    expect(screen.getByText(/Equipment/)).toBeInTheDocument();
  });
});
