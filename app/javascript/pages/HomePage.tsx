import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PlusIcon, ChevronDownIcon, Squares2X2Icon, ListBulletIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { useCollections, useCreateCollection } from "@/hooks/useCollections";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAgentStore } from "@/stores/agentStore";
import { useQueryClient } from "@tanstack/react-query";
import { fetchMembers, removeMember } from "@/api/memberships";
import CollectionCard from "@/components/collections/CollectionCard";
import ShareCollectionModal from "@/components/collections/ShareCollectionModal";
import CreateCollectionModal from "@/components/collections/CreateCollectionModal";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import type { Collection } from "@/types/collection";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    ", " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function formatPrice(cents: number | null): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("de-DE", { maximumFractionDigits: 0 }) + " €";
}

function formatMileage(km: number | null): string {
  if (km == null) return "—";
  return km.toLocaleString("de-DE") + " km";
}

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: collections, isLoading } = useCollections();
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const fp = useFormatPrice();
  const [showCreate, setShowCreate] = useState(false);
  const [shareCollectionId, setShareCollectionId] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "grid">("cards");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const openAgent = useAgentStore((s) => s.open);

  const myCollections = useMemo(
    () => (collections ?? []).filter((c) => c.role === "owner"),
    [collections],
  );
  const sharedCollections = useMemo(
    () => (collections ?? []).filter((c) => c.role !== "owner"),
    [collections],
  );
  const hasSharedCollections = sharedCollections.length > 0;
  const shareCollection = shareCollectionId != null ? collections?.find((c) => c.id === shareCollectionId) : null;

  const handleShare = useCallback((collection: Collection) => {
    setShareCollectionId(collection.id);
  }, []);

  const handleLeave = useCallback(async (collection: Collection) => {
    if (!currentUser) return;
    try {
      const membersData = await fetchMembers(collection.id);
      const myMembership = membersData.find((m) => m.user_id === currentUser.id && m.role !== "owner");
      if (myMembership) {
        await removeMember(collection.id, myMembership.id);
        queryClient.invalidateQueries({ queryKey: ["collections"] });
      }
    } catch {
      // Silently fail — card overlay already dismissed
    }
  }, [currentUser, queryClient]);

  // Open AI chat on first visit when user has no collections
  useEffect(() => {
    if (!isLoading && collections && collections.length === 0) {
      openAgent();
    }
  }, [isLoading, collections]);

  // Auto-navigate new users to their default Favorites collection
  useEffect(() => {
    if (!isLoading && collections && collections.length === 1 && collections[0].default) {
      const visited = sessionStorage.getItem("gv_visited_collections");
      if (!visited) {
        sessionStorage.setItem("gv_visited_collections", "1");
        navigate(`/collections/${collections[0].id}/grid`, { replace: true });
      }
    }
  }, [isLoading, collections, navigate]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (isLoading) return <LoadingSpinner />;

  const tableHeaders = [
    t("collections.name"),
    t("collections.cars_other", { count: 0 }).replace("0 ", ""),
    t("filters.price"),
    t("cars.mileage"),
    t("collections.updated"),
    ...(hasSharedCollections ? [t("sharing.role")] : []),
  ];

  function renderCollectionList(items: Collection[]) {
    if (viewMode === "cards") {
      return (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(min(380px, 100%), 1fr))", maxWidth: 1400 }}>
          {items.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onShare={handleShare}
              onLeave={handleLeave}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
              {tableHeaders.map((h) => (
                <th
                  key={h}
                  className="text-gray-500 dark:text-gray-400"
                  style={{ padding: "10px 16px", fontSize: 12, fontWeight: 600, textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((collection) => (
              <tr
                key={collection.id}
                onClick={() => navigate(`/collections/${collection.id}`)}
                className="border-b border-gray-100 even:bg-gray-50 hover:bg-indigo-50 dark:border-gray-800 dark:even:bg-gray-800/50 dark:hover:bg-gray-800"
                style={{ cursor: "pointer" }}
              >
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {collection.role !== "owner" && (
                      <UserGroupIcon className="h-4 w-4 shrink-0 text-indigo-400" />
                    )}
                    {collection.preview_photos?.[0] && (
                      <img
                        src={collection.preview_photos[0]}
                        alt=""
                        style={{ width: 40, height: 30, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
                      />
                    )}
                    <span className="font-medium text-gray-900 dark:text-white" style={{ fontSize: 14 }}>
                      {collection.name}
                    </span>
                  </div>
                </td>
                <td className="text-gray-600 dark:text-gray-300" style={{ padding: "12px 16px", fontSize: 14 }}>
                  {collection.cars_count}
                </td>
                <td className="text-gray-600 dark:text-gray-300" style={{ padding: "12px 16px", fontSize: 13 }}>
                  {collection.price_min != null && collection.price_max != null
                    ? `${fp(collection.price_min)} – ${fp(collection.price_max)}`
                    : "\u2014"}
                </td>
                <td className="text-gray-600 dark:text-gray-300" style={{ padding: "12px 16px", fontSize: 13 }}>
                  {collection.mileage_min != null && collection.mileage_max != null
                    ? `${formatMileage(collection.mileage_min)} – ${formatMileage(collection.mileage_max)}`
                    : "\u2014"}
                </td>
                <td className="text-gray-500 dark:text-gray-400" style={{ padding: "12px 16px", fontSize: 13 }}>
                  {collection.is_fetching ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#3b82f6" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", border: "2px solid #93c5fd", borderTopColor: "#2563eb", animation: "spin 1s linear infinite", display: "inline-block" }} />
                      {t("collections.fetching")}
                    </span>
                  ) : (
                    formatDate(collection.updated_at)
                  )}
                </td>
                {hasSharedCollections && (
                  <td style={{ padding: "12px 16px", fontSize: 13 }}>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                      {t(`sharing.${collection.role}`)}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ maxWidth: 1400, margin: "0 auto", width: "100%" }}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("collections.title")}</h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          {collections && collections.length > 0 && (
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(128,128,128,0.3)" }}>
              {[
                { mode: "cards" as const, icon: Squares2X2Icon, label: "Cards" },
                { mode: "grid" as const, icon: ListBulletIcon, label: "Grid" },
              ].map((v) => (
                <button
                  key={v.mode}
                  onClick={() => setViewMode(v.mode)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 12px",
                    fontSize: 13,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: viewMode === v.mode ? "rgba(99,102,241,0.15)" : "transparent",
                    color: viewMode === v.mode ? "#6366f1" : undefined,
                  }}
                  className={viewMode !== v.mode ? "text-gray-500 dark:text-gray-400" : ""}
                >
                  <v.icon style={{ width: 16, height: 16 }} />
                  {v.label}
                </button>
              ))}
            </div>
          )}

          {/* New Collection dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4" />
              {t("collections.create")}
              <ChevronDownIcon className="ml-1 h-3 w-3" />
            </button>
            {dropdownOpen && (
              <div
                className="absolute right-0 z-50 mt-1 overflow-hidden rounded-lg shadow-xl"
                style={{ width: 220, backgroundColor: "#2563eb" }}
              >
                {[
                  { label: t("collections.createTitle"), icon: ({ style }: { style?: React.CSSProperties }) => (
                    <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 21V10l9-7 9 7v11H3z" />
                      <path d="M8 21v-8h8v8" />
                      <path d="M8 16h8M8 19h8" />
                    </svg>
                  ), action: () => { setDropdownOpen(false); setShowCreate(true); } },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "10px 16px",
                      fontSize: 14,
                      fontWeight: 500,
                      color: "white",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.15)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <item.icon style={{ width: 18, height: 18, flexShrink: 0 }} />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {collections && collections.length > 0 ? (
        <>
          {/* My Collections section */}
          <div className={hasSharedCollections ? "mt-6" : "mt-6"}>
            {hasSharedCollections && (
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                {t("collections.myCollections")} <span className="text-sm font-normal text-gray-400">({myCollections.length})</span>
              </h2>
            )}
            {myCollections.length > 0 ? (
              renderCollectionList(myCollections)
            ) : hasSharedCollections ? (
              <div className="text-center text-gray-500 dark:text-gray-400">
                <p className="text-lg">{t("collections.empty")}</p>
                <p className="mt-1 text-sm">{t("collections.emptyMessage")}</p>
              </div>
            ) : null}
          </div>

          {/* Shared with me section */}
          {hasSharedCollections && (
            <div className="mt-10">
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                {t("collections.sharedWithMe")} <span className="text-sm font-normal text-gray-400">({sharedCollections.length})</span>
              </h2>
              {renderCollectionList(sharedCollections)}
            </div>
          )}
        </>
      ) : (
        <div className="mt-12 text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg">{t("collections.empty")}</p>
          <p className="mt-1 text-sm">{t("collections.emptyMessage")}</p>
        </div>
      )}

      <CreateCollectionModal open={showCreate} onClose={() => setShowCreate(false)} />
      {shareCollection && (
        <ShareCollectionModal
          collectionId={shareCollection.id}
          isOpen={shareCollectionId != null}
          onClose={() => setShareCollectionId(null)}
          currentUserRole={shareCollection.role}
          currentUserId={currentUser?.id}
          compareToken={shareCollection.compare_token}
          compareUrl={shareCollection.compare_url}
          compareRole={shareCollection.compare_role}
          shareToken={shareCollection.share_token}
          shareUrl={shareCollection.share_url}
          isDefaultCollection={shareCollection.default}
          onCompareLinkChange={() => queryClient.invalidateQueries({ queryKey: ["collections"] })}
          onShareLinkChange={() => queryClient.invalidateQueries({ queryKey: ["collections"] })}
        />
      )}
    </div>
  );
}
