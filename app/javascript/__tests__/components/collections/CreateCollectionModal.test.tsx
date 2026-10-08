import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import CreateCollectionModal from "@/components/collections/CreateCollectionModal";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

const mockMutate = vi.fn();
vi.mock("@/hooks/useCollections", () => ({
  useCreateCollection: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

vi.mock("@headlessui/react", () => ({
  Dialog: ({ children, onClose }: any) => <div role="dialog">{children}</div>,
  DialogPanel: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children, className }: any) => <div className={className}>{children}</div>,
  Transition: ({ children, show }: any) => (show ? children : null),
  TransitionChild: ({ children }: any) => children,
}));

describe("CreateCollectionModal", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the modal with title and form inputs when open", () => {
    renderWithProviders(<CreateCollectionModal open={true} onClose={onClose} />);

    expect(screen.getByText("collections.createTitle")).toBeInTheDocument();
    expect(screen.getByText("collections.name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("collections.namePlaceholder")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    renderWithProviders(<CreateCollectionModal open={false} onClose={onClose} />);

    expect(screen.queryByText("collections.createTitle")).not.toBeInTheDocument();
  });

  it("disables submit button when name is empty", () => {
    renderWithProviders(<CreateCollectionModal open={true} onClose={onClose} />);

    const submitButton = screen.getByText("common.create");
    expect(submitButton).toBeDisabled();
  });

  it("calls createCollection.mutate when form is submitted with name", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateCollectionModal open={true} onClose={onClose} />);

    const input = screen.getByPlaceholderText("collections.namePlaceholder");
    await user.type(input, "New Collection");

    const submitButton = screen.getByText("common.create");
    expect(submitButton).not.toBeDisabled();

    await user.click(submitButton);
    expect(mockMutate).toHaveBeenCalledWith(
      { name: "New Collection" },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });
});
