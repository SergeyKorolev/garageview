import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import CarCard from "@/components/cars/CarCard";
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
    title: "BMW 320d",
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
    seller_address: "Berlin, Germany",
    seller_latitude: 52.52,
    seller_longitude: 13.405,
    photos: ["https://example.com/photo1.jpg"],
    features: ["LED Headlights", "Navigation"],
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

describe("CarCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders car title, price, and mileage", () => {
    const car = makeCar();
    renderWithProviders(<CarCard car={car} />);

    expect(screen.getByText("BMW 320d")).toBeInTheDocument();
    expect(screen.getByText("25000 EUR")).toBeInTheDocument();
    expect(screen.getByText("85.000 km")).toBeInTheDocument();
  });

  it("renders car photos via PhotoCarousel", () => {
    const car = makeCar({ photos: ["https://example.com/photo1.jpg"] });
    renderWithProviders(<CarCard car={car} />);

    const img = screen.getByAltText("BMW 320d - photo 1");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/photo1.jpg");
  });

  it("renders AI rating badge when ai_rating is set", () => {
    const car = makeCar({ ai_rating: 8.5 });
    renderWithProviders(<CarCard car={car} />);

    expect(screen.getByText("AI 8.5")).toBeInTheDocument();
  });

  it("does not render AI rating badge when ai_rating is null", () => {
    const car = makeCar({ ai_rating: null });
    renderWithProviders(<CarCard car={car} />);

    expect(screen.queryByText(/^AI /)).not.toBeInTheDocument();
  });

  it("renders travel time badge when travel_time is set", () => {
    const car = makeCar({
      travel_time: {
        driving_seconds: 7200,
        flying_seconds: null,
        distance_km: 300,
        route_cities: ["Leipzig"],
      },
    });
    renderWithProviders(<CarCard car={car} />);

    expect(screen.getByText("2h 0min")).toBeInTheDocument();
  });

  it("renders loading spinner when status is scraping and no photos", () => {
    const car = makeCar({
      title: "",
      price_cents: 0,
      mileage_km: 0,
      fuel_type: "",
      power_kw: 0,
      transmission: "",
      seller_name: "",
      photos: [],
      status: "scraping",
    });
    renderWithProviders(<CarCard car={car} />);

    // Should show "Fetching data" message when loading with no photos
    expect(screen.getByText("cars.fetchingData")).toBeInTheDocument();
  });
});
