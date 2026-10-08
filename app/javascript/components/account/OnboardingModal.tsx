import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MapPinIcon } from "@heroicons/react/24/outline";
import Modal from "@/components/common/Modal";
import { useUpdateUser } from "@/hooks/useCurrentUser";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useCurrencyStore } from "@/stores/currencyStore";
import { SUPPORTED_LANGUAGES } from "@/constants/languages";
import { SUPPORTED_CURRENCIES, type Currency } from "@/constants/currencies";

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

function detectBrowserLanguage(): string {
  const browserLang = navigator.language?.split("-")[0] || "en";
  const supported: string[] = SUPPORTED_LANGUAGES.map((l) => l.code);
  return supported.includes(browserLang) ? browserLang : "en";
}

function defaultCurrencyForLanguage(lang: string): Currency {
  const map: Record<string, Currency> = {
    en: "EUR", de: "EUR", fr: "EUR", es: "EUR", it: "EUR", pt: "EUR",
    nl: "EUR", fi: "EUR", el: "EUR", ga: "EUR", et: "EUR", lt: "EUR",
    lv: "EUR", sl: "EUR", sk: "EUR",
    pl: "PLN", cs: "CZK", hu: "HUF", ro: "RON", bg: "BGN", hr: "HRK",
    sv: "SEK", da: "DKK", nb: "NOK", uk: "UAH",
  };
  return map[lang] || "EUR";
}

export default function OnboardingModal() {
  const { t, i18n } = useTranslation();
  const updateUser = useUpdateUser();
  const { setCurrency } = useCurrencyStore();
  const geo = useGeolocation();

  const [language, setLanguage] = useState(() => detectBrowserLanguage());
  const [currency, setCurrencyLocal] = useState<Currency>(() => defaultCurrencyForLanguage(detectBrowserLanguage()));
  const [locationName, setLocationName] = useState("");
  const [saving, setSaving] = useState(false);

  // Update i18n when language changes during onboarding
  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  // Auto-set currency when language changes
  useEffect(() => {
    setCurrencyLocal(defaultCurrencyForLanguage(language));
  }, [language]);

  // Reverse geocode when location detected
  useEffect(() => {
    if (geo.latitude && geo.longitude) {
      reverseGeocode(geo.latitude, geo.longitude).then(setLocationName);
    }
  }, [geo.latitude, geo.longitude]);

  const handleGetStarted = () => {
    setSaving(true);
    setCurrency(currency);
    updateUser.mutate(
      {
        language,
        currency,
        ...(geo.latitude && geo.longitude
          ? { latitude: geo.latitude, longitude: geo.longitude, location_name: locationName || "My location" }
          : locationName ? { location_name: locationName } : {}),
        onboarded: true,
      },
      { onSettled: () => setSaving(false) }
    );
  };

  return (
    <Modal open={true} onClose={() => {}} title={t("onboarding.welcome")}>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        {t("onboarding.setup")}
      </p>

      <div className="space-y-4">
        {/* Language */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t("onboarding.selectLanguage")}
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
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
            {t("onboarding.selectCurrency")}
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrencyLocal(e.target.value as Currency)}
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
            {t("onboarding.setLocation")}
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => geo.requestLocation()}
              disabled={geo.loading}
              className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <MapPinIcon className="inline h-3.5 w-3.5 mr-1" />
              {geo.loading ? t("onboarding.detecting") : t("onboarding.detectLocation")}
            </button>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder={t("account.locationPlaceholder")}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>
          {geo.error && <p className="mt-1 text-xs text-red-500">{geo.error}</p>}
        </div>
      </div>

      {/* Get Started */}
      <button
        onClick={handleGetStarted}
        disabled={saving}
        className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? t("common.loading") : t("onboarding.getStarted")}
      </button>
    </Modal>
  );
}
