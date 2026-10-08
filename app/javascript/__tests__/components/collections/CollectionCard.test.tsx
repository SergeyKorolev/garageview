import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import CollectionCard from "@/components/collections/CollectionCard";
import type { Collection } from "@/types/collection";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (key === "collections.cars_other") return `${opts?.count ?? 0} cars`;
      if (key === "sharing.sharedBy") return `Shared by ${opts?.name}`;
      if (key === "sharing.sharedWith") return `Shared with ${opts?.count} members`;
      return key;
    },
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

vi.mock("@/hooks/useCollections", () => ({
  useUpdateCollection: () => ({ mutate: vi.fn() }),
  useDeleteCollection: () => ({ mutate: vi.fn() }),
}));

vi.mock("@headlessui/react", () => ({
  Dialog: ({ children, onClose }: any) => <div role="dialog">{children}</div>,
  DialogPanel: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  Transition: ({ children, show }: any) => (show ? children : null),
  TransitionChild: ({ children }: any) => children,
}));

function makeCollection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 1,
    name: "My Test Collection",
    default: false,
    description: "A test collection",
    latitude: null,
    longitude: null,
    location_name: null,
    cars_count: 5,
    ai_rated_count: 3,
    search_filters_count: 1,
    preview_photos: ["https://example.com/photo1.jpg"],
    is_fetching: false,
    price_min: 1500000,
    price_max: 3500000,
    mileage_min: 50000,
    mileage_max: 120000,
    created_at: "2024-01-01",
    updated_at: "2024-01-15T10:30:00Z",
    role: "owner",
    members_count: 1,
    owner: null,
    ...overrides,
  };
}

describe("CollectionCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders collection name and car count", () => {
    renderWithProviders(<CollectionCard collection={makeCollection()} />);

    expect(screen.getByText("My Test Collection")).toBeInTheDocument();
    expect(screen.getByText("5 cars")).toBeInTheDocument();
  });

  it("shows AI rated count", () => {
    renderWithProviders(<CollectionCard collection={makeCollection()} />);

    expect(screen.getByText("AI 3/5")).toBeInTheDocument();
  });

  it("shows shared by label for non-owner collections", () => {
    const collection = makeCollection({
      role: "viewer",
      owner: { id: 2, name: "John Doe" },
    });

    renderWithProviders(<CollectionCard collection={collection} />);

    expect(screen.getByText("Shared by John Doe")).toBeInTheDocument();
  });

  it("shows fetching indicator when collection is fetching", () => {
    const collection = makeCollection({ is_fetching: true });

    renderWithProviders(<CollectionCard collection={collection} />);

    expect(screen.getByText("Fetching cars...")).toBeInTheDocument();
  });
});
