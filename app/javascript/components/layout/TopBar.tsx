import { Link } from "react-router-dom";
import { useAgentStore } from "@/stores/agentStore";
import { useThemeStore } from "@/stores/themeStore";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

export default function TopBar() {
  const toggle = useAgentStore((s) => s.toggle);
  const isDark = useThemeStore((s) => s.theme === "dark");

  return (
    <header className="sticky top-0 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900" style={{ zIndex: 110 }}>
      <div className="flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center">
          <img
            src="/logo-dark.png?v=3"
            alt="garageview.ai"
            className="hidden dark:block"
            style={{ height: 36 }}
          />
          <img
            src="/logo.png?v=3"
            alt="garageview.ai"
            className="block dark:hidden"
            style={{ height: 36 }}
          />
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 8,
              border: `1px solid ${isDark ? "#334155" : "#d1d5db"}`, backgroundColor: "transparent",
              color: isDark ? "#93c5fd" : "#2563eb", fontSize: 13, fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? "#1e293b" : "#f3f4f6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <span>✨</span>
            AI Assistant
            <span style={{ fontSize: 11, color: isDark ? "#64748b" : "#9ca3af", padding: "1px 5px", border: `1px solid ${isDark ? "#334155" : "#d1d5db"}`, borderRadius: 4, marginLeft: 2 }}>⌘K</span>
          </button>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
