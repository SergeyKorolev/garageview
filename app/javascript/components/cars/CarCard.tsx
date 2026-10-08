import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowTopRightOnSquareIcon, EllipsisVerticalIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { Car } from "@/types/car";
import { useSelectionStore } from "@/stores/selectionStore";
import { formatMileage, formatPower, formatDate } from "@/utils/formatters";
import { sourceLabel, sourceLogo } from "@/utils/sourceLabel";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import { cn } from "@/utils/cn";
import PhotoCarousel from "./PhotoCarousel";
import TravelBadge from "./TravelBadge";
import StarRating from "./StarRating";

interface CarCardProps {
  car: Car;
  onRemove?: (carId: number) => void;
  onRate?: (carId: number, rating: number) => void;
  onClick?: () => void;
  style?: React.CSSProperties;
}

function Placeholder({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-gray-200 dark:bg-gray-700", className)} />
  );
}

export default function CarCard({ car, onRemove, onRate, onClick, style }: CarCardProps) {
  const { t } = useTranslation();
  const fp = useFormatPrice();
  const { selectedCarId, setSelectedCarId, setHoveredCarId } = useSelectionStore();
  const isSelected = selectedCarId === car.id;
  const isLoading = car.status === "pending" || car.status === "scraping";
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isError = car.status === "error";

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Placeholder skeleton for expected but not-yet-created cars
  if ((car.status as string) === "placeholder") {
    return (
      <div style={style} className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex h-48 items-center justify-center bg-gray-100 dark:bg-gray-700/50">
          <div className="text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500 dark:border-gray-500" />
            <span className="mt-2 block text-xs text-gray-500">{t("cars.waiting")}</span>
          </div>
        </div>
        <div className="flex-1 p-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  return (
    <div
      id={`car-${car.id}`}
      onClick={() => { if (onClick) { onClick(); } else { setSelectedCarId(isSelected ? null : car.id); } }}
      onMouseEnter={() => setHoveredCarId(car.id)}
      onMouseLeave={() => setHoveredCarId(null)}
      style={style}
      className={cn(
        "group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-md dark:bg-gray-800",
        isSelected
          ? "border-blue-500 shadow-md ring-2 ring-blue-200 dark:ring-blue-800"
          : "border-gray-200 dark:border-gray-700"
      )}
    >
      <div className="relative">
        {/* Three dots menu */}
        {onRemove && (
          <div
            ref={menuRef}
            className={`absolute right-2 top-2 z-10 transition-opacity ${menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: "rgba(0,0,0,0.5)", color: "white",
                cursor: "pointer", border: "none",
              }}
            >
              <EllipsisVerticalIcon style={{ width: 18, height: 18 }} />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-600 dark:bg-gray-800"
                style={{ width: 160, padding: "4px 0" }}
              >
                <button
                  onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-500 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
                  style={{ border: "none", background: "none", cursor: "pointer" }}
                >
                  <TrashIcon style={{ width: 15, height: 15 }} />
                  {t("cars.remove")}
                </button>
              </div>
            )}
          </div>
        )}
      <div onClick={(e) => e.stopPropagation()}>
      {isLoading && !car.photos?.length ? (
        <div className="flex h-48 items-center justify-center bg-gray-100 dark:bg-gray-700">
          <div className="text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
            <span className="mt-2 block text-xs text-gray-400">{t("cars.fetchingData")}</span>
          </div>
        </div>
      ) : (
        <PhotoCarousel photos={car.photos || []} title={car.title || "Car"} />
      )}
      </div>
      </div>

      <div className="flex flex-1 flex-col p-3">
        {isError && (
          <div className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">
            {t("cars.fetchError")}
          </div>
        )}

        {car.title ? (
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
            {car.title}
          </h3>
        ) : (
          <Placeholder className="h-4 w-3/4" />
        )}
        <div className="mt-1 flex items-center justify-between">
          {car.price_cents ? (
            <span className="shrink-0 text-lg font-bold text-blue-600 dark:text-blue-400">
              {fp(car.price_cents)}
            </span>
          ) : (
            <Placeholder className="h-5 w-16" />
          )}
          {car.listing_url && !isLoading && (
            <a
              href={car.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {sourceLogo(car) ? (
                <img src={sourceLogo(car)!} alt="" className="h-3 w-3 rounded-[2px]" />
              ) : (
                <ArrowTopRightOnSquareIcon className="h-3 w-3" />
              )}
              {sourceLabel(car)}
            </a>
          )}
        </div>

        {car.mileage_km || car.power_kw || car.fuel_type ? (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            {car.mileage_km ? <span>{formatMileage(car.mileage_km)}</span> : null}
            {car.first_registration ? <span>{formatDate(car.first_registration)}</span> : null}
            {car.power_kw ? <span>{formatPower(car.power_kw)}</span> : null}
            {car.fuel_type ? <span className="capitalize">{car.fuel_type}</span> : null}
            {car.transmission ? <span className="capitalize">{car.transmission}</span> : null}
          </div>
        ) : isLoading ? (
          <div className="mt-2 flex gap-3">
            <Placeholder className="h-3 w-16" />
            <Placeholder className="h-3 w-12" />
            <Placeholder className="h-3 w-20" />
          </div>
        ) : null}

        {car.seller_name ? (
          <div className="mt-2 flex items-center gap-1.5 overflow-hidden text-xs">
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 3, flexShrink: 0,
              border: "1px solid #3b82f6", color: "#3b82f6", textTransform: "capitalize",
            }}>
              {car.seller_type === "dealer" ? t("cars.dealer") : t("cars.private")}
            </span>
            <span className="truncate" style={{ color: "#3b82f6" }}>{car.seller_name}</span>
          </div>
        ) : isLoading ? (
          <div className="mt-2">
            <Placeholder className="h-3 w-32" />
          </div>
        ) : null}

        {car.seller_address && (
          <div className="mt-1 text-xs text-gray-400 truncate dark:text-gray-500">
            {car.seller_address}
          </div>
        )}

        {!isLoading && (
          <div className="mt-2" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {onRate && (
                <StarRating
                  rating={car.rating ?? 0}
                  onChange={(r) => onRate(car.id, r)}
                />
              )}
              {(() => {
                const condition = car.attributes?.["Vehicle condition"];
                const condStr = Array.isArray(condition) ? condition.join(", ") : String(condition || "");
                const isAccidentFree = condStr.toLowerCase().includes("accident-free") || condStr.toLowerCase().includes("unfallfrei");
                const isDamaged = condStr.toLowerCase().includes("damage") || condStr.toLowerCase().includes("repaired");
                if (isAccidentFree) return (
                  <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 3, backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e" }}>✓ {t("cars.accidentFree")}</span>
                );
                if (isDamaged) return (
                  <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 3, backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }}>⚠ {t("cars.damage")}</span>
                );
                return null;
              })()}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* Red flag indicator */}
              {(() => {
                try {
                  const parsed = car.ai_explanation ? JSON.parse(car.ai_explanation) : car.ai_analysis;
                  if (parsed?.red_flags?.length > 0) {
                    return <span style={{ fontSize: 12 }} title={parsed.red_flags.join(", ")}>⚠️</span>;
                  }
                } catch { /* legacy format, skip */ }
                return null;
              })()}
              {car.ai_rating != null && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                  border: "1px solid #22c55e", color: "#22c55e",
                }}>
                  AI {car.ai_rating}
                </span>
              )}
            </div>
          </div>
        )}

        {car.listing_url && isLoading && (
          <div className="mt-1 text-[10px] text-gray-400 truncate dark:text-gray-500">
            {car.listing_url}
          </div>
        )}

        <div className="mt-auto">
        {car.travel_time && (
          <>
            <hr className="mt-2 border-gray-100 dark:border-gray-700" />
            <div className="mt-2">
              <TravelBadge travelTime={car.travel_time} />
            </div>
          </>
        )}

        </div>
      </div>

      {/* Full-card confirm overlay */}
      {confirmDelete && (
        <div
          className="absolute inset-0 z-30"
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: "rgba(17, 24, 39, 0.85)",
            borderRadius: 12,
            cursor: "default",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: "white" }}>{t("cars.removeConfirm")}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove?.(car.id); setConfirmDelete(false); }}
              style={{
                padding: "6px 16px", fontSize: 13, fontWeight: 600,
                color: "white", backgroundColor: "#dc2626",
                borderRadius: 6, border: "none", cursor: "pointer",
              }}
            >
              {t("common.yes")}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
              style={{
                padding: "6px 16px", fontSize: 13, fontWeight: 500,
                color: "white", backgroundColor: "rgba(255,255,255,0.15)",
                borderRadius: 6, border: "none", cursor: "pointer",
              }}
            >
              {t("common.no")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
