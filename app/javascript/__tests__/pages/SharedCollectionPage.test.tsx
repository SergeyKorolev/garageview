import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import SharedCollectionPage from "@/pages/SharedCollectionPage";

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

vi.mock("@/components/layout/ThemeToggle", () => ({
  default: () => <button data-testid="theme-toggle">Theme</button>,
}));

vi.mock("@headlessui/react", () => ({
  Dialog: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogPanel: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  Transition: ({ children, show }: any) => (show ? children : null),
  TransitionChild: ({ children }: any) => children,
}));

const mockPublicData = {
  collection: {
    id: 1,
    name: "Shared BMW Collection",
    owner_name: "John",
    cars_count: 2,
    created_at: "2024-01-01",
  },
  cars: [
    {
      id: 1,
      external_id: "md-1",
      title: "BMW 320d",
      listing_url: "https://mobile.de/1",
      price_cents: 2500000,
      price_currency: "EUR",
      mileage_km: 80000,
      first_registration: "2020-01-01",
      power_kw: 140,
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
    },
  ],
  deep_researches: [],
};

vi.mock("@/api/publicCollections", () => ({
  getPublicCollection: () => Promise.resolve(mockPublicData),
}));

describe("SharedCollectionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders collection name and owner", async () => {
    renderWithProviders(<SharedCollectionPage />, {
      routerProps: { initialEntries: ["/s/c/test-token"] },
    });

    await waitFor(() => {
      expect(screen.getByText("Shared BMW Collection")).toBeInTheDocument();
    });
    expect(screen.getByText("by John")).toBeInTheDocument();
  });

  it("renders sign-in link", async () => {
    renderWithProviders(<SharedCollectionPage />, {
      routerProps: { initialEntries: ["/s/c/test-token"] },
    });

    await waitFor(() => {
      expect(screen.getByText(/Sign in with Google/)).toBeInTheDocument();
    });
  });

  it("renders car data in the view", async () => {
    renderWithProviders(<SharedCollectionPage />, {
      routerProps: { initialEntries: ["/s/c/test-token"] },
    });

    await waitFor(() => {
      expect(screen.getByText("BMW 320d")).toBeInTheDocument();
    });
  });
});
