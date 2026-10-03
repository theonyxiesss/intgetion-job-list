import { createClient } from "@supabase/supabase-js";
import { HttpError } from "@/lib/http";
import type { LogoStorage } from "./logo-service";

export class SupabaseLogoStorage implements LogoStorage {
  async upload(path: string, bytes: Buffer, contentType: "image/webp") {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!key || !url)
      throw new HttpError(
        503,
        "STORAGE_UNAVAILABLE",
        "Company logo storage is not configured",
      );
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.storage
      .from("company-logos")
      .upload(path, bytes, { contentType, upsert: false });
    if (error)
      throw new HttpError(
        502,
        "STORAGE_ERROR",
        "Could not upload company logo",
      );
    return data.path;
  }
}
