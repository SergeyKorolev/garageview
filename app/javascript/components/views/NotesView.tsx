import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MagnifyingGlassIcon, ExclamationTriangleIcon, DocumentTextIcon, PaperAirplaneIcon, ChatBubbleLeftEllipsisIcon, ShareIcon, LinkIcon, XMarkIcon, ArrowLeftIcon, PrinterIcon } from "@heroicons/react/24/outline";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { getDeepResearches, getDeepResearch, chatWithResearch, shareResearch, unshareResearch, type DeepResearch } from "@/api/deepResearch";
import { formatMileage, formatPower } from "@/utils/formatters";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import { useThemeStore } from "@/stores/themeStore";
import type { Car } from "@/types/car";

interface NotesViewProps {
  collectionId: number;
  cars: Car[];
  onCarClick?: (carId: number) => void;
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

export default function NotesView({ collectionId, cars, onCarClick }: NotesViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fp = useFormatPrice();
  const isDark = useThemeStore((s) => s.theme === "dark");
  const isMobile = useIsMobile();
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [researches, setResearches] = useState<DeepResearch[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedResearch, setSelectedResearch] = useState<DeepResearch | null>(null);
  const [loading, setLoading] = useState(true);
  const [funnyMsg, setFunnyMsg] = useState(FUNNY_MESSAGES[0]);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load all researches
  useEffect(() => {
    setLoading(true);
    getDeepResearches(collectionId)
      .then((data) => {
        setResearches(data);
        const paramId = searchParams.get("research");
        if (paramId && data.some(r => r.id === Number(paramId))) {
          setSelectedId(Number(paramId));
          searchParams.delete("research");
          setSearchParams(searchParams, { replace: true });
        } else if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [collectionId]);

  // Load selected research detail
  const pollResearch = useCallback(async () => {
    if (!selectedId) return null;
    try {
      const data = await getDeepResearch(collectionId, selectedId);
      setSelectedResearch(data);
      return data.status;
    } catch {
      return "failed";
    }
  }, [collectionId, selectedId]);

  useEffect(() => {
    if (!selectedId) { setSelectedResearch(null); return; }
    setChatMessages([]);
    pollResearch();
    const interval = setInterval(async () => {
      const status = await pollResearch();
      if (status === "completed" || status === "failed") clearInterval(interval);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedId, pollResearch]);

  useEffect(() => {
    if (!selectedResearch || (selectedResearch.status !== "pending" && selectedResearch.status !== "processing")) return;
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % FUNNY_MESSAGES.length;
      setFunnyMsg(FUNNY_MESSAGES[i]);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedResearch?.status]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const isResearchLoading = selectedResearch && (selectedResearch.status === "pending" || selectedResearch.status === "processing");
  const result = selectedResearch?.result;

  // Get the cars analyzed in this research, sorted by ranking if available
  const analyzedCars = selectedResearch?.car_ids
    ? cars.filter(c => selectedResearch.car_ids.includes(c.id)).sort((a, b) => {
        const ranking = result?.ranking;
        if (!ranking) return 0;
        const aPlace = ranking.find((r: any) => r.car_id === a.id)?.place ?? 999;
        const bPlace = ranking.find((r: any) => r.car_id === b.id)?.place ?? 999;
        return aPlace - bPlace;
      })
    : [];

  const [chatLoading, setChatLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  const handleShare = async () => {
    if (!selectedResearch || !selectedId) return;
    setShareLoading(true);
    try {
      if (selectedResearch.share_token) {
        await unshareResearch(collectionId, selectedId);
        setSelectedResearch({ ...selectedResearch, share_token: null, public_url: null });
      } else {
        const { share_token, public_url } = await shareResearch(collectionId, selectedId);
        setSelectedResearch({ ...selectedResearch, share_token, public_url });
        await navigator.clipboard.writeText(public_url);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      }
    } catch {
      // ignore
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!selectedResearch?.public_url) return;
    await navigator.clipboard.writeText(selectedResearch.public_url);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const handleSendMessage = async () => {
    const msg = chatInput.trim();
    if (!msg || !selectedId || chatLoading) return;
    const userMsg = { role: "user" as const, text: msg };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      // Build history from previous messages for context
      const history = [...chatMessages, userMsg].map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const { reply } = await chatWithResearch(collectionId, selectedId, msg, history.slice(0, -1));
      setChatMessages(prev => [...prev, { role: "ai", text: reply }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, {
        role: "ai",
        text: `Sorry, I couldn't process that: ${err?.response?.data?.error || err.message || "Unknown error"}`
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 10rem)" }}>
      {/* Sidebar */}
      <div style={{
        width: isMobile ? "100%" : 280, flexShrink: 0, borderRight: isMobile ? "none" : `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}`,
        backgroundColor: isDark ? "#0d1117" : "#f9fafb", overflowY: "auto", display: isMobile && mobileShowDetail ? "none" : "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#e5e7eb" : "#111827", marginBottom: 8 }}>Deep Research</div>
          <button
            onClick={() => navigate(`/collections/${collectionId}/compare`)}
            style={{
              width: "100%", padding: "6px 12px", fontSize: 12, fontWeight: 600,
              borderRadius: 6, border: "1px solid #22c55e", backgroundColor: "transparent",
              color: "#22c55e", cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(34,197,94,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            + Start New Research
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: "#6b7280", fontSize: 12 }}>Loading...</div>
        ) : researches.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#6b7280", fontSize: 12 }}>
            No research yet. Go to Compare view to start one.
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
                    <StatusBadge status={r.status} />
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
          {!selectedId ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#6b7280" }}>
              <DocumentTextIcon style={{ width: 48, height: 48, marginBottom: 12, opacity: 0.5 }} />
              <div style={{ fontSize: 14 }}>Select a research to view</div>
            </div>
          ) : isResearchLoading ? (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <div style={{ display: "inline-block", width: 32, height: 32, border: "3px solid rgba(34,197,94,0.3)", borderTopColor: "#22c55e", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <div style={{ marginTop: 16, fontSize: 16, fontWeight: 600, color: "#22c55e" }}>{funnyMsg}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>This may take 30-60 seconds</div>
            </div>
          ) : selectedResearch?.status === "failed" ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "#ef4444" }}>
              <ExclamationTriangleIcon style={{ width: 40, height: 40, margin: "0 auto 12px" }} />
              <div style={{ fontSize: 16, fontWeight: 600 }}>Analysis failed</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
                {typeof result === "string" ? result : "Please try again"}
              </div>
            </div>
          ) : result && typeof result === "object" ? (
            <div style={{ padding: isMobile ? "16px" : "24px 32px", maxWidth: 900 }}>
              {/* Header */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
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
                  {selectedResearch?.status === "completed" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {selectedResearch.share_token && (
                        <button
                          onClick={handleCopyLink}
                          title="Copy share link"
                          style={{
                            display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                            fontSize: 12, fontWeight: 600, borderRadius: 8, border: `1px solid ${isDark ? "#374151" : "#d1d5db"}`,
                            backgroundColor: showCopied ? "rgba(34,197,94,0.1)" : "transparent",
                            color: showCopied ? "#22c55e" : (isDark ? "#d1d5db" : "#4b5563"),
                            cursor: "pointer", transition: "all 0.15s",
                          }}
                        >
                          <LinkIcon style={{ width: 14, height: 14 }} />
                          {showCopied ? t("cars.copied") : t("cars.copyLink")}
                        </button>
                      )}
                      <button
                        onClick={handleShare}
                        disabled={shareLoading}
                        title={selectedResearch.share_token ? "Stop sharing" : "Share publicly"}
                        style={{
                          display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                          fontSize: 12, fontWeight: 600, borderRadius: 8, border: "none",
                          backgroundColor: selectedResearch.share_token ? "#ef4444" : "#22c55e",
                          color: "white", cursor: shareLoading ? "default" : "pointer",
                          opacity: shareLoading ? 0.6 : 1, transition: "all 0.15s",
                        }}
                      >
                        {selectedResearch.share_token ? (
                          <>
                            <XMarkIcon style={{ width: 14, height: 14 }} />
                            {t("cars.stopSharing")}
                          </>
                        ) : (
                          <>
                            <ShareIcon style={{ width: 14, height: 14 }} />
                            {t("cars.share")}
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => window.open(`/print/research/${collectionId}/${selectedId}`, "_blank")}
                        title="Print / Save as PDF"
                        style={{
                          display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                          fontSize: 12, fontWeight: 600, borderRadius: 8, border: `1px solid ${isDark ? "#374151" : "#d1d5db"}`,
                          backgroundColor: "transparent",
                          color: isDark ? "#d1d5db" : "#4b5563",
                          cursor: "pointer",
                        }}
                      >
                        <PrinterIcon style={{ width: 14, height: 14 }} />
                        {t("cars.pdf")}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Analyzed Cars Table */}
              {analyzedCars.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {t("cars.analyzedCars")}
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
                          padding: "10px 14px", cursor: "pointer",
                          borderBottom: i < analyzedCars.length - 1 ? `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}` : "none",
                          backgroundColor: i % 2 === 1 ? (isDark ? "#0d1117" : "#f9fafb") : "transparent",
                          transition: "background-color 0.1s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? "#1f2937" : "#e5e7eb"; }}
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
                            {car.price_cents ? fp(car.price_cents) : "—"}
                          </div>
                          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                            {[
                              car.mileage_km ? formatMileage(car.mileage_km) : null,
                              car.power_kw ? formatPower(car.power_kw) : null,
                            ].filter(Boolean).join(" · ")}
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
                {/* Final Ranking — top */}
                {result.ranking?.length > 0 && (
                  <Section title={t("cars.finalRanking")}>
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

                {/* Per-Car Analysis: AI analysis + strengths/weaknesses combined */}
                {analyzedCars.length > 0 && (
                  <Section title={t("cars.perCarAnalysis")}>
                    {analyzedCars.map((car, i) => {
                      const rankEntry = result.ranking?.find((r: any) => r.car_id === car.id);
                      const carNum = rankEntry?.car_number ?? (i + 1);
                      const perCar = result.per_car_analysis?.find((p: any) => p.car_id === car.id);
                      // Parse car-level AI explanation
                      const aiData = car.ai_explanation
                        ? (() => { try { const p = JSON.parse(car.ai_explanation); return p.verdict ? p : null; } catch { return null; } })()
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

                          {/* AI Analysis verdict */}
                          {aiData?.verdict && (
                            <p style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 10, color: isDark ? "#d1d5db" : "#4b5563" }}>{aiData.verdict}</p>
                          )}

                          {/* Deep Research strengths/weaknesses */}
                          {perCar && (
                            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
                              {perCar.strengths?.length > 0 && (
                                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                                  <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4, color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("cars.strengths")}</div>
                                  {perCar.strengths.map((s: string, j: number) => (
                                    <div key={j} style={{ fontSize: 12, color: "#34d399", marginBottom: 3 }}>+ {s}</div>
                                  ))}
                                </div>
                              )}
                              {perCar.weaknesses?.length > 0 && (
                                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                                  <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("cars.weaknesses")}</div>
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
                                <div key={j} style={{ fontSize: 12, color: "#fbbf24", marginBottom: 3 }}>⚠ {f}</div>
                              ))}
                            </div>
                          )}

                          {/* AI Analysis extras: negotiation points, test drive checklist */}
                          {aiData?.negotiation_points?.length > 0 && (
                            <div style={{ marginTop: 8, marginBottom: 8 }}>
                              <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4, color: isDark ? "#e5e7eb" : "#111827", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("cars.negotiationLeverage")}</div>
                              {aiData.negotiation_points.map((point: string, j: number) => (
                                <div key={j} style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 2, display: "flex", gap: 5 }}>
                                  <span style={{ flexShrink: 0 }}>💡</span>
                                  <span style={{ color: isDark ? "#d1d5db" : "#4b5563" }}>{point}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {aiData?.test_drive_checklist?.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4, color: isDark ? "#e5e7eb" : "#111827", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("cars.testDriveChecklist")}</div>
                              {aiData.test_drive_checklist.map((item: string, j: number) => (
                                <div key={j} style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 2, display: "flex", gap: 5 }}>
                                  <span style={{ flexShrink: 0, color: "#6b7280" }}>▸</span>
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
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e", marginBottom: 6 }}>{t("cars.bottomLine")}</div>
                    <div style={{ fontSize: 14, color: isDark ? "#d1d5db" : "#4b5563", lineHeight: 1.7 }}>{result.bottom_line}</div>
                  </div>
                )}

                {/* Description Audit */}
                {result.description_audit?.length > 0 && (
                  <Section title={t("cars.descriptionAudit")}>
                    {result.description_audit.map((audit: any, i: number) => (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa", marginBottom: 4 }}>{audit.car_title || `Car #${audit.car_number}`}</div>
                        {audit.findings?.map((f: string, j: number) => (
                          <div key={j} style={{ fontSize: 13, color: isDark ? "#d1d5db" : "#4b5563", marginBottom: 3, paddingLeft: 12 }}>• {f}</div>
                        ))}
                        {(!audit.findings || audit.findings.length === 0) && (
                          <div style={{ fontSize: 13, color: "#6b7280", paddingLeft: 12 }}>{t("cars.noDiscrepancies")}</div>
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
                                <div key={k} style={{ fontSize: 13, color: isDark ? "#d1d5db" : "#4b5563", marginBottom: 2, paddingLeft: 12 }}>• {p}</div>
                              ))}
                            </div>
                          );
                        })}
                        {section.verdict && (
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#34d399", marginTop: 4, borderTop: "1px solid #374151", paddingTop: 8 }}>
                            ✓ {section.verdict}
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
                  <Section title={t("cars.hiddenConcerns")}>
                    {result.hidden_concerns.map((c: string, i: number) => (
                      <div key={i} style={{ fontSize: 13, color: "#fbbf24", marginBottom: 4 }}>⚠ {c}</div>
                    ))}
                  </Section>
                )}

              </div>

              {/* Chat Messages */}
              {chatMessages.length > 0 && (
                <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                  <Section title={t("cars.conversation")}>
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                          marginBottom: 8,
                        }}
                      >
                        <div style={{
                          maxWidth: "80%",
                          padding: "10px 14px",
                          borderRadius: 12,
                          fontSize: 13,
                          lineHeight: 1.6,
                          backgroundColor: msg.role === "user" ? "#1d4ed8" : (isDark ? "#1f2937" : "#f3f4f6"),
                          color: msg.role === "user" ? "#e5e7eb" : (isDark ? "#e5e7eb" : "#1f2937"),
                          borderBottomRightRadius: msg.role === "user" ? 4 : 12,
                          borderBottomLeftRadius: msg.role === "ai" ? 4 : 12,
                        }}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </Section>
                  {chatLoading && (
                    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8 }}>
                      <div style={{
                        padding: "10px 14px", borderRadius: 12, borderBottomLeftRadius: 4,
                        backgroundColor: isDark ? "#1f2937" : "#f3f4f6", color: "#9ca3af", fontSize: 13,
                        display: "flex", alignItems: "center", gap: 6,
                      }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#6b7280", animation: "pulse 1.5s infinite" }} />
                          <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#6b7280", animation: "pulse 1.5s infinite 0.3s" }} />
                          <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#6b7280", animation: "pulse 1.5s infinite 0.6s" }} />
                        </div>
                        Thinking...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#6b7280" }}>
              No results available
            </div>
          )}
        </div>

        {/* Chat input — shown when a completed research is selected */}
        {selectedResearch?.status === "completed" && (
          <div style={{
            flexShrink: 0, padding: "12px 24px", borderTop: `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}`,
            backgroundColor: isDark ? "#0d1117" : "#f9fafb",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              backgroundColor: isDark ? "#1f2937" : "#ffffff", borderRadius: 10, padding: "6px 6px 6px 14px",
              border: `1px solid ${isDark ? "#374151" : "#d1d5db"}`,
            }}>
              <ChatBubbleLeftEllipsisIcon style={{ width: 18, height: 18, color: "#6b7280", flexShrink: 0 }} />
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                placeholder="Ask AI about this research..."
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  color: isDark ? "#e5e7eb" : "#111827", fontSize: 13, padding: "6px 0",
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || chatLoading}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 32, height: 32, borderRadius: 8,
                  backgroundColor: chatInput.trim() && !chatLoading ? "#22c55e" : (isDark ? "#374151" : "#d1d5db"),
                  border: "none", cursor: chatInput.trim() && !chatLoading ? "pointer" : "default",
                  transition: "background-color 0.15s",
                }}
              >
                {chatLoading ? (
                  <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                ) : (
                  <PaperAirplaneIcon style={{ width: 16, height: 16, color: "white" }} />
                )}
              </button>
            </div>
          </div>
        )}
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "#22c55e",
    processing: "#f59e0b",
    pending: "#6b7280",
    failed: "#ef4444",
  };
  return (
    <div style={{
      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
      backgroundColor: colors[status] || "#6b7280",
    }} />
  );
}
