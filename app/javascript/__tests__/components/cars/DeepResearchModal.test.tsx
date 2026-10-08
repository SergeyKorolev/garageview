import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import DeepResearchModal from "@/components/cars/DeepResearchModal";
import type { Car } from "@/types/car";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

const mockGetDeepResearch = vi.fn();
vi.mock("@/api/deepResearch", () => ({
  getDeepResearch: (...args: any[]) => mockGetDeepResearch(...args),
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
    ...overrides,
  };
}

describe("DeepResearchModal", () => {
  const onClose = vi.fn();
  const onStatusChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("renders loading state when research is pending", async () => {
    mockGetDeepResearch.mockResolvedValue({
      id: 1,
      collection_id: 1,
      car_ids: [1],
      title: "Deep Research",
      status: "pending",
      result: null,
      share_token: null,
      public_url: null,
      created_at: "2024-01-01",
    });

    renderWithProviders(
      <DeepResearchModal
        collectionId={1}
        researchId={1}
        onClose={onClose}
        onStatusChange={onStatusChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("This may take 30-60 seconds")).toBeInTheDocument();
    });
  });

  it("renders completed result with ranking", async () => {
    mockGetDeepResearch.mockResolvedValue({
      id: 1,
      collection_id: 1,
      car_ids: [1, 2],
      title: "Car Comparison Research",
      status: "completed",
      result: {
        ranking: [
          { place: 1, car_id: 1, car_title: "BMW 320d", reason: "Best value" },
          { place: 2, car_id: 2, car_title: "Audi A4", reason: "Higher mileage" },
        ],
        bottom_line: "BMW is the better buy",
      },
      share_token: null,
      public_url: null,
      created_at: "2024-01-01",
    });

    renderWithProviders(
      <DeepResearchModal
        collectionId={1}
        researchId={1}
        cars={[makeCar({ id: 1, title: "BMW 320d" }), makeCar({ id: 2, title: "Audi A4" })]}
        onClose={onClose}
        onStatusChange={onStatusChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Car Comparison Research")).toBeInTheDocument();
    });

    expect(screen.getByText("Final Ranking")).toBeInTheDocument();
    // BMW 320d appears in both ranking and per-car analysis, so use getAllByText
    expect(screen.getAllByText("BMW 320d").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Best value")).toBeInTheDocument();
    expect(screen.getByText("Bottom Line")).toBeInTheDocument();
    expect(screen.getByText("BMW is the better buy")).toBeInTheDocument();
  });

  it("renders failed state", async () => {
    mockGetDeepResearch.mockResolvedValue({
      id: 1,
      collection_id: 1,
      car_ids: [1],
      title: "Failed Research",
      status: "failed",
      result: "Timeout error",
      share_token: null,
      public_url: null,
      created_at: "2024-01-01",
    });

    renderWithProviders(
      <DeepResearchModal
        collectionId={1}
        researchId={1}
        onClose={onClose}
        onStatusChange={onStatusChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Analysis failed")).toBeInTheDocument();
    });
    expect(screen.getByText("Timeout error")).toBeInTheDocument();
  });

  it("renders title from research data", async () => {
    mockGetDeepResearch.mockResolvedValue({
      id: 1,
      collection_id: 1,
      car_ids: [1],
      title: "My Custom Research Title",
      status: "processing",
      result: null,
      share_token: null,
      public_url: null,
      created_at: "2024-01-01",
    });

    renderWithProviders(
      <DeepResearchModal
        collectionId={1}
        researchId={1}
        onClose={onClose}
        onStatusChange={onStatusChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("My Custom Research Title")).toBeInTheDocument();
    });
  });

  it("renders Open in Notes link", async () => {
    mockGetDeepResearch.mockResolvedValue({
      id: 1,
      collection_id: 1,
      car_ids: [1],
      title: "Research",
      status: "completed",
      result: { ranking: [], bottom_line: "Summary" },
      share_token: null,
      public_url: null,
      created_at: "2024-01-01",
    });

    renderWithProviders(
      <DeepResearchModal
        collectionId={1}
        researchId={1}
        onClose={onClose}
        onStatusChange={onStatusChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Open in Notes")).toBeInTheDocument();
    });
  });
});
