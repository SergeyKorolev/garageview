import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMembers } from "@/hooks/useMemberships";
import ShareCollectionModal from "@/components/collections/ShareCollectionModal";

interface MemberAvatarStackProps {
  collectionId: number;
  membersCount: number;
  currentUserRole: "owner" | "editor" | "viewer";
}

const MAX_VISIBLE = 3;

export default function MemberAvatarStack({
  collectionId,
  membersCount,
  currentUserRole,
}: MemberAvatarStackProps) {
  const [showModal, setShowModal] = useState(false);
  const { data: members } = useMembers(collectionId);

  // Use fetched members for display if available, otherwise show placeholder circles
  const acceptedMembers = members?.filter((m) => m.status === "accepted") ?? [];
  const visibleMembers = acceptedMembers.slice(0, MAX_VISIBLE);
  const overflowCount = Math.max(0, (members ? acceptedMembers.length : membersCount) - MAX_VISIBLE);

  if (membersCount <= 1) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="hidden items-center -space-x-1 sm:flex"
        type="button"
      >
        {visibleMembers.map((member) => (
          <div
            key={member.id}
            className="group/avatar relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-indigo-500 text-[10px] font-semibold text-white dark:border-gray-900"
          >
            {member.name?.[0]?.toUpperCase() ?? "?"}
            <span className="pointer-events-none absolute -bottom-8 left-1/2 z-50 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[10px] font-normal text-white shadow-lg group-hover/avatar:block dark:bg-gray-700">
              {member.name ?? member.email}
            </span>
          </div>
        ))}
        {overflowCount > 0 && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-400 text-[10px] font-semibold text-white dark:border-gray-900">
            +{overflowCount}
          </div>
        )}
      </button>

      <ShareCollectionModal
        collectionId={collectionId}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        currentUserRole={currentUserRole}
      />
    </>
  );
}
