import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useThemeStore } from "@/stores/themeStore";
import { useIsMobile } from "@/hooks/useMediaQuery";
import ThemeToggle from "@/components/layout/ThemeToggle";
import ViewTabs from "@/components/navigation/ViewTabs";
import GridView from "@/components/views/GridView";
import ListView from "@/components/views/ListView";
import MapViewWrapper from "@/components/views/MapViewWrapper";
import CompareView from "@/components/views/CompareView";
import SharedNotesView from "@/components/views/SharedNotesView";
import CarDetailModal from "@/components/cars/CarDetailModal";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { getPublicCollection } from "@/api/publicCollections";
import type { Car } from "@/types/car";

type ViewMode = "list" | "grid" | "map" | "compare" | "notes";

const SORT_KEYS: { value: string; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "price:asc", label: "Price ↑" },
  { value: "price:desc", label: "Price ↓" },
  { value: "mileage:asc", label: "Mileage ↑" },
  { value: "mileage:desc", label: "Mileage ↓" },
  { value: "ai_rating:asc", label: "AI Rating ↑" },
  { value: "ai_rating:desc", label: "AI Rating ↓" },
];

const PRIORITY_ATTRS = [
  "Vehicle condition", "Category", "First Registration", "Mileage",
  "Power", "Transmission", "Drive type", "Fuel type", "Other energy source",
  "Electric range", "Range", "CO₂ emissions (comb.)", "CO₂ class",
  "Energy consumption (comb.)", "Power consumption",
  "Number of Seats", "Door Count", "Colour", "Interior Design",
  "Climatisation", "Parking sensors", "Airbags", "Emissions Sticker",
  "Number of Vehicle Owners", "Availability",
];

export default function SharedCollectionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const parts = location.pathname.split("/s/c/")[1]?.split("/");
  const token = parts?.[0];
  const viewFromUrl = parts?.[1] as ViewMode | undefined;
  const validViews: ViewMode[] = ["list", "grid", "map", "compare", "notes"];
  const viewMode: ViewMode = viewFromUrl && validViews.includes(viewFromUrl) ? viewFromUrl : "grid";
  const isDark = useThemeStore((s) => s.theme === "dark");
  const isMobile = useIsMobile();

  const setViewMode = useCallback((mode: ViewMode) => {
    const path = mode === "grid" ? `/s/c/${token}` : `/s/c/${token}/${mode}`;
    navigate(path, { replace: true });
  }, [token, navigate]);
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const [sort, setSort] = useState<{ field: string; direction: "asc" | "desc" }>({ field: "created_at", direction: "desc" });
  const [maxMileage, setMaxMileage] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["publicCollection", token],
    queryFn: () => getPublicCollection(token!),
    enabled: !!token,
    staleTime: 60 * 1000,
  });

  const cars = data?.cars ?? [];

  const { sortedCars, attrKeys, allFeatures } = useMemo(() => {
    let filtered = cars;
    if (maxMileage != null) {
      filtered = filtered.filter((c) => c.mileage_km != null && c.mileage_km <= maxMileage);
    }
    const dir = sort.direction === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      switch (sort.field) {
        case "price": return ((a.price_cents ?? 0) - (b.price_cents ?? 0)) * dir;
        case "mileage": return ((a.mileage_km ?? 0) - (b.mileage_km ?? 0)) * dir;
        case "feature_count": return ((a.features?.length ?? 0) - (b.features?.length ?? 0)) * dir;
        case "rating": return ((a.rating ?? 0) - (b.rating ?? 0)) * dir;
        case "ai_rating": return ((a.ai_rating ?? 9999) - (b.ai_rating ?? 9999)) * dir;
        default: return 0;
      }
    });

    const attrSet = new Set<string>();
    sorted.forEach((car) => {
      if (car.attributes) Object.keys(car.attributes).forEach((k) => attrSet.add(k));
    });
    const remaining = Array.from(attrSet).filter((k) => !PRIORITY_ATTRS.includes(k)).sort();
    const orderedAttrs = [...PRIORITY_ATTRS.filter((k) => attrSet.has(k)), ...remaining];

    const featureSet = new Set<string>();
    sorted.forEach((car) => car.features?.forEach((f) => featureSet.add(f)));
    return { sortedCars: sorted, attrKeys: orderedAttrs, allFeatures: Array.from(featureSet).sort() };
  }, [cars, sort.field, sort.direction, maxMileage]);

  // Set page title
  useEffect(() => {
    if (data?.collection?.name) {
      document.title = `${data.collection.name} — ${data.collection.cars_count} cars — Garageview.ai`;
    }
  }, [data?.collection?.name]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-lg text-gray-500 dark:text-gray-400">Collection not found or no longer shared</p>
        <a href="/en" className="mt-4 text-blue-500 hover:underline">Go to Garageview.ai</a>
      </div>
    );
  }

  const googleAuthUrl = `/users/auth/google_oauth2`;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <header className="sticky top-0 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900" style={{ zIndex: 110 }}>
        <div className="flex h-14 items-center justify-between px-4">
          <a href="/en" className="flex items-center">
            <img src="/logo-dark.png?v=3" alt="garageview.ai" className="hidden dark:block" style={{ height: 36 }} />
            <img src="/logo.png?v=3" alt="garageview.ai" className="block dark:hidden" style={{ height: 36 }} />
          </a>

          <a
            href={googleAuthUrl}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 16px", borderRadius: 8,
              border: `1px solid ${isDark ? "#334155" : "#d1d5db"}`,
              backgroundColor: isDark ? "#1e293b" : "#ffffff",
              color: isDark ? "#e2e8f0" : "#374151",
              fontSize: 13, fontWeight: 600,
              textDecoration: "none",
              transition: "all 0.15s",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            {isMobile ? "Sign in" : "Sign in with Google to manage your own collections"}
          </a>

          <ThemeToggle />
        </div>
      </header>

      {/* Collection toolbar */}
      <div className="sticky top-14 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900" style={{ zIndex: 100 }}>
        <div className="flex items-center gap-3">
          <h2 className="px-1 font-semibold text-gray-900 dark:text-white">
            {data.collection.name}
          </h2>
          <span className="text-sm text-gray-400">({data.collection.cars_count} cars)</span>
          {data.collection.owner_name && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              by {data.collection.owner_name}
            </span>
          )}
        </div>
      </div>

      {/* View tabs */}
      <ViewTabs
        collectionId={0}
        basePath={`/s/c/${token}`}
        activeView={viewMode}
        onViewChange={setViewMode}
        rightContent={viewMode !== "notes" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={maxMileage == null ? "" : String(maxMileage)}
              onChange={(e) => setMaxMileage(e.target.value ? Number(e.target.value) : null)}
              style={{
                fontSize: 12, padding: "4px 24px 4px 8px", borderRadius: 6,
                border: `1px solid ${isDark ? "#374151" : "#d1d5db"}`, backgroundColor: isDark ? "#1f2937" : "white", color: isDark ? "#d1d5db" : "#374151",
                cursor: "pointer", outline: "none",
              }}
            >
              <option value="">All mileage</option>
              <option value="5000">≤ 5,000 km</option>
              <option value="10000">≤ 10,000 km</option>
              <option value="20000">≤ 20,000 km</option>
              <option value="50000">≤ 50,000 km</option>
              <option value="100000">≤ 100,000 km</option>
              <option value="150000">≤ 150,000 km</option>
            </select>
            <select
              value={sort.field === "created_at" ? "default" : `${sort.field}:${sort.direction}`}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "default") {
                  setSort({ field: "created_at", direction: "desc" });
                } else {
                  const [field, dir] = val.split(":");
                  setSort({ field, direction: dir as "asc" | "desc" });
                }
              }}
              style={{
                fontSize: 12, padding: "4px 24px 4px 8px", borderRadius: 6,
                border: `1px solid ${isDark ? "#374151" : "#d1d5db"}`, backgroundColor: isDark ? "#1f2937" : "white", color: isDark ? "#d1d5db" : "#374151",
                cursor: "pointer", outline: "none",
              }}
            >
              {SORT_KEYS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        ) : undefined}
      />

      {/* View content */}
      <div className="flex-1 flex flex-col min-h-0">
        {viewMode === "grid" && (
          <GridView cars={sortedCars} isLoading={isLoading} />
        )}
        {viewMode === "list" && (
          <ListView cars={sortedCars} isLoading={isLoading} onCarClick={(carId) => setSelectedCarId(carId)} />
        )}
        {viewMode === "map" && (
          <MapViewWrapper cars={sortedCars} isLoading={isLoading} onCarClick={(carId) => setSelectedCarId(carId)} />
        )}
        {viewMode === "compare" && (
          <CompareView
            cars={cars as Car[]}
            sortedCars={sortedCars as Car[]}
            attrKeys={attrKeys}
            allFeatures={allFeatures}
            isLoading={isLoading}
            collectionId={0}
            fetchingFilter={false}
            onCarClick={(carId) => setSelectedCarId(carId)}
            onRateCar={() => {}}
            selectedForResearch={new Set()}
            onToggleResearch={() => {}}
          />
        )}
        {viewMode === "notes" && (
          <SharedNotesView
            cars={cars as Car[]}
            researches={data.deep_researches}
            onCarClick={(carId) => setSelectedCarId(carId)}
          />
        )}
      </div>

      {/* Car detail modal (read-only) */}
      <CarDetailModal
        car={(cars as Car[]).find((c) => c.id === selectedCarId) ?? null}
        collectionId={0}
        open={selectedCarId !== null}
        onClose={() => setSelectedCarId(null)}
      />
    </div>
  );
}
