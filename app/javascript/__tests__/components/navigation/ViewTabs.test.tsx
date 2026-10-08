import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import ViewTabs from "@/components/navigation/ViewTabs";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "views.grid": "Grid",
        "views.map": "Map",
        "views.list": "List",
        "views.compare": "Compare",
        "views.notes": "Notes",
      };
      return map[key] ?? key;
    },
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

vi.mock("@/hooks/useMediaQuery", () => ({
  useIsMobile: () => false,
}));

describe("ViewTabs", () => {
  it("renders all view tab labels", () => {
    renderWithProviders(
      <ViewTabs collectionId={1} />,
      { routerProps: { initialEntries: ["/collections/1/grid"] } }
    );

    expect(screen.getByText("Grid")).toBeInTheDocument();
    expect(screen.getByText("Map")).toBeInTheDocument();
    expect(screen.getByText("List")).toBeInTheDocument();
    expect(screen.getByText("Compare")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  it("shows notes badge when notesCount is provided", () => {
    renderWithProviders(
      <ViewTabs collectionId={1} notesCount={3} />,
      { routerProps: { initialEntries: ["/collections/1/grid"] } }
    );

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("calls onViewChange when in controlled mode", async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();

    renderWithProviders(
      <ViewTabs
        collectionId={1}
        activeView="grid"
        onViewChange={onViewChange}
      />,
      { routerProps: { initialEntries: ["/collections/1/grid"] } }
    );

    await user.click(screen.getByText("List"));
    expect(onViewChange).toHaveBeenCalledWith("list");
  });
});
