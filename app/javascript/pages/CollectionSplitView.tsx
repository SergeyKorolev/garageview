import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, Link, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SparklesIcon, MagnifyingGlassIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import ShareCollectionModal from "@/components/collections/ShareCollectionModal";
import MemberAvatarStack from "@/components/collections/MemberAvatarStack";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCollection, useUpdateCollection } from "@/hooks/useCollections";
import { useQueryClient } from "@tanstack/react-query";
import { useCollectionCars, useRemoveCar, useRateCar } from "@/hooks/useCollectionCars";
import { triggerAiRating, getAllCollectionCars } from "@/api/cars";
import { SOURCES } from "@/utils/sourceLabel";
import { createDeepResearch } from "@/api/deepResearch";
import DeepResearchModal from "@/components/cars/DeepResearchModal";
import { useFilterStore } from "@/stores/filterStore";
import { useCurrencyStore } from "@/stores/currencyStore";
import { useThemeStore } from "@/stores/themeStore";
import AddCarModal from "@/components/collections/AddCarModal";
import CarDetailModal from "@/components/cars/CarDetailModal";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ViewTabs from "@/components/navigation/ViewTabs";
import ListView from "@/components/views/ListView";
import GridView from "@/components/views/GridView";
import MapViewWrapper from "@/components/views/MapViewWrapper";
import CompareView from "@/components/views/CompareView";
import NotesView from "@/components/views/NotesView";
import type { CarSortField } from "@/types/car";

type ViewMode = "list" | "grid" | "map" | "compare" | "notes";

const SORT_KEYS: { value: string; key: string }[] = [
  { value: "default", key: "sort.default" },
  { value: "price:asc", key: "sort.priceAsc" },
  { value: "price:desc", key: "sort.priceDesc" },
  { value: "mileage:asc", key: "sort.mileageAsc" },
  { value: "mileage:desc", key: "sort.mileageDesc" },
  { value: "travel_time:asc", key: "sort.travelAsc" },
  { value: "travel_time:desc", key: "sort.travelDesc" },
  { value: "feature_count:desc", key: "sort.featuresDesc" },
  { value: "feature_count:asc", key: "sort.featuresAsc" },
  { value: "rating:desc", key: "sort.ratingDesc" },
  { value: "rating:asc", key: "sort.ratingAsc" },
  { value: "ai_rating:asc", key: "sort.aiAsc" },
  { value: "ai_rating:desc", key: "sort.aiDesc" },
];

const FETCHING_MESSAGES = [
  "Warming up the engines...", "Checking under the hood...", "Scanning the autobahn...",
  "Polishing the results...", "Negotiating with dealers...", "Kicking the tires...",
  "Test driving the listings...", "Revving up the search...", "Fueling the pipeline...",
  "Tuning the filters...", "Inspecting the paint job...", "Checking the Carfax...",
];

const DEEP_RESEARCH_MESSAGES = [
  "🔬 Reading dealer descriptions line by line...", "🔬 Cross-checking features vs specs...",
  "🔬 Comparing equipment lists item by item...", "🔬 Looking for features mentioned but not listed...",
  "🔬 Analyzing price-to-value ratio for each car...", "🔬 Checking accident history and red flags...",
  "🔬 Estimating running cost differences...", "🔬 Evaluating resale value outlook...",
  "🔬 Assessing dealer reliability...", "🔬 Building final ranking with evidence...",
  "🔬 Polishing the deep comparison report...",
];

const AI_RATING_MESSAGES = [
  "🤖 Analyzing market prices...", "🤖 Comparing mileage vs age...", "🤖 Checking for red flags...",
  "🤖 Counting premium features...", "🤖 Investigating dealer margins...", "🤖 Cross-referencing mobile.de data...",
  "🤖 Looking for hidden defects...", "🤖 Calculating depreciation curves...", "🤖 Preparing negotiation leverage...",
  "🤖 Building your test drive checklist...", "🤖 Running the numbers one more time...", "🤖 Almost done, fine-tuning rankings...",
];

function useRotatingMessage(messages: string[], active: boolean) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!active) { setIdx(0); return; }
    const interval = setInterval(() => {
      setIdx((i) => (i + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [active, messages]);
  return messages[idx];
}

function deriveViewMode(pathname: string): ViewMode {
  if (pathname.endsWith("/grid")) return "grid";
  if (pathname.endsWith("/map")) return "map";
  if (pathname.endsWith("/compare")) return "compare";
  if (pathname.endsWith("/notes")) return "notes";
  return "list";
}

const PRIORITY_ATTRS = [
  "Vehicle condition", "Category", "First Registration", "Mileage",
  "Power", "Transmission", "Drive type", "Fuel type", "Other energy source",
  "Electric range", "Range", "CO₂ emissions (comb.)", "CO₂ class",
  "Energy consumption (comb.)", "Power consumption",
  "Number of Seats", "Door Count", "Colour", "Interior Design",
  "Climatisation", "Parking sensors", "Airbags", "Emissions Sticker",
  "Number of Vehicle Owners", "Availability",
];

export default function CollectionSplitView() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const { t } = useTranslation();
  const isDark = useThemeStore((s) => s.theme === "dark");
  const [searchParams, setSearchParams] = useSearchParams();
  const id = Number(collectionId);
  const { data: collection } = useCollection(id);
  const { data: currentUser } = useCurrentUser();
  const fetchingFilter = collection?.is_fetching === true;
  const { data: carsData, isLoading } = useCollectionCars(id);
  const queryClient = useQueryClient();
  const removeCar = useRemoveCar(id);
  const rateCar = useRateCar(id);
  const [showAddCar, setShowAddCar] = useState(false);
  const [addCarMode, setAddCarMode] = useState<"car" | "search">("car");
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);
  const addDropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const viewMode = deriveViewMode(location.pathname);
  const updateCollection = useUpdateCollection();
  const { sort, setSort } = useFilterStore();
  const { currency } = useCurrencyStore();
  const [maxMileage, setMaxMileage] = useState<number | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const fetchingMessage = useRotatingMessage(FETCHING_MESSAGES, fetchingFilter);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [aiRatingLoading, setAiRatingLoading] = useState(false);
  const aiPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiRateInFlightRef = useRef(false);
  const aiMessage = useRotatingMessage(AI_RATING_MESSAGES, aiRatingLoading);
  const [deepResearchInProgress, setDeepResearchInProgress] = useState(false);
  const deepResearchMessage = useRotatingMessage(DEEP_RESEARCH_MESSAGES, deepResearchInProgress);

  // Global deep research selection (shared across List & Compare views)
  const [selectedForResearch, setSelectedForResearch] = useState<Set<number>>(new Set());
  const [deepResearchId, setDeepResearchId] = useState<number | null>(null);
  const [deepResearchLoading, setDeepResearchLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const userRole = collection?.role ?? "owner";
  const canEdit = userRole === "owner" || userRole === "editor";
  const isOwner = userRole === "owner";

  const toggleCarForResearch = (carId: number) => {
    setSelectedForResearch(prev => {
      const next = new Set(prev);
      if (next.has(carId)) { next.delete(carId); }
      else { next.add(carId); }
      return next;
    });
  };

  const handleDeepResearch = async () => {
    if (selectedForResearch.size < 2 || !id) return;
    setDeepResearchLoading(true);
    setDeepResearchInProgress(true);
    try {
      const res = await createDeepResearch(id, Array.from(selectedForResearch));
      setDeepResearchId(res.id);
    } catch (err: any) {
      console.error("Deep research failed:", err);
      const msg = err?.response?.data?.error || err?.message || "Deep research failed";
      alert(msg);
      setDeepResearchInProgress(false);
    } finally {
      setDeepResearchLoading(false);
    }
  };

  const handleNameSave = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== collection?.name) {
      updateCollection.mutate({ id, payload: { name: trimmed } });
    }
    setEditingName(false);
  };

  // Clean up URL param if present (legacy)
  useEffect(() => {
    if (searchParams.get("fetching")) {
      searchParams.delete("fetching");
      setSearchParams(searchParams, { replace: true });
    }
  }, []);


  useEffect(() => {
    if (!addDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (addDropdownRef.current && !addDropdownRef.current.contains(e.target as Node)) setAddDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [addDropdownOpen]);

  const cars = carsData?.cars ?? [];

  const { sortedCars, attrKeys, allFeatures } = useMemo(() => {
    let filtered = cars;
    if (maxMileage != null) {
      filtered = filtered.filter((c) => c.mileage_km != null && c.mileage_km <= maxMileage);
    }
    if (sourceFilter) {
      filtered = filtered.filter((c) => c.source === sourceFilter);
    }
    const dir = sort.direction === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      switch (sort.field) {
        case "price": return ((a.price_cents ?? 0) - (b.price_cents ?? 0)) * dir;
        case "mileage": return ((a.mileage_km ?? 0) - (b.mileage_km ?? 0)) * dir;
        case "feature_count": return ((a.features?.length ?? 0) - (b.features?.length ?? 0)) * dir;
        case "travel_time": return ((a.travel_time?.driving_seconds ?? 999999) - (b.travel_time?.driving_seconds ?? 999999)) * dir;
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
  }, [cars, sort.field, sort.direction, maxMileage, sourceFilter]);

  const handleAiRate = async () => {
    // Ref guard set synchronously, so a second click during the trigger
    // request can't start a duplicate request and poll timer
    if (aiRateInFlightRef.current) return;
    aiRateInFlightRef.current = true;
    setAiRatingLoading(true);
    try {
      await triggerAiRating(id);
      // Poll for results — job runs in background via Sidekiq
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes at 2s intervals
      const poll = setInterval(async () => {
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(poll);
          aiPollRef.current = null;
          aiRateInFlightRef.current = false;
          setAiRatingLoading(false);
          return;
        }
        try {
          // Refresh the main view so user sees per-car analyses as they arrive
          await queryClient.invalidateQueries({ queryKey: ["collectionCars", id] });
          const results = await queryClient.fetchQuery({
            queryKey: ["collectionCars", id, "ai_poll", attempts],
            queryFn: ({ signal }) => getAllCollectionCars({ collectionId: id }, signal),
            staleTime: 0,
          });
          const freshCars = results?.cars;
          // Ratings are done when all ready cars have ai_rating
          const readyCars = freshCars?.filter((c: any) => c.status === "ready") || [];
          const allRated = readyCars.length > 0 && readyCars.every((c: any) => c.ai_rating != null);
          if (allRated) {
            clearInterval(poll);
            aiPollRef.current = null;
            aiRateInFlightRef.current = false;
            await queryClient.invalidateQueries({ queryKey: ["collectionCars", id] });
            setSort({ field: "ai_rating" as CarSortField, direction: "asc" });
            setAiRatingLoading(false);
          }
        } catch { /* keep polling */ }
      }, 2000);
      aiPollRef.current = poll;
    } catch (e) {
      console.error("AI rating failed:", e);
      aiRateInFlightRef.current = false;
      setAiRatingLoading(false);
    }
  };

  // Clean up AI-rating poll on unmount
  useEffect(() => {
    return () => {
      if (aiPollRef.current) {
        clearInterval(aiPollRef.current);
        aiPollRef.current = null;
      }
    };
  }, []);

  // Auto-trigger AI rate if navigated with ?ai_rate=1 (from collection card menu)
  useEffect(() => {
    if (searchParams.get("ai_rate") && cars.length >= 1 && !aiRatingLoading) {
      searchParams.delete("ai_rate");
      setSearchParams(searchParams, { replace: true });
      handleAiRate();
    }
  }, [searchParams, cars.length]);

  if (!collection) return <LoadingSpinner />;

  return (
    <>
      {/* Toolbar */}
      <div className="sticky top-14 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900" style={{ zIndex: 100 }}>
        <div className="flex items-center gap-3">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            Collections
          </Link>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          {isOwner && editingName ? (
            <input
              ref={nameInputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSave();
                if (e.key === "Escape") setEditingName(false);
              }}
              className="rounded border border-blue-400 bg-transparent px-1 font-semibold text-gray-900 outline-none dark:text-white"
              style={{ width: Math.max(100, nameValue.length * 9 + 20) }}
              autoFocus
            />
          ) : isOwner ? (
            <h2
              className="cursor-pointer rounded px-1 font-semibold text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-800"
              onClick={() => { setNameValue(collection.name); setEditingName(true); }}
              title="Click to rename"
            >
              {collection.name}
            </h2>
          ) : (
            <h2 className="px-1 font-semibold text-gray-900 dark:text-white">
              {collection.name}
            </h2>
          )}
          <span className="text-sm text-gray-400">({cars.length} cars)</span>
          {collection.members_count > 1 && (
            <MemberAvatarStack
              collectionId={id}
              membersCount={collection.members_count}
              currentUserRole={userRole}
            />
          )}
        </div>

        {/* Center: Status messages */}
        {fetchingFilter && (
          <div className="flex items-center gap-2">
            <div style={{ width: 16, height: 16, borderWidth: 2 }} className="animate-spin rounded-full border-blue-400 border-t-blue-600" />
            <span className="text-sm text-blue-300">
              {(() => {
                const ready = cars.filter(c => c.status === "ready").length;
                const total = collection?.expected_cars || cars.filter(c => (c.status as string) !== "placeholder").length;
                if (total > 0) return `Loading ${ready}/${total} cars — ${fetchingMessage}`;
                return `Searching mobile.de — ${fetchingMessage}`;
              })()}
            </span>
          </div>
        )}

        {deepResearchInProgress && !aiRatingLoading && !fetchingFilter && (
          <div className="flex items-center gap-3">
            <div style={{ width: 18, height: 18, borderWidth: 2.5, borderColor: "#86efac", borderTopColor: "#22c55e", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <span className="text-sm font-medium" style={{ color: "#22c55e", transition: "opacity 0.3s" }}>
              {deepResearchMessage}
            </span>
          </div>
        )}

        {/* Right: Global actions */}
        <div className="flex items-center gap-2">
          {/* Share button (owner only) */}
          {isOwner && (
            <>
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 sm:hidden"
              >
                <UserPlusIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowShareModal(true)}
                className="hidden items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 sm:flex"
              >
                <UserPlusIcon className="h-4 w-4" />
                {t("sharing.share")}
              </button>
            </>
          )}
          {canEdit && viewMode !== "notes" && (() => {
            const readyCars = cars.filter((c: any) => c.status === "ready");
            const allRated = readyCars.length >= 1 && readyCars.every((c: any) => c.ai_rating != null);
            const tooFew = readyCars.length < 1;
            const aiRateDisabled = aiRatingLoading || allRated || tooFew;
            const tooltip = tooFew ? "No cars to rate" : allRated ? "All cars already rated" : "";
            return (
              <button
                onClick={handleAiRate}
                disabled={aiRateDisabled}
                title={tooltip}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "6px 12px", fontSize: 13, fontWeight: 600, borderRadius: 6,
                  border: "none", cursor: aiRateDisabled ? "not-allowed" : "pointer",
                  backgroundColor: "#22c55e", color: "white",
                  opacity: aiRateDisabled ? 0.4 : 1,
                }}
              >
                <SparklesIcon style={{ width: 14, height: 14 }} />
                {aiRatingLoading ? t("actions.rating") : t("actions.aiRate")}
              </button>
            );
          })()}
          {canEdit && <button
            onClick={() => {
              setAddCarMode("car");
              setShowAddCar(true);
            }}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <span style={{ position: "relative", width: 20, height: 20, flexShrink: 0 }}>
              <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 17h14M5 17a2 2 0 01-2-2v-3a1 1 0 011-1l2-4h12l2 4a1 1 0 011 1v3a2 2 0 01-2 2M5 17a2 2 0 100 4 2 2 0 000-4zm14 0a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              <span style={{
                position: "absolute", top: -4, right: -4,
                width: 12, height: 12, borderRadius: "50%",
                backgroundColor: "white", color: "#2563eb",
                fontSize: 10, fontWeight: 800, lineHeight: "12px",
                textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center",
              }}>+</span>
            </span>
            {t("actions.addCar")}
          </button>}
        </div>
      </div>

      {/* Tab navigation with sort + deep research */}
      <ViewTabs
        collectionId={id}
        rightContent={viewMode !== "notes" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {canEdit && (viewMode === "list" || viewMode === "compare") && (
              <button
                onClick={handleDeepResearch}
                disabled={selectedForResearch.size < 2 || deepResearchLoading || fetchingFilter}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "4px 10px", fontSize: 12, fontWeight: 600, borderRadius: 6,
                  border: "none", cursor: selectedForResearch.size >= 2 ? "pointer" : "default",
                  backgroundColor: "#22c55e", color: "white",
                  opacity: selectedForResearch.size < 2 || deepResearchLoading ? 0.4 : 1,
                }}
              >
                <MagnifyingGlassIcon style={{ width: 13, height: 13 }} />
                {deepResearchLoading ? "Starting..." : `Deep Research${selectedForResearch.size > 0 ? ` (${selectedForResearch.size})` : ""}`}
              </button>
            )}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              style={{
                fontSize: 12, padding: "4px 24px 4px 8px", borderRadius: 6,
                border: `1px solid ${isDark ? "#374151" : "#d1d5db"}`, backgroundColor: isDark ? "#1f2937" : "white", color: isDark ? "#d1d5db" : "#374151",
                cursor: "pointer", outline: "none",
              }}
            >
              <option value="">{t("filters.allSites")}</option>
              {SOURCES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            <select
              value={maxMileage == null ? "" : String(maxMileage)}
              onChange={(e) => setMaxMileage(e.target.value ? Number(e.target.value) : null)}
              style={{
                fontSize: 12, padding: "4px 24px 4px 8px", borderRadius: 6,
                border: `1px solid ${isDark ? "#374151" : "#d1d5db"}`, backgroundColor: isDark ? "#1f2937" : "white", color: isDark ? "#d1d5db" : "#374151",
                cursor: "pointer", outline: "none",
              }}
            >
              <option value="">{t("filters.allMileage")}</option>
              <option value="5000">≤ 5.000 km</option>
              <option value="10000">≤ 10.000 km</option>
              <option value="15000">≤ 15.000 km</option>
              <option value="20000">≤ 20.000 km</option>
              <option value="30000">≤ 30.000 km</option>
              <option value="50000">≤ 50.000 km</option>
              <option value="75000">≤ 75.000 km</option>
              <option value="100000">≤ 100.000 km</option>
              <option value="150000">≤ 150.000 km</option>
            </select>
            <select
              value={sort.field === "created_at" ? "default" : `${sort.field}:${sort.direction}`}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "default") {
                  setSort({ field: "created_at" as CarSortField, direction: "desc" });
                } else {
                  const [field, dir] = val.split(":");
                  setSort({ field: field as CarSortField, direction: dir as "asc" | "desc" });
                }
              }}
              style={{
                fontSize: 12, padding: "4px 24px 4px 8px", borderRadius: 6,
                border: `1px solid ${isDark ? "#374151" : "#d1d5db"}`, backgroundColor: isDark ? "#1f2937" : "white", color: isDark ? "#d1d5db" : "#374151",
                cursor: "pointer", outline: "none",
              }}
            >
              {SORT_KEYS.map((o) => (
                <option key={o.value} value={o.value}>{t(o.key)}</option>
              ))}
            </select>
          </div>
        ) : undefined}
      />

      {/* View content */}
      {viewMode === "list" && (
        <ListView
          cars={sortedCars}
          isLoading={isLoading}
          disabled={false}
          onAddCar={canEdit ? () => setShowAddCar(true) : undefined}
          onRemoveCar={canEdit ? (carId) => removeCar.mutate(carId) : undefined}
          onRateCar={canEdit ? (carId, rating) => rateCar.mutate({ carId, rating }) : undefined}
          onCarClick={(carId) => setSelectedCarId(carId)}
          selectedForResearch={selectedForResearch}
          onToggleResearch={toggleCarForResearch}
        />
      )}
      {viewMode === "grid" && (
        <GridView
          cars={sortedCars}
          isLoading={isLoading}
          disabled={false}
          onAddCar={canEdit ? () => setShowAddCar(true) : undefined}
          onRemoveCar={canEdit ? (carId) => removeCar.mutate(carId) : undefined}
          onRateCar={canEdit ? (carId, rating) => rateCar.mutate({ carId, rating }) : undefined}
        />
      )}
      {viewMode === "map" && (
        <MapViewWrapper
          cars={sortedCars}
          isLoading={isLoading}
          disabled={false}
          onAddCar={canEdit ? () => setShowAddCar(true) : undefined}
          onRemoveCar={canEdit ? (carId) => removeCar.mutate(carId) : undefined}
          onRateCar={canEdit ? (carId, rating) => rateCar.mutate({ carId, rating }) : undefined}
          onCarClick={(carId) => setSelectedCarId(carId)}
        />
      )}
      {viewMode === "compare" && (
        <CompareView
          cars={cars}
          sortedCars={sortedCars}
          attrKeys={attrKeys}
          allFeatures={allFeatures}
          isLoading={isLoading}
          collectionId={id}
          fetchingFilter={fetchingFilter}
          onCarClick={(carId) => setSelectedCarId(carId)}
          onRateCar={canEdit ? (carId, rating) => rateCar.mutate({ carId, rating }) : () => {}}
          selectedForResearch={selectedForResearch}
          onToggleResearch={toggleCarForResearch}
        />
      )}
      {viewMode === "notes" && (
        <NotesView collectionId={id} cars={cars} onCarClick={(carId) => setSelectedCarId(carId)} />
      )}

      {/* Shared modals */}
      <AddCarModal
        open={showAddCar}
        onClose={() => setShowAddCar(false)}
        collectionId={id}
        initialMode={addCarMode}
        onSearchFilterAdded={() => { queryClient.invalidateQueries({ queryKey: ["collections", id] }); }}
      />
      <CarDetailModal
        car={cars.find((c) => c.id === selectedCarId) ?? null}
        collectionId={id}
        open={selectedCarId !== null}
        onClose={() => setSelectedCarId(null)}
        onRate={canEdit ? (carId, rating) => rateCar.mutate({ carId, rating }) : undefined}
      />

      {/* Share modal */}
      <ShareCollectionModal
        collectionId={id}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        currentUserRole={userRole}
        currentUserId={currentUser?.id}
        compareToken={collection?.compare_token}
        compareUrl={collection?.compare_url}
        compareRole={collection?.compare_role}
        shareToken={collection?.share_token}
        shareUrl={collection?.share_url}
        isDefaultCollection={collection?.default}
        onCompareLinkChange={() => queryClient.invalidateQueries({ queryKey: ["collections", id] })}
        onShareLinkChange={() => queryClient.invalidateQueries({ queryKey: ["collections", id] })}
      />

      {/* Deep Research modal */}
      {deepResearchId && (
        <DeepResearchModal
          collectionId={id}
          researchId={deepResearchId}
          cars={cars}
          onClose={() => { setDeepResearchId(null); setDeepResearchInProgress(false); }}
          onStatusChange={(status) => {
            if (status === "completed" || status === "failed") setDeepResearchInProgress(false);
          }}
        />
      )}

      {/* AI Rating loading modal */}
      {aiRatingLoading && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)" }}
        >
          <div
            style={{
              width: "70%", maxWidth: 900,
              backgroundColor: "#111827", border: "1px solid #1f2937",
              borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column",
            }}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1f2937", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>🤖</span>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "white", margin: 0 }}>AI Rating</h2>
              </div>
            </div>
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ display: "inline-block", width: 32, height: 32, border: "3px solid rgba(34,197,94,0.3)", borderTopColor: "#22c55e", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <div style={{ marginTop: 16, fontSize: 16, fontWeight: 600, color: "#22c55e" }}>{aiMessage}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>This may take 30-60 seconds</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
