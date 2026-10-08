import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StarRating from "@/components/cars/StarRating";

describe("StarRating", () => {
  it("renders 5 star buttons", () => {
    render(<StarRating rating={0} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(5);
  });

  it("renders filled stars based on rating", () => {
    render(<StarRating rating={3} />);

    const buttons = screen.getAllByRole("button");
    // First 3 should have yellow class, last 2 should have gray class
    buttons.slice(0, 3).forEach((btn) => {
      expect(btn.className).toContain("text-yellow-400");
    });
    buttons.slice(3).forEach((btn) => {
      expect(btn.className).toContain("text-gray-300");
    });
  });

  it("calls onChange when a star is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<StarRating rating={0} onChange={onChange} />);

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[3]); // Click the 4th star

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("toggles rating off when the same star is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<StarRating rating={3} onChange={onChange} />);

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[2]); // Click star 3 which is already the rating

    expect(onChange).toHaveBeenCalledWith(0);
  });
});
