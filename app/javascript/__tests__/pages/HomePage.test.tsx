import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import HomePage from "@/pages/HomePage";
import type { Collection } from "@/types/collection";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (key === "collections.cars_other") return `${opts?.count ?? 0} cars`;
      return key;
    },
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

vi.mock("@/hooks/useFormatPrice", () => ({
  useFormatPrice: () => (cents: number) => `${(cents / 100).toFixed(0)} EUR`,
}));

const mockCollections: Collection[] = [
  {
    id: 1,
    name: "BMW Collection",
    default: false,
    description: "My BMW cars",
    latitude: null,
    longitude: null,
    location_name: null,
    cars_count: 3,
    ai_rated_count: 2,
    search_filters_count: 0,
    preview_photos: [],
    is_fetching: false,
    price_min: 2000000,
    price_max: 4000000,
    mileage_min: 50000,
    mileage_max: 100000,
    created_at: "2024-01-01",
    updated_at: "2024-01-15T10:30:00Z",
    role: "owner",
    members_count: 1,
    owner: null,
  },
];

vi.mock("@/hooks/useCollections", () => ({
  useCollections: () => ({ data: mockCollections, isLoading: false }),
  useCreateCollection: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateCollection: () => ({ mutate: vi.fn() }),
  useDeleteCollection: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/useCollectionCars", () => ({
  useAddCar: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    data: { id: 1, name: "Test User", email: "test@test.com" },
  }),
}));

vi.mock("@/api/memberships", () => ({
  fetchMembers: vi.fn(),
  removeMember: vi.fn(),
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

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page title", () => {
    renderWithProviders(<HomePage />);

    expect(screen.getByText("collections.title")).toBeInTheDocument();
  });

  it("renders collection cards", () => {
    renderWithProviders(<HomePage />);

    expect(screen.getByText("BMW Collection")).toBeInTheDocument();
    expect(screen.getByText("3 cars")).toBeInTheDocument();
  });

  it("renders create collection button", () => {
    renderWithProviders(<HomePage />);

    expect(screen.getByText("collections.create")).toBeInTheDocument();
  });
});
