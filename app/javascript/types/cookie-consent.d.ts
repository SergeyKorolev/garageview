interface CookieConsentAPI {
  acceptedCategory(category: string): boolean;
  showPreferences(): void;
  show(): void;
  hide(): void;
}

declare global {
  interface Window {
    CookieConsent?: CookieConsentAPI;
  }
}

export {};
