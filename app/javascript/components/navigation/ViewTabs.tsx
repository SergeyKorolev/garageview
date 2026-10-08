import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "@/stores/themeStore";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { ListBulletIcon, Squares2X2Icon, MapIcon, TableCellsIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

type ViewMode = "list" | "grid" | "map" | "compare" | "notes";

interface ViewTabsProps {
  collectionId: number;
  notesCount?: number;
  rightContent?: React.ReactNode;
  // Shared collection mode — when basePath is set, use local state instead of URL routing
  basePath?: string;
  activeView?: ViewMode;
  onViewChange?: (mode: ViewMode) => void;
}

const TAB_DEFS: { mode: ViewMode; labelKey: string; icon: typeof ListBulletIcon }[] = [
  { mode: "grid", labelKey: "views.grid", icon: Squares2X2Icon },
  { mode: "map", labelKey: "views.map", icon: MapIcon },
  { mode: "list", labelKey: "views.list", icon: ListBulletIcon },
  { mode: "compare", labelKey: "views.compare", icon: TableCellsIcon },
  { mode: "notes", labelKey: "views.notes", icon: DocumentTextIcon },
];

export default function ViewTabs({ collectionId, notesCount, rightContent, basePath, activeView, onViewChange }: ViewTabsProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const isDark = useThemeStore((s) => s.theme === "dark");
  const isMobile = useIsMobile();
  const pathname = location.pathname;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: 40,
        backgroundColor: isDark ? "#111827" : "#f9fafb",
        borderBottom: `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}`,
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
        {TAB_DEFS.map(({ mode, labelKey, icon: Icon }) => {
          const label = t(labelKey);
          const isActive = onViewChange ? activeView === mode : (
            pathname.endsWith("/grid") ? "grid" :
            pathname.endsWith("/map") ? "map" :
            pathname.endsWith("/compare") ? "compare" :
            pathname.endsWith("/notes") ? "notes" :
            "list"
          ) === mode;

          const style = {
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: isMobile ? "0 10px" : "0 16px",
            height: "100%",
            fontSize: 13,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? (isDark ? "#e5e7eb" : "#111827") : (isDark ? "#6b7280" : "#9ca3af"),
            textDecoration: "none",
            borderBottom: isActive ? "2px solid #3b82f6" : "2px solid transparent",
            transition: "color 0.15s, border-color 0.15s",
            cursor: "pointer",
          } as const;

          if (onViewChange) {
            return (
              <div
                key={mode}
                onClick={() => onViewChange(mode)}
                style={style}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.color = isDark ? "#9ca3af" : "#6b7280";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.color = isDark ? "#6b7280" : "#9ca3af";
                }}
              >
                <Icon style={{ width: 16, height: 16 }} />
                {!isMobile && label}
                {mode === "notes" && notesCount != null && notesCount > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    backgroundColor: isActive ? "#3b82f6" : (isDark ? "#374151" : "#e5e7eb"),
                    color: isActive ? "white" : (isDark ? "white" : "#374151"),
                    borderRadius: 8, padding: "1px 6px", marginLeft: 2,
                  }}>
                    {notesCount}
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link
              key={mode}
              to={`/collections/${collectionId}/${mode}`}
              style={style}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = isDark ? "#9ca3af" : "#6b7280";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = isDark ? "#6b7280" : "#9ca3af";
              }}
            >
              <Icon style={{ width: 16, height: 16 }} />
              {!isMobile && label}
              {mode === "notes" && notesCount != null && notesCount > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  backgroundColor: isActive ? "#3b82f6" : (isDark ? "#374151" : "#e5e7eb"),
                  color: isActive ? "white" : (isDark ? "white" : "#374151"),
                  borderRadius: 8, padding: "1px 6px", marginLeft: 2,
                }}>
                  {notesCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      {rightContent && (
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          {rightContent}
        </div>
      )}
    </div>
  );
}
