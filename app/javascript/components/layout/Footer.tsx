import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "@/stores/themeStore";

export default function Footer() {
  const { t } = useTranslation();
  const isDark = useThemeStore((s) => s.theme === "dark");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white py-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl px-6">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <img src="/logo.png?v=3" alt="garageview.ai" className="hidden dark:block" style={{ height: 24, opacity: 0.7 }} />
          <img src="/logo-dark.png?v=3" alt="garageview.ai" className="block dark:hidden" style={{ height: 24, opacity: 0.7 }} />
          <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
            <span>{t("landing.footer")}</span>
            <Link to="/privacy" className="hover:underline">Privacy</Link>
            <button onClick={() => window.CookieConsent?.showPreferences()} className="hover:underline">
              {t("privacy.cookieSettings")}
            </button>
            <Link to="/terms" className="hover:underline">Terms</Link>
            <span>&copy; {year}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
