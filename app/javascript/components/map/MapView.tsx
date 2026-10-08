import { useCallback, useRef, useEffect } from "react";
import Map, { Marker, Popup, NavigationControl, type MapRef } from "react-map-gl/maplibre";
import type { Car } from "@/types/car";
import { useSelectionStore } from "@/stores/selectionStore";
import { useThemeStore } from "@/stores/themeStore";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import { cn } from "@/utils/cn";

interface MapViewProps {
  cars: Car[];
  onCarClick?: (carId: number) => void;
}

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const MAP_STYLE_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

function CarPin({ photo, selected, hovered }: { photo?: string; selected: boolean; hovered?: boolean }) {
  const size = selected ? 52 : 40;
  const borderColor = selected ? "#2563eb" : hovered ? "#60a5fa" : "white";
  const borderWidth = selected ? 3 : 2;
  const scale = selected ? 1.3 : hovered ? 1.3 : 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", transition: "transform 0.15s ease", transform: `scale(${scale})`, zIndex: hovered || selected ? 10 : 1 }}>
      <div style={{
        width: size,
        height: size * 0.75,
        borderRadius: 6,
        border: `${borderWidth}px solid ${borderColor}`,
        overflow: "hidden",
        backgroundColor: "#e5e7eb",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}>
        {photo ? (
          <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🚗</div>
        )}
      </div>
      {/* Pin triangle */}
      <div style={{
        width: 0, height: 0,
        borderLeft: "6px solid transparent",
        borderRight: "6px solid transparent",
        borderTop: `8px solid ${borderColor}`,
        marginTop: -1,
      }} />
    </div>
  );
}

export default function MapView({ cars, onCarClick }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const { selectedCarId, setSelectedCarId, hoveredCarId } = useSelectionStore();
  const { data: user } = useCurrentUser();
  const theme = useThemeStore((s) => s.theme);
  const formatPrice = useFormatPrice();
  const isDark = theme === "dark";
  const hasFitted = useRef(false);

  const carsWithCoords = cars.filter(
    (c) => c.seller_latitude != null && c.seller_longitude != null
  );

  const selectedCar = carsWithCoords.find((c) => c.id === selectedCarId);

  // Auto-zoom to fit all cars + user location on first load
  useEffect(() => {
    if (hasFitted.current || !mapRef.current || carsWithCoords.length === 0) return;

    const points: [number, number][] = carsWithCoords.map((c) => [
      c.seller_longitude!,
      c.seller_latitude!,
    ]);

    if (user?.latitude && user?.longitude) {
      points.push([user.longitude, user.latitude]);
    }

    if (points.length === 1) {
      mapRef.current.flyTo({ center: points[0], zoom: 10, duration: 1000 });
    } else {
      const lngs = points.map((p) => p[0]);
      const lats = points.map((p) => p[1]);
      mapRef.current.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 60, duration: 1000, maxZoom: 12 }
      );
    }

    hasFitted.current = true;
  }, [carsWithCoords.length, user?.latitude, user?.longitude]);

  const handleMarkerClick = useCallback(
    (carId: number) => {
      setSelectedCarId(selectedCarId === carId ? null : carId);
    },
    [setSelectedCarId, selectedCarId]
  );

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: 10.4515,
        latitude: 51.1657,
        zoom: 5,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={isDark ? MAP_STYLE_DARK : MAP_STYLE}
    >
      <NavigationControl position="top-right" />

      {/* User location marker */}
      {user?.latitude && user?.longitude && (
        <Marker longitude={user.longitude} latitude={user.latitude}>
          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-green-500 shadow-md">
            <div className="h-1.5 w-1.5 rounded-full bg-white" />
          </div>
        </Marker>
      )}

      {carsWithCoords.map((car) => (
        <Marker
          key={car.id}
          longitude={car.seller_longitude!}
          latitude={car.seller_latitude!}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            handleMarkerClick(car.id);
          }}
        >
          <CarPin photo={car.photos?.[0]} selected={car.id === selectedCarId} hovered={car.id === hoveredCarId} />
        </Marker>
      ))}

      {selectedCar && (
        <Popup
          longitude={selectedCar.seller_longitude!}
          latitude={selectedCar.seller_latitude!}
          closeOnClick={false}
          onClose={() => setSelectedCarId(null)}
          offset={[0, -45]}
          maxWidth="240px"
        >
          <div
            onClick={() => onCarClick?.(selectedCar.id)}
            style={{ cursor: onCarClick ? "pointer" : "default", padding: 2 }}
          >
            {selectedCar.photos?.[0] && (
              <img
                src={selectedCar.photos[0]}
                alt=""
                style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 6, marginBottom: 6 }}
              />
            )}
            <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, marginBottom: 3 }}
              className="text-gray-900 dark:text-gray-900"
            >
              {selectedCar.title}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#2563eb", marginBottom: 4 }}>
              {formatPrice(selectedCar.price_cents)}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {selectedCar.rating > 0 && (
                <div style={{ display: "flex", gap: 1 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} style={{ fontSize: 10, color: s <= selectedCar.rating ? "#f59e0b" : "#d1d5db" }}>★</span>
                  ))}
                </div>
              )}
              {selectedCar.ai_rating != null && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3, border: "1px solid #22c55e", color: "#22c55e" }}>
                  AI {selectedCar.ai_rating}
                </span>
              )}
            </div>
          </div>
        </Popup>
      )}
    </Map>
  );
}
