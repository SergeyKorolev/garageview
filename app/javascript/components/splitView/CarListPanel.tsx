import type { Car } from "@/types/car";
import CarCard from "@/components/cars/CarCard";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";

interface CarListPanelProps {
  cars: Car[];
  isLoading: boolean;
  disabled?: boolean;
  onAddCar?: () => void;
  onRemoveCar?: (carId: number) => void;
  onRateCar?: (carId: number, rating: number) => void;
  onCarClick?: (carId: number) => void;
}

export default function CarListPanel({ cars, isLoading, disabled, onAddCar, onRemoveCar, onRateCar, onCarClick }: CarListPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <LoadingSpinner />
        ) : cars.length === 0 ? (
          <EmptyState
            title="No cars yet"
            description="Add cars manually or set up a search filter"
            action={
              onAddCar && (
                <button
                  onClick={onAddCar}
                  disabled={disabled}
                  style={disabled ? { pointerEvents: "none", opacity: 0.35 } : undefined}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Add car
                </button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(390px,1fr))] gap-3 p-3">
            {cars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                onRemove={disabled ? undefined : onRemoveCar}
                onRate={disabled ? undefined : onRateCar}
                onClick={onCarClick ? () => onCarClick(car.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
