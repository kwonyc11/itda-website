declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ITDA_OWNER_EMAIL?: string;
  }
}
