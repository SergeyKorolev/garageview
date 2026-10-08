import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import CarDetailPanel from "@/components/cars/CarDetailPanel";
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

vi.mock("swiper/react", () => ({
  Swiper: ({ children }: any) => <div data-testid="swiper">{children}</div>,
  SwiperSlide: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("swiper/modules", () => ({
  Navigation: {},
  Pagination: {},
}));

function makeCar(overrides: Partial<Car> = {}): Car {
  return {
    id: 1,
    external_id: "123",
    title: "BMW 320d Touring",
    listing_url: "https://mobile.de/listing/123",
    price_cents: 2500000,
    price_currency: "EUR",
    mileage_km: 85000,
    first_registration: "2019-06-01",
    power_kw: 140,
    fuel_type: "diesel",
    transmission: "automatic",
    co2_emissions: 120,
    seller_name: "AutoHaus Berlin",
    seller_type: "dealer",
    seller_address: "Berliner Str 123, Berlin",
    seller_latitude: 52.52,
    seller_longitude: 13.405,
    photos: ["https://example.com/photo1.jpg"],
    features: ["LED Headlights", "Navigation", "Heated Seats"],
    rating: 4,
    ai_rating: null,
    ai_explanation: null,
    ai_analysis: null,
    ai_analyzed_at: null,
    last_scraped_at: "2024-01-01",
    created_at: "2024-01-01",
    status: "ready",
    ...overrides,
  };
}

describe("CarDetailPanel", () => {
  const onClose = vi.fn();
  const onRate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders full car details: title, price, seller", () => {
    const car = makeCar();
    renderWithProviders(
      <CarDetailPanel car={car} onClose={onClose} onRate={onRate} />
    );

    expect(screen.getByText("BMW 320d Touring")).toBeInTheDocument();
    expect(screen.getByText("25000 EUR")).toBeInTheDocument();
    expect(screen.getByText("AutoHaus Berlin")).toBeInTheDocument();
    expect(screen.getByText("dealer")).toBeInTheDocument();
  });

  it("renders AI analysis section when ai_explanation is present (JSON format)", () => {
    const car = makeCar({
      ai_explanation: JSON.stringify({
        verdict: "Great car overall",
        pros: ["Low mileage", "Full service history"],
        cons: ["Minor paint damage"],
        red_flags: [],
        negotiation_points: ["Paint needs touch-up"],
        test_drive_checklist: ["Check suspension"],
        market_price_label: "Fair price",
      }),
    });

    renderWithProviders(
      <CarDetailPanel car={car} onClose={onClose} onRate={onRate} />
    );

    expect(screen.getByText("cars.aiAnalysis")).toBeInTheDocument();
    expect(screen.getByText("Great car overall")).toBeInTheDocument();
    expect(screen.getByText("Low mileage")).toBeInTheDocument();
    expect(screen.getByText("Minor paint damage")).toBeInTheDocument();
  });

  it("renders travel time section when travel_time is present", () => {
    const car = makeCar({
      travel_time: {
        driving_seconds: 10800,
        flying_seconds: 5400,
        distance_km: 500,
        route_cities: ["Leipzig", "Dresden"],
        origin_airport: "BER",
        dest_airport: "MUC",
      },
    });

    renderWithProviders(
      <CarDetailPanel car={car} onClose={onClose} onRate={onRate} />
    );

    expect(screen.getByText("cars.travelToDealer")).toBeInTheDocument();
    expect(screen.getByText("3h 0min")).toBeInTheDocument();
  });

  it("renders equipment list", () => {
    const car = makeCar({
      features: ["LED Headlights", "Navigation", "Heated Seats"],
    });

    renderWithProviders(
      <CarDetailPanel car={car} onClose={onClose} onRate={onRate} />
    );

    expect(screen.getByText("cars.equipment (3)")).toBeInTheDocument();
    expect(screen.getByText("LED Headlights")).toBeInTheDocument();
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Heated Seats")).toBeInTheDocument();
  });

  it("renders AI rating badge when ai_rating is set", () => {
    const car = makeCar({ ai_rating: 7.5 });

    renderWithProviders(
      <CarDetailPanel car={car} onClose={onClose} onRate={onRate} />
    );

    expect(screen.getByText("AI 7.5")).toBeInTheDocument();
  });
});
