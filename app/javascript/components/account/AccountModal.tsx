import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MapPinIcon, UserCircleIcon, ExclamationTriangleIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import Modal from "@/components/common/Modal";
import { useCurrentUser, useUpdateUser } from "@/hooks/useCurrentUser";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useCurrencyStore } from "@/stores/currencyStore";
import { SUPPORTED_LANGUAGES } from "@/constants/languages";
import { SUPPORTED_CURRENCIES, type Currency } from "@/constants/currencies";
import { deleteAccount, exportUserData } from "@/api/auth";

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    const addr = data.address;
    const city = addr?.city || addr?.town || addr?.village || addr?.county;
    const country = addr?.country;
    if (city && country) return `${city}, ${country}`;
    if (city) return city;
    if (country) return country;
    return "Unknown location";
  } catch {
    return "Unknown location";
  }
}

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AccountModal({ open, onClose }: AccountModalProps) {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const updateUser = useUpdateUser();
  const { setCurrency } = useCurrencyStore();
  const geo = useGeolocation();
  const [locationName, setLocationName] = useState("");
  const [avatarError, setAvatarError] = useState(false);
  const savingFromEnter = useRef(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.location_name) {
      setLocationName(user.location_name);
    }
  }, [user?.location_name, open]);

  // Auto-save when geolocation is detected
  useEffect(() => {
    if (geo.latitude && geo.longitude) {
      reverseGeocode(geo.latitude, geo.longitude).then((name) => {
        setLocationName(name);
        updateUser.mutate({
          latitude: geo.latitude!,
          longitude: geo.longitude!,
          location_name: name,
        });
      });
    }
  }, [geo.latitude, geo.longitude]);

  if (!user) return null;

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    updateUser.mutate({ language: lang });
  };

  const handleCurrencyChange = (currency: Currency) => {
    setCurrency(currency);
    updateUser.mutate({ currency });
  };

  const handleLocationSave = () => {
    const trimmed = locationName.trim();
    if (!trimmed) return;
    // Always save — even if name looks the same, user may want to re-geocode
    updateUser.mutate({ location_name: trimmed });
  };

  return (
    <Modal open={open} onClose={onClose} title={t("account.title")}>
      {/* User info */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        {user.avatar_url && !avatarError ? (
          <img
            src={user.avatar_url}
            alt=""
            className="h-10 w-10 rounded-full"
            referrerPolicy="no-referrer"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <UserCircleIcon className="h-10 w-10 text-gray-400" />
        )}
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {/* Language */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t("account.language")}
          </label>
          <select
            value={user.language || i18n.language || "en"}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName} ({lang.name})
              </option>
            ))}
          </select>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t("account.currency")}
          </label>
          <select
            value={user.currency}
            onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t("account.location")}
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => geo.requestLocation()}
              disabled={geo.loading}
              className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <MapPinIcon className="inline h-3.5 w-3.5 mr-1" />
              {geo.loading ? t("account.detecting") : t("account.detect")}
            </button>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              onBlur={() => { if (!savingFromEnter.current) handleLocationSave(); savingFromEnter.current = false; }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); savingFromEnter.current = true; handleLocationSave(); (e.target as HTMLInputElement).blur(); } }}
              placeholder={t("account.locationPlaceholder")}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>
          {geo.error && <p className="mt-1 text-xs text-red-500">{geo.error}</p>}
        </div>
      </div>

      {/* Your Data - Export */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
          {t("account.yourData")}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("account.dataExportDescription")}
        </p>
        <button
          onClick={async () => {
            setExporting(true);
            setExportError(null);
            try {
              await exportUserData();
            } catch (err: unknown) {
              if (err && typeof err === "object" && "response" in err) {
                const axiosErr = err as { response?: { status?: number } };
                if (axiosErr.response?.status === 429) {
                  setExportError(t("account.exportRateLimited"));
                } else {
                  setExportError(t("account.exportError"));
                }
              } else {
                setExportError(t("account.exportError"));
              }
            } finally {
              setExporting(false);
            }
          }}
          disabled={exporting}
          className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
        >
          {exporting ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {t("account.preparingExport")}
            </>
          ) : (
            <>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {t("account.downloadMyData")}
            </>
          )}
        </button>
        {exportError && (
          <p className="mt-2 text-xs text-red-500">{exportError}</p>
        )}
      </div>

      {/* Delete Account */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
          >
            Delete my account
          </button>
        ) : (
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">Delete your account?</h4>
                <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1 mb-3">
                  This will permanently delete your account, all collections, saved cars, and AI analyses. This action cannot be undone.
                </p>
                <label className="block text-xs text-red-600 dark:text-red-400 mb-1.5">
                  Type <strong>DELETE</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="DELETE"
                  className="w-full rounded-md border border-red-300 dark:border-red-800 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-red-700 dark:text-red-300 placeholder-red-300 dark:placeholder-red-800"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={async () => {
                      setDeleting(true);
                      try {
                        await deleteAccount();
                        window.location.href = "/";
                      } catch {
                        setDeleting(false);
                      }
                    }}
                    disabled={deleteInput !== "DELETE" || deleting}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {deleting ? "Deleting..." : "Delete permanently"}
                  </button>
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
                    className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
