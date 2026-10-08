import { useState } from "react";
import type { Car } from "@/types/car";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import DarkCheckbox from "@/components/common/DarkCheckbox";
import StarRating from "@/components/cars/StarRating";
import { formatMileage, formatPower, formatDate } from "@/utils/formatters";
import { sourceLabel, sourceLogo } from "@/utils/sourceLabel";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import { useThemeStore } from "@/stores/themeStore";

interface ListViewProps {
  cars: Car[];
  isLoading: boolean;
  disabled?: boolean;
  onAddCar?: () => void;
  onRemoveCar?: (carId: number) => void;
  onRateCar?: (carId: number, rating: number) => void;
  onCarClick?: (carId: number) => void;
  selectedForResearch?: Set<number>;
  onToggleResearch?: (carId: number) => void;
}

function getCondition(car: Car): { label: string; color: string; bg: string } | null {
  const raw = car.attributes?.["Vehicle condition"];
  const condStr = (Array.isArray(raw) ? raw.join(", ") : String(raw || "")).toLowerCase();
  if (condStr.includes("accident-free") || condStr.includes("unfallfrei")) {
    return { label: "Accident-free", color: "#22c55e", bg: "rgba(34,197,94,0.15)" };
  }
  if (condStr.includes("repaired") || condStr.includes("repariert")) {
    return { label: "Repaired", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" };
  }
  if (condStr.includes("damage") || condStr.includes("schaden") || condStr.includes("nicht repariert")) {
    return { label: "Damaged", color: "#ef4444", bg: "rgba(239,68,68,0.15)" };
  }
  return null;
}

function getWarranty(car: Car): string | null {
  // Check attributes first
  const raw = car.attributes?.["Warranty"] || car.attributes?.["Garantie"];
  if (raw) {
    const str = Array.isArray(raw) ? raw.join(", ") : String(raw);
    if (str) return str;
  }
  // Check features for warranty-related entries
  const warrantyFeature = car.features?.find(f =>
    f.toLowerCase().includes("warranty") || f.toLowerCase().includes("garantie")
  );
  if (warrantyFeature) return warrantyFeature;
  return null;
}

export default function ListView({ cars, isLoading, disabled, onAddCar, onRemoveCar, onRateCar, onCarClick, selectedForResearch, onToggleResearch }: ListViewProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const fp = useFormatPrice();
  const isDark = useThemeStore((s) => s.theme === "dark");

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

  const thStyle = getThStyle(isDark);
  const tdStyle = getTdStyle(isDark);
  const textMuted = isDark ? "#9ca3af" : "#6b7280";
  const textSecondary = isDark ? "#d1d5db" : "#4b5563";
  const textPrimary = isDark ? "#e5e7eb" : "#111827";
  const priceColor = isDark ? "#60a5fa" : "#2563eb";

  return (
    <div
      style={{
        height: "calc(100vh - 10rem)",
        overflowY: "auto",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : undefined,
      }}
    >
      <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: 32 }} />   {/* # / checkbox */}
          <col style={{ width: 68 }} />   {/* Photo */}
          <col style={{ width: "14%" }} /> {/* Car - flexible */}
          <col style={{ width: 85 }} />   {/* Price */}
          <col style={{ width: 48 }} />   {/* Features count */}
          <col style={{ width: 65 }} />   {/* Mileage */}
          <col style={{ width: 55 }} />   {/* Year */}
          <col style={{ width: 70 }} />   {/* Power */}
          <col style={{ width: 55 }} />   {/* Fuel */}
          <col style={{ width: 60 }} />   {/* Transmission */}
          <col style={{ width: 78 }} />   {/* Condition */}
          <col style={{ width: 50 }} />   {/* Warranty */}
          <col style={{ width: "16%" }} /> {/* Seller - flexible */}
          <col style={{ width: "12%" }} /> {/* Location - flexible */}
          <col style={{ width: 70 }} />   {/* Rating */}
          <col style={{ width: 48 }} />   {/* AI */}
          <col style={{ width: 100 }} />  {/* source link */}
        </colgroup>
        <thead style={{ position: "sticky", top: 0, zIndex: 10, backgroundColor: isDark ? "#111827" : "#f9fafb" }}>
          <tr style={{ borderBottom: `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}` }}>
            <th style={{ ...thStyle, textAlign: "center" }}>
              {onToggleResearch ? (() => {
                const selectedCount = selectedForResearch?.size ?? 0;
                const carsSelectedHere = cars.filter(c => selectedForResearch?.has(c.id)).length;
                const allSelected = cars.length > 0 && carsSelectedHere === cars.length;
                const someSelected = carsSelectedHere > 0 && !allSelected;
                return (
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <DarkCheckbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={() => {
                        if (allSelected || someSelected) {
                          // Deselect all cars in this view
                          cars.filter(c => selectedForResearch?.has(c.id)).forEach(c => onToggleResearch!(c.id));
                        } else {
                          // Select up to 4 total
                          const remaining = 10 - selectedCount;
                          cars.filter(c => !selectedForResearch?.has(c.id)).slice(0, remaining).forEach(c => onToggleResearch!(c.id));
                        }
                      }}
                    />
                  </div>
                );
              })() : "#"}
            </th>
            <th style={thStyle}>Photo</th>
            <th style={thStyle}>Car</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Price</th>
            <th style={{ ...thStyle, textAlign: "center" }}>Features</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Mileage</th>
            <th style={thStyle}>Year</th>
            <th style={thStyle}>Power</th>
            <th style={thStyle}>Fuel</th>
            <th style={thStyle}>Trans.</th>
            <th style={{ ...thStyle, textAlign: "center" }}>Condition</th>
            <th style={{ ...thStyle, textAlign: "center" }}>Warranty</th>
            <th style={thStyle}>Seller</th>
            <th style={thStyle}>Location</th>
            <th style={{ ...thStyle, textAlign: "center" }}>Rating</th>
            <th style={{ ...thStyle, textAlign: "center" }}>AI</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {cars.map((car, idx) => {
            const isHovered = hoveredId === car.id;
            const condition = getCondition(car);
            const warranty = getWarranty(car);
            const isSelected = selectedForResearch?.has(car.id) ?? false;
            return (
              <tr
                key={car.id}
                onClick={() => onCarClick?.(car.id)}
                onMouseEnter={() => setHoveredId(car.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  cursor: "pointer",
                  backgroundColor: isSelected ? "rgba(34,197,94,0.08)" : isHovered ? (isDark ? "#1f2937" : "#f3f4f6") : idx % 2 === 1 ? (isDark ? "#0d1117" : "#f9fafb") : "transparent",
                  borderBottom: `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}`,
                  transition: "background-color 0.1s",
                }}
              >
                <td style={{ ...tdStyle, textAlign: "center", padding: "6px 4px" }} onClick={(e) => e.stopPropagation()}>
                  {onToggleResearch ? (() => {
                    const atLimit = !isSelected && (selectedForResearch?.size ?? 0) >= 10;
                    return (
                      <div style={{ display: "flex", justifyContent: "center", opacity: atLimit ? 0.3 : 1 }}>
                        <DarkCheckbox
                          checked={isSelected}
                          disabled={atLimit}
                          onChange={() => !atLimit && onToggleResearch(car.id)}
                        />
                      </div>
                    );
                  })() : (
                    <span style={{ color: "#6b7280", fontSize: 11 }}>{idx + 1}</span>
                  )}
                </td>
                <td style={{ ...tdStyle, padding: "4px 8px" }}>
                  {car.photos?.[0] ? (
                    <img src={car.photos[0]} alt="" style={{ width: 60, height: 42, borderRadius: 4, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 60, height: 42, borderRadius: 4, backgroundColor: isDark ? "#1f2937" : "#e5e7eb" }} />
                  )}
                </td>
                <td style={tdStyle}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {car.title || "Loading..."}
                  </div>
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: priceColor }}>
                    {car.price_cents ? fp(car.price_cents) : "—"}
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: "center", color: textMuted, fontSize: 12 }}>
                  {car.features?.length || "—"}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", color: textSecondary, fontSize: 12 }}>
                  {car.mileage_km ? formatMileage(car.mileage_km) : "—"}
                </td>
                <td style={{ ...tdStyle, color: textSecondary, fontSize: 12 }}>
                  {car.first_registration ? formatDate(car.first_registration) : "—"}
                </td>
                <td style={{ ...tdStyle, color: textSecondary, fontSize: 12 }}>
                  {car.power_kw ? formatPower(car.power_kw) : "—"}
                </td>
                <td style={{ ...tdStyle, color: textSecondary, fontSize: 12, textTransform: "capitalize" }}>
                  {car.fuel_type || "—"}
                </td>
                <td style={{ ...tdStyle, color: textSecondary, fontSize: 12, textTransform: "capitalize" }}>
                  {car.transmission || "—"}
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {condition ? (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                      backgroundColor: condition.bg, color: condition.color, whiteSpace: "nowrap",
                    }}>
                      {condition.label}
                    </span>
                  ) : (
                    <span style={{ color: "#6b7280", fontSize: 11 }}>—</span>
                  )}
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {warranty ? (
                    <svg style={{ width: 20, height: 20, margin: "0 auto", color: "#22c55e" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg style={{ width: 20, height: 20, margin: "0 auto", color: "#ef4444" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  )}
                </td>
                <td style={tdStyle}>
                  {car.seller_name ? (
                    <span style={{ fontSize: 12, color: textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                      {car.seller_name}
                    </span>
                  ) : (
                    <span style={{ color: textMuted, fontSize: 12 }}>—</span>
                  )}
                </td>
                <td style={tdStyle}>
                  {car.seller_address ? (
                    <span style={{ fontSize: 11, color: textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                      {car.seller_address}
                    </span>
                  ) : (
                    <span style={{ color: textMuted, fontSize: 12 }}>—</span>
                  )}
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                  <StarRating
                    rating={car.rating ?? 0}
                    onChange={(r) => onRateCar?.(car.id, r)}
                  />
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {car.ai_rating != null ? (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                      border: "1px solid #22c55e", color: "#22c55e",
                    }}>
                      {car.ai_rating}
                    </span>
                  ) : (
                    <span style={{ color: "#6b7280", fontSize: 12 }}>—</span>
                  )}
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {car.listing_url && (
                    <a
                      href={car.listing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: 10, color: "#3b82f6", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}
                    >
                      {sourceLogo(car) ? (
                        <img src={sourceLogo(car)!} alt="" style={{ width: 12, height: 12, borderRadius: 2 }} />
                      ) : (
                        <span>↗</span>
                      )}
                      <span>{sourceLabel(car)}</span>
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getThStyle(isDark: boolean): React.CSSProperties {
  return {
    padding: "8px 10px",
    fontSize: 11,
    fontWeight: 600,
    color: isDark ? "#6b7280" : "#6b7280",
    textAlign: "left",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
  };
}

function getTdStyle(isDark: boolean): React.CSSProperties {
  return {
    padding: "6px 10px",
    fontSize: 12,
    color: isDark ? "#d1d5db" : "#374151",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
}
