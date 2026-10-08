import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { XMarkIcon, TrophyIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { getDeepResearch, type DeepResearch } from "@/api/deepResearch";
import { useThemeStore } from "@/stores/themeStore";
import type { Car } from "@/types/car";

interface Props {
  collectionId: number;
  researchId: number;
  cars?: Car[];
  onClose: () => void;
  onStatusChange?: (status: string) => void;
}

const FUNNY_MESSAGES = [
  "Reading the fine print dealers hope you skip...",
  "Cross-checking every feature claim...",
  "Comparing spec sheets with a magnifying glass...",
  "Calculating real-world running costs...",
  "Checking for hidden surprises...",
  "Analyzing depreciation curves...",
  "Verifying dealer descriptions vs reality...",
  "Building your negotiation playbook...",
];

export default function DeepResearchModal({ collectionId, researchId, cars: allCars = [], onClose, onStatusChange }: Props) {
  const navigate = useNavigate();
  const isDark = useThemeStore((s) => s.theme === "dark");
  const [research, setResearch] = useState<DeepResearch | null>(null);
  const [funnyMsg, setFunnyMsg] = useState(FUNNY_MESSAGES[0]);

  const textPrimary = isDark ? "white" : "#111827";
  const textSecondary = isDark ? "#d1d5db" : "#4b5563";
  const textMuted = isDark ? "#6b7280" : "#9ca3af";
  const bgModal = isDark ? "#111827" : "#ffffff";
  const borderColor = isDark ? "#1f2937" : "#e5e7eb";

  const poll = useCallback(async () => {
    try {
      const data = await getDeepResearch(collectionId, researchId);
      setResearch(data);
      onStatusChange?.(data.status);
      return data.status;
    } catch {
      onStatusChange?.("failed");
      return "failed";
    }
  }, [collectionId, researchId, onStatusChange]);

  useEffect(() => {
    poll();
    const interval = setInterval(async () => {
      const status = await poll();
      if (status === "completed" || status === "failed") clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
  }, [poll]);

  useEffect(() => {
    if (research?.status !== "processing" && research?.status !== "pending") return;
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % FUNNY_MESSAGES.length;
      setFunnyMsg(FUNNY_MESSAGES[i]);
    }, 3000);
    return () => clearInterval(interval);
  }, [research?.status]);

  const isLoading = !research || research.status === "pending" || research.status === "processing";
  const result = research?.result;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "70%", maxWidth: 900, maxHeight: "85vh",
          backgroundColor: bgModal, border: `1px solid ${borderColor}`,
          borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${borderColor}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MagnifyingGlassIcon style={{ width: 20, height: 20, color: "#22c55e" }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: textPrimary, margin: 0 }}>
              {research?.title || "Deep Research"}
            </h2>
            <button
              onClick={() => {
                onClose();
                navigate(`/collections/${collectionId}/notes?research=${researchId}`);
              }}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 11, color: textMuted, background: "none", border: "none",
                cursor: "pointer", padding: "2px 6px", borderRadius: 4,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#3b82f6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? "#6b7280" : "#9ca3af"; }}
              title="Open in Notes"
            >
              <ArrowTopRightOnSquareIcon style={{ width: 13, height: 13 }} />
              Open in Notes
            </button>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <XMarkIcon style={{ width: 22, height: 22, color: "#9ca3af" }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ display: "inline-block", width: 32, height: 32, border: "3px solid rgba(34,197,94,0.3)", borderTopColor: "#22c55e", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <div style={{ marginTop: 16, fontSize: 16, fontWeight: 600, color: "#22c55e" }}>{funnyMsg}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: textMuted }}>This may take 30-60 seconds</div>
            </div>
          ) : research?.status === "failed" ? (
            <div style={{ textAlign: "center", padding: 40, color: "#ef4444" }}>
              <ExclamationTriangleIcon style={{ width: 40, height: 40, margin: "0 auto 12px" }} />
              <div style={{ fontSize: 16, fontWeight: 600 }}>Analysis failed</div>
              <div style={{ fontSize: 13, color: textMuted, marginTop: 8 }}>{typeof result === "string" ? result : "Please try again"}</div>
            </div>
          ) : result && typeof result === "object" ? (
            <ModalResultBody result={result} research={research} allCars={allCars} isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted} borderColor={borderColor} />
          ) : (
            <div style={{ color: textMuted, textAlign: "center", padding: 40 }}>No results available</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalResultBody({ result, research, allCars, isDark, textPrimary, textSecondary, textMuted, borderColor }: {
  result: any; research: DeepResearch; allCars: Car[]; isDark: boolean;
  textPrimary: string; textSecondary: string; textMuted: string; borderColor: string;
}) {
  // Get analyzed cars sorted by ranking
  const analyzedCars = research?.car_ids
    ? allCars.filter(c => research.car_ids.includes(c.id)).sort((a, b) => {
        const ranking = result?.ranking;
        if (!ranking) return 0;
        const aPlace = ranking.find((r: any) => r.car_id === a.id)?.place ?? 999;
        const bPlace = ranking.find((r: any) => r.car_id === b.id)?.place ?? 999;
        return aPlace - bPlace;
      })
    : [];


  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Final Ranking */}
      {result.ranking?.length > 0 && (
        <Section title="Final Ranking" isDark={isDark}>
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
                <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>{r.car_title}</div>
                <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>{r.reason}</div>
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Per-Car Analysis with AI details */}
      {analyzedCars.length > 0 && (
        <Section title="Per-Car Analysis" isDark={isDark}>
          {analyzedCars.map((car, i) => {
            const rankEntry = result.ranking?.find((r: any) => r.car_id === car.id);
            const carNum = rankEntry?.car_number ?? (i + 1);
            const perCar = result.per_car_analysis?.find((p: any) => p.car_id === car.id);
            const aiData = car.ai_explanation
              ? (() => { try { const p = JSON.parse(car.ai_explanation); return p.verdict ? p : null; } catch { return null; } })()
              : car.ai_analysis
                ? { ...car.ai_analysis, verdict: car.ai_analysis.summary }
                : null;

            return (
              <div key={car.id} style={{ marginBottom: 20, padding: "14px 16px", borderRadius: 10, border: `1px solid ${borderColor}`, backgroundColor: isDark ? "#0d1117" : "#f9fafb" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 12, flexShrink: 0,
                    backgroundColor: i === 0 ? "#22c55e" : i === 1 ? "#3b82f6" : "#4b5563", color: "white",
                  }}>
                    #{carNum}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#60a5fa" }}>{car.title}</div>
                  {car.ai_rating != null && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, border: "1px solid #22c55e", color: "#22c55e", marginLeft: "auto", flexShrink: 0 }}>
                      AI {car.ai_rating}
                    </span>
                  )}
                </div>

                {aiData?.verdict && (
                  <p style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 10, color: textSecondary }}>{aiData.verdict}</p>
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
                          <div key={j} style={{ fontSize: 12, color: "#f87171", marginBottom: 3 }}>− {w}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {perCar?.red_flags?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    {perCar.red_flags.map((f: string, j: number) => (
                      <div key={j} style={{ fontSize: 12, color: "#fbbf24", marginBottom: 3 }}>⚠ {f}</div>
                    ))}
                  </div>
                )}

                {aiData?.negotiation_points?.length > 0 && (
                  <div style={{ marginTop: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4, color: textPrimary, textTransform: "uppercase", letterSpacing: "0.05em" }}>Negotiation Leverage</div>
                    {aiData.negotiation_points.map((point: string, j: number) => (
                      <div key={j} style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 2, display: "flex", gap: 5 }}>
                        <span style={{ flexShrink: 0 }}>💡</span>
                        <span style={{ color: textSecondary }}>{point}</span>
                      </div>
                    ))}
                  </div>
                )}
                {aiData?.test_drive_checklist?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4, color: textPrimary, textTransform: "uppercase", letterSpacing: "0.05em" }}>Test Drive Checklist</div>
                    {aiData.test_drive_checklist.map((item: string, j: number) => (
                      <div key={j} style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 2, display: "flex", gap: 5 }}>
                        <span style={{ flexShrink: 0, color: textMuted }}>▸</span>
                        <span style={{ color: textSecondary }}>{item}</span>
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
          <div style={{ fontSize: 14, color: textSecondary, lineHeight: 1.7 }}>{result.bottom_line}</div>
        </div>
      )}

      {/* Description Audit */}
      {result.description_audit?.length > 0 && (
        <Section title="Description vs Specs Audit" isDark={isDark}>
          {result.description_audit.map((audit: any, i: number) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa", marginBottom: 4 }}>{audit.car_title || `Car #${audit.car_number}`}</div>
              {audit.findings?.map((f: string, j: number) => (
                <div key={j} style={{ fontSize: 13, color: textSecondary, marginBottom: 3, paddingLeft: 12 }}>• {f}</div>
              ))}
              {(!audit.findings || audit.findings.length === 0) && (
                <div style={{ fontSize: 13, color: textMuted, paddingLeft: 12 }}>No discrepancies found</div>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Comparison Sections */}
      {result.comparison_sections?.map((section: any, i: number) => (
        <Section key={i} title={section.title} isDark={isDark}>
          {section.per_car ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {section.overview && (
                <div style={{ fontSize: 13, color: textSecondary, lineHeight: 1.6, marginBottom: 4 }}>{section.overview}</div>
              )}
              {section.per_car.map((car: any, j: number) => {
                const label = result.car_labels?.find((l: any) => l.car_number === car.car_number);
                return (
                  <div key={j} style={{ paddingLeft: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa", marginBottom: 3 }}>
                      {label?.car_title || `Car #${car.car_number}`}
                    </div>
                    {car.points?.map((p: string, k: number) => (
                      <div key={k} style={{ fontSize: 13, color: textSecondary, marginBottom: 2, paddingLeft: 12 }}>• {p}</div>
                    ))}
                  </div>
                );
              })}
              {section.verdict && (
                <div style={{ fontSize: 13, fontWeight: 600, color: "#34d399", marginTop: 4, borderTop: `1px solid ${borderColor}`, paddingTop: 8 }}>
                  ✓ {section.verdict}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: textSecondary, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{section.analysis}</div>
          )}
        </Section>
      ))}

      {/* Hidden Concerns */}
      {result.hidden_concerns?.length > 0 && (
        <Section title="Hidden Concerns" isDark={isDark}>
          {result.hidden_concerns.map((c: string, i: number) => (
            <div key={i} style={{ fontSize: 13, color: "#fbbf24", marginBottom: 4 }}>⚠ {c}</div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children, isDark }: { title: string; children: React.ReactNode; isDark: boolean }) {
  return (
    <div>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: isDark ? "white" : "#111827", marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}` }}>{title}</h3>
      {children}
    </div>
  );
}
