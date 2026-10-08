import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import ShareCollectionModal from "@/components/collections/ShareCollectionModal";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

vi.mock("@headlessui/react", () => ({
  Dialog: ({ children, onClose }: any) => <div role="dialog">{children}</div>,
  DialogPanel: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children, className }: any) => <div className={className}>{children}</div>,
  Transition: ({ children, show }: any) => (show ? children : null),
  TransitionChild: ({ children }: any) => children,
}));

const mockMembers = [
  { id: 1, user_id: 10, name: "Owner User", email: "owner@test.com", avatar_url: null, role: "owner" as const, status: "accepted" as const, created_at: "2024-01-01" },
  { id: 2, user_id: 20, name: "Editor User", email: "editor@test.com", avatar_url: null, role: "editor" as const, status: "accepted" as const, created_at: "2024-01-02" },
];

vi.mock("@/hooks/useMemberships", () => ({
  useMembers: () => ({ data: mockMembers, isLoading: false }),
  useInviteMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMemberRole: () => ({ mutateAsync: vi.fn() }),
  useRemoveMember: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/api/memberships", () => ({
  createCompareLink: vi.fn(),
  revokeCompareLink: vi.fn(),
  shareCollection: vi.fn(),
  unshareCollection: vi.fn(),
}));

describe("ShareCollectionModal", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders modal title and invite form for owner", () => {
    renderWithProviders(
      <ShareCollectionModal
        collectionId={1}
        isOpen={true}
        onClose={onClose}
        currentUserRole="owner"
        currentUserId={10}
      />
    );

    expect(screen.getByText("sharing.manageMembers")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("sharing.emailPlaceholder")).toBeInTheDocument();
    expect(screen.getByText("sharing.invite")).toBeInTheDocument();
  });

  it("does not render invite form for non-owner", () => {
    renderWithProviders(
      <ShareCollectionModal
        collectionId={1}
        isOpen={true}
        onClose={onClose}
        currentUserRole="viewer"
        currentUserId={20}
      />
    );

    expect(screen.queryByPlaceholderText("sharing.emailPlaceholder")).not.toBeInTheDocument();
  });

  it("renders member list", () => {
    renderWithProviders(
      <ShareCollectionModal
        collectionId={1}
        isOpen={true}
        onClose={onClose}
        currentUserRole="owner"
        currentUserId={10}
      />
    );

    expect(screen.getByText("Owner User")).toBeInTheDocument();
    expect(screen.getByText("Editor User")).toBeInTheDocument();
  });

  it("shows leave button for non-owner role", () => {
    renderWithProviders(
      <ShareCollectionModal
        collectionId={1}
        isOpen={true}
        onClose={onClose}
        currentUserRole="viewer"
        currentUserId={20}
      />
    );

    expect(screen.getByText("sharing.leaveCollection")).toBeInTheDocument();
  });
});
