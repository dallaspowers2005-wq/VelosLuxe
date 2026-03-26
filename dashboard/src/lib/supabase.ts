import { createClient } from "@supabase/supabase-js";

// VelosLuxe Supabase — clients, onboarding, config
export function getVelosSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Spaceship CRM Supabase — leads, sales, pitch_pages, campaigns
export function getCrmSupabase() {
  return createClient(
    process.env.CRM_SUPABASE_URL!,
    process.env.CRM_SUPABASE_SERVICE_KEY!
  );
}

// Backwards compat
export const getSupabase = getVelosSupabase;

export interface PitchPageData {
  id: string;
  lead_id: string;
  slug: string;
  enrichment_data: {
    owner_name?: string;
    services?: string[];
    social_links?: { instagram?: string; facebook?: string };
    contact_email?: string;
    estimated_lost_revenue?: number;
    response_time_estimate?: string;
    top_services?: string[];
    review_count?: number;
    rating?: number;
    brand_colors?: { primary: string; secondary: string; background: string };
    logo_url?: string;
    hero_image_url?: string;
    tagline?: string;
  };
  page_views: number;
  lead?: {
    business_name: string;
    phone: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    google_rating: number | null;
    google_reviews: number | null;
  };
}
