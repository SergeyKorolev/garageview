import { Link, useLocation } from "react-router-dom";
import { useThemeStore } from "@/stores/themeStore";
import { SUPPORTED_LANGUAGES } from "@/constants/languages";

const CHROME_WEB_STORE_URL = "https://chromewebstore.google.com/detail/garageviewai-%E2%80%94-your-ai-ca/ibifmbahobechmjhbpjbnieeladcgece";

const LOCALES = SUPPORTED_LANGUAGES.map((l) => ({ code: l.code, label: l.nativeName }));

export default function ExtensionPage() {
  const isDark = useThemeStore((s) => s.theme === "dark");
  const { pathname } = useLocation();
  const lang = pathname.split("/").filter(Boolean)[0] || "en";

  const bg = isDark ? "#0b1120" : "#ffffff";
  const text = isDark ? "#e5e7eb" : "#374151";
  const heading = isDark ? "#ffffff" : "#111827";
  const muted = isDark ? "#9ca3af" : "#6b7280";
  const border = isDark ? "#1f2937" : "#e5e7eb";
  const cardBg = isDark ? "#1a2332" : "#f9fafb";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: bg, display: "flex", flexDirection: "column" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", flex: 1 }}>
        <Link to={`/${lang}`} style={{ display: "inline-block", marginBottom: 32 }}>
          <img
            src={isDark ? "/logo-dark.png?v=3" : "/logo.png?v=3"}
            alt="garageview.ai"
            style={{ height: 28 }}
          />
        </Link>

        <h1 style={{ fontSize: 28, fontWeight: 700, color: heading, marginBottom: 8 }}>Chrome Extension</h1>
        <p style={{ fontSize: 15, color: muted, marginBottom: 32, lineHeight: 1.6 }}>
          Save cars directly from mobile.de to your Garageview workspace with one click.
        </p>

        {/* Add to Chrome button */}
        <a
          href={CHROME_WEB_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "14px 32px", fontSize: 16, fontWeight: 600,
            color: "white", backgroundColor: "#3b82f6",
            border: "none", borderRadius: 10, cursor: "pointer",
            textDecoration: "none", marginBottom: 40,
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#2563eb"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#3b82f6"; }}
        >
          <ChromeIcon />
          Add to Chrome
        </a>

        <div style={{ fontSize: 15, lineHeight: 1.8, color: text }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: heading, marginBottom: 16 }}>How It Works</h2>

          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <div style={{
              flexShrink: 0, width: 32, height: 32, borderRadius: "50%",
              backgroundColor: "#3b82f6", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, marginTop: 2,
            }}>1</div>
            <div style={{ flex: 1, paddingTop: 4 }}>
              Click <strong>"Add to Chrome"</strong> above and confirm the installation.
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <div style={{
              flexShrink: 0, width: 32, height: 32, borderRadius: "50%",
              backgroundColor: "#3b82f6", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, marginTop: 2,
            }}>2</div>
            <div style={{ flex: 1, paddingTop: 4 }}>
              Visit any car listing on <strong>mobile.de</strong> — you'll see "Save to Garageview" buttons on each listing.
            </div>
          </div>

          <div style={{ marginTop: 32, padding: 20, backgroundColor: cardBg, borderRadius: 10, border: `1px solid ${border}` }}>
            <p style={{ fontSize: 14, color: muted, margin: 0 }}>
              Available on the <a href={CHROME_WEB_STORE_URL} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "none" }}>Chrome Web Store</a>. For questions, contact <a href="mailto:support@garageview.ai" style={{ color: "#3b82f6", textDecoration: "none" }}>support@garageview.ai</a>.
            </p>
          </div>
        </div>

      </div>

      {/* Footer — matches landing page */}
      <footer style={{
        borderTop: `1px solid ${border}`,
        padding: "32px 24px", textAlign: "center",
        backgroundColor: bg,
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px 16px", marginBottom: 16 }}>
          {LOCALES.map(({ code, label }) => (
            <a
              key={code}
              href={`/${code}/extension`}
              style={{
                fontSize: 12, textDecoration: "none",
                color: code === lang ? "#3b82f6" : "#6b7280",
                fontWeight: code === lang ? 600 : 400,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#3b82f6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = code === lang ? "#3b82f6" : "#6b7280"; }}
            >
              {label}
            </a>
          ))}
        </div>
        <div style={{ fontSize: 13, color: muted }}>
          <a href={`/${lang}`} style={{ color: muted, textDecoration: "none" }} onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }} onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}>garageview.ai</a>
          {" · "}
          <a href={`/${lang}/privacy`} style={{ color: muted, textDecoration: "none" }} onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }} onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}>Privacy</a>
          {" · "}
          <a href={`/${lang}/terms`} style={{ color: muted, textDecoration: "none" }} onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }} onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}>Terms</a>
          {" · "}
          <a href="mailto:support@garageview.ai" style={{ color: muted, textDecoration: "none" }} onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }} onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}>support@garageview.ai</a>
        </div>
      </footer>
    </div>
  );
}

function ChromeIcon() {
  return (
    <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="0" />
      <path d="M12 2a10 10 0 00-8.66 5h5.66l3-5.2A10 10 0 0012 2z" fill="#EA4335" />
      <path d="M3.34 7A10 10 0 002 12a10 10 0 005 8.66l2.83-4.9L6.34 7H3.34z" fill="#FBBC05" />
      <path d="M7 20.66A10 10 0 0012 22a10 10 0 008.66-5H15l-3 5.2a10 10 0 01-5-1.54z" fill="#34A853" />
      <path d="M20.66 17A10 10 0 0022 12a10 10 0 00-5-8.66l-2.83 4.9L17.66 17h3z" fill="#4285F4" />
      <circle cx="12" cy="12" r="4" fill="white" />
      <circle cx="12" cy="12" r="3.2" fill="#4285F4" />
    </svg>
  );
}
