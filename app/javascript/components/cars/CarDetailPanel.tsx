import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { XMarkIcon, ArrowTopRightOnSquareIcon, ShareIcon, PrinterIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import type { Car } from "@/types/car";
import { formatMileage, formatPower, formatDate } from "@/utils/formatters";
import { sourceLabel, sourceLogo } from "@/utils/sourceLabel";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import client from "@/api/client";
import { useThemeStore } from "@/stores/themeStore";
import PhotoCarousel from "./PhotoCarousel";
import TravelBadge from "./TravelBadge";
import StarRating from "./StarRating";

const AI_LOADING_MESSAGES = [
  "Reading the listing details...",
  "Analyzing price and specs...",
  "Checking for red flags...",
  "Comparing with market data...",
  "Building negotiation points...",
  "Preparing test drive checklist...",
];

interface CarDetailPanelProps {
  car: Car;
  collectionId?: number;
  onClose: () => void;
  onRate?: (carId: number, rating: number) => void;
}

function parseAiExplanation(text: string) {
  try {
    const parsed = JSON.parse(text);
    if (parsed.verdict) return parsed;
  } catch {}
  const lines = text.split("\n");
  const verdict: string[] = [];
  const pros: string[] = [];
  const cons: string[] = [];
  let valueNote = "";
  let recommendation = "";
  for (const line of lines) {
    if (line === "") continue;
    if (line.startsWith("+")) pros.push(line.slice(2));
    else if (line.startsWith("-")) cons.push(line.slice(2));
    else if (line.startsWith("💰")) valueNote = line.slice(2).trim();
    else if (line.startsWith("📋")) recommendation = line.slice(2).trim();
    else verdict.push(line);
  }
  return { verdict: verdict.join(" "), pros, cons, red_flags: [], market_price_label: valueNote, recommendation, negotiation_points: [], test_drive_checklist: [], estimated_tco_yearly: null };
}

export default function CarDetailPanel({ car, collectionId, onClose, onRate }: CarDetailPanelProps) {
  const { t } = useTranslation();
  const fp = useFormatPrice();
  const isDark = useThemeStore((s) => s.theme === "dark");
  const queryClient = useQueryClient();
  const [aiLoadingMsg, setAiLoadingMsg] = useState(AI_LOADING_MESSAGES[0]);
  const [showCopied, setShowCopied] = useState(false);

  const aiPending = car.status === "ready" && !car.ai_analysis && !car.ai_explanation;
  useEffect(() => {
    if (!aiPending) return;
    let msgIdx = 0;
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % AI_LOADING_MESSAGES.length;
      setAiLoadingMsg(AI_LOADING_MESSAGES[msgIdx]);
    }, 2500);
    const pollInterval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["collectionCars"] });
    }, 4000);
    return () => { clearInterval(msgInterval); clearInterval(pollInterval); };
  }, [aiPending, queryClient]);
  const attrs = car.attributes || {};
  const priorityAttrs = [
    "Vehicle condition", "Category", "First Registration", "Mileage",
    "Power", "Transmission", "Drive type", "Fuel type",
    "Electric range", "Range", "CO₂ emissions (comb.)", "CO₂ class",
    "Number of Seats", "Door Count", "Colour", "Interior Design",
    "Climatisation", "Parking sensors", "Airbags",
    "Number of Vehicle Owners", "Availability",
  ];
  const attrKeys = [
    ...priorityAttrs.filter((k) => k in attrs),
    ...Object.keys(attrs).filter((k) => !priorityAttrs.includes(k)).sort(),
  ];
  // Use collection-level AI explanation if available, otherwise fall back to per-car AI analysis
  const ai = car.ai_explanation
    ? parseAiExplanation(car.ai_explanation)
    : car.ai_analysis
      ? { ...car.ai_analysis, verdict: car.ai_analysis.summary }
      : null;

  const textPrimary = isDark ? "#e5e7eb" : "#111827";
  const textSecondary = isDark ? "#d1d5db" : "#4b5563";
  const textMuted = isDark ? "#6b7280" : "#9ca3af";
  const bgCard = isDark ? "#111827" : "#ffffff";
  const borderColor = isDark ? "#1f2937" : "#e5e7eb";
  const bgChip = isDark ? "#1f2937" : "#f3f4f6";
  const textChip = isDark ? "#d1d5db" : "#4b5563";
  const bgZebra = isDark ? "rgba(31,41,55,0.5)" : "rgba(249,250,251,0.8)";

  return (
    <div
      style={{
        backgroundColor: bgCard,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Photo with close button overlay */}
      <div style={{ height: car.photos?.length ? 240 : 0, flexShrink: 0, position: "relative" }}>
        {car.photos?.length > 0 && (
          <PhotoCarousel photos={car.photos} height="h-full" />
        )}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 10, right: 10, zIndex: 10,
            width: 30, height: 30, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.5)", color: "white",
            border: "none", cursor: "pointer",
          }}
        >
          <XMarkIcon style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* Scrollable details */}
      <div style={{ flex: 1, padding: "14px 18px" }}>
        {/* Title + Share/PDF row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3, color: textPrimary, flex: 1, minWidth: 0 }}>{car.title}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 10 }}>
            <button
              title="Share car"
              onClick={async () => {
                try {
                  if (collectionId) {
                    const { data } = await client.post(`/collections/${collectionId}/cars/${car.id}/share`);
                    await navigator.clipboard.writeText(data.share_url);
                  } else {
                    await navigator.clipboard.writeText(window.location.href);
                  }
                  setShowCopied(true);
                  setTimeout(() => setShowCopied(false), 2000);
                } catch {}
              }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px",
                fontSize: 12, fontWeight: 600, borderRadius: 6,
                border: `1px solid ${showCopied ? "#22c55e" : (isDark ? "#374151" : "#d1d5db")}`,
                backgroundColor: showCopied ? "rgba(34,197,94,0.1)" : "transparent",
                color: showCopied ? "#22c55e" : (isDark ? "#d1d5db" : "#6b7280"),
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <ShareIcon style={{ width: 14, height: 14 }} />
              {showCopied ? t("cars.copied") : t("cars.share")}
            </button>
            {(collectionId ?? 0) > 0 && (
              <button
                title="Print / Save as PDF"
                onClick={() => window.open(`/print/car/${collectionId}/${car.id}`, "_blank")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px",
                  fontSize: 12, fontWeight: 600, borderRadius: 6,
                  border: `1px solid ${isDark ? "#374151" : "#d1d5db"}`,
                  backgroundColor: "transparent",
                  color: isDark ? "#d1d5db" : "#6b7280",
                  cursor: "pointer",
                }}
              >
                <PrinterIcon style={{ width: 14, height: 14 }} />
                {t("cars.pdf")}
              </button>
            )}
          </div>
        </div>

        {/* Price + mobile.de row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: isDark ? "#60a5fa" : "#2563eb" }}>
            {fp(car.price_cents)}
          </span>
          {car.listing_url && (
            <a
              href={car.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, color: "#3b82f6", textDecoration: "none" }}
            >
              {sourceLogo(car) ? (
                <img src={sourceLogo(car)!} alt="" style={{ width: 14, height: 14, borderRadius: 2 }} />
              ) : (
                <ArrowTopRightOnSquareIcon style={{ width: 14, height: 14 }} />
              )}
              {sourceLabel(car)}
            </a>
          )}
        </div>

        {/* Rating + AI badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          {onRate ? (
            <StarRating rating={car.rating ?? 0} onChange={(r) => onRate(car.id, r)} />
          ) : (
            <div />
          )}
          {car.ai_rating != null && (
            <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 5, border: "1px solid #22c55e", color: "#22c55e" }}>
              AI {car.ai_rating}
            </span>
          )}
        </div>

        {/* Key specs chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {[
            car.mileage_km != null && formatMileage(car.mileage_km),
            car.first_registration && formatDate(car.first_registration),
            car.power_kw != null && formatPower(car.power_kw),
            car.transmission,
            car.fuel_type,
          ].filter(Boolean).map((spec, i) => (
            <span key={i} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, backgroundColor: bgChip, color: textChip }}>
              {spec}
            </span>
          ))}
        </div>

        {/* Seller */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            {car.seller_type && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 3,
                border: "1px solid #3b82f6", color: "#3b82f6", textTransform: "capitalize",
              }}>
                {car.seller_type}
              </span>
            )}
            <span style={{ fontSize: 13, color: "#3b82f6" }}>{car.seller_name}</span>
          </div>
          {car.seller_address && (
            <div style={{ fontSize: 11, color: textMuted }}>{car.seller_address}</div>
          )}
        </div>

        {/* Travel */}
        {car.travel_time && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: textPrimary }}>{t("cars.travelToDealer")}</div>
            <TravelBadge travelTime={car.travel_time} />
          </div>
        )}

        {/* AI Analysis — loading */}
        {!ai && aiPending && (
          <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 8, border: `1px solid rgba(34,197,94,0.2)`, backgroundColor: "rgba(34,197,94,0.05)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: textPrimary }}>{t("cars.aiAnalysis")}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 14, height: 14, border: "2px solid rgba(34,197,94,0.3)",
                borderTopColor: "#22c55e", borderRadius: "50%",
                animation: "spin 1s linear infinite", flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 500 }}>{aiLoadingMsg}</span>
            </div>
          </div>
        )}

        {/* AI Analysis */}
        {ai && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: textPrimary }}>{t("cars.aiAnalysis")}</div>
            {ai.verdict && (
              <p style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 10, color: textSecondary }}>{ai.verdict}</p>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              {ai.pros?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4, color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("cars.strengths")}</div>
                  {ai.pros.map((p: string, i: number) => (
                    <div key={i} style={{ fontSize: 11, lineHeight: 1.6, marginBottom: 2, display: "flex", gap: 4 }}>
                      <span style={{ color: "#22c55e", flexShrink: 0 }}>+</span>
                      <span style={{ color: textSecondary }}>{p}</span>
                    </div>
                  ))}
                </div>
              )}
              {ai.cons?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("cars.weaknesses")}</div>
                  {ai.cons.map((c: string, i: number) => (
                    <div key={i} style={{ fontSize: 11, lineHeight: 1.6, marginBottom: 2, display: "flex", gap: 4 }}>
                      <span style={{ color: "#ef4444", flexShrink: 0 }}>-</span>
                      <span style={{ color: textSecondary }}>{c}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {ai.red_flags?.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {ai.red_flags.map((flag: string, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3, fontSize: 11, fontWeight: 600, color: "#ef4444" }}>
                    <span style={{ fontSize: 13 }}>⚠</span> {flag}
                  </div>
                ))}
              </div>
            )}
            {ai.negotiation_points?.length > 0 && (
              <div style={{ marginTop: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: textPrimary }}>{t("cars.negotiationLeverage")}</div>
                {ai.negotiation_points.map((point: string, i: number) => (
                  <div key={i} style={{ fontSize: 11, lineHeight: 1.6, marginBottom: 2, display: "flex", gap: 5 }}>
                    <span style={{ flexShrink: 0 }}>💡</span>
                    <span style={{ color: textSecondary }}>{point}</span>
                  </div>
                ))}
              </div>
            )}
            {ai.test_drive_checklist?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: textPrimary }}>{t("cars.testDriveChecklist")}</div>
                {ai.test_drive_checklist.map((item: string, i: number) => (
                  <div key={i} style={{ fontSize: 11, lineHeight: 1.6, marginBottom: 2, display: "flex", gap: 5 }}>
                    <span style={{ flexShrink: 0, color: textMuted }}>▸</span>
                    <span style={{ color: textSecondary }}>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Technical attributes */}
        {attrKeys.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: textPrimary }}>{t("cars.technicalData")}</div>
            <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${borderColor}` }}>
              {attrKeys.map((key, i) => {
                const val = attrs[key];
                const display = val == null ? "—" : Array.isArray(val) ? val[0] : String(val);
                return (
                  <div key={key} style={{ display: "flex", fontSize: 11, padding: "5px 12px", backgroundColor: i % 2 === 0 ? bgZebra : "transparent" }}>
                    <span style={{ width: "42%", flexShrink: 0, color: textMuted, fontWeight: 500 }}>{key}</span>
                    <span style={{ color: textPrimary }}>{display}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Features */}
        {car.features?.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: textPrimary }}>{t("cars.equipment")} ({car.features.length})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {car.features.map((f) => (
                <span key={f} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, backgroundColor: bgChip, color: textChip }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
