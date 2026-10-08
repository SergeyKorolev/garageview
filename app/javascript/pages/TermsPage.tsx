import { Link, useLocation } from "react-router-dom";
import { useThemeStore } from "@/stores/themeStore";

export default function TermsPage() {
  const isDark = useThemeStore((s) => s.theme === "dark");
  const { pathname } = useLocation();
  const lang = pathname.split("/").filter(Boolean)[0] || "en";

  const bg = isDark ? "#0b1120" : "#ffffff";
  const text = isDark ? "#e5e7eb" : "#374151";
  const heading = isDark ? "#ffffff" : "#111827";
  const muted = isDark ? "#9ca3af" : "#6b7280";
  const border = isDark ? "#1f2937" : "#e5e7eb";

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

        <h1 style={{ fontSize: 28, fontWeight: 700, color: heading, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ fontSize: 13, color: muted, marginBottom: 32 }}>Last updated: March 2026</p>

        <div style={{ fontSize: 15, lineHeight: 1.8, color: text }}>
          <Section title="1. Acceptance of Terms" heading={heading} border={border}>
            <p>By accessing or using garageview.ai ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>
          </Section>

          <Section title="2. Description of Service" heading={heading} border={border}>
            <p>garageview.ai is a car search aggregation and comparison tool. The Service allows users to:</p>
            <ul style={{ paddingLeft: 24, marginTop: 8 }}>
              <li>Collect and organize car listings from online marketplaces</li>
              <li>Compare vehicles side by side</li>
              <li>Get AI-powered analysis and ratings of vehicles</li>
              <li>Conduct deep research on shortlisted cars</li>
              <li>Calculate travel distances to dealers</li>
            </ul>
          </Section>

          <Section title="3. Accounts" heading={heading} border={border}>
            <p>You must sign in with a Google account to use the Service. You are responsible for maintaining the security of your account. You may not share your account or use another person's account without permission.</p>
          </Section>

          <Section title="4. Acceptable Use" heading={heading} border={border}>
            <p>You agree not to:</p>
            <ul style={{ paddingLeft: 24, marginTop: 8 }}>
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to scrape, crawl, or extract data from the Service in bulk</li>
              <li>Interfere with or disrupt the Service's infrastructure</li>
              <li>Misrepresent your identity or affiliation</li>
              <li>Use the Service to harass, spam, or harm others</li>
            </ul>
          </Section>

          <Section title="5. Third-Party Content" heading={heading} border={border}>
            <p>The Service displays car listing data sourced from third-party marketplaces. We do not own, verify, or guarantee the accuracy of this data. Listings may be outdated, incorrect, or no longer available. Always verify details directly with the seller before making a purchase.</p>
          </Section>

          <Section title="6. AI Features" heading={heading} border={border}>
            <p>The Service provides AI-generated analysis, ratings, and recommendations. These are for informational purposes only and should not be treated as professional advice. AI outputs may contain errors or inaccuracies. You are solely responsible for your purchasing decisions.</p>
          </Section>

          <Section title="7. Intellectual Property" heading={heading} border={border}>
            <p>The Service, including its design, code, and branding, is the property of garageview.ai. You may not copy, modify, or distribute any part of the Service without permission. User-generated content (ratings, notes) remains yours, but you grant us a license to store and display it within the Service.</p>
          </Section>

          <Section title="8. Disclaimers" heading={heading} border={border}>
            <p>The Service is provided "as is" without warranties of any kind. We do not guarantee that the Service will be uninterrupted, error-free, or that any information provided is accurate or complete. We are not responsible for any losses arising from your use of the Service or reliance on its content.</p>
          </Section>

          <Section title="9. Limitation of Liability" heading={heading} border={border}>
            <p>To the maximum extent permitted by law, garageview.ai shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.</p>
          </Section>

          <Section title="10. Termination" heading={heading} border={border}>
            <p>We may suspend or terminate your access to the Service at any time, with or without cause. You may stop using the Service at any time.</p>
          </Section>

          <Section title="11. Changes to Terms" heading={heading} border={border}>
            <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
          </Section>

          <Section title="12. Contact" heading={heading} border={border}>
            <p>For questions about these Terms, please contact us through the app or at the email address provided in your account settings.</p>
          </Section>
        </div>

        <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${border}`, fontSize: 13, color: muted }}>
          <Link to={`/${lang}`} style={{ color: "#3b82f6", textDecoration: "none" }}>Back to garageview.ai</Link>
          {" · "}
          <Link to={`/${lang}/privacy`} style={{ color: "#3b82f6", textDecoration: "none" }}>Privacy Policy</Link>
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
