import { Fragment, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { XMarkIcon, ArrowTopRightOnSquareIcon, MapPinIcon, BuildingStorefrontIcon, ShareIcon, PrinterIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import type { Car } from "@/types/car";
import { formatMileage, formatPower, formatDate } from "@/utils/formatters";
import { sourceLabel, sourceLogo } from "@/utils/sourceLabel";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import { useIsMobile } from "@/hooks/useMediaQuery";
import client from "@/api/client";
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

interface CarDetailModalProps {
  car: Car | null;
  collectionId?: number;
  open: boolean;
  onClose: () => void;
  onRate?: (carId: number, rating: number) => void;
}

/** Parse AI explanation into structured sections */
function parseAiExplanation(text: string) {
  // Try structured JSON first (new format)
  try {
    const parsed = JSON.parse(text);
    if (parsed.verdict) {
      return {
        verdict: parsed.verdict || "",
        pros: parsed.pros || [],
        cons: parsed.cons || [],
        red_flags: parsed.red_flags || [],
        market_price_label: parsed.market_price_label || "",
        recommendation: parsed.recommendation || "",
        negotiation_points: parsed.negotiation_points || [],
        test_drive_checklist: parsed.test_drive_checklist || [],
        estimated_tco_yearly: parsed.estimated_tco_yearly ?? null,
      };
    }
  } catch {
    // Fall through to legacy parser
  }

  // Legacy text format
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
  return { verdict: verdict.join(" "), pros, cons, red_flags: [] as string[], market_price_label: valueNote, recommendation, negotiation_points: [] as string[], test_drive_checklist: [] as string[], estimated_tco_yearly: null as number | null };
}

/** Price assessment bar using mobile.de's real market data */
function PriceAssessment({ label, priceRanges, priceCents }: { label: string; priceRanges?: any[]; priceCents?: number | null }) {
  const labelMap: Record<string, number> = {
    "Very good price": 0, "Good price": 1, "Fair price": 2, "Increased price": 3, "High price": 4,
  };
  const level = labelMap[label] ?? 2;

  const labels = ["Very good price", "Good price", "Fair price", "Increased price", "High price"];
  const colors = ["#22c55e", "#4ade80", "#22c55e", "#f59e0b", "#ef4444"];
  const barColors = [
    ["#22c55e", "#22c55e", "#22c55e", "#22c55e", "#22c55e"],
    ["#22c55e", "#22c55e", "#22c55e", "#22c55e", "#d1d5db"],
    ["#22c55e", "#22c55e", "#22c55e", "#d1d5db", "#d1d5db"],
    ["#f59e0b", "#f59e0b", "#d1d5db", "#d1d5db", "#d1d5db"],
    ["#ef4444", "#d1d5db", "#d1d5db", "#d1d5db", "#d1d5db"],
  ];

  const priceEur = priceCents ? (priceCents / 100).toLocaleString("de-DE", { maximumFractionDigits: 0 }) : null;

  return (
    <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 8 }}
      className="border border-gray-200 dark:border-gray-700"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ display: "flex", gap: 3 }}>
          {barColors[level].map((c, i) => (
            <div key={i} style={{ width: 24, height: 8, borderRadius: 2, backgroundColor: c }} />
          ))}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: colors[level] }}>{labels[level]}</span>
      </div>
      {priceRanges && priceRanges.length > 0 && (
        <div style={{ fontSize: 11, lineHeight: 1.6, marginTop: 4 }} className="text-gray-500 dark:text-gray-400">
          {priceRanges.map((r: any, i: number) => (
            <span key={i} style={{ marginRight: 12 }}>
              <span style={{ color: ["#22c55e", "#4ade80", "#22c55e", "#f59e0b", "#ef4444"][i] }}>●</span>{" "}
              {r.label}: {r.min?.toLocaleString("de-DE")}–{r.max?.toLocaleString("de-DE")}€
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CarDetailModal({ car, collectionId, open, onClose, onRate }: CarDetailModalProps) {
  const { t } = useTranslation();
  const fp = useFormatPrice();
  const queryClient = useQueryClient();
  const [aiLoadingMsg, setAiLoadingMsg] = useState(AI_LOADING_MESSAGES[0]);
  const [showCopied, setShowCopied] = useState(false);

  // Poll for AI analysis when car is ready but analysis is missing
  const aiPending = car && car.status === "ready" && !car.ai_analysis && !car.ai_explanation;
  useEffect(() => {
    if (!aiPending || !open) return;
    let msgIdx = 0;
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % AI_LOADING_MESSAGES.length;
      setAiLoadingMsg(AI_LOADING_MESSAGES[msgIdx]);
    }, 2500);
    const pollInterval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["collectionCars"] });
    }, 4000);
    return () => { clearInterval(msgInterval); clearInterval(pollInterval); };
  }, [aiPending, open, queryClient]);

  if (!car) return null;

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
      ? parseAiExplanation(JSON.stringify({ ...car.ai_analysis, verdict: car.ai_analysis.summary }))
      : null;

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative" style={{ zIndex: 200 }}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-center justify-center" style={{ padding: "clamp(8px, 4vw, 48px)" }}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel
              className="rounded-2xl bg-white shadow-2xl dark:bg-gray-800"
              style={{ width: "100%", maxWidth: 880, maxHeight: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}
            >
              {/* Photos — full width, no padding */}
              {car.photos?.length > 0 && (
                <div style={{ position: "relative" }}>
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ height: 360 }}>
                      <PhotoCarousel photos={car.photos} height="h-full" />
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    style={{
                      position: "absolute", top: 12, right: 12, zIndex: 10,
                      width: 32, height: 32, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      backgroundColor: "rgba(0,0,0,0.5)", color: "white",
                      border: "none", cursor: "pointer",
                    }}
                  >
                    <XMarkIcon style={{ width: 18, height: 18 }} />
                  </button>
                </div>
              )}

              {/* Scrollable content */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>
                {/* Title + Share/PDF row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white" style={{ lineHeight: 1.3, flex: 1, minWidth: 0 }}>{car.title}</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                    <button
                      title="Share car"
                      onClick={async (e) => {
                        e.stopPropagation();
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
                        border: "1px solid",
                        borderColor: showCopied ? "#22c55e" : undefined,
                        backgroundColor: showCopied ? "rgba(34,197,94,0.1)" : "transparent",
                        color: showCopied ? "#22c55e" : "#6b7280",
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                      className="dark:border-gray-600 dark:text-gray-400"
                    >
                      <ShareIcon style={{ width: 14, height: 14 }} />
                      {showCopied ? t("cars.copied") : t("cars.share")}
                    </button>
                    {(collectionId ?? 0) > 0 && (
                      <button
                        title="Print / Save as PDF"
                        onClick={(e) => { e.stopPropagation(); window.open(`/print/car/${collectionId}/${car.id}`, "_blank"); }}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px",
                          fontSize: 12, fontWeight: 600, borderRadius: 6,
                          border: "1px solid #d1d5db",
                          backgroundColor: "transparent", color: "#6b7280",
                          cursor: "pointer",
                        }}
                        className="dark:border-gray-600 dark:text-gray-400"
                      >
                        <PrinterIcon style={{ width: 14, height: 14 }} />
                        {t("cars.pdf")}
                      </button>
                    )}
                    {!car.photos?.length && (
                      <button onClick={onClose} className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Price + mobile.de row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 22, fontWeight: 700 }} className="text-blue-600 dark:text-blue-400">
                    {fp(car.price_cents)}
                  </span>
                  {car.listing_url && (
                    <a
                      href={car.listing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, color: "#3b82f6" }}
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

                {/* User rating + AI badge — same line like car card */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                  {[
                    car.mileage_km != null && formatMileage(car.mileage_km),
                    car.first_registration && formatDate(car.first_registration),
                    car.power_kw != null && formatPower(car.power_kw),
                    car.transmission,
                    car.fuel_type,
                  ].filter(Boolean).map((spec, i) => (
                    <span key={i} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6 }}
                      className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    >
                      {spec}
                    </span>
                  ))}
                </div>

                {/* Seller — blue text, no fill */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    {car.seller_type && (
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 3,
                        border: "1px solid #3b82f6", color: "#3b82f6", textTransform: "capitalize",
                      }}>
                        {car.seller_type}
                      </span>
                    )}
                    <span className="text-sm" style={{ color: "#3b82f6" }}>{car.seller_name}</span>
                  </div>
                  {car.seller_address && (
                    <div className="text-xs text-gray-400 dark:text-gray-500">{car.seller_address}</div>
                  )}
                </div>

                {/* Travel to Dealer */}
                {car.travel_time && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}
                      className="text-gray-800 dark:text-gray-200"
                    >
                      {t("cars.travelToDealer")}
                    </div>
                    <TravelBadge travelTime={car.travel_time} />
                  </div>
                )}

                {/* AI Analysis — loading state */}
                {!ai && aiPending && (
                  <div style={{ marginBottom: 16, padding: "16px 20px", borderRadius: 10, border: "1px solid rgba(34,197,94,0.2)", backgroundColor: "rgba(34,197,94,0.05)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}
                      className="text-gray-800 dark:text-gray-200"
                    >
                      {t("cars.aiAnalysis")}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 18, height: 18, border: "2px solid rgba(34,197,94,0.3)",
                        borderTopColor: "#22c55e", borderRadius: "50%",
                        animation: "spin 1s linear infinite", flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 13, color: "#22c55e", fontWeight: 500 }}>{aiLoadingMsg}</span>
                    </div>
                  </div>
                )}

                {/* AI Analysis — structured */}
                {ai && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}
                      className="text-gray-800 dark:text-gray-200"
                    >
                      {t("cars.aiAnalysis")}
                    </div>

                    {/* Verdict */}
                    {ai.verdict && (
                      <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}
                        className="text-gray-600 dark:text-gray-300"
                      >
                        {ai.verdict}
                      </p>
                    )}

                    {/* Pros & Cons side by side */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                      {ai.pros.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("cars.strengths")}</div>
                          {ai.pros.map((p: string, i: number) => (
                            <div key={i} style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 3, display: "flex", gap: 4 }}>
                              <span style={{ color: "#22c55e", flexShrink: 0 }}>+</span>
                              <span className="text-gray-700 dark:text-gray-300">{p}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {ai.cons.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("cars.weaknesses")}</div>
                          {ai.cons.map((c: string, i: number) => (
                            <div key={i} style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 3, display: "flex", gap: 4 }}>
                              <span style={{ color: "#ef4444", flexShrink: 0 }}>-</span>
                              <span className="text-gray-700 dark:text-gray-300">{c}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Red flags */}
                    {ai.red_flags && ai.red_flags.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        {ai.red_flags.map((flag: string, i: number) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#ef4444" }}>
                            <span style={{ fontSize: 14 }}>⚠</span> {flag}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Price assessment — real mobile.de data */}
                    {(ai.market_price_label || car.price_rating?.rating) && (
                      <PriceAssessment
                        label={car.price_rating?.rating || ai.market_price_label}
                        priceRanges={car.price_rating?.priceRanges}
                        priceCents={car.price_cents}
                      />
                    )}

                    {/* Negotiation Points */}
                    {ai.negotiation_points?.length > 0 && (
                      <div style={{ marginTop: 16, marginBottom: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}
                          className="text-gray-800 dark:text-gray-200"
                        >
                          {t("cars.negotiationLeverage")}
                        </div>
                        {ai.negotiation_points.map((point: string, i: number) => (
                          <div key={i} style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 3, display: "flex", gap: 6 }}>
                            <span style={{ flexShrink: 0 }}>💡</span>
                            <span className="text-gray-700 dark:text-gray-300">{point}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Test Drive Checklist */}
                    {ai.test_drive_checklist?.length > 0 && (
                      <div style={{ marginTop: 16, marginBottom: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}
                          className="text-gray-800 dark:text-gray-200"
                        >
                          {t("cars.testDriveChecklist")}
                        </div>
                        {ai.test_drive_checklist.map((item: string, i: number) => (
                          <div key={i} style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 3, display: "flex", gap: 6 }}>
                            <span style={{ flexShrink: 0 }} className="text-gray-500 dark:text-gray-400">▸</span>
                            <span className="text-gray-700 dark:text-gray-300">{item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Technical attributes */}
                {attrKeys.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}
                      className="text-gray-800 dark:text-gray-200"
                    >
                      {t("cars.technicalData")}
                    </div>
                    <div style={{ borderRadius: 8, overflow: "hidden" }}
                      className="border border-gray-200 dark:border-gray-700"
                    >
                      {attrKeys.map((key, i) => {
                        const val = attrs[key];
                        const display = val == null ? "—" : Array.isArray(val) ? val[0] : String(val);
                        return (
                          <div key={key} style={{ display: "flex", fontSize: 12, padding: "7px 14px" }}
                            className={i % 2 === 0 ? "bg-gray-50 dark:bg-gray-800/50" : ""}
                          >
                            <span style={{ width: "42%", flexShrink: 0 }} className="font-medium text-gray-500 dark:text-gray-400">{key}</span>
                            <span className="text-gray-800 dark:text-gray-200">{display}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Features */}
                {car.features?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}
                      className="text-gray-800 dark:text-gray-200"
                    >
                      {t("cars.equipment")} ({car.features.length})
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {car.features.map((f) => (
                        <span key={f} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5 }}
                          className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
