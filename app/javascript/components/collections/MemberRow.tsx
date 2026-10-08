import { useState } from "react";
import { useTranslation } from "react-i18next";
import { XMarkIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import type { CollectionMember } from "@/types/membership";

interface MemberRowProps {
  member: CollectionMember;
  isOwnerView: boolean;
  isLast: boolean;
  onRoleChange?: (memberId: number, role: "editor" | "viewer") => void;
  onRemove?: (memberId: number) => void;
  isUpdating?: boolean;
}

function getAvatarColor(role: string): string {
  if (role === "owner") return "bg-blue-600";
  if (role === "editor") return "bg-indigo-500";
  return "bg-gray-500";
}

export default function MemberRow({
  member,
  isOwnerView,
  isLast,
  onRoleChange,
  onRemove,
  isUpdating,
}: MemberRowProps) {
  const { t } = useTranslation();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const isPending = member.status === "pending";
  const isOwner = member.role === "owner";
  const displayName = member.name ?? member.email;
  const initial = displayName[0]?.toUpperCase() ?? "?";

  if (confirmRemove) {
    return (
      <div
        className={`flex items-center justify-between gap-3 py-2 ${!isLast ? "border-b border-gray-100 dark:border-gray-700/50" : ""}`}
        style={isUpdating ? { opacity: 0.5 } : undefined}
      >
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {t("sharing.confirmRemove", { name: displayName })}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRemove?.(member.id)}
            className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
          >
            {t("common.yes")}
          </button>
          <button
            onClick={() => setConfirmRemove(false)}
            className="rounded-md bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
          >
            {t("common.no")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 py-2 ${!isLast ? "border-b border-gray-100 dark:border-gray-700/50" : ""}`}
      style={isUpdating ? { opacity: 0.5 } : undefined}
    >
      {/* Avatar / Initial */}
      {isPending ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600">
          <EnvelopeIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </div>
      ) : (
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${getAvatarColor(member.role)}`}
        >
          {initial}
        </div>
      )}

      {/* Name + Email / Status */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {displayName}
        </p>
        {isPending ? (
          <p className="truncate text-xs text-amber-500 dark:text-amber-400">
            {t("sharing.pending")}
          </p>
        ) : member.name ? (
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {member.email}
          </p>
        ) : null}
      </div>

      {/* Role badge / select */}
      {isOwner ? (
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {t("sharing.owner")}
        </span>
      ) : isOwnerView ? (
        <select
          value={member.role === "editor" ? "editor" : "viewer"}
          onChange={(e) =>
            onRoleChange?.(member.id, e.target.value as "editor" | "viewer")
          }
          className="w-24 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        >
          <option value="viewer">{t("sharing.canView")}</option>
          <option value="editor">{t("sharing.canEdit")}</option>
        </select>
      ) : (
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {member.role === "editor" ? t("sharing.editor") : t("sharing.viewer")}
        </span>
      )}

      {/* Remove button (owner view only, not for the owner row) */}
      {isOwnerView && !isOwner && (
        <button
          onClick={() => setConfirmRemove(true)}
          className="rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
