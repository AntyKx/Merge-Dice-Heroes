import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * One row per Firebase-authenticated player. `uid` always comes from a
 * verified Firebase ID token (see lib/firebaseAuth.ts) -- it is never
 * accepted as a client-supplied request parameter, unlike the old
 * DiceHeroSpriteIntegratedGame_v2 reference (`/save/[uid]` trusted whatever
 * uid was in the URL).
 */
export const players = sqliteTable("players", {
  uid: text("uid").primaryKey(),
  email: text("email"),
  playerName: text("player_name").notNull().default("王都新秀"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

/**
 * Cloud copy of client/src/game/types.ts's PlayerProgress, stored as a single
 * JSON blob (mirrors how it already lives in localStorage) -- one row per
 * player. Run-in-progress state (client/src/game/run-engine RunState) is
 * intentionally NOT synced: Tiers/board state only exist within a single Run
 * by design (玩法核心.txt), so there is nothing meaningful to resume across
 * devices there.
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
