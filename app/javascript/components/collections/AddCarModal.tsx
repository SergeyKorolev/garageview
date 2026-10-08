import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import Modal from "@/components/common/Modal";
import { useAddCar } from "@/hooks/useCollectionCars";
import { createSearchFilter } from "@/api/searchFilters";

interface AddCarModalProps {
  open: boolean;
  onClose: () => void;
  collectionId: number;
  initialMode?: "car" | "search";
  onSearchFilterAdded?: () => void;
}

export default function AddCarModal({ open, onClose, collectionId, initialMode = "car", onSearchFilterAdded }: AddCarModalProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"car" | "search">(initialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const addCar = useAddCar(collectionId);
  const queryClient = useQueryClient();

  useEffect(() => { if (open) { setMode(initialMode); setError(""); } }, [open, initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError("");

    if (mode === "car") {
      addCar.mutate(url.trim(), {
        onSuccess: () => {
          setUrl("");
          onClose();
        },
        onError: (err: any) => {
          setError(err?.response?.data?.error || t("collections.addError"));
        },
      });
    } else {
      setIsSubmitting(true);
      try {
        await createSearchFilter(collectionId, { search_url: url.trim() });
        queryClient.invalidateQueries({ queryKey: ["collectionCars", collectionId] });
        queryClient.invalidateQueries({ queryKey: ["collections"] });
        onSearchFilterAdded?.();
        setUrl("");
        onClose();
      } catch (err: any) {
        console.error("Failed to create search filter:", err);
        setError(err?.response?.data?.error || t("collections.addError"));
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const isPending = addCar.isPending || isSubmitting;

  return (
    <Modal open={open} onClose={onClose} title={mode === "car" ? t("collections.addCarTitle") : t("collections.addFilterTitle")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {mode === "car" ? t("collections.pasteUrl") : t("collections.filterUrl")}
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={mode === "car" ? t("collections.urlPlaceholder") : t("collections.filterUrlPlaceholder")}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            autoFocus
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {mode === "car" ? t("collections.carUrlHelp") : t("collections.searchUrlHelp")}
          </p>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
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
            disabled={!url.trim() || isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? t("common.adding") : t("common.add")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
