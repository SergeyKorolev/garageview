import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "@/stores/themeStore";

export default function PrivacyPage() {
  const { t } = useTranslation();
  const isDark = useThemeStore((s) => s.theme === "dark");
  const { pathname } = useLocation();
  const lang = pathname.split("/").filter(Boolean)[0] || "en";

  const bg = isDark ? "#0b1120" : "#ffffff";
  const text = isDark ? "#e5e7eb" : "#374151";
  const heading = isDark ? "#ffffff" : "#111827";
  const muted = isDark ? "#9ca3af" : "#6b7280";
  const border = isDark ? "#1f2937" : "#e5e7eb";
  const link = "#3b82f6";
  const tableBg = isDark ? "#111827" : "#f9fafb";
  const tableHeaderBg = isDark ? "#1f2937" : "#f3f4f6";
  const tableBorder = isDark ? "#374151" : "#e5e7eb";
  const codeBg = isDark ? "#1e293b" : "#f1f5f9";

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
    marginTop: 12,
    marginBottom: 12,
  };

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: `2px solid ${tableBorder}`,
    backgroundColor: tableHeaderBg,
    color: heading,
    fontWeight: 600,
    fontSize: 13,
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderBottom: `1px solid ${tableBorder}`,
    color: text,
    fontSize: 13,
    verticalAlign: "top",
  };

  const codeStyle: React.CSSProperties = {
    backgroundColor: codeBg,
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 12,
    fontFamily: "monospace",
  };

  const handleOpenCookieSettings = () => {
    window.CookieConsent?.showPreferences();
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: bg }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
        <Link to="/" style={{ display: "inline-block", marginBottom: 32 }}>
          <img
            src={isDark ? "/logo-dark.png?v=3" : "/logo.png?v=3"}
            alt="garageview.ai"
            style={{ height: 28 }}
          />
        </Link>

        <h1 style={{ fontSize: 28, fontWeight: 700, color: heading, marginBottom: 8 }}>
          {t("privacyPage.title", "Privacy Policy")}
        </h1>
        <p style={{ fontSize: 13, color: muted, marginBottom: 32 }}>
          {t("privacyPage.lastUpdated", "Last updated: April 2026")}
        </p>

        <div style={{ fontSize: 15, lineHeight: 1.8, color: text }}>
          {/* 1. Introduction / Data Controller */}
          <Section title={t("privacyPage.dataController.title", "1. Data Controller")} heading={heading} border={border}>
            <p>
              {t(
                "privacyPage.dataController.body",
                "garageview.ai (\"we\", \"our\", \"the Service\") is a car search aggregation tool operated from Germany. The data controller responsible for your personal data is:"
              )}
            </p>
            <p style={{ marginTop: 12 }}>
              <strong>garageview.ai</strong>
              <br />
              {t("privacyPage.dataController.email", "Email")}: <a href="mailto:support@garageview.ai" style={{ color: link, textDecoration: "none" }}>support@garageview.ai</a>
              <br />
              {t("privacyPage.dataController.website", "Website")}: <a href="https://garageview.ai" style={{ color: link, textDecoration: "none" }}>garageview.ai</a>
            </p>
          </Section>

          {/* 2. Information We Collect */}
          <Section title={t("privacyPage.informationCollected.title", "2. Information We Collect")} heading={heading} border={border}>
            <p>
              <strong>{t("privacyPage.informationCollected.accountData", "Account Information:")}</strong>{" "}
              {t(
                "privacyPage.informationCollected.accountDataDesc",
                "When you sign in with Google, we receive your name, email address, and profile picture from your Google account."
              )}
            </p>
            <p>
              <strong>{t("privacyPage.informationCollected.carData", "Car Data:")}</strong>{" "}
              {t(
                "privacyPage.informationCollected.carDataDesc",
                "Car listings you save, including titles, prices, mileage, photos, seller details, and AI-generated ratings and analyses."
              )}
            </p>
            <p>
              <strong>{t("privacyPage.informationCollected.usageData", "Usage Data:")}</strong>{" "}
              {t(
                "privacyPage.informationCollected.usageDataDesc",
                "With your consent, we collect analytics data including page views, sessions, device information, and feature usage through Google Analytics and PostHog."
              )}
            </p>
            <p>
              <strong>{t("privacyPage.informationCollected.preferences", "User Preferences:")}</strong>{" "}
              {t(
                "privacyPage.informationCollected.preferencesDesc",
                "Language, currency, location, and theme settings you configure within the app."
              )}
            </p>
            <p>
              <strong>{t("privacyPage.informationCollected.technical", "Technical Data:")}</strong>{" "}
              {t(
                "privacyPage.informationCollected.technicalDesc",
                "Browser type, device information, and IP address collected automatically through server logs."
              )}
            </p>
          </Section>

          {/* 3. How We Use Your Information */}
          <Section title={t("privacyPage.howWeUse.title", "3. How We Use Your Information")} heading={heading} border={border}>
            <p>{t("privacyPage.howWeUse.intro", "We use your information to:")}</p>
            <ul style={{ paddingLeft: 24, marginTop: 8 }}>
              <li>{t("privacyPage.howWeUse.item1", "Provide and maintain the Service")}</li>
              <li>{t("privacyPage.howWeUse.item2", "Authenticate your identity via Google OAuth")}</li>
              <li>{t("privacyPage.howWeUse.item3", "Save your car searches, comparisons, and preferences")}</li>
              <li>{t("privacyPage.howWeUse.item4", "Power AI-assisted features (car ratings, deep research, chat)")}</li>
              <li>{t("privacyPage.howWeUse.item5", "Measure site usage and improve the Service (with your consent)")}</li>
              <li>{t("privacyPage.howWeUse.item6", "Send transactional emails (e.g., collection invitations)")}</li>
            </ul>
          </Section>

          {/* 4. Legal Basis for Processing */}
          <Section title={t("privacyPage.legalBasis.title", "4. Legal Basis for Processing")} heading={heading} border={border}>
            <p>
              {t(
                "privacyPage.legalBasis.intro",
                "Under the General Data Protection Regulation (GDPR), we process your personal data based on the following legal grounds:"
              )}
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>{t("privacyPage.legalBasis.purpose", "Purpose")}</th>
                    <th style={thStyle}>{t("privacyPage.legalBasis.basis", "Legal Basis")}</th>
                    <th style={thStyle}>{t("privacyPage.legalBasis.article", "GDPR Article")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ backgroundColor: tableBg }}>
                    <td style={tdStyle}>{t("privacyPage.legalBasis.row1Purpose", "Account creation and authentication")}</td>
                    <td style={tdStyle}>{t("privacyPage.legalBasis.row1Basis", "Performance of a contract")}</td>
                    <td style={tdStyle}>Art. 6(1)(b)</td>
                  </tr>
                  <tr>
                    <td style={tdStyle}>{t("privacyPage.legalBasis.row2Purpose", "Saving cars, collections, and preferences")}</td>
                    <td style={tdStyle}>{t("privacyPage.legalBasis.row2Basis", "Performance of a contract")}</td>
                    <td style={tdStyle}>Art. 6(1)(b)</td>
                  </tr>
                  <tr style={{ backgroundColor: tableBg }}>
                    <td style={tdStyle}>{t("privacyPage.legalBasis.row3Purpose", "AI ratings, deep research, and chat")}</td>
                    <td style={tdStyle}>{t("privacyPage.legalBasis.row3Basis", "Performance of a contract")}</td>
                    <td style={tdStyle}>Art. 6(1)(b)</td>
                  </tr>
                  <tr>
                    <td style={tdStyle}>{t("privacyPage.legalBasis.row4Purpose", "Analytics (Google Analytics, PostHog)")}</td>
                    <td style={tdStyle}>{t("privacyPage.legalBasis.row4Basis", "Consent")}</td>
                    <td style={tdStyle}>Art. 6(1)(a)</td>
                  </tr>
                  <tr style={{ backgroundColor: tableBg }}>
                    <td style={tdStyle}>{t("privacyPage.legalBasis.row5Purpose", "Service improvement and bug fixing")}</td>
                    <td style={tdStyle}>{t("privacyPage.legalBasis.row5Basis", "Legitimate interest")}</td>
                    <td style={tdStyle}>Art. 6(1)(f)</td>
                  </tr>
                  <tr>
                    <td style={tdStyle}>{t("privacyPage.legalBasis.row6Purpose", "Transactional emails")}</td>
                    <td style={tdStyle}>{t("privacyPage.legalBasis.row6Basis", "Legitimate interest")}</td>
                    <td style={tdStyle}>Art. 6(1)(f)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* 5. Cookies and Tracking Technologies */}
          <Section title={t("privacyPage.cookies.title", "5. Cookies and Tracking Technologies")} heading={heading} border={border}>
            <p>
              {t(
                "privacyPage.cookies.intro",
                "We use cookies to operate the Service and, with your consent, to measure site usage. The following table lists all cookies used:"
              )}
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>{t("privacyPage.cookies.name", "Cookie Name")}</th>
                    <th style={thStyle}>{t("privacyPage.cookies.category", "Category")}</th>
                    <th style={thStyle}>{t("privacyPage.cookies.duration", "Duration")}</th>
                    <th style={thStyle}>{t("privacyPage.cookies.purpose", "Purpose")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ backgroundColor: tableBg }}>
                    <td style={tdStyle}><code style={codeStyle}>_garageview_session</code></td>
                    <td style={tdStyle}>{t("privacyPage.cookies.essential", "Essential")}</td>
                    <td style={tdStyle}>{t("privacyPage.cookies.session", "Session")}</td>
                    <td style={tdStyle}>{t("privacyPage.cookies.sessionPurpose", "Authentication")}</td>
                  </tr>
                  <tr>
                    <td style={tdStyle}><code style={codeStyle}>cc_cookie</code></td>
                    <td style={tdStyle}>{t("privacyPage.cookies.essential", "Essential")}</td>
                    <td style={tdStyle}>{t("privacyPage.cookies.sixMonths", "6 months")}</td>
                    <td style={tdStyle}>{t("privacyPage.cookies.consentPurpose", "Cookie consent preferences")}</td>
                  </tr>
                  <tr style={{ backgroundColor: tableBg }}>
                    <td style={tdStyle}><code style={codeStyle}>_ga</code></td>
                    <td style={tdStyle}>{t("privacyPage.cookies.analytics", "Analytics")}</td>
                    <td style={tdStyle}>{t("privacyPage.cookies.twoYears", "2 years")}</td>
                    <td style={tdStyle}>Google Analytics</td>
                  </tr>
                  <tr>
                    <td style={tdStyle}><code style={codeStyle}>_ga_ZLRFVLLGG4</code></td>
                    <td style={tdStyle}>{t("privacyPage.cookies.analytics", "Analytics")}</td>
                    <td style={tdStyle}>{t("privacyPage.cookies.twoYears", "2 years")}</td>
                    <td style={tdStyle}>Google Analytics</td>
                  </tr>
                  <tr style={{ backgroundColor: tableBg }}>
                    <td style={tdStyle}><code style={codeStyle}>ph_*</code></td>
                    <td style={tdStyle}>{t("privacyPage.cookies.analytics", "Analytics")}</td>
                    <td style={tdStyle}>{t("privacyPage.cookies.oneYear", "1 year")}</td>
                    <td style={tdStyle}>PostHog</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: 12 }}>
              {t("privacyPage.cookies.localStorage", "We also use browser localStorage for theme, language, and currency preferences. These are never transmitted to our servers.")}
            </p>
            <p style={{ marginTop: 8 }}>
              {t("privacyPage.cookies.manageIntro", "You can manage your cookie preferences at any time.")}{" "}
              <button
                onClick={handleOpenCookieSettings}
                style={{
                  color: link,
                  textDecoration: "underline",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  font: "inherit",
                  padding: 0,
                }}
              >
                {t("privacyPage.cookies.manageLink", "Manage your cookie preferences")}
              </button>
            </p>
          </Section>

          {/* 6. Chrome Extension */}
          <Section title={t("privacyPage.chromeExtension.title", "6. Chrome Extension")} heading={heading} border={border}>
            <p>
              {t(
                "privacyPage.chromeExtension.intro",
                "The Garageview Chrome extension enhances your experience on mobile.de by adding \"Save to Garageview\" buttons directly on car listings. The extension:"
              )}
            </p>
            <ul style={{ paddingLeft: 24, marginTop: 8 }}>
              <li>
                <strong>{t("privacyPage.chromeExtension.reads", "Reads car listing data")}</strong>{" "}
                {t("privacyPage.chromeExtension.readsDesc", "(title, price, mileage, images) from mobile.de pages you visit to display save controls and send data to your Garageview account.")}
              </li>
              <li>
                <strong>{t("privacyPage.chromeExtension.cookies", "Uses cookies")}</strong>{" "}
                {t("privacyPage.chromeExtension.cookiesDesc", "from garageview.ai to authenticate your session so you stay logged in while browsing mobile.de.")}
              </li>
              <li>
                <strong>{t("privacyPage.chromeExtension.stores", "Stores locally")}</strong>{" "}
                {t("privacyPage.chromeExtension.storesDesc", "your API endpoint preference and last-used collection ID using Chrome's storage API. This data stays on your device.")}
              </li>
              <li>
                <strong>{t("privacyPage.chromeExtension.doesNot", "Does not")}</strong>{" "}
                {t("privacyPage.chromeExtension.doesNotDesc", "track your browsing history, collect data on pages other than mobile.de, or send any data to third parties.")}
              </li>
            </ul>
          </Section>

          {/* 7. Third-Party Services / Sub-Processors */}
          <Section title={t("privacyPage.subProcessors.title", "7. Third-Party Services and Sub-Processors")} heading={heading} border={border}>
            <p>
              {t(
                "privacyPage.subProcessors.intro",
                "We use the following third-party services to operate the Service. Each processes data only for the stated purpose:"
              )}
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>{t("privacyPage.subProcessors.service", "Service")}</th>
                    <th style={thStyle}>{t("privacyPage.subProcessors.purpose", "Purpose")}</th>
                    <th style={thStyle}>{t("privacyPage.subProcessors.dataProcessed", "Data Processed")}</th>
                    <th style={thStyle}>{t("privacyPage.subProcessors.location", "Hosting Location")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { service: "Google OAuth", purpose: "Authentication", data: "Email, name, avatar", location: "US" },
                    { service: "OpenAI", purpose: "AI ratings, deep research, chat", data: "Car data, user location, chat messages", location: "US" },
                    { service: "Mailtrap", purpose: "Transactional email", data: "Email addresses, names, tokens", location: "US" },
                    { service: "Apify", purpose: "Listing scraping", data: "mobile.de listing URLs", location: "US/EU" },
                    { service: "Google Analytics", purpose: "Web analytics", data: "Page views, sessions, device info", location: "US" },
                    { service: "PostHog", purpose: "Product analytics", data: "User ID, email, feature usage events", location: "EU (Frankfurt)" },
                    { service: "Hetzner", purpose: "Application hosting", data: "All application data", location: "EU (Germany)" },
                    { service: "Cloudflare", purpose: "CDN, DNS, DDoS protection", data: "All HTTP traffic", location: "US (global edge)" },
                    { service: "Nominatim/OSM", purpose: "Geocoding", data: "Geographic coordinates", location: "Public (no account)" },
                    { service: "Project-OSRM", purpose: "Route calculation", data: "Geographic coordinates", location: "Public (no account)" },
                    { service: "Carto", purpose: "Map tile rendering", data: "Map viewport coordinates", location: "US" },
                    { service: "Docker Hub", purpose: "Container image registry", data: "Container images (no user data)", location: "US" },
                  ].map((row, i) => (
                    <tr key={row.service} style={i % 2 === 0 ? { backgroundColor: tableBg } : undefined}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{row.service}</td>
                      <td style={tdStyle}>{row.purpose}</td>
                      <td style={tdStyle}>{row.data}</td>
                      <td style={tdStyle}>{row.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* 8. Data Retention */}
          <Section title={t("privacyPage.dataRetention.title", "8. Data Retention")} heading={heading} border={border}>
            <p>
              {t(
                "privacyPage.dataRetention.intro",
                "We retain your data for different periods depending on the type:"
              )}
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>{t("privacyPage.dataRetention.dataCategory", "Data Category")}</th>
                    <th style={thStyle}>{t("privacyPage.dataRetention.retentionPeriod", "Retention Period")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { category: "Account data (name, email, avatar)", period: "Until account deletion" },
                    { category: "Collections and saved cars", period: "Until account deletion" },
                    { category: "AI ratings and deep research", period: "Until account deletion" },
                    { category: "Search filters", period: "Until account deletion" },
                    { category: "Chat messages", period: "Until account deletion" },
                    { category: "Server logs (IP, user agent)", period: "90 days" },
                    { category: "Analytics data (GA, PostHog)", period: "Per provider defaults (GA: 14 months, PostHog: configurable)" },
                  ].map((row, i) => (
                    <tr key={i} style={i % 2 === 0 ? { backgroundColor: tableBg } : undefined}>
                      <td style={tdStyle}>{t(`privacyPage.dataRetention.row${i + 1}Category`, row.category)}</td>
                      <td style={tdStyle}>{t(`privacyPage.dataRetention.row${i + 1}Period`, row.period)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* 9. International Data Transfers */}
          <Section title={t("privacyPage.internationalTransfers.title", "9. International Data Transfers")} heading={heading} border={border}>
            <p>
              {t(
                "privacyPage.internationalTransfers.body1",
                "Some of our sub-processors are based in the United States or operate globally. When your data is transferred outside the European Economic Area (EEA), we ensure appropriate safeguards are in place, including EU Standard Contractual Clauses (SCCs) where applicable."
              )}
            </p>
            <p style={{ marginTop: 8 }}>
              {t(
                "privacyPage.internationalTransfers.body2",
                "Our primary application hosting is on Hetzner servers located in Germany. PostHog analytics data is processed on EU servers in Frankfurt."
              )}
            </p>
          </Section>

          {/* 10. Your Rights Under GDPR */}
          <Section title={t("privacyPage.yourRights.title", "10. Your Rights Under GDPR")} heading={heading} border={border}>
            <p>
              {t(
                "privacyPage.yourRights.intro",
                "As a data subject under the GDPR, you have the following rights:"
              )}
            </p>
            <ul style={{ paddingLeft: 24, marginTop: 8 }}>
              <li>
                <strong>{t("privacyPage.yourRights.access", "Right of Access")} (Art. 15)</strong> &mdash;{" "}
                {t("privacyPage.yourRights.accessDesc", "Request a copy of your personal data.")}
              </li>
              <li>
                <strong>{t("privacyPage.yourRights.rectification", "Right to Rectification")} (Art. 16)</strong> &mdash;{" "}
                {t("privacyPage.yourRights.rectificationDesc", "Request correction of inaccurate data.")}
              </li>
              <li>
                <strong>{t("privacyPage.yourRights.erasure", "Right to Erasure")} (Art. 17)</strong> &mdash;{" "}
                {t("privacyPage.yourRights.erasureDesc", "Request deletion of your data (\"right to be forgotten\"). Available via the \"Delete my account\" feature in Account settings.")}
              </li>
              <li>
                <strong>{t("privacyPage.yourRights.restriction", "Right to Restriction of Processing")} (Art. 18)</strong> &mdash;{" "}
                {t("privacyPage.yourRights.restrictionDesc", "Request that we limit how we use your data.")}
              </li>
              <li>
                <strong>{t("privacyPage.yourRights.portability", "Right to Data Portability")} (Art. 20)</strong> &mdash;{" "}
                {t("privacyPage.yourRights.portabilityDesc", "Download your data in a machine-readable format. Available via the \"Download my data\" feature in Account settings.")}
              </li>
              <li>
                <strong>{t("privacyPage.yourRights.object", "Right to Object")} (Art. 21)</strong> &mdash;{" "}
                {t("privacyPage.yourRights.objectDesc", "Object to processing based on legitimate interest.")}
              </li>
              <li>
                <strong>{t("privacyPage.yourRights.withdrawConsent", "Right to Withdraw Consent")} (Art. 7(3))</strong> &mdash;{" "}
                {t("privacyPage.yourRights.withdrawConsentDesc", "Withdraw consent for analytics cookies at any time via Cookie Settings. This does not affect the lawfulness of processing before withdrawal.")}
              </li>
              <li>
                <strong>{t("privacyPage.yourRights.complaint", "Right to Lodge a Complaint")}</strong> &mdash;{" "}
                {t("privacyPage.yourRights.complaintDesc", "Contact a supervisory authority. For Germany: Die Bundesbeauftragte für den Datenschutz und die Informationsfreiheit (BfDI).")}
              </li>
            </ul>
            <p style={{ marginTop: 12 }}>
              {t(
                "privacyPage.yourRights.contact",
                "To exercise any of these rights, email us at"
              )}{" "}
              <a href="mailto:support@garageview.ai" style={{ color: link, textDecoration: "none" }}>support@garageview.ai</a>
              {t("privacyPage.yourRights.contactSuffix", " or use the relevant in-app feature.")}
            </p>
          </Section>

          {/* 11. Data Security */}
          <Section title={t("privacyPage.dataSecurity.title", "11. Data Security")} heading={heading} border={border}>
            <p>
              {t(
                "privacyPage.dataSecurity.body",
                "Your data is stored on secured servers hosted by Hetzner in Germany. We use encryption in transit (HTTPS/TLS) and follow industry-standard security practices. We do not sell your personal information to third parties."
              )}
            </p>
          </Section>

          {/* 12. Children's Privacy */}
          <Section title={t("privacyPage.childrensPrivacy.title", "12. Children's Privacy")} heading={heading} border={border}>
            <p>
              {t(
                "privacyPage.childrensPrivacy.body",
                "The Service is not directed at children under the age of 16. We do not knowingly collect personal data from children. If you believe that a child has provided us with personal data, please contact us so we can delete it."
              )}
            </p>
          </Section>

          {/* 13. Changes to This Policy */}
          <Section title={t("privacyPage.changes.title", "13. Changes to This Policy")} heading={heading} border={border}>
            <p>
              {t(
                "privacyPage.changes.body",
                "We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date. We encourage you to review this page periodically."
              )}
            </p>
          </Section>

          {/* 14. Contact Us */}
          <Section title={t("privacyPage.contact.title", "14. Contact Us")} heading={heading} border={border}>
            <p>
              {t("privacyPage.contact.body", "For questions about this Privacy Policy or to exercise your data protection rights, please contact us at")}{" "}
              <a href="mailto:support@garageview.ai" style={{ color: link, textDecoration: "none" }}>support@garageview.ai</a>.
            </p>
          </Section>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${border}`, fontSize: 13, color: muted }}>
          <Link to={`/${lang}`} style={{ color: link, textDecoration: "none" }}>
            {t("privacyPage.footerHome", "Back to garageview.ai")}
          </Link>
          {" · "}
          <button
            onClick={handleOpenCookieSettings}
            style={{
              color: link,
              textDecoration: "none",
              background: "none",
              border: "none",
              cursor: "pointer",
              font: "inherit",
              fontSize: 13,
              padding: 0,
            }}
          >
            {t("privacy.cookieSettings")}
          </button>
          {" · "}
          <Link to={`/${lang}/terms`} style={{ color: link, textDecoration: "none" }}>
            {t("privacyPage.footerTerms", "Terms of Service")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, heading, border, children }: { title: string; heading: string; border: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: heading, marginBottom: 10 }}>{title}</h2>
      {children}
    </div>
  );
}
