export interface Env {
  DB: D1Database;
  /** Set via `wrangler secret put FIREBASE_PROJECT_ID` -- the Firebase project id (not the API key). */
  FIREBASE_PROJECT_ID: string;
  /** Set via `wrangler secret put ADMIN_UIDS` -- comma-separated Firebase uids allowed into /api/admin/*.
   * Single source of truth for admin access (no `role` column in the DB to keep in sync). */
  ADMIN_UIDS?: string;
}
