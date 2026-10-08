import { beforeEach, describe, expect, it, vi } from "vitest";
import client from "@/api/client";
import { getAllCollectionCars } from "@/api/cars";

vi.mock("@/api/client", () => ({ default: { get: vi.fn() } }));

describe("getAllCollectionCars", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads every page so comparison views can use cars beyond the first page", async () => {
    vi.mocked(client.get)
      .mockResolvedValueOnce({ data: { cars: [{ id: 1 }], total: 3, page: 1, per_page: 200, total_pages: 3 } })
      .mockResolvedValueOnce({ data: { cars: [{ id: 2 }], total_pages: 3 } })
      .mockResolvedValueOnce({ data: { cars: [{ id: 3 }], total_pages: 3 } });
    const signal = new AbortController().signal;
    const result = await getAllCollectionCars({ collectionId: 7 }, signal);
    expect(result.cars.map(car => car.id)).toEqual([1, 2, 3]);
    expect(client.get).toHaveBeenNthCalledWith(3, "/collections/7/cars", expect.objectContaining({
      signal, params: expect.objectContaining({ page: 3, per_page: 200 }),
    }));
  });

  it("rejects a failed later page instead of presenting an incomplete collection", async () => {
    vi.mocked(client.get)
      .mockResolvedValueOnce({ data: { cars: [{ id: 1 }], total_pages: 2 } })
      .mockRejectedValueOnce(new Error("Page failed"));
    await expect(getAllCollectionCars({ collectionId: 7 })).rejects.toThrow("Page failed");
  });
});
