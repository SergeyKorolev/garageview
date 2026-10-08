import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Modal from "@/components/common/Modal";

vi.mock("@headlessui/react", () => ({
  Dialog: ({ children, onClose, className }: any) => (
    <div role="dialog" className={className}>
      {children}
    </div>
  ),
  DialogPanel: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  DialogTitle: ({ children, className }: any) => (
    <h2 className={className}>{children}</h2>
  ),
  Transition: ({ children, show }: any) => (show ? <>{children}</> : null),
  TransitionChild: ({ children }: any) => <>{children}</>,
}));

describe("Modal", () => {
  const onClose = vi.fn();

  it("renders title and children when open", () => {
    render(
      <Modal open={true} onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.getByText("Test Modal")).toBeInTheDocument();
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <Modal open={false} onClose={onClose} title="Hidden Modal">
        <p>Hidden content</p>
      </Modal>
    );

    expect(screen.queryByText("Hidden Modal")).not.toBeInTheDocument();
    expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();
  });

  it("renders a close button", () => {
    render(
      <Modal open={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );

    // The close button has an XMarkIcon inside
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });
});
