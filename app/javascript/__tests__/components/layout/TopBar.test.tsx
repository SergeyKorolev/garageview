import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import TopBar from "@/components/layout/TopBar";
import { useAgentStore } from "@/stores/agentStore";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

vi.mock("@/components/layout/ThemeToggle", () => ({
  default: () => <button data-testid="theme-toggle">Toggle Theme</button>,
}));

vi.mock("@/components/layout/UserMenu", () => ({
  default: () => <div data-testid="user-menu">User Menu</div>,
}));

describe("TopBar", () => {
  it("renders the logo", () => {
    renderWithProviders(<TopBar />);

    const logos = screen.getAllByAltText("garageview.ai");
    expect(logos.length).toBeGreaterThanOrEqual(1);
  });

  it("renders AI Assistant button", () => {
    renderWithProviders(<TopBar />);

    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
  });

  it("renders theme toggle and user menu", () => {
    renderWithProviders(<TopBar />);

    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("user-menu")).toBeInTheDocument();
  });

  it("toggles agent drawer when AI Assistant button is clicked", async () => {
    const user = userEvent.setup();
    useAgentStore.setState({ isOpen: false });

    renderWithProviders(<TopBar />);

    await user.click(screen.getByText("AI Assistant"));

    expect(useAgentStore.getState().isOpen).toBe(true);
  });
});
