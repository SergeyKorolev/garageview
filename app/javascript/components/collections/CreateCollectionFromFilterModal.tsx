import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import Modal from "@/components/common/Modal";
import { useCreateCollection } from "@/hooks/useCollections";
import { createSearchFilter } from "@/api/searchFilters";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateCollectionFromFilterModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const createCollection = useCreateCollection();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    setError("");
    setIsSubmitting(true);

    try {
      // Auto-generate name from URL params if not provided
      const collectionName = name.trim() || extractNameFromUrl(trimmedUrl);

      // 1. Create collection
      const collection = await new Promise<any>((resolve, reject) => {
        createCollection.mutate(
          { name: collectionName },
          { onSuccess: resolve, onError: reject }
        );
      });

      // 2. Create search filter on the new collection
      await createSearchFilter(collection.id, { search_url: trimmedUrl });
      queryClient.invalidateQueries({ queryKey: ["collections"] });

      // 3. Navigate to the collection
      setName("");
      setUrl("");
      onClose();
      navigate(`/collections/${collection.id}/grid?fetching=1`);
    } catch (err: any) {
      console.error("Failed to create collection from filter:", err);
      setError(err?.response?.data?.error || t("collections.createError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("collections.addFilterTitle")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("collections.name")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("collections.filterNamePlaceholder")}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("collections.filterUrl")}
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("collections.filterUrlPlaceholder")}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            autoFocus
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t("collections.searchUrlHelp")}
          </p>
        </div>
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
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
            disabled={!url.trim() || isSubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? t("common.creating") : t("common.create")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function extractNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Try to extract make/model from the mobile.de "ms" param (e.g. "20100;;;Taycan Cross Turismo")
    const ms = parsed.searchParams.get("ms");
    if (ms) {
      const parts = ms.split(";").filter(Boolean);
      if (parts.length > 1) return parts.slice(1).join(" ");
      if (parts.length === 1) return parts[0];
    }
    // otomoto/autoscout24: derive from path slugs, e.g. /osobowe/bmw/seria-1 or /lst/bmw/118
    if (!parsed.host.includes("mobile.de")) {
      const segments = parsed.pathname
        .split("/")
        .filter(Boolean)
        .filter((s) => !["osobowe", "lst", "search"].includes(s));
      if (segments.length > 0) {
        return segments
          .slice(0, 2)
          .join(" ")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }
    return `Search ${new Date().toLocaleDateString()}`;
  } catch {
    return `Search ${new Date().toLocaleDateString()}`;
  }
}
