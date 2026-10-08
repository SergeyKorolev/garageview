import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { UserGroupIcon, LinkIcon, XMarkIcon, EyeIcon } from "@heroicons/react/24/outline";
import Modal from "@/components/common/Modal";
import MemberRow from "@/components/collections/MemberRow";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import {
  useMembers,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
} from "@/hooks/useMemberships";
import { createCompareLink, revokeCompareLink, shareCollection, unshareCollection } from "@/api/memberships";

interface ShareCollectionModalProps {
  collectionId: number;
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: "owner" | "editor" | "viewer";
  currentUserId?: number;
  compareToken?: string | null;
  compareUrl?: string | null;
  compareRole?: string;
  shareToken?: string | null;
  shareUrl?: string | null;
  isDefaultCollection?: boolean;
  onCompareLinkChange?: () => void;
  onShareLinkChange?: () => void;
}

export default function ShareCollectionModal({
  collectionId,
  isOpen,
  onClose,
  currentUserRole,
  currentUserId,
  compareToken,
  compareUrl,
  compareRole = "viewer",
  shareToken,
  shareUrl,
  isDefaultCollection = false,
  onCompareLinkChange,
  onShareLinkChange,
}: ShareCollectionModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isOwner = currentUserRole === "owner";

  const { data: members, isLoading } = useMembers(collectionId);
  const inviteMember = useInviteMember(collectionId);
  const updateRole = useUpdateMemberRole(collectionId);
  const removeMemberMutation = useRemoveMember(collectionId);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<number | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [compareLinkLoading, setCompareLinkLoading] = useState(false);
  const [compareLinkCopied, setCompareLinkCopied] = useState(false);
  const [publicRole, setPublicRole] = useState<"viewer" | "editor">(compareRole as "viewer" | "editor" || "viewer");
  const [shareLinkLoading, setShareLinkLoading] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);

  // Auto-clear feedback after 4 seconds
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setRole("viewer");
      setFeedback(null);
      setConfirmLeave(false);
    }
  }, [isOpen]);

  const handleInvite = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFeedback(null);
      const trimmedEmail = email.trim();
      if (!trimmedEmail) return;

      try {
        await inviteMember.mutateAsync({ email: trimmedEmail, role });
        setEmail("");
        setFeedback({ type: "success", message: t("sharing.inviteSent") });
      } catch (err: any) {
        const msg =
          err?.response?.data?.error || t("common.error");
        setFeedback({ type: "error", message: msg });
      }
    },
    [email, role, inviteMember, t]
  );

  const handleRoleChange = useCallback(
    async (memberId: number, newRole: "editor" | "viewer") => {
      setUpdatingMemberId(memberId);
      try {
        await updateRole.mutateAsync({ memberId, role: newRole });
        setFeedback({ type: "success", message: t("sharing.roleUpdated") });
      } catch (err: any) {
        const msg =
          err?.response?.data?.error || t("common.error");
        setFeedback({ type: "error", message: msg });
      } finally {
        setUpdatingMemberId(null);
      }
    },
    [updateRole, t]
  );

  const handleRemove = useCallback(
    async (memberId: number) => {
      setUpdatingMemberId(memberId);
      const member = members?.find((m) => m.id === memberId);
      const isPending = member?.status === "pending";
      try {
        await removeMemberMutation.mutateAsync(memberId);
        setFeedback({
          type: "success",
          message: isPending
            ? t("sharing.inviteRevoked")
            : t("sharing.memberRemoved"),
        });
      } catch (err: any) {
        const msg =
          err?.response?.data?.error || t("common.error");
        setFeedback({ type: "error", message: msg });
      } finally {
        setUpdatingMemberId(null);
      }
    },
    [removeMemberMutation, members, t]
  );

  const handleLeave = useCallback(async () => {
    const myMembership = currentUserId
      ? members?.find((m) => m.user_id === currentUserId && m.role !== "owner")
      : members?.find((m) => m.role === currentUserRole && m.role !== "owner");
    if (!myMembership) return;
    try {
      await removeMemberMutation.mutateAsync(myMembership.id);
      onClose();
      navigate("/");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error || t("common.error");
      setFeedback({ type: "error", message: msg });
    }
  }, [members, currentUserId, currentUserRole, removeMemberMutation, onClose, navigate, t]);

  const handleCreateCompareLink = useCallback(async () => {
    setCompareLinkLoading(true);
    try {
      const result = await createCompareLink(collectionId, publicRole);
      await navigator.clipboard.writeText(result.compare_url);
      setCompareLinkCopied(true);
      setTimeout(() => setCompareLinkCopied(false), 2000);
      onCompareLinkChange?.();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.response?.data?.error || t("common.error") });
    } finally {
      setCompareLinkLoading(false);
    }
  }, [collectionId, publicRole, onCompareLinkChange, t]);

  const handleRevokeCompareLink = useCallback(async () => {
    setCompareLinkLoading(true);
    try {
      await revokeCompareLink(collectionId);
      onCompareLinkChange?.();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.response?.data?.error || t("common.error") });
    } finally {
      setCompareLinkLoading(false);
    }
  }, [collectionId, onCompareLinkChange, t]);

  const handleCopyCompareLink = useCallback(async () => {
    if (!compareUrl) return;
    await navigator.clipboard.writeText(compareUrl);
    setCompareLinkCopied(true);
    setTimeout(() => setCompareLinkCopied(false), 2000);
  }, [compareUrl]);

  const handleCreateShareLink = useCallback(async () => {
    setShareLinkLoading(true);
    try {
      const result = await shareCollection(collectionId);
      await navigator.clipboard.writeText(result.share_url);
      setShareLinkCopied(true);
      setTimeout(() => setShareLinkCopied(false), 2000);
      onShareLinkChange?.();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.response?.data?.error || t("common.error") });
    } finally {
      setShareLinkLoading(false);
    }
  }, [collectionId, onShareLinkChange, t]);

  const handleRevokeShareLink = useCallback(async () => {
    setShareLinkLoading(true);
    try {
      await unshareCollection(collectionId);
      onShareLinkChange?.();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.response?.data?.error || t("common.error") });
    } finally {
      setShareLinkLoading(false);
    }
  }, [collectionId, onShareLinkChange, t]);

  const handleCopyShareLink = useCallback(async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setShareLinkCopied(true);
    setTimeout(() => setShareLinkCopied(false), 2000);
  }, [shareUrl]);

  const ownerMember = members?.find((m) => m.role === "owner");
  const nonOwnerMembers = members?.filter((m) => m.role !== "owner") ?? [];
  const hasMembers = nonOwnerMembers.length > 0;

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={t("sharing.manageMembers")}
      className="max-w-lg"
    >
      {/* A. Invite Form Row (owner only) */}
      {isOwner && (
        <form onSubmit={handleInvite} className="flex flex-wrap items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("sharing.emailPlaceholder")}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:w-auto sm:flex-1"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
            className="w-32 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          >
            <option value="viewer">{t("sharing.canView")}</option>
            <option value="editor">{t("sharing.canEdit")}</option>
          </select>
          <button
            type="submit"
            disabled={!email.trim() || !isValidEmail(email.trim()) || inviteMember.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {inviteMember.isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              t("sharing.invite")
            )}
          </button>
        </form>
      )}

      {/* B. Inline Feedback Message */}
      {feedback && (
        <p
          className={`mt-2 text-sm ${
            feedback.type === "success"
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {feedback.message}
        </p>
      )}

      {/* B2. View-only public link (owner only, non-default collection) */}
      {isOwner && !isDefaultCollection && (
        <div className="mt-4 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div className="mb-2 flex items-center gap-2">
            <EyeIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              View-only public link
            </span>
          </div>
          {shareToken ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl || ""}
                  className="flex-1 truncate rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
                />
                <button
                  onClick={handleCopyShareLink}
                  className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                >
                  {shareLinkCopied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Anyone can view cars &amp; AI ratings — no sign-in needed
                </span>
                <button
                  onClick={handleRevokeShareLink}
                  disabled={shareLinkLoading}
                  className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
                >
                  <XMarkIcon className="h-3 w-3" />
                  Disable
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleCreateShareLink}
              disabled={shareLinkLoading}
              className="w-full rounded-md border border-blue-600 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:hover:bg-blue-900/20"
            >
              {shareLinkLoading ? "Creating..." : "Create view-only link"}
            </button>
          )}
        </div>
      )}

      {/* B3. Public invite link (owner only, non-default collection) */}
      {isOwner && !isDefaultCollection && (
        <div className="mt-4 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div className="mb-2 flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("sharing.publicLink") || "Public invite link"}
            </span>
          </div>
          {compareToken ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={compareUrl || ""}
                  className="flex-1 truncate rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
                />
                <button
                  onClick={handleCopyCompareLink}
                  className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                >
                  {compareLinkCopied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Anyone with this link can join as {compareRole}
                </span>
                <button
                  onClick={handleRevokeCompareLink}
                  disabled={compareLinkLoading}
                  className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
                >
                  <XMarkIcon className="h-3 w-3" />
                  Disable
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <select
                value={publicRole}
                onChange={(e) => setPublicRole(e.target.value as "viewer" | "editor")}
                className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              >
                <option value="viewer">{t("sharing.canView")}</option>
                <option value="editor">{t("sharing.canEdit")}</option>
              </select>
              <button
                onClick={handleCreateCompareLink}
                disabled={compareLinkLoading}
                className="flex-1 rounded-md border border-green-600 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 disabled:opacity-50 dark:hover:bg-green-900/20"
              >
                {compareLinkLoading ? "Creating..." : "Create public link"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* C. Divider */}
      {isOwner && <hr className="my-4 border-gray-200 dark:border-gray-700" />}

      {/* D. Member List */}
      {isLoading ? (
        <LoadingSpinner className="py-6" />
      ) : !hasMembers && isOwner ? (
        /* Empty State */
        <div className="py-8 text-center">
          <UserGroupIcon className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t("sharing.noMembers")}
          </p>
        </div>
      ) : (
        <div>
          {/* Owner row first */}
          {ownerMember && (
            <MemberRow
              member={ownerMember}
              isOwnerView={isOwner}
              isLast={!hasMembers}
              isUpdating={updatingMemberId === ownerMember.id}
            />
          )}
          {/* Other members */}
          {nonOwnerMembers.map((member, idx) => (
            <MemberRow
              key={member.id}
              member={member}
              isOwnerView={isOwner}
              isLast={idx === nonOwnerMembers.length - 1}
              onRoleChange={handleRoleChange}
              onRemove={handleRemove}
              isUpdating={updatingMemberId === member.id}
            />
          ))}
        </div>
      )}

      {/* E. Leave Action (Non-Owner View) */}
      {!isOwner && !isLoading && (
        <>
          {confirmLeave ? (
            <div className="mt-4 space-y-3 text-center">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t("sharing.confirmLeave")}
              </p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={handleLeave}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  {t("sharing.leave")}
                </button>
                <button
                  onClick={() => setConfirmLeave(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmLeave(true)}
              className="mt-4 w-full rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              {t("sharing.leaveCollection")}
            </button>
          )}
        </>
      )}
    </Modal>
  );
}
