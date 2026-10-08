import { useState, useCallback, useRef, useEffect } from "react";
import type { Car } from "@/types/car";
import CarCard from "@/components/cars/CarCard";
import CarDetailPanel from "@/components/cars/CarDetailPanel";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import { useThemeStore } from "@/stores/themeStore";
import { useIsMobile } from "@/hooks/useMediaQuery";

interface GridViewProps {
  cars: Car[];
  isLoading: boolean;
  disabled?: boolean;
  onAddCar?: () => void;
  onRemoveCar?: (carId: number) => void;
  onRateCar?: (carId: number, rating: number) => void;
}

export default function GridView({ cars, isLoading, disabled, onAddCar, onRemoveCar, onRateCar }: GridViewProps) {
  const isDark = useThemeStore((s) => s.theme === "dark");
  const [openPanels, setOpenPanels] = useState<number[]>([]);
  const detailRef = useRef<HTMLDivElement>(null);

  const togglePanel = useCallback((carId: number) => {
    setOpenPanels((prev) => {
      if (prev.includes(carId)) {
        return prev.filter((id) => id !== carId);
      }
      return [...prev, carId];
    });
  }, []);

  const closePanel = useCallback((carId: number) => {
    setOpenPanels((prev) => prev.filter((id) => id !== carId));
  }, []);

  // Scroll the detail container to the right to show the latest panel
  useEffect(() => {
    if (openPanels.length > 0 && detailRef.current) {
      requestAnimationFrame(() => {
        if (detailRef.current) {
          detailRef.current.scrollLeft = detailRef.current.scrollWidth;
        }
      });
    }
  }, [openPanels.length]);

  const isMobile = useIsMobile();
  const hasDetail = openPanels.length > 0;

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "calc(100vh - 10rem)" }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (cars.length === 0) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "calc(100vh - 10rem)" }}>
        <EmptyState
          title="No cars yet"
          description="Add cars manually or set up a search filter"
          action={
            onAddCar && (
              <button
                onClick={onAddCar}
                disabled={disabled}
                className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Add Car
              </button>
            )
          }
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 10rem)",
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : undefined,
      }}
    >
      {/* Left: Cards grid */}
      <div
        style={{
          flex: hasDetail ? "0 0 auto" : "1",
          width: hasDetail ? 420 : undefined,
          minWidth: hasDetail ? 340 : undefined,
          overflowY: "auto",
          padding: 16,
          transition: "width 0.3s ease",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: hasDetail || isMobile
              ? "1fr"
              : "repeat(auto-fill, minmax(390px, 1fr))",
            gap: 12,
          }}
        >
          {cars.map((car) => (
            <CarCard
              key={car.id}
              car={car}
              onRemove={onRemoveCar}
              onRate={onRateCar}
              onClick={() => togglePanel(car.id)}
              style={openPanels.includes(car.id) ? { outline: "2px solid #3b82f6", outlineOffset: -2, borderRadius: 12 } : undefined}
            />
          ))}
        </div>
      </div>

      {/* Right: Detail panels side by side, horizontally scrollable */}
      {hasDetail && (
        <div
          ref={detailRef}
          style={{
            flex: "1 1 0%",
            overflowX: "auto",
            overflowY: "hidden",
            borderLeft: `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}`,
            padding: 12,
            display: "flex",
            flexDirection: "row",
            gap: 12,
          }}
        >
          {openPanels.map((carId) => {
            const car = cars.find((c) => c.id === carId);
            if (!car) return null;
            return (
              <div
                key={carId}
                data-panel-id={carId}
                style={{
                  flex: "0 0 550px",
                  height: "100%",
                  overflowY: "auto",
                }}
              >
                <CarDetailPanel
                  car={car}
                  onClose={() => closePanel(carId)}
                  onRate={onRateCar}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
