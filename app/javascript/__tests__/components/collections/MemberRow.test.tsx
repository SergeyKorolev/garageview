import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MemberRow from "@/components/collections/MemberRow";
import type { CollectionMember } from "@/types/membership";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (key === "sharing.confirmRemove") return `Remove ${opts?.name}?`;
      return key;
    },
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

function makeMember(overrides: Partial<CollectionMember> = {}): CollectionMember {
  return {
    id: 1,
    user_id: 10,
    name: "Test User",
    email: "test@example.com",
    avatar_url: null,
    role: "editor",
    status: "accepted",
    created_at: "2024-01-01",
    ...overrides,
  };
}

describe("MemberRow", () => {
  it("renders member name and email", () => {
    render(
      <MemberRow member={makeMember()} isOwnerView={true} isLast={false} />
    );

    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("shows owner badge for owner role", () => {
    render(
      <MemberRow
        member={makeMember({ role: "owner" })}
        isOwnerView={true}
        isLast={false}
      />
    );

    expect(screen.getByText("sharing.owner")).toBeInTheDocument();
  });

  it("shows pending status for pending members", () => {
    render(
      <MemberRow
        member={makeMember({ status: "pending", name: null })}
        isOwnerView={true}
        isLast={false}
      />
    );

    expect(screen.getByText("sharing.pending")).toBeInTheDocument();
  });

  it("shows remove confirmation when remove button is clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();

    render(
      <MemberRow
        member={makeMember()}
        isOwnerView={true}
        isLast={false}
        onRemove={onRemove}
      />
    );

    // Click the X button to trigger confirmation
    const removeButton = screen.getByRole("button");
    await user.click(removeButton);

    expect(screen.getByText("Remove Test User?")).toBeInTheDocument();
    expect(screen.getByText("common.yes")).toBeInTheDocument();
    expect(screen.getByText("common.no")).toBeInTheDocument();
  });
});
