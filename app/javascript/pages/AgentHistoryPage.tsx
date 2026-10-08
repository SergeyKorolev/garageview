import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAgentConversations, useAgentConversation, useDeleteAgentConversation } from "@/hooks/useAgent";
import { useAgentStore } from "@/stores/agentStore";
import { useThemeStore } from "@/stores/themeStore";
import { useIsMobile } from "@/hooks/useMediaQuery";

const TYPE_TABS = [
  { key: "", label: "All" },
  { key: "collection", label: "Collections" },
  { key: "cars", label: "Cars" },
  { key: "research", label: "Research" },
  { key: "general", label: "General" },
];

const TYPE_ICONS: Record<string, string> = {
  collection: "📁",
  cars: "🚗",
  research: "🔬",
  general: "💬",
};

export default function AgentHistoryPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const isDark = useThemeStore((s) => s.theme === "dark");
  const [typeFilter, setTypeFilter] = useState("");
  const { data: listData } = useAgentConversations(typeFilter || undefined);
  const selectedId = conversationId ? Number(conversationId) : 0;
  const { data: detail } = useAgentConversation(selectedId);
  const deleteMutation = useDeleteAgentConversation();
  const { open: openDrawer, setConversationId, setMessages } = useAgentStore();

  const conversations = listData?.conversations || [];

  const textPrimary = isDark ? "white" : "#111827";
  const textSecondary = isDark ? "#e2e8f0" : "#374151";
  const textMuted = isDark ? "#64748b" : "#9ca3af";
  const bgSidebar = isDark ? "#0d1117" : "#f9fafb";
  const bgMain = isDark ? "#0f172a" : "#ffffff";
  const borderColor = isDark ? "#1e293b" : "#e5e7eb";
  const bgHover = isDark ? "#1e293b" : "#f3f4f6";

  const handleSelect = (id: number) => {
    navigate(`/agent/${id}`);
    if (isMobile) setMobileShowDetail(true);
  };

  const handleContinue = (conv: any) => {
    setConversationId(conv.id);
    if (detail?.messages) {
      setMessages(detail.messages.map((m: any) => ({ role: m.role, content: m.content })));
    }
    openDrawer();
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this conversation?")) {
      deleteMutation.mutate(id);
      if (selectedId === id) navigate("/agent");
    }
  };

  const isMobile = useIsMobile();
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>
      {/* Sidebar */}
      <div style={{
        width: isMobile ? "100%" : 320, flexShrink: 0, borderRight: isMobile ? "none" : `1px solid ${borderColor}`,
        backgroundColor: bgSidebar, display: isMobile && mobileShowDetail ? "none" : "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "16px", borderBottom: `1px solid ${borderColor}` }}>
          <h2 style={{ color: textPrimary, fontSize: 16, fontWeight: 700, marginBottom: 12 }}>AI Conversations</h2>

          {/* Type filter tabs */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTypeFilter(tab.key)}
                style={{
                  padding: "4px 10px", borderRadius: 6, border: "none",
                  backgroundColor: typeFilter === tab.key ? (isDark ? "#1e3a5f" : "#dbeafe") : "transparent",
                  color: typeFilter === tab.key ? (isDark ? "#93c5fd" : "#2563eb") : textMuted,
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {conversations.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: textMuted, fontSize: 13 }}>
              No conversations yet. Open the AI Assistant to get started.
            </div>
          )}

          {conversations.map((c: any) => (
            <div
              key={c.id}
              onClick={() => handleSelect(c.id)}
              style={{
                padding: "12px 16px", cursor: "pointer",
                borderBottom: `1px solid ${borderColor}`,
                backgroundColor: selectedId === c.id ? bgHover : "transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 13 }}>{TYPE_ICONS[c.conversation_type] || "💬"}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.title || "Untitled"}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                  style={{ border: "none", background: "none", color: isDark ? "#475569" : "#9ca3af", fontSize: 14, cursor: "pointer", padding: "2px 4px" }}
                >
                  ×
                </button>
              </div>
              <div style={{ fontSize: 12, color: textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.last_message || "No messages"}
              </div>
              <div style={{ fontSize: 11, color: isDark ? "#475569" : "#d1d5db", marginTop: 4 }}>
                {formatDate(c.updated_at)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: isMobile && !mobileShowDetail ? "none" : "flex", flexDirection: "column", backgroundColor: bgMain }}>
        {!selectedId ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: textMuted }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: isDark ? "#94a3b8" : "#6b7280" }}>Select a conversation</div>
              <div style={{ fontSize: 13, marginTop: 8 }}>Or press ⌘K to start a new one</div>
            </div>
          </div>
        ) : detail ? (
          <>
            {/* Conversation header */}
            <div style={{
              padding: "16px 24px", borderBottom: `1px solid ${borderColor}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                {isMobile && (
                  <button
                    onClick={() => { setMobileShowDetail(false); navigate("/agent"); }}
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: textMuted, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 6 }}
                  >
                    ← All conversations
                  </button>
                )}
                <h3 style={{ color: textPrimary, fontSize: 16, fontWeight: 700 }}>
                  {detail.title || "Conversation"}
                </h3>
                <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>
                  {new Date(detail.created_at).toLocaleString()} · {detail.conversation_type}
                </div>
              </div>
              <button
                onClick={() => handleContinue(detail)}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: `1px solid ${isDark ? "#334155" : "#d1d5db"}`,
                  backgroundColor: isDark ? "#1e293b" : "#f3f4f6", color: isDark ? "#93c5fd" : "#2563eb", fontSize: 13,
                  fontWeight: 600, cursor: "pointer",
                }}
              >
                Continue in chat →
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
              {detail.messages.map((msg: any, i: number) => (
                <div key={i} style={{ marginBottom: 20 }}>
                  <div style={{
                    display: "flex",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  }}>
                    <div style={{
                      maxWidth: "70%", padding: "12px 16px", borderRadius: 12,
                      backgroundColor: msg.role === "user" ? "#2563eb" : (isDark ? "#1e293b" : "#f3f4f6"),
                      color: msg.role === "user" ? "white" : textSecondary,
                      fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap",
                    }}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: textMuted }}>
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
