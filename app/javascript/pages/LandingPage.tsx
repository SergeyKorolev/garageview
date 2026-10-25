import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { SUPPORTED_LANGUAGES } from "@/constants/languages";

const LOCALES = SUPPORTED_LANGUAGES.map((l) => ({ code: l.code, label: l.nativeName }));

const CAROUSEL_SLIDES = [
  { image: "/screens/grid.png", labelKey: "landing.section1Label" },
  { image: "/screens/compare.png", labelKey: "landing.section2Label" },
  { image: "/screens/list.png", labelKey: "landing.section2Label" },
  { image: "/screens/notes.png", labelKey: "landing.section4Label" },
  { image: "/screens/map.png", labelKey: "landing.section3Label" },
  { image: "/screens/detail.png", labelKey: "landing.section1Label" },
];

const SECTIONS = [
  {
    labelKey: "landing.section1Label",
    titleKey: "landing.section1Title",
    descKey: "landing.section1Desc",
    desc2Key: "landing.section1Desc2",
    image: "/screens/detail.png",
  },
  {
    labelKey: "landing.section4Label",
    titleKey: "landing.section4Title",
    descKey: "landing.section4Desc",
    desc2Key: "landing.section4Desc2",
    image: "/screens/notes.png",
  },
  {
    labelKey: "landing.section3Label",
    titleKey: "landing.section3Title",
    descKey: "landing.section3Desc",
    desc2Key: "landing.section3Desc2",
    image: "/screens/map.png",
  },
  {
    labelKey: "landing.section2Label",
    titleKey: "landing.section2Title",
    descKey: "landing.section2Desc",
    desc2Key: "landing.section2Desc2",
    image: "/screens/compare.png",
  },
];

const ChromeIcon = () => (
  <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="0"/>
    <path d="M12 2a10 10 0 00-8.66 5h5.66l3-5.2A10 10 0 0012 2z" fill="#EA4335"/>
    <path d="M3.34 7A10 10 0 002 12a10 10 0 005 8.66l2.83-4.9L6.34 7H3.34z" fill="#FBBC05"/>
    <path d="M7 20.66A10 10 0 0012 22a10 10 0 008.66-5H15l-3 5.2a10 10 0 01-5-1.54z" fill="#34A853"/>
    <path d="M20.66 17A10 10 0 0022 12a10 10 0 00-5-8.66l-2.83 4.9L17.66 17h3z" fill="#4285F4"/>
    <circle cx="12" cy="12" r="4" fill="white"/>
    <circle cx="12" cy="12" r="3.2" fill="#4285F4"/>
  </svg>
);

const GoogleIcon = () => (
  <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function GoogleButton({ csrfToken, label }: { csrfToken: string; label: string }) {
  return (
    <form action="/users/auth/google_oauth2" method="post">
      <input type="hidden" name="authenticity_token" value={csrfToken} />
      <button
        type="submit"
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 36px", fontSize: 16, fontWeight: 600,
          color: "white", backgroundColor: "#2563eb",
          border: "none", borderRadius: 12, cursor: "pointer",
          boxShadow: "0 4px 24px rgba(37,99,235,0.4)",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1d4ed8"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(37,99,235,0.5)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#2563eb"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(37,99,235,0.4)"; }}
      >
        <GoogleIcon />
        {label}
      </button>
    </form>
  );
}

function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const { t } = useTranslation();

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % CAROUSEL_SLIDES.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <div style={{ marginTop: 60, maxWidth: 1100, width: "100%", position: "relative" }}>
      {/* Slides */}
      <div style={{
        position: "relative", width: "100%", overflow: "hidden", borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3)",
      }}>
        {CAROUSEL_SLIDES.map((slide, i) => (
          <img
            key={slide.image}
            src={slide.image}
            alt={t(slide.labelKey)}
            style={{
              width: "100%",
              display: "block",
              position: i === 0 ? "relative" : "absolute",
              top: 0, left: 0,
              opacity: i === current ? 1 : 0,
              transition: "opacity 0.5s ease",
            }}
          />
        ))}
      </div>

      {/* Dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
        {CAROUSEL_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              width: i === current ? 24 : 8,
              height: 8,
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
              backgroundColor: i === current ? "#3b82f6" : "rgba(255,255,255,0.2)",
              transition: "all 0.3s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || "";
  const currentLocale = i18n.language || "en";

  // Set hreflang tags and update document title/meta for SEO
  useEffect(() => {
    // Update title
    document.title = t("landing.metaTitle");

    // Update meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", t("landing.metaDescription"));

    // Update canonical
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", `https://garageview.ai/${currentLocale}`);

    // Update og tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", t("landing.metaTitle"));
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", t("landing.metaDescription"));
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute("content", `https://garageview.ai/${currentLocale}`);
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute("content", currentLocale === "en" ? "en_US" : `${currentLocale}_${currentLocale.toUpperCase()}`);

    // Add hreflang link tags
    const existingHreflangs = document.querySelectorAll('link[hreflang]');
    existingHreflangs.forEach((el) => el.remove());

    LOCALES.forEach(({ code }) => {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = code;
      link.href = `https://garageview.ai/${code}`;
      document.head.appendChild(link);
    });
    // x-default
    const xDefault = document.createElement("link");
    xDefault.rel = "alternate";
    xDefault.setAttribute("hreflang", "x-default");
    xDefault.href = "https://garageview.ai/en";
    document.head.appendChild(xDefault);

    return () => {
      document.querySelectorAll('link[hreflang]').forEach((el) => el.remove());
    };
  }, [currentLocale, t]);

  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden" }}>
      {/* Hero — dark */}
      <section style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", padding: "60px 24px 40px", textAlign: "center", position: "relative",
        backgroundColor: "#0b1120", color: "#e5e7eb",
      }}>
        <img src="/logo.png?v=2" alt="GarageView.ai" width="290" height="56" style={{ height: 56, maxWidth: "100%", objectFit: "contain", marginBottom: 60 }} />
        <h1 style={{
          maxWidth: 1050, fontSize: "clamp(28px, 7vw, 60px)", fontWeight: 800, lineHeight: 1.1,
          marginBottom: 20, letterSpacing: "-0.03em", color: "white",
        }}>
          {t("landing.hero")}
        </h1>
        <p style={{
          fontSize: "clamp(16px, 2vw, 20px)", lineHeight: 1.6, maxWidth: 800,
          marginBottom: 40, color: "#9ca3af",
        }}>
          {t("landing.subtitle")}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 28 }}>
          <span style={{ fontSize: 14, color: "#9ca3af" }}>{t("landing.supportedSources")}</span>
          {["mobile.de", "AutoScout24", "Otomoto"].map(source => (
            <span key={source} style={{ padding: "8px 16px", border: "1px solid #374151", borderRadius: 999, fontSize: 15, fontWeight: 600, color: "#e5e7eb" }}>{source}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <GoogleButton csrfToken={csrfToken} label={t("landing.getStarted")} />
          <a
            href="https://chromewebstore.google.com/detail/garageviewai-%E2%80%94-your-ai-ca/ibifmbahobechmjhbpjbnieeladcgece"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "14px 36px", fontSize: 16, fontWeight: 600,
              color: "white", backgroundColor: "transparent",
              border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, cursor: "pointer",
              textDecoration: "none",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"; e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <ChromeIcon />
            {t("landing.addToChrome")}
          </a>
          <a href="https://www.youtube.com/watch?v=-SxWbA7cpR4" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "14px 28px", border: "1px solid #60a5fa", borderRadius: 12, color: "#eff6ff", backgroundColor: "#172554", fontSize: 16, fontWeight: 600, textDecoration: "none" }}>
            {t("landing.watchVideo")}
          </a>
        </div>
        <p style={{ maxWidth: 680, margin: "20px 0 0", fontSize: 13, lineHeight: 1.6, color: "#9ca3af" }}>{t("landing.importNote")}</p>
        <HeroCarousel />
      </section>

      {/* Light feature sections */}
      <div style={{ backgroundColor: "#f8f9fb" }}>
        {SECTIONS.map((section, i) => {
          const reversed = i % 2 === 1;
          const isEven = i % 2 === 0;
          return (
            <section
              key={section.titleKey}
              style={{
                maxWidth: 1200, margin: "0 auto", padding: "clamp(48px, 8vw, 100px) 24px",
                display: "flex", flexDirection: reversed ? "row-reverse" : "row",
                alignItems: "center", gap: "clamp(24px, 5vw, 60px)", flexWrap: "wrap",
                borderBottom: i < SECTIONS.length - 1 ? "1px solid #e5e7eb" : "none",
              }}
            >
              {/* Text */}
              <div style={{
                flex: "1 1 340px", minWidth: 280,
                textAlign: "left",
              }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, letterSpacing: "0.12em",
                  color: "#2563eb", marginBottom: 12, textTransform: "uppercase",
                }}>
                  {t(section.labelKey)}
                </div>
                <h2 style={{
                  fontSize: "clamp(28px, 3vw, 40px)", fontWeight: 800, lineHeight: 1.1,
                  color: "#111827", marginBottom: 16, letterSpacing: "-0.02em",
                }}>
                  {t(section.titleKey)}
                </h2>
                <p style={{
                  fontSize: "clamp(15px, 1.5vw, 18px)", lineHeight: 1.7, color: "#4b5563",
                  marginBottom: 12,
                }}>
                  {t(section.descKey)}
                </p>
                <p style={{
                  fontSize: "clamp(14px, 1.3vw, 16px)", lineHeight: 1.7, color: "#6b7280",
                }}>
                  {t(section.desc2Key)}
                </p>
              </div>

              {/* Screenshot */}
              <div style={{
                flex: "1 1 500px", minWidth: 300,
                overflow: "hidden", borderRadius: 16,
                boxShadow: "0 12px 48px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)",
              }}>
                <img
                  src={section.image}
                  alt={t(section.titleKey)}
                  style={{
                    width: "100%",
                    display: "block",
                    borderRadius: 16,
                  }}
                />
              </div>
            </section>
          );
        })}
      </div>

      {/* Final CTA — dark */}
      <section style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "100px 24px", textAlign: "center",
        backgroundColor: "#0b1120",
      }}>
        <h2 style={{
          fontSize: "clamp(28px, 3.5vw, 48px)", fontWeight: 800, lineHeight: 1.1,
          color: "white", marginBottom: 16, letterSpacing: "-0.02em",
        }}>
          {t("landing.ctaTitle")}
        </h2>
        <p style={{ fontSize: 18, color: "#9ca3af", marginBottom: 40 }}>
          {t("landing.ctaSubtitle")}
        </p>
        <GoogleButton csrfToken={csrfToken} label={t("landing.getStarted")} />
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "32px 24px", textAlign: "center",
        backgroundColor: "#0b1120",
      }}>
        {/* Language switcher */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px 16px", marginBottom: 16 }}>
          {LOCALES.map(({ code, label }) => (
            <a
              key={code}
              href={`/${code}`}
              style={{
                fontSize: 12, textDecoration: "none",
                color: code === currentLocale ? "#3b82f6" : "#6b7280",
                fontWeight: code === currentLocale ? 600 : 400,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#3b82f6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = code === currentLocale ? "#3b82f6" : "#6b7280"; }}
            >
              {label}
            </a>
          ))}
        </div>
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          garageview.ai · {t("landing.footer")}
          {" · "}
          <a href={`/${currentLocale}/guides/`} style={{ color: "#9ca3af" }}>{t("landing.guides")}</a>
          {" · "}
          <a href={`/${currentLocale}/privacy`} style={{ color: "#6b7280", textDecoration: "none" }} onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }} onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}>Privacy</a>
          {" · "}
          <a href={`/${currentLocale}/terms`} style={{ color: "#6b7280", textDecoration: "none" }} onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }} onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}>Terms</a>
          {" · "}
          <a href="https://github.com/SergeyKorolev/garageview" target="_blank" rel="noopener noreferrer" style={{ color: "#6b7280", textDecoration: "none" }} onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }} onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}>GitHub</a>
          {" · "}
          <a href="mailto:support@garageview.ai" style={{ color: "#6b7280", textDecoration: "none" }} onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }} onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}>support@garageview.ai</a>
        </div>
      </footer>
    </div>
  );
}
