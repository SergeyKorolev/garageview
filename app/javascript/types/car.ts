export interface Car {
  id: number;
  external_id: string;
  source?: string;
  title: string;
  listing_url: string;
  price_cents: number;
  price_currency: string;
  mileage_km: number;
  first_registration: string | null;
  power_kw: number;
  fuel_type: string;
  transmission: string;
  co2_emissions: number | null;
  seller_name: string;
  seller_type: string;
  seller_address: string;
  seller_latitude: number | null;
  seller_longitude: number | null;
  photos: string[];
  features: string[];
  attributes?: Record<string, string | string[]>;
  price_rating?: {
    rating: string;
    priceRanges?: Array<{ min: number; max: number; label: string }>;
  };
  rating: number;
  ai_rating: number | null;
  ai_explanation: string | null;
  ai_analysis: Record<string, any> | null;
  ai_analyzed_at: string | null;
  last_scraped_at: string;
  created_at: string;
  status: "pending" | "scraping" | "ready" | "error";
  travel_time?: TravelTime;
}

export interface TravelTime {
  driving_seconds: number | null;
  flying_seconds: number | null;
  distance_km: number;
  route_cities?: string[];
  origin_airport?: string;
  dest_airport?: string;
  last_mile_info?: string;
  travel_description?: string;
}

export interface CarFilters {
  price_min?: number;
  price_max?: number;
  mileage_min?: number;
  mileage_max?: number;
  fuel_type?: string;
  transmission?: string;
}

export type CarSortField = "price" | "mileage" | "travel_time" | "feature_count" | "rating" | "ai_rating" | "created_at";
export type SortDirection = "asc" | "desc";

export interface CarSort {
  field: CarSortField;
  direction: SortDirection;
}
