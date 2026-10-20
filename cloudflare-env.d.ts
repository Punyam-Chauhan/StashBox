declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    STORAGE_PROVIDER?: string;
    SUPABASE_URL?: string;
    SUPABASE_BUCKET?: string;
    SUPABASE_SECRET_KEY?: string;
  }
}
