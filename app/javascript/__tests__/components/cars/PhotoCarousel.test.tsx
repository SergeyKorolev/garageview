import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PhotoCarousel from "@/components/cars/PhotoCarousel";

vi.mock("swiper/react", () => ({
  Swiper: ({ children, className }: any) => (
    <div data-testid="swiper" className={className}>
      {children}
    </div>
  ),
  SwiperSlide: ({ children }: any) => <div data-testid="swiper-slide">{children}</div>,
}));

vi.mock("swiper/modules", () => ({
  Navigation: {},
  Pagination: {},
}));

describe("PhotoCarousel", () => {
  it("renders placeholder when photos array is empty", () => {
    const { container } = render(<PhotoCarousel photos={[]} />);

    // Should render an SVG placeholder, not a swiper
    expect(screen.queryByTestId("swiper")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders Swiper with images when photos are provided", () => {
    const photos = [
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg",
    ];

    render(<PhotoCarousel photos={photos} title="BMW 320d" />);

    expect(screen.getByTestId("swiper")).toBeInTheDocument();
    const slides = screen.getAllByTestId("swiper-slide");
    expect(slides).toHaveLength(2);
  });

  it("renders correct alt text for each image", () => {
    const photos = ["https://example.com/photo1.jpg"];

    render(<PhotoCarousel photos={photos} title="Audi A4" />);

    expect(screen.getByAltText("Audi A4 - photo 1")).toBeInTheDocument();
  });

  it("uses empty default title in alt text when title is not provided", () => {
    const photos = ["https://example.com/photo1.jpg"];

    render(<PhotoCarousel photos={photos} />);

    // Default title is "" so alt becomes " - photo 1"
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", " - photo 1");
  });
});
