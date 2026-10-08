import { useState, useEffect, useCallback } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface SplitViewLayoutProps {
  listPanel: React.ReactNode;
  mapPanel: React.ReactNode;
}

// Card ~400px + gap + padding ≈ 430px per column
const ONE_COL_W = 430;
const TWO_COL_W = 866;
const MIN_MAP_W = 400;

function calcPanelWidth() {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1400;
  const maxW = Math.floor(vw * 0.4);
  // Use 2 columns if fits within 1/3 screen, otherwise 1 column capped at 1/3
  if (TWO_COL_W <= maxW) return TWO_COL_W;
  return Math.min(ONE_COL_W, maxW);
}

export default function SplitViewLayout({ listPanel, mapPanel }: SplitViewLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [panelWidth, setPanelWidth] = useState(calcPanelWidth);

  const handleResize = useCallback(() => {
    setPanelWidth(calcPanelWidth());
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  return (
    <div className="flex h-[calc(100vh-6rem)]">
      {/* List panel — snaps to 1 or 2 card columns */}
      <div
        style={{ width: collapsed ? 0 : panelWidth }}
        className={`relative shrink-0 overflow-y-auto border-r border-gray-200 transition-[width] duration-300 ease-in-out dark:border-gray-700 ${
          collapsed ? "overflow-hidden border-r-0" : ""
        }`}
      >
        {listPanel}
      </div>

      {/* Map panel + collapse toggle */}
      <div className="relative flex-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-r-md border border-l-0 border-gray-200 bg-white px-0.5 py-3 text-gray-400 shadow-sm hover:bg-gray-50 hover:text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          title={collapsed ? "Show car list" : "Hide car list"}
        >
          {collapsed ? (
            <ChevronRightIcon className="h-4 w-4" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4" />
          )}
        </button>
        {mapPanel}
      </div>
    </div>
  );
}
