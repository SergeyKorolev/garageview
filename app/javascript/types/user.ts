import type { Currency } from "@/constants/currencies";

export interface User {
  id: number;
  email: string;
  name: string;
  avatar_url: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  theme: "light" | "dark";
  currency: Currency;
  language: string;
  onboarded: boolean;
}

export interface UpdateUserPayload {
  latitude?: number;
  longitude?: number;
  location_name?: string;
  theme?: "light" | "dark";
  currency?: Currency;
  language?: string;
  onboarded?: boolean;
}
