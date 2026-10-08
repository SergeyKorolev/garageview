import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import AgentDrawer from "@/components/agent/AgentDrawer";
import { useAgentStore } from "@/stores/agentStore";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

vi.mock("@/hooks/useAgent", () => ({
  useAgentChat: () => ({
    mutateAsync: vi.fn().mockResolvedValue({
      reply: "Hello! How can I help?",
      conversation_id: 1,
      actions: [],
    }),
  }),
}));

vi.mock("@/hooks/useCollections", () => ({
  useCollections: () => ({ data: [] }),
}));

vi.mock("@/hooks/useMediaQuery", () => ({
  useIsMobile: () => false,
}));

// jsdom doesn't support scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe("AgentDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAgentStore.setState({
      isOpen: true,
      conversationId: null,
      messages: [],
      isLoading: false,
    });
  });

  it("renders nothing when closed", () => {
    useAgentStore.setState({ isOpen: false });
    const { container } = renderWithProviders(<AgentDrawer />);

    expect(container.innerHTML).toBe("");
  });

  it("renders welcome message and example prompts when open with no messages", () => {
    renderWithProviders(<AgentDrawer />);

    expect(screen.getByText("Let's find a great car together!")).toBeInTheDocument();
    expect(screen.getByText(/Create a collection/)).toBeInTheDocument();
  });

  it("renders the text input area", () => {
    renderWithProviders(<AgentDrawer />);

    const textarea = screen.getByPlaceholderText(
      "Tell me what you need... (Enter to send, Shift+Enter for new line)"
    );
    expect(textarea).toBeInTheDocument();
  });

  it("renders close button", () => {
    renderWithProviders(<AgentDrawer />);

    // The close button has the "x" character
    const closeButton = screen.getByText("\u00d7");
    expect(closeButton).toBeInTheDocument();
  });

  it("renders messages when conversation has messages", () => {
    useAgentStore.setState({
      isOpen: true,
      messages: [
        { role: "user", content: "Help me find a BMW" },
        { role: "assistant", content: "I can help with that!" },
      ],
    });

    renderWithProviders(<AgentDrawer />);

    expect(screen.getByText("Help me find a BMW")).toBeInTheDocument();
    expect(screen.getByText("I can help with that!")).toBeInTheDocument();
  });

  it("shows loading dots when isLoading is true", () => {
    useAgentStore.setState({
      isOpen: true,
      messages: [{ role: "user", content: "Hello" }],
      isLoading: true,
    });

    const { container } = renderWithProviders(<AgentDrawer />);

    // Loading dots should be visible (3 pulsing dots)
    const style = container.querySelector("style");
    expect(style?.textContent).toContain("pulse");
  });
});
