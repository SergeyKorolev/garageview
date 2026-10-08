import type { Car } from "@/types/car";
import SplitViewLayout from "@/components/splitView/SplitViewLayout";
import CarListPanel from "@/components/splitView/CarListPanel";
import MapView from "@/components/map/MapView";

interface MapViewWrapperProps {
  cars: Car[];
  isLoading: boolean;
  disabled?: boolean;
  onAddCar?: () => void;
  onRemoveCar?: (carId: number) => void;
  onRateCar?: (carId: number, rating: number) => void;
  onCarClick?: (carId: number) => void;
}

export default function MapViewWrapper({ cars, isLoading, disabled, onAddCar, onRemoveCar, onRateCar, onCarClick }: MapViewWrapperProps) {
  return (
    <SplitViewLayout
      listPanel={
        <CarListPanel
          cars={cars}
          isLoading={isLoading}
          disabled={disabled}
          onAddCar={onAddCar}
          onRemoveCar={onRemoveCar ? (carId) => onRemoveCar(carId) : undefined}
          onRateCar={onRateCar ? (carId, rating) => onRateCar(carId, rating) : undefined}
          onCarClick={onCarClick ? (carId) => onCarClick(carId) : undefined}
        />
      }
      mapPanel={<MapView cars={cars} onCarClick={onCarClick ? (carId) => onCarClick(carId) : undefined} />}
    />
  );
}
