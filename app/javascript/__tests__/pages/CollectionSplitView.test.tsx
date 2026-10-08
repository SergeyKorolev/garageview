import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import CollectionSplitView from "@/pages/CollectionSplitView";
import { useFilterStore } from "@/stores/filterStore";
import type { Collection } from "@/types/collection";
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

const mockCollection: Collection = {
  id: 1,
  name: "Test Collection",
  default: false,
  description: null,
  latitude: null,
  longitude: null,
  location_name: null,
  cars_count: 2,
  ai_rated_count: 1,
  search_filters_count: 0,
  preview_photos: [],
  is_fetching: false,
  price_min: null,
  price_max: null,
  mileage_min: null,
  mileage_max: null,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
  role: "owner",
  members_count: 1,
  owner: null,
};

const mockCars: Car[] = [
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
];

vi.mock("@/hooks/useCollections", () => ({
  useCollection: () => ({ data: mockCollection }),
  useUpdateCollection: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/useCollectionCars", () => ({
  useCollectionCars: () => ({ data: { cars: mockCars }, isLoading: false }),
  useRemoveCar: () => ({ mutate: vi.fn() }),
  useRateCar: () => ({ mutate: vi.fn() }),
  useAddCar: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    data: { id: 1, name: "Test User", email: "test@test.com" },
  }),
}));

vi.mock("@/api/cars", () => ({
  triggerAiRating: vi.fn(),
  getAllCollectionCars: vi.fn(),
}));

vi.mock("@/api/deepResearch", () => ({
  createDeepResearch: vi.fn(),
}));

vi.mock("@/api/searchFilters", () => ({
  createSearchFilter: vi.fn(),
}));

vi.mock("@headlessui/react", () => ({
  Dialog: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogPanel: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  Transition: ({ children, show }: any) => (show ? children : null),
  TransitionChild: ({ children }: any) => children,
}));

vi.mock("@/components/collections/MemberAvatarStack", () => ({
  default: () => null,
}));

function renderWithRoute(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/collections/:collectionId/*" element={<CollectionSplitView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("CollectionSplitView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFilterStore.setState({
      filters: {},
      sort: { field: "price", direction: "asc" },
    });
  });

  it("renders collection name in breadcrumb", () => {
    renderWithRoute("/collections/1/grid");

    expect(screen.getByText("Test Collection")).toBeInTheDocument();
  });

  it("renders Collections breadcrumb link", () => {
    renderWithRoute("/collections/1/grid");

    expect(screen.getByText("Collections")).toBeInTheDocument();
  });

  it("shows car count", () => {
    renderWithRoute("/collections/1/grid");

    expect(screen.getByText("(1 cars)")).toBeInTheDocument();
  });

  it("renders Add Car button for owner", () => {
    renderWithRoute("/collections/1/grid");

    expect(screen.getByText("actions.addCar")).toBeInTheDocument();
  });

  it("renders AI Rate button for owner with cars", () => {
    renderWithRoute("/collections/1/grid");

    expect(screen.getByText("actions.aiRate")).toBeInTheDocument();
  });
});
