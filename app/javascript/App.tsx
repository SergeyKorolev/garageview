import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import "@/i18n";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCurrencyStore } from "@/stores/currencyStore";
import TopBar from "@/components/layout/TopBar";
import HomePage from "@/pages/HomePage";
import CollectionSplitView from "@/pages/CollectionSplitView";
import SharedCollectionPage from "@/pages/SharedCollectionPage";
import FeatureMatrixPage from "@/pages/FeatureMatrixPage";
import LandingPage from "@/pages/LandingPage";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import OnboardingModal from "@/components/account/OnboardingModal";
import AgentDrawer from "@/components/agent/AgentDrawer";
import AgentHistoryPage from "@/pages/AgentHistoryPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import ExtensionPage from "@/pages/ExtensionPage";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { SUPPORTED_LANGUAGES } from "@/constants/languages";

const SUPPORTED_LOCALES: string[] = SUPPORTED_LANGUAGES.map((l) => l.code);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: false,
    },
  },
});

function ThemeInitializer() {
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }, []);
  return null;
}

function LanguageSync() {
  const { data: user } = useCurrentUser();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (user?.language && user.language !== i18n.language) {
      i18n.changeLanguage(user.language);
    }
  }, [user?.language, i18n]);

  return null;
}

function CurrencySync() {
  const { data: user } = useCurrentUser();
  const { currency, setCurrency, fetchRates } = useCurrencyStore();

  useEffect(() => {
    if (user?.currency && user.currency !== currency) {
      setCurrency(user.currency as any);
    } else if (user?.currency && user.currency !== "EUR") {
      fetchRates();
    }
  }, [user?.currency]);

  return null;
}

function PostHogIdentify({ user }: { user: any }) {
  useEffect(() => {
    if (user?.id && window.posthog && window.CookieConsent?.acceptedCategory('analytics')) {
      window.posthog.identify(String(user.id), {
        email: user.email,
        name: user.name,
      });
    }
  }, [user?.id]);
  return null;
}

// Detect language: saved preference > browser language > "en"
function detectLocale(): string {
  const saved = localStorage.getItem("preferred_locale");
  if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;
  const browserLang = navigator.language?.split("-")[0] || "en";
  return SUPPORTED_LOCALES.includes(browserLang) ? browserLang : "en";
}

function RootRedirect() {
  return <Navigate to={`/${detectLocale()}`} replace />;
}

// Set i18n language from URL locale
function LocaleWrapper({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const locale = pathname.split("/").filter(Boolean)[0] || "en";
  const { i18n } = useTranslation();

  useEffect(() => {
    if (SUPPORTED_LOCALES.includes(locale)) {
      localStorage.setItem("preferred_locale", locale);
      if (locale !== i18n.language) i18n.changeLanguage(locale);
    }
  }, [locale, i18n]);

  return <>{children}</>;
}

// Landing page with locale — redirects to /collections if authenticated
function LocaleLanding() {
  const { data: user, isLoading, isError } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isError && user) {
    return <Navigate to="/collections" replace />;
  }

  return <LandingPage />;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !user) {
    return <RootRedirect />;
  }

  return (
    <>
      <PostHogIdentify user={user} />
      <LanguageSync />
      <CurrencySync />
      {!user.onboarded && <OnboardingModal />}
      {children}
    </>
  );
}


function AppRoutes() {
  return (
    <AuthGate>
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
        <TopBar />
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 flex flex-col min-w-0">
            <Routes>
              <Route path="/" element={<Navigate to="/collections" replace />} />
              <Route path="/collections" element={<HomePage />} />
              <Route path="/collections/:collectionId" element={<Navigate to="grid" replace />} />
              <Route path="/collections/:collectionId/list" element={<CollectionSplitView />} />
              <Route path="/collections/:collectionId/grid" element={<CollectionSplitView />} />
              <Route path="/collections/:collectionId/map" element={<CollectionSplitView />} />
              <Route path="/collections/:collectionId/compare" element={<CollectionSplitView />} />
              <Route path="/collections/:collectionId/notes" element={<CollectionSplitView />} />
              <Route path="/collections/:collectionId/matrix" element={<FeatureMatrixPage />} />
              <Route path="/agent" element={<AgentHistoryPage />} />
              <Route path="/agent/:conversationId" element={<AgentHistoryPage />} />
              <Route path="*" element={<Navigate to="/collections" replace />} />
            </Routes>
          </div>
          <AgentDrawer />
        </div>
      </div>
    </AuthGate>
  );
}

// Route guard: checks if first path segment is a locale, renders locale pages; otherwise falls through to app
function RouteSwitch() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0] || "";

  // Root — redirect to detected locale
  if (pathname === "/") return <RootRedirect />;

  // Shared collection — public, no auth (supports /s/c/TOKEN and /s/c/TOKEN/view)
  if (pathname.startsWith("/s/c/")) {
    const parts = pathname.split("/s/c/")[1]?.split("/");
    const token = parts?.[0];
    if (token) return <SharedCollectionPage />;
  }

  // Legacy routes without locale — redirect
  if (pathname === "/login") return <RootRedirect />;
  if (pathname === "/privacy") return <Navigate to="/en/privacy" replace />;
  if (pathname === "/terms") return <Navigate to="/en/terms" replace />;
  if (pathname === "/extension") return <Navigate to="/en/extension" replace />;

  // If first segment is a valid locale, render public locale pages
  if (SUPPORTED_LOCALES.includes(firstSegment)) {
    const subPath = segments.slice(1).join("/");
    return (
      <LocaleWrapper>
        {subPath === "privacy" ? <PrivacyPage /> : subPath === "terms" ? <TermsPage /> : subPath === "extension" ? <ExtensionPage /> : <LocaleLanding />}
      </LocaleWrapper>
    );
  }

  // Everything else — authenticated app
  return <AppRoutes />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeInitializer />
          <RouteSwitch />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
