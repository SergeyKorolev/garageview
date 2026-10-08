import { useState, useMemo, useEffect } from "react";
import { CheckIcon, XMarkIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import StarRating from "@/components/cars/StarRating";
import DarkCheckbox from "@/components/common/DarkCheckbox";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import { sourceLabel, sourceLogo } from "@/utils/sourceLabel";
import { cn } from "@/utils/cn";
import { useThemeStore } from "@/stores/themeStore";
import type { Car } from "@/types/car";

interface CompareViewProps {
  cars: Car[];
  sortedCars: Car[];
  attrKeys: string[];
  allFeatures: string[];
  isLoading: boolean;
  collectionId: number;
  fetchingFilter: boolean;
  onCarClick: (carId: number) => void;
  onRateCar: (carId: number, rating: number) => void;
  selectedForResearch: Set<number>;
  onToggleResearch: (carId: number) => void;
}

export default function CompareView({
  cars, sortedCars, attrKeys, allFeatures, isLoading, collectionId, fetchingFilter,
  onCarClick, onRateCar, selectedForResearch, onToggleResearch,
}: CompareViewProps) {
  const fp = useFormatPrice();
  const isDark = useThemeStore((s) => s.theme === "dark");
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);
  const [aiInfoCarId, setAiInfoCarId] = useState<number | null>(null);
  const [featureFilters, setFeatureFilters] = useState<Record<number, "all" | "included" | "excluded">>({});
  const [featureRequirements, setFeatureRequirements] = useState<Record<string, "all" | "has" | "missing">>({});

  useEffect(() => {
    if (aiInfoCarId === null) return;
    const handler = () => setAiInfoCarId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [aiInfoCarId]);

  const filteredFeatures = useMemo(() => {
    const activeFilters = Object.entries(featureFilters).filter(([, v]) => v !== "all");
    if (activeFilters.length === 0) return allFeatures;
    return allFeatures.filter((feature) =>
      activeFilters.every(([carIdStr, filter]) => {
        const car = sortedCars.find((c) => c.id === Number(carIdStr));
        const has = car?.features?.includes(feature) ?? false;
        return filter === "included" ? has : !has;
      })
    );
  }, [allFeatures, featureFilters, sortedCars]);

  const matrixFilteredCars = useMemo(() => {
    const activeReqs = Object.entries(featureRequirements).filter(([, v]) => v !== "all");
    if (activeReqs.length === 0) return sortedCars;
    return sortedCars.filter((car) =>
      activeReqs.every(([feature, req]) => {
        const has = car.features?.includes(feature) ?? false;
        return req === "has" ? has : !has;
      })
    );
  }, [sortedCars, featureRequirements]);

  const activeFeatureReqCount = Object.values(featureRequirements).filter((v) => v !== "all").length;

  return (
    <div className="flex-1 overflow-auto pb-16" style={{ height: "calc(100vh - 10rem)" }}>
      <table className="min-w-full border-collapse">
        <thead className="sticky top-0 bg-white dark:bg-gray-900" style={{ zIndex: 30 }}>
          <tr>
            <th className="sticky left-0 z-20 border-b border-r border-gray-200 bg-white px-3 py-2 text-left text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400" style={{ width: "1%", minWidth: "min(300px, 40vw)" }}>
              {activeFeatureReqCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "#6366f1" }}>
                    {matrixFilteredCars.length}/{sortedCars.length} cars
                  </span>
                  <button
                    onClick={() => setFeatureRequirements({})}
                    style={{ fontSize: 10, color: "#ef4444", cursor: "pointer", border: "none", background: "none", padding: 0, textDecoration: "underline" }}
                  >
                    Reset
                  </button>
                </div>
              )}
            </th>
            {matrixFilteredCars.map((car) => (
              <th
                key={car.id}
                className="min-w-[160px] max-w-[200px] border-b border-gray-200 px-2 py-2 text-center align-top dark:border-gray-700"
              >
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4, marginBottom: 4 }} onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const isSelected = selectedForResearch.has(car.id);
                    const atLimit = !isSelected && selectedForResearch.size >= 10;
                    return (<>
                      <DarkCheckbox
                        checked={isSelected}
                        disabled={atLimit}
                        onChange={() => !atLimit && onToggleResearch(car.id)}
                      />
                      <span style={{ fontSize: 10, color: isSelected ? "#22c55e" : atLimit ? "#374151" : "#6b7280" }}>Compare</span>
                    </>);
                  })()}
                </div>
                <div onClick={() => onCarClick(car.id)} style={{ cursor: "pointer" }}>
                  {car.photos?.[0] ? (
                    <img src={car.photos[0]} alt="" className="mx-auto mb-1 h-16 w-28 rounded object-cover" />
                  ) : (
                    <div className="mx-auto mb-1 h-16 w-28 rounded bg-gray-100 dark:bg-gray-800" />
                  )}
                </div>
                <div className="text-xs font-medium text-gray-900 dark:text-white line-clamp-1">
                  {car.title}
                </div>
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  {fp(car.price_cents)}
                </div>
                <div className="text-[10px] text-gray-400">
                  {car.seller_name && <div className="truncate">{car.seller_name}</div>}
                  <div className="truncate">
                    {car.mileage_km != null && `${Math.round(car.mileage_km / 1000)}k km`}
                    {car.mileage_km != null && car.power_kw != null && " | "}
                    {car.power_kw != null && `${Math.round(car.power_kw * 1.36)} PS`}
                  </div>
                </div>
                {car.listing_url && (
                  <a
                    href={car.listing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {sourceLogo(car) && <img src={sourceLogo(car)!} alt="" className="h-3 w-3 rounded-[2px]" />}
                    {sourceLabel(car)} ↗
                  </a>
                )}
                <div className="mt-1" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <StarRating
                    rating={car.rating ?? 0}
                    onChange={(r) => onRateCar(car.id, r)}
                  />
                </div>
                {car.ai_rating != null && (
                  <div className="mt-1" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, position: "relative" }}>
                    <span
                      onClick={(e) => { e.stopPropagation(); setAiInfoCarId(aiInfoCarId === car.id ? null : car.id); }}
                      style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                        border: "1px solid #22c55e", color: "#22c55e", cursor: "pointer",
                        display: "inline-flex", alignItems: "center", gap: 3,
                      }}
                    >
                      AI {car.ai_rating}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setAiInfoCarId(aiInfoCarId === car.id ? null : car.id); }}
                      style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}
                    >
                      <InformationCircleIcon style={{ width: 14, height: 14, color: "#6b7280" }} />
                    </button>
                    {aiInfoCarId === car.id && car.ai_explanation && (() => {
                      let data: any;
                      try { data = typeof car.ai_explanation === "string" ? JSON.parse(car.ai_explanation) : car.ai_explanation; } catch { data = null; }
                      return (
                        <div
                          style={{
                            position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                            marginTop: 6, zIndex: 50,
                            width: 340, padding: "14px 16px",
                            borderRadius: 10, fontSize: 12, lineHeight: 1.6,
                            boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
                            backgroundColor: isDark ? "#1f2937" : "#ffffff",
                            color: isDark ? "#e5e7eb" : "#374151",
                            border: "1px solid #374151",
                            textAlign: "left",
                          }}
                        >
                          {data ? (
                            <>
                              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{data.verdict}</div>
                              {data.pros?.length > 0 && (
                                <div style={{ marginBottom: 6 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", textTransform: "uppercase", marginBottom: 3 }}>Strengths</div>
                                  {data.pros.map((p: string, i: number) => (
                                    <div key={i} style={{ color: "#22c55e", fontWeight: 500, marginBottom: 2 }}>+ {p}</div>
                                  ))}
                                </div>
                              )}
                              {data.cons?.length > 0 && (
                                <div style={{ marginBottom: 6 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", marginBottom: 3 }}>Weaknesses</div>
                                  {data.cons.map((c: string, i: number) => (
                                    <div key={i} style={{ color: "#ef4444", fontWeight: 500, marginBottom: 2 }}>- {c}</div>
                                  ))}
                                </div>
                              )}
                              {data.market_price_label && (
                                <div style={{ marginTop: 6, padding: "4px 8px", borderRadius: 4, backgroundColor: "rgba(34,197,94,0.1)", fontSize: 11, fontWeight: 600 }}>
                                  Price: {data.market_price_label}
                                </div>
                              )}
                            </>
                          ) : (
                            <div>{String(car.ai_explanation)}</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {attrKeys.map((key, rowIdx) => {
            const isHighlighted = highlightedRow === `attr-${key}`;
            const isEven = rowIdx % 2 === 1;
            const stickyBg = isHighlighted ? undefined : isEven ? "var(--zebra-bg)" : "var(--base-bg)";
            return (
            <tr
              key={`attr-${key}`}
              onClick={() => setHighlightedRow(isHighlighted ? null : `attr-${key}`)}
              className={cn(
                "cursor-pointer transition-colors",
                isHighlighted
                  ? "bg-blue-100 dark:bg-blue-900/30"
                  : "even:bg-gray-50 hover:bg-gray-100 dark:even:bg-gray-800/50 dark:hover:bg-gray-800"
              )}
              style={{ "--zebra-bg": isDark ? "rgb(31,41,55)" : "rgb(249,250,251)", "--base-bg": isDark ? "rgb(17,24,39)" : "rgb(255,255,255)" } as React.CSSProperties}
            >
              <td className="sticky left-0 border-r border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 dark:border-gray-700 dark:text-gray-300" style={{ zIndex: 20, backgroundColor: stickyBg, width: "1%", minWidth: "min(300px, 40vw)" }}>
                {key}
              </td>
              {matrixFilteredCars.map((car) => {
                const val = car.attributes?.[key];
                const display = val == null ? "—" : Array.isArray(val) ? val[0] : String(val);
                return (
                  <td key={car.id} className="px-2 py-1.5 text-center text-xs text-gray-700 dark:text-gray-300">
                    {display}
                  </td>
                );
              })}
            </tr>
          );
          })}
          <tr className="border-b-2 border-gray-300 dark:border-gray-600">
            <td className="sticky left-0 border-r border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900" style={{ zIndex: 20, width: "1%", minWidth: "min(300px, 40vw)" }}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Equipment &amp; Features
              </div>
            </td>
            {matrixFilteredCars.map((car) => (
              <td key={car.id} className="px-1 py-2 text-center">
                <select
                  value={featureFilters[car.id] || "all"}
                  onChange={(e) => setFeatureFilters((prev) => ({
                    ...prev,
                    [car.id]: e.target.value as "all" | "included" | "excluded",
                  }))}
                  className="mx-auto block rounded border border-gray-300 bg-white px-1 py-0.5 text-[10px] text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                  <option value="all">All</option>
                  <option value="included">Included</option>
                  <option value="excluded">Missing</option>
                </select>
              </td>
            ))}
          </tr>
          {filteredFeatures.map((feature, rowIdx) => {
            const isHighlighted = highlightedRow === `feat-${feature}`;
            const isEven = rowIdx % 2 === 1;
            const stickyBg = isHighlighted ? undefined : isEven ? "var(--zebra-bg)" : "var(--base-bg)";
            return (
            <tr
              key={`feat-${feature}`}
              onClick={() => setHighlightedRow(isHighlighted ? null : `feat-${feature}`)}
              className={cn(
                "cursor-pointer transition-colors",
                isHighlighted
                  ? "bg-blue-100 dark:bg-blue-900/30"
                  : "even:bg-gray-50 hover:bg-gray-100 dark:even:bg-gray-800/50 dark:hover:bg-gray-800"
              )}
              style={{ "--zebra-bg": isDark ? "rgb(31,41,55)" : "rgb(249,250,251)", "--base-bg": isDark ? "rgb(17,24,39)" : "rgb(255,255,255)" } as React.CSSProperties}
            >
              <td className="sticky left-0 border-r border-gray-200 px-3 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:text-gray-300" style={{ zIndex: 20, backgroundColor: stickyBg, width: "1%", minWidth: "min(300px, 40vw)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                  <span style={{ maxWidth: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={feature}>{feature}</span>
                  <select
                    value={featureRequirements[feature] || "all"}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      setFeatureRequirements((prev) => ({
                        ...prev,
                        [feature]: e.target.value as "all" | "has" | "missing",
                      }));
                    }}
                    className="rounded border border-gray-300 bg-white px-1 py-0.5 text-[10px] text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    style={{
                      flexShrink: 0, cursor: "pointer",
                      borderColor: featureRequirements[feature] && featureRequirements[feature] !== "all" ? "#6366f1" : undefined,
                      backgroundColor: featureRequirements[feature] === "has" ? "rgba(34,197,94,0.15)" : featureRequirements[feature] === "missing" ? "rgba(239,68,68,0.15)" : undefined,
                    }}
                  >
                    <option value="all">All</option>
                    <option value="has">Has</option>
                    <option value="missing">Missing</option>
                  </select>
                </div>
              </td>
              {matrixFilteredCars.map((car) => (
                <td key={car.id} className="px-2 py-1.5 text-center">
                  {car.features?.includes(feature) ? (
                    <CheckIcon className="mx-auto h-5 w-5 stroke-[3] text-green-500" />
                  ) : (
                    <XMarkIcon className="mx-auto h-5 w-5 stroke-[3] text-red-500" />
                  )}
                </td>
              ))}
            </tr>
          );
          })}
        </tbody>
      </table>
    </div>
  );
}
