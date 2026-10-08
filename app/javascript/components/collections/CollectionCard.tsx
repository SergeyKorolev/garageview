import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
  UserGroupIcon,
  UserPlusIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";
import Modal from "@/components/common/Modal";
import { useUpdateCollection, useDeleteCollection } from "@/hooks/useCollections";
import { useCurrencyStore } from "@/stores/currencyStore";
import { CURRENCY_MAP } from "@/constants/currencies";
import type { Collection } from "@/types/collection";

interface CollectionCardProps {
  collection: Collection;
  onShare?: (collection: Collection) => void;
  onLeave?: (collection: Collection) => void;
}

const ROTATIONS = [-8, 5, -3, 10, -5];

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Yesterday, ${time}`;
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatPriceShort(cents: number): string {
  const eur = Math.round(cents / 100);
  if (eur >= 1000) return `${(eur / 1000).toFixed(eur % 1000 === 0 ? 0 : 1)}k`;
  return `${eur}`;
}

function formatMileageShort(km: number): string {
  if (km >= 1000) return `${(km / 1000).toFixed(km % 1000 === 0 ? 0 : 1)}k`;
  return `${km}`;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function CollectionCard({ collection, onShare, onLeave }: CollectionCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const updateCollection = useUpdateCollection();
  const deleteCollection = useDeleteCollection();
  const { currency, convert } = useCurrencyStore();
  const allPhotos = collection.preview_photos ?? [];
  const photos = seededShuffle(allPhotos, collection.id).slice(0, 5);
  const hasPhotos = photos.length > 0;

  const isOwner = collection.role === "owner";
  const isShared = collection.role !== "owner";
  const isOwnerShared = isOwner && collection.members_count > 1;

  const [menuOpen, setMenuOpen] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasUnratedCars = collection.cars_count >= 1 && collection.ai_rated_count < collection.cars_count;
  const showAiRate = collection.cars_count >= 1;
  const handleAiRate = () => {
    setMenuOpen(false);
    navigate(`/collections/${collection.id}/grid?ai_rate=1`);
  };

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== collection.name) {
      updateCollection.mutate({ id: collection.id, payload: { name: trimmed } });
    }
    setShowRename(false);
  };

  const handleDelete = () => {
    deleteCollection.mutate(collection.id);
    setConfirmDelete(false);
  };

  const handleLeave = () => {
    onLeave?.(collection);
    setConfirmLeave(false);
  };

  const handleShare = () => {
    setMenuOpen(false);
    onShare?.(collection);
  };

  // Build context menu items based on role
  const menuItems: Array<{
    label: string;
    icon: React.ComponentType<{ style?: React.CSSProperties }>;
    action: () => void;
    disabled: boolean;
    className?: string;
  }> = [];

  // AI Rate for everyone with cars
  if (showAiRate && (isOwner || collection.role === "editor")) {
    menuItems.push({
      label: t("actions.aiRate"),
      icon: SparklesIcon,
      action: handleAiRate,
      disabled: !hasUnratedCars,
    });
  }

  if (isOwner) {
    // Share option for owner (not on default collection)
    if (!collection.default) {
      menuItems.push({
        label: t("sharing.share"),
        icon: UserPlusIcon,
        action: handleShare,
        disabled: false,
      });
      menuItems.push({
        label: t("common.rename"),
        icon: PencilIcon,
        action: () => { setMenuOpen(false); setNameValue(collection.name); setShowRename(true); },
        disabled: false,
      });
      menuItems.push({
        label: t("common.delete"),
        icon: TrashIcon,
        action: () => { setMenuOpen(false); setConfirmDelete(true); },
        disabled: false,
      });
    }
  } else {
    // Non-owner: Leave option
    menuItems.push({
      label: t("sharing.leave"),
      icon: ArrowRightStartOnRectangleIcon,
      action: () => { setMenuOpen(false); setConfirmLeave(true); },
      disabled: false,
      className: "text-amber-600 dark:text-amber-400",
    });
  }

  const showMenu = menuItems.length > 0;

  return (
    <>
      <div
        onClick={() => { if (!confirmDelete && !confirmLeave && !menuOpen) navigate(`/collections/${collection.id}`); }}
        className="group relative block overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
        style={{ cursor: menuOpen ? "default" : "pointer" }}
      >
        {/* Delete confirmation overlay */}
        {confirmDelete && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", inset: 0, zIndex: 20,
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: "rgba(17, 24, 39, 0.85)",
              borderRadius: 12,
              cursor: "default",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "white" }}>{t("collections.deleteCollection")}?</span>
              <button
                onClick={handleDelete}
                style={{
                  padding: "6px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "white",
                  backgroundColor: "#dc2626",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {t("common.yes")}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  padding: "6px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "white",
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {t("common.no")}
              </button>
            </div>
          </div>
        )}

        {/* Leave confirmation overlay -- amber/warning style */}
        {confirmLeave && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", inset: 0, zIndex: 20,
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: "rgba(17, 24, 39, 0.85)",
              borderRadius: 12,
              cursor: "default",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "white" }}>{t("sharing.confirmLeaveShort")}</span>
              <button
                onClick={handleLeave}
                style={{
                  padding: "6px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "white",
                  backgroundColor: "#f59e0b",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {t("common.yes")}
              </button>
              <button
                onClick={() => setConfirmLeave(false)}
                style={{
                  padding: "6px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "white",
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {t("common.no")}
              </button>
            </div>
          </div>
        )}

        {/* Three dots menu */}
        {showMenu && <div
          ref={menuRef}
          className={`absolute right-2 top-2 z-10 transition-opacity ${menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(55,65,81,0.7)",
              color: "white",
              cursor: "pointer",
              border: "none",
            }}
          >
            <EllipsisVerticalIcon style={{ width: 18, height: 18 }} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-600 dark:bg-gray-800"
              style={{ width: 180, padding: "6px 0" }}
            >
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={item.disabled ? undefined : item.action}
                  className={item.className || "text-gray-700 dark:text-gray-200"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "10px 16px",
                    fontSize: 14,
                    textAlign: "left",
                    cursor: item.disabled ? "default" : "pointer",
                    border: "none",
                    background: "none",
                    opacity: item.disabled ? 0.4 : 1,
                  }}
                  onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.backgroundColor = "rgba(99,102,241,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <item.icon style={{ width: 16, height: 16, flexShrink: 0 }} />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>}

        <div style={{ display: "flex", height: 260, position: "relative" }}>
          {/* Left: Info */}
          <div style={{ width: (hasPhotos || collection.cars_count === 0) ? "50%" : "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 20 }}>
            <div>
              <h3
                className="text-lg font-semibold leading-tight text-gray-900 dark:text-white"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {collection.name}
              </h3>

              {/* Sharing indicators */}
              {isShared && collection.owner && (
                <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <UserGroupIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t("sharing.sharedBy", { name: collection.owner.name })}</span>
                </p>
              )}
              {isOwnerShared && (
                <p className="mt-1 flex items-center gap-1 text-xs text-indigo-500 dark:text-indigo-400">
                  <UserGroupIcon className="h-3.5 w-3.5 shrink-0" />
                  {t("sharing.sharedWith", { count: collection.members_count })}
                </p>
              )}

              {/* Description only for non-shared collections */}
              {!isShared && collection.description && (
                <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
                  {collection.description}
                </p>
              )}
              {collection.is_fetching && (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
                  <span className="text-xs text-blue-600 dark:text-blue-300">Fetching cars...</span>
                </div>
              )}
            </div>
            <div style={{ fontSize: 15 }} className="text-gray-500 dark:text-gray-400">
              {collection.cars_count === 0 && !collection.is_fetching && (
                <div style={{ marginTop: 4 }}>
                  <div className="rounded" style={{ height: 14, width: 112, marginBottom: 8, backgroundColor: "rgba(148,163,184,0.2)" }} />
                  <div className="rounded" style={{ height: 12, width: 80, marginBottom: 8, backgroundColor: "rgba(148,163,184,0.15)" }} />
                  <div className="rounded" style={{ height: 12, width: 96, backgroundColor: "rgba(148,163,184,0.12)" }} />
                </div>
              )}
              {collection.price_min != null && collection.price_max != null && (
                <div style={{ marginTop: 2 }}>
                  {collection.price_min === collection.price_max
                    ? `${formatPriceShort(convert(collection.price_min))} ${CURRENCY_MAP[currency]?.symbol || currency}`
                    : `${formatPriceShort(convert(collection.price_min))} – ${formatPriceShort(convert(collection.price_max))} ${CURRENCY_MAP[currency]?.symbol || currency}`}
                </div>
              )}
              {collection.mileage_min != null && collection.mileage_max != null && (
                <div style={{ marginTop: 1 }}>
                  {collection.mileage_min === collection.mileage_max
                    ? `${formatMileageShort(collection.mileage_min)} km`
                    : `${formatMileageShort(collection.mileage_min)} – ${formatMileageShort(collection.mileage_max)} km`}
                </div>
              )}
              <div style={{ marginTop: 2 }} className="text-gray-400 dark:text-gray-500">
                {formatRelativeDate(collection.updated_at)}
              </div>
              <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#22c55e", whiteSpace: "nowrap" }}>
                  AI {collection.ai_rated_count}/{collection.cars_count}
                </span>
                {hasUnratedCars && (isOwner || collection.role === "editor") && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAiRate(); }}
                    className="rounded px-1.5 py-0.5 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30"
                    style={{ border: "1px solid currentColor", cursor: "pointer", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", lineHeight: 1.3 }}
                  >
                    <SparklesIcon style={{ width: 11, height: 11, display: "inline", marginRight: 2, verticalAlign: "-1px" }} />
                    {t("actions.aiRate")}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: Scattered photos or skeleton placeholders */}
          {hasPhotos ? (
            <div style={{ width: "50%", position: "relative", overflow: "hidden", top: 15, left: -5 }}>
              {photos.map((photo, i) => {
                const rotation = ROTATIONS[i % ROTATIONS.length];
                const positions = [
                  { left: 5, top: 25 },
                  { left: 45, top: 5 },
                  { left: 20, top: 10 },
                  { left: 50, top: 40 },
                  { left: 25, top: 45 },
                ];
                const pos = positions[i % positions.length];
                return (
                  <img
                    key={i}
                    src={photo}
                    alt=""
                    style={{
                      position: "absolute",
                      width: 100,
                      height: 72,
                      objectFit: "cover",
                      borderRadius: 8,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                      transform: `rotate(${rotation}deg)`,
                      left: `${pos.left}%`,
                      top: `${pos.top}%`,
                      zIndex: i,
                      transition: "transform 0.2s",
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div style={{ width: "50%", position: "relative", overflow: "hidden", top: 15, left: -5 }}>
              {[0, 1, 2].map((i) => {
                const rotation = ROTATIONS[i];
                const positions = [
                  { left: 10, top: 25 },
                  { left: 40, top: 10 },
                  { left: 25, top: 45 },
                ];
                const pos = positions[i];
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      width: 100,
                      height: 72,
                      borderRadius: 8,
                      backgroundColor: "rgba(148,163,184,0.2)",
                      transform: `rotate(${rotation}deg)`,
                      left: `${pos.left}%`,
                      top: `${pos.top}%`,
                      zIndex: i,
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Cars count — anchored bottom-right of the full card */}
          <span style={{ position: "absolute", bottom: 12, right: 16, fontSize: 13, fontWeight: 600 }} className="text-gray-400 dark:text-gray-500">
            {t("collections.cars_other", { count: collection.cars_count })}
          </span>
        </div>
      </div>

      {/* Rename modal */}
      <Modal open={showRename} onClose={() => setShowRename(false)} title={t("common.rename")}>
        <form onSubmit={handleSaveName} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("collections.name")}
            </label>
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowRename(false)}
              className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={!nameValue.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              style={!nameValue.trim() ? { opacity: 0.5 } : undefined}
            >
              {t("common.save")}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
