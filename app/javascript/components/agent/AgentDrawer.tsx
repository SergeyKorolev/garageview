import { useRef, useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAgentStore } from "@/stores/agentStore";
import { useThemeStore } from "@/stores/themeStore";
import { useAgentChat } from "@/hooks/useAgent";
import { useCollections } from "@/hooks/useCollections";
import { useIsMobile } from "@/hooks/useMediaQuery";

const MIN_WIDTH = 340;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 420;

function AgentActionCard({ action }: { action: any }) {
  const navigate = useNavigate();
  const isDark = useThemeStore((s) => s.theme === "dark");

  const handleClick = () => {
    if (action.collection_id) {
      navigate(`/collections/${action.collection_id}/grid`);
    }
  };

  const icons: Record<string, string> = {
    collection_created: "📁",
    cars_added: "🚗",
    collection_from_search: "🔍",
    research_launched: "🔬",
    rating_started: "⭐",
  };

  const labels: Record<string, string> = {
    collection_created: `Created "${action.name || action.collection_name}"`,
    cars_added: `Added ${action.cars_added} car${action.cars_added !== 1 ? "s" : ""} to "${action.collection_name}"`,
    collection_from_search: `Importing cars into "${action.name}"`,
    research_launched: `Deep research started on "${action.collection_name}"`,
    rating_started: `AI rating started for "${action.collection_name}"`,
  };

  return (
    <button
      onClick={handleClick}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", borderRadius: 8, border: `1px solid ${isDark ? "#1e3a5f" : "#dbeafe"}`,
        backgroundColor: isDark ? "#0d2137" : "#eff6ff", color: isDark ? "#93c5fd" : "#2563eb", fontSize: 13,
        cursor: action.collection_id ? "pointer" : "default",
        width: "100%", textAlign: "left",
      }}
    >
      <span>{icons[action.type] || "✅"}</span>
      <span>{labels[action.type] || "Action completed"}</span>
      {action.collection_id && <span style={{ marginLeft: "auto", opacity: 0.5 }}>→</span>}
    </button>
  );
}

function getExamples(currentCollection?: string, collectionName?: string): string[] {
  const name = currentCollection || collectionName || "Best cars";
  if (currentCollection) {
    return [
      "Add car by posting URLs from car portals",
      `Import search https://suchen.mobile.de/... as "${name}"`,
      `Run deep research on ${name}`,
      `Rate all cars in ${name}`,
    ];
  }
  return [
    `Create a collection called "${name}"`,
    "Add car by posting URLs from car portals",
    `Import search https://suchen.mobile.de/... as "${name}"`,
    `Run deep research on ${name}`,
    `Rate all cars in ${name}`,
  ];
}

export default function AgentDrawer() {
  const { isOpen, close, messages, conversationId, isLoading, addMessage, setConversationId, setLoading, startNewConversation } = useAgentStore();
  const isDark = useThemeStore((s) => s.theme === "dark");
  const isMobile = useIsMobile();
  const chatMutation = useAgentChat();
  const { data: collections } = useCollections();
  const [input, setInput] = useState("");
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDragging = useRef(false);

  const collectionNames = (collections || []).map((b: any) => b.name).slice(0, 3);
  const { collectionId } = useParams<{ collectionId?: string }>();
  const currentCollection = collections?.find((b: any) => String(b.id) === collectionId);
  const examples = getExamples(currentCollection?.name, collectionNames[0]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) textareaRef.current?.focus();
  }, [isOpen]);

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        useAgentStore.getState().toggle();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Resize drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth - e.clientX));
      setWidth(newWidth);
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  const handleSend = useCallback(async () => {
    const msg = input.trim();
    if (!msg || isLoading) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    addMessage({ role: "user", content: msg });
    setLoading(true);

    try {
      const result = await chatMutation.mutateAsync({ message: msg, conversationId, currentCollectionId: currentCollection?.id });

      if (!conversationId && result.conversation_id) {
        setConversationId(result.conversation_id);
      }

      addMessage({
        role: "assistant",
        content: result.reply,
        actions: result.actions,
      });
    } catch {
      addMessage({ role: "assistant", content: "Sorry, something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }, [input, isLoading, conversationId, currentCollection?.id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  if (!isOpen) return null;

  return (
    <div style={isMobile ? {
      position: "fixed", inset: 0, zIndex: 200,
      backgroundColor: isDark ? "#0f172a" : "#ffffff",
      display: "flex", flexDirection: "column",
    } : {
      width, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH,
      flexShrink: 0, height: "calc(100vh - 56px)",
      backgroundColor: isDark ? "#0f172a" : "#ffffff", borderLeft: `1px solid ${isDark ? "#1e293b" : "#e5e7eb"}`,
      display: "flex", flexDirection: "column",
      position: "sticky", top: 56,
    }}>
      {/* Resize handle (desktop only) */}
      {!isMobile && <div
        onMouseDown={handleResizeStart}
        style={{
          position: "absolute", top: 0, left: -3, bottom: 0, width: 6,
          cursor: "col-resize", zIndex: 10,
        }}
      >
        <div style={{
          position: "absolute", top: "50%", left: 1, width: 3, height: 40,
          backgroundColor: isDark ? "#334155" : "#d1d5db", borderRadius: 2, transform: "translateY(-50%)",
          opacity: 0.5,
        }} />
      </div>}

        {/* Close button */}
        <div style={{
          display: "flex", justifyContent: "flex-end",
          padding: "4px 8px", flexShrink: 0,
        }}>
          <button
            onClick={close}
            style={{ padding: "4px 8px", borderRadius: 6, border: "none", backgroundColor: "transparent", color: isDark ? "#64748b" : "#9ca3af", fontSize: 18, cursor: "pointer", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 16px", color: isDark ? "#64748b" : "#9ca3af" }}>
              <img src="/garageview-icon-dark.png" alt="GarageView" className="hidden dark:block" style={{ height: 48, margin: "0 auto 12px" }} />
              <img src="/garageview-icon.png" alt="GarageView" className="block dark:hidden" style={{ height: 48, margin: "0 auto 12px" }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: isDark ? "#94a3b8" : "#374151", marginBottom: 8 }}>
                Let's find a great car together!
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
                Create collections, add cars, launch research — just tell me what you need.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {examples.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(ex); textareaRef.current?.focus(); }}
                    style={{
                      padding: "8px 14px", borderRadius: 8, border: `1px solid ${isDark ? "#334155" : "#e5e7eb"}`,
                      backgroundColor: "transparent", color: isDark ? "#94a3b8" : "#6b7280", fontSize: 13,
                      cursor: "pointer", textAlign: "left", width: "100%",
                    }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{
                display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}>
                <div style={{
                  maxWidth: "85%", padding: "10px 14px", borderRadius: 12,
                  backgroundColor: msg.role === "user" ? "#2563eb" : (isDark ? "#1e293b" : "#f3f4f6"),
                  color: msg.role === "user" ? "white" : (isDark ? "#e2e8f0" : "#1f2937"),
                  fontSize: 14, lineHeight: 1.6,
                  whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "break-word",
                }}>
                  {msg.content}
                </div>
              </div>

              {msg.actions && msg.actions.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {msg.actions.map((action: any, j: number) => (
                    <AgentActionCard key={j} action={action} />
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div style={{ display: "flex", gap: 4, padding: "8px 0" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: "50%", backgroundColor: "#3b82f6",
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
              <style>{`@keyframes pulse { 0%, 80%, 100% { opacity: 0.3 } 40% { opacity: 1 } }`}</style>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Multi-line input */}
        <div style={{
          padding: "12px 16px", flexShrink: 0,
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Tell me what you need... (Enter to send, Shift+Enter for new line)"
            rows={5}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 10,
              border: `1px solid ${isDark ? "#334155" : "#d1d5db"}`, backgroundColor: isDark ? "#1e293b" : "#f9fafb",
              color: isDark ? "white" : "#1f2937", fontSize: 14, outline: "none",
              resize: "none", lineHeight: 1.5,
              fontFamily: "inherit",
            }}
          />
        </div>
      </div>
  );
}
