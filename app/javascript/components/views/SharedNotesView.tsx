import { useState } from "react";
import { DocumentTextIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { formatMileage, formatPower } from "@/utils/formatters";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import { useThemeStore } from "@/stores/themeStore";
import type { Car } from "@/types/car";
import type { PublicDeepResearch } from "@/api/publicCollections";

interface SharedNotesViewProps {
  cars: Car[];
  researches: PublicDeepResearch[];
  onCarClick?: (carId: number) => void;
}

export default function SharedNotesView({ cars, researches, onCarClick }: SharedNotesViewProps) {
  const fp = useFormatPrice();
  const isDark = useThemeStore((s) => s.theme === "dark");
  const isMobile = useIsMobile();
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(researches.length > 0 ? researches[0].id : null);

  const selectedResearch = researches.find((r) => r.id === selectedId) ?? null;
  const result = selectedResearch?.result;

  const analyzedCars = selectedResearch?.car_ids
    ? cars.filter((c) => selectedResearch.car_ids.includes(c.id)).sort((a, b) => {
        const ranking = result?.ranking;
        if (!ranking) return 0;
        const aPlace = ranking.find((r: any) => r.car_id === a.id)?.place ?? 999;
        const bPlace = ranking.find((r: any) => r.car_id === b.id)?.place ?? 999;
        return aPlace - bPlace;
      })
    : [];

  return (
    <div style={{ display: "flex", height: "calc(100vh - 10rem)" }}>
      {/* Sidebar */}
      <div style={{
        width: isMobile ? "100%" : 280, flexShrink: 0, borderRight: isMobile ? "none" : `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}`,
        backgroundColor: isDark ? "#0d1117" : "#f9fafb", overflowY: "auto", display: isMobile && mobileShowDetail ? "none" : "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#e5e7eb" : "#111827" }}>Deep Research</div>
        </div>

        {researches.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#6b7280", fontSize: 12 }}>
            No research available for this collection.
          </div>
        ) : (
          <div style={{ padding: 6 }}>
            {researches.map((r) => {
              const isActive = selectedId === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => { setSelectedId(r.id); if (isMobile) setMobileShowDetail(true); }}
                  style={{
                    padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 2,
                    backgroundColor: isActive ? (isDark ? "#1f2937" : "#e5e7eb") : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = isDark ? "#111827" : "#f3f4f6"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = isActive ? (isDark ? "#1f2937" : "#e5e7eb") : "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, backgroundColor: "#22c55e" }} />
                    <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#e5e7eb" : "#111827", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.title || `Research #${r.id}`}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4, paddingLeft: 18 }}>
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: isMobile && !mobileShowDetail ? "none" : "flex", flexDirection: "column", backgroundColor: isDark ? "#111827" : "#ffffff" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {!selectedId || !result ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#6b7280" }}>
              <DocumentTextIcon style={{ width: 48, height: 48, marginBottom: 12, opacity: 0.5 }} />
              <div style={{ fontSize: 14 }}>{researches.length === 0 ? "No research available" : "Select a research to view"}</div>
            </div>
          ) : (
            <div style={{ padding: isMobile ? "16px" : "24px 32px", maxWidth: 900 }}>
              {/* Header */}
              <div style={{ marginBottom: 20 }}>
                {isMobile && (
                  <button
                    onClick={() => setMobileShowDetail(false)}
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 8 }}
                  >
                    <ArrowLeftIcon style={{ width: 14, height: 14 }} />
                    All research
                  </button>
                )}
                <h2 style={{ fontSize: 20, fontWeight: 700, color: isDark ? "white" : "#111827", margin: 0 }}>
                  {selectedResearch?.title || "Deep Research"}
                </h2>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  {selectedResearch && new Date(selectedResearch.created_at).toLocaleString()}
                </div>
              </div>

              {/* Analyzed Cars Table */}
              {analyzedCars.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Analyzed Cars
                  </h3>
                  <div style={{ borderRadius: 8, border: `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}`, overflow: "hidden" }}>
                    {analyzedCars.map((car, i) => (
                      <div
                        key={car.id}
                        onClick={() => onCarClick?.(car.id)}
                        role="button"
                        tabIndex={0}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "10px 14px", cursor: onCarClick ? "pointer" : "default",
                          borderBottom: i < analyzedCars.length - 1 ? `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}` : "none",
                          backgroundColor: i % 2 === 1 ? (isDark ? "#0d1117" : "#f9fafb") : "transparent",
                        }}
                        onMouseEnter={(e) => { if (onCarClick) e.currentTarget.style.backgroundColor = isDark ? "#1f2937" : "#e5e7eb"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = i % 2 === 1 ? (isDark ? "#0d1117" : "#f9fafb") : "transparent"; }}
                      >
                        {car.photos?.[0] ? (
                          <img src={car.photos[0]} alt="" style={{ width: 52, height: 36, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 52, height: 36, borderRadius: 4, backgroundColor: isDark ? "#1f2937" : "#e5e7eb", flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#e5e7eb" : "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{car.title}</div>
                          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {car.seller_name && `${car.seller_name}`}
                            {car.seller_address && ` · ${car.seller_address}`}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa" }}>
                            {car.price_cents ? fp(car.price_cents) : "\u2014"}
                          </div>
                          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                            {[
                              car.mileage_km ? formatMileage(car.mileage_km) : null,
                              car.power_kw ? formatPower(car.power_kw) : null,
                            ].filter(Boolean).join(" \u00B7 ")}
                          </div>
                        </div>
                        {car.ai_rating != null && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                            border: "1px solid #22c55e", color: "#22c55e", flexShrink: 0,
                          }}>
                            AI {car.ai_rating}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Final Ranking */}
                {result.ranking?.length > 0 && (
                  <Section title="Final Ranking">
                    {result.ranking.map((r: any, i: number) => (
                      <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 800, fontSize: 14, flexShrink: 0,
                          backgroundColor: i === 0 ? "#22c55e" : i === 1 ? "#3b82f6" : "#4b5563",
                          color: "white"
                        }}>
                          #{r.place}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: isDark ? "white" : "#111827" }}>{r.car_title}</div>
                          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{r.reason}</div>
                        </div>
                      </div>
                    ))}
                  </Section>
                )}

                {/* Per-Car Analysis */}
                {analyzedCars.length > 0 && (
                  <Section title="Per-Car Analysis">
                    {analyzedCars.map((car, i) => {
                      const rankEntry = result.ranking?.find((r: any) => r.car_id === car.id);
                      const carNum = rankEntry?.car_number ?? (i + 1);
                      const perCar = result.per_car_analysis?.find((p: any) => p.car_id === car.id);
                      const aiData = car.ai_explanation
                        ? (() => { try { const p = typeof car.ai_explanation === "string" ? JSON.parse(car.ai_explanation) : car.ai_explanation; return p?.verdict ? p : null; } catch { return null; } })()
                        : car.ai_analysis
                          ? { ...car.ai_analysis, verdict: car.ai_analysis.summary }
                          : null;

                      return (
                        <div key={car.id} style={{ marginBottom: 20, padding: "14px 16px", borderRadius: 10, border: `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}`, backgroundColor: isDark ? "#0d1117" : "#f9fafb" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                            <div style={{
                              width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                              fontWeight: 800, fontSize: 12, flexShrink: 0,
                              backgroundColor: i === 0 ? "#22c55e" : i === 1 ? "#3b82f6" : "#4b5563", color: "white",
                            }}>
                              #{carNum}
                            </div>
                            <div
                              style={{ fontSize: 14, fontWeight: 700, color: "#60a5fa", cursor: onCarClick ? "pointer" : "default" }}
                              onClick={() => onCarClick?.(car.id)}
                            >
                              {car.title}
                            </div>
                            {car.ai_rating != null && (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, border: "1px solid #22c55e", color: "#22c55e", marginLeft: "auto", flexShrink: 0 }}>
                                AI {car.ai_rating}
                              </span>
                            )}
                          </div>

                          {aiData?.verdict && (
                            <p style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 10, color: isDark ? "#d1d5db" : "#4b5563" }}>{aiData.verdict}</p>
                          )}

                          {perCar && (
                            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
                              {perCar.strengths?.length > 0 && (
                                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                                  <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4, color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.05em" }}>Strengths</div>
                                  {perCar.strengths.map((s: string, j: number) => (
                                    <div key={j} style={{ fontSize: 12, color: "#34d399", marginBottom: 3 }}>+ {s}</div>
                                  ))}
                                </div>
                              )}
                              {perCar.weaknesses?.length > 0 && (
                                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                                  <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.05em" }}>Weaknesses</div>
                                  {perCar.weaknesses.map((w: string, j: number) => (
                                    <div key={j} style={{ fontSize: 12, color: "#f87171", marginBottom: 3 }}>&minus; {w}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          {perCar?.red_flags?.length > 0 && (
                            <div style={{ marginBottom: 8 }}>
                              {perCar.red_flags.map((f: string, j: number) => (
                                <div key={j} style={{ fontSize: 12, color: "#fbbf24", marginBottom: 3 }}>{"\u26A0"} {f}</div>
                              ))}
                            </div>
                          )}

                          {aiData?.negotiation_points?.length > 0 && (
                            <div style={{ marginTop: 8, marginBottom: 8 }}>
                              <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4, color: isDark ? "#e5e7eb" : "#111827", textTransform: "uppercase", letterSpacing: "0.05em" }}>Negotiation Leverage</div>
                              {aiData.negotiation_points.map((point: string, j: number) => (
                                <div key={j} style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 2, display: "flex", gap: 5 }}>
                                  <span style={{ flexShrink: 0 }}>{"\uD83D\uDCA1"}</span>
                                  <span style={{ color: isDark ? "#d1d5db" : "#4b5563" }}>{point}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {aiData?.test_drive_checklist?.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4, color: isDark ? "#e5e7eb" : "#111827", textTransform: "uppercase", letterSpacing: "0.05em" }}>Test Drive Checklist</div>
                              {aiData.test_drive_checklist.map((item: string, j: number) => (
                                <div key={j} style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 2, display: "flex", gap: 5 }}>
                                  <span style={{ flexShrink: 0, color: "#6b7280" }}>{"\u25B8"}</span>
                                  <span style={{ color: isDark ? "#d1d5db" : "#4b5563" }}>{item}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </Section>
                )}

                {/* Bottom Line */}
                {result.bottom_line && (
                  <div style={{ padding: "14px 18px", borderRadius: 10, backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e", marginBottom: 6 }}>Bottom Line</div>
                    <div style={{ fontSize: 14, color: isDark ? "#d1d5db" : "#4b5563", lineHeight: 1.7 }}>{result.bottom_line}</div>
                  </div>
                )}

                {/* Description Audit */}
                {result.description_audit?.length > 0 && (
                  <Section title="Description vs Specs Audit">
                    {result.description_audit.map((audit: any, i: number) => (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa", marginBottom: 4 }}>{audit.car_title || `Car #${audit.car_number}`}</div>
                        {audit.findings?.map((f: string, j: number) => (
                          <div key={j} style={{ fontSize: 13, color: isDark ? "#d1d5db" : "#4b5563", marginBottom: 3, paddingLeft: 12 }}>{"\u2022"} {f}</div>
                        ))}
                        {(!audit.findings || audit.findings.length === 0) && (
                          <div style={{ fontSize: 13, color: "#6b7280", paddingLeft: 12 }}>No discrepancies found</div>
                        )}
                      </div>
                    ))}
                  </Section>
                )}

                {/* Comparison Sections */}
                {result.comparison_sections?.map((section: any, i: number) => (
                  <Section key={i} title={section.title}>
                    {section.per_car ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {section.overview && (
                          <div style={{ fontSize: 13, color: isDark ? "#d1d5db" : "#4b5563", lineHeight: 1.6, marginBottom: 4 }}>{section.overview}</div>
                        )}
                        {section.per_car.map((car: any, j: number) => {
                          const label = result.car_labels?.find((l: any) => l.car_number === car.car_number);
                          return (
                            <div key={j} style={{ paddingLeft: 4 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa", marginBottom: 3 }}>
                                {label?.car_title || `Car #${car.car_number}`}
                              </div>
                              {car.points?.map((p: string, k: number) => (
                                <div key={k} style={{ fontSize: 13, color: isDark ? "#d1d5db" : "#4b5563", marginBottom: 2, paddingLeft: 12 }}>{"\u2022"} {p}</div>
                              ))}
                            </div>
                          );
                        })}
                        {section.verdict && (
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#34d399", marginTop: 4, borderTop: "1px solid #374151", paddingTop: 8 }}>
                            {"\u2713"} {section.verdict}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: isDark ? "#d1d5db" : "#4b5563", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{section.analysis}</div>
                    )}
                  </Section>
                ))}

                {/* Hidden Concerns */}
                {result.hidden_concerns?.length > 0 && (
                  <Section title="Hidden Concerns">
                    {result.hidden_concerns.map((c: string, i: number) => (
                      <div key={i} style={{ fontSize: 13, color: "#fbbf24", marginBottom: 4 }}>{"\u26A0"} {c}</div>
                    ))}
                  </Section>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const isDark = useThemeStore((s) => s.theme === "dark");
  return (
    <div>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: isDark ? "white" : "#111827", marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}` }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
