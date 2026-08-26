import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * One row per Firebase-authenticated player. `uid` always comes from a
 * verified Firebase ID token (see lib/firebaseAuth.ts) -- it is never
 * accepted as a client-supplied request parameter, unlike the old
 * DiceHeroSpriteIntegratedGame_v2 reference (`/save/[uid]` trusted whatever
 * uid was in the URL).
 */
/**
 * "Promoted" fields: the subset of client/src/game/types.ts's PlayerProgress
 * that gets its own column instead of living only inside saves.progressJson
 * -- specifically the fields something server-side needs to query, sort, or
 * atomically increment (leaderboards, admin currency grants). Everything
 * else in PlayerProgress stays as opaque JSON in `saves`; promoting it too
 * would just be schema churn for no query benefit. `players` is the sole
 * source of truth for these once written -- src/index.ts strips them out of
 * the JSON blob on write and merges them back in on read, so the client
 * never needs to know about the split (it always sends/receives the full
 * PlayerProgress shape).
 */
export const PROMOTED_PROGRESS_FIELDS = ["wins", "losses", "bestWave", "crystals", "sigils", "materials", "stamina"] as const;
export type PromotedProgressField = (typeof PROMOTED_PROGRESS_FIELDS)[number];

export const players = sqliteTable("players", {
  uid: text("uid").primaryKey(),
  email: text("email"),
  playerName: text("player_name").notNull().default("王都新秀"),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  bestWave: integer("best_wave").notNull().default(0),
  crystals: integer("crystals").notNull().default(0),
  sigils: integer("sigils").notNull().default(0),
  materials: integer("materials").notNull().default(0),
  stamina: integer("stamina").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

/**
 * Cloud copy of the REST of client/src/game/types.ts's PlayerProgress (i.e.
 * everything except PROMOTED_PROGRESS_FIELDS and playerName, which live on
 * `players` instead) -- one row per player. Run-in-progress state (client/
 * src/game/run-engine RunState) is intentionally NOT synced: Tiers/board
 * state only exist within a single Run by design (玩法核心.txt), so there is
 * nothing meaningful to resume across devices there.
 */
export const saves = sqliteTable("saves", {
  uid: text("uid").primaryKey().references(() => players.uid),
  progressJson: text("progress_json").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

/** Every admin-panel write is logged here -- the old reference project's
 * admin/*.js scripts had no audit trail at all for currency/item grants. */
export const adminAuditLog = sqliteTable("admin_audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adminUid: text("admin_uid").notNull(),
  action: text("action").notNull(),
  targetUid: text("target_uid"),
  detail: text("detail"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
