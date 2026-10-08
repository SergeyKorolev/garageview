import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import GridView from "@/components/views/GridView";
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

vi.mock("@/hooks/useMediaQuery", () => ({
  useIsMobile: () => false,
}));

vi.mock("swiper/react", () => ({
  Swiper: ({ children }: any) => <div data-testid="swiper">{children}</div>,
  SwiperSlide: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("swiper/modules", () => ({
  Navigation: {},
  Pagination: {},
}));

function makeCar(id: number, title: string): Car {
  return {
    id,
    external_id: `md-${id}`,
    title,
    listing_url: `https://mobile.de/${id}`,
    price_cents: 2000000 + id * 100000,
    price_currency: "EUR",
    mileage_km: 50000 + id * 10000,
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
    features: [],
    rating: 0,
    ai_rating: null,
    ai_explanation: null,
    ai_analysis: null,
    ai_analyzed_at: null,
    last_scraped_at: "2024-01-01",
    created_at: "2024-01-01",
    status: "ready",
  };
}

describe("GridView", () => {
  it("renders car cards for each car", () => {
    const cars = [makeCar(1, "BMW 320d"), makeCar(2, "Audi A4")];

    renderWithProviders(
      <GridView cars={cars} isLoading={false} />
    );

    expect(screen.getByText("BMW 320d")).toBeInTheDocument();
    expect(screen.getByText("Audi A4")).toBeInTheDocument();
  });

  it("shows empty state when cars array is empty", () => {
    renderWithProviders(
      <GridView cars={[]} isLoading={false} />
    );

    expect(screen.getByText("No cars yet")).toBeInTheDocument();
  });

  it("shows loading spinner when loading", () => {
    const { container } = renderWithProviders(
      <GridView cars={[]} isLoading={true} />
    );

    // LoadingSpinner renders an animated spinner
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });
});
