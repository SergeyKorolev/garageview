import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Modal from "@/components/common/Modal";
import { useCreateCollection } from "@/hooks/useCollections";

interface CreateCollectionModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateCollectionModal({ open, onClose }: CreateCollectionModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const createCollection = useCreateCollection();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createCollection.mutate(
      { name: name.trim() },
      {
        onSuccess: (collection) => {
          setName("");
          onClose();
          navigate(`/collections/${collection.id}`);
        },
      }
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={t("collections.createTitle")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("collections.name")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("collections.namePlaceholder")}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={!name.trim() || createCollection.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createCollection.isPending ? t("common.creating") : t("common.create")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
