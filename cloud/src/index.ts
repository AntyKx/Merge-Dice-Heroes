import { desc, eq, like, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { PROMOTED_PROGRESS_FIELDS, adminAuditLog, players, saves } from "./db/schema";
import type { PromotedProgressField } from "./db/schema";
import type { Env } from "./env";
import { getDb } from "./lib/db";
import { FirebaseAuthError, requireFirebaseUser } from "./lib/firebaseAuth";

/** Pulls the 7 promoted numeric fields off a client-shaped PlayerProgress
 * object, defaulting any missing/non-numeric value to 0, and returns the
 * remainder untouched (the rest-object that goes into saves.progressJson). */
function splitProgress(progress: Record<string, unknown>): {
  promoted: Record<PromotedProgressField, number>;
  rest: Record<string, unknown>;
} {
  const promoted = {} as Record<PromotedProgressField, number>;
  const rest = { ...progress };
  for (const field of PROMOTED_PROGRESS_FIELDS) {
    const value = progress[field];
    promoted[field] = typeof value === "number" && Number.isFinite(value) ? value : 0;
    delete rest[field];
  }
  return { promoted, rest };
}

type Bindings = { Bindings: Env; Variables: { uid: string; email?: string } };
const app = new Hono<Bindings>();

// CORS origins aren't secret, so they're just listed here rather than in an env
// var. Includes both the game client (Vercel) and the admin panel
// (Cloudflare Pages, cloud/admin/) -- the admin panel's own auth check
// (requireAdmin) is what actually gates access, this just controls which
// origins may call the API from a browser at all.
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:5174",
  "https://merge-dice-heroes.vercel.app",
  "https://merge-dice-heroes-admin.pages.dev",
  "https://master.merge-dice-heroes-admin.pages.dev",
];

app.use(
  "*",
  cors({
    origin: (origin) => (ALLOWED_ORIGINS.includes(origin) ? origin : undefined),
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "PUT", "POST", "OPTIONS"],
  }),
);

/** Every route below this point requires a verified Firebase ID token. The
 * uid used everywhere downstream comes from the verified token's `sub`
 * claim -- never from a client-supplied URL/body field. */
app.use("/api/*", async (c, next) => {
  try {
    const user = await requireFirebaseUser(c.req.raw, c.env.FIREBASE_PROJECT_ID);
    c.set("uid", user.uid);
    c.set("email", user.email);
    await next();
  } catch (error) {
    if (error instanceof FirebaseAuthError) return c.json({ error: error.message }, 401);
    throw error;
  }
});

/** Firebase uids in the ADMIN_UIDS secret only -- see src/env.ts. */
const requireAdmin: MiddlewareHandler<Bindings> = async (c, next) => {
  const adminUids = (c.env.ADMIN_UIDS ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
  if (!adminUids.includes(c.get("uid"))) return c.json({ error: "Forbidden" }, 403);
  await next();
};

// ---------------------------------------------------------------------------
// Player-facing: cloud save/load, scoped to the caller's own verified uid.
// ---------------------------------------------------------------------------

app.get("/api/save", async (c) => {
  const db = getDb(c.env);
  const uid = c.get("uid");
  const player = await db.select().from(players).where(eq(players.uid, uid)).get();
  const save = await db.select().from(saves).where(eq(saves.uid, uid)).get();
  if (!player || !save) return c.json({ progress: null, updatedAt: null });

  const rest = JSON.parse(save.progressJson) as Record<string, unknown>;
  const progress = {
    ...rest,
    playerName: player.playerName,
    wins: player.wins,
    losses: player.losses,
    bestWave: player.bestWave,
    crystals: player.crystals,
    sigils: player.sigils,
    materials: player.materials,
    stamina: player.stamina,
  };
  return c.json({ progress, updatedAt: save.updatedAt });
});

app.put("/api/save", async (c) => {
  const body = await c.req.json<{ progress: Record<string, unknown>; playerName?: string }>().catch(() => null);
  if (!body || typeof body.progress !== "object" || body.progress === null) {
    return c.json({ error: "Body must include a `progress` object" }, 400);
  }

  const db = getDb(c.env);
  const uid = c.get("uid");
  const email = c.get("email");
  const now = new Date();
  const playerName = typeof body.playerName === "string" ? body.playerName.trim().slice(0, 12) || undefined : undefined;
  const { promoted, rest } = splitProgress(body.progress);
  const progressJson = JSON.stringify(rest);

  await db
    .insert(players)
    .values({ uid, email, playerName: playerName ?? "王都新秀", ...promoted })
    .onConflictDoUpdate({ target: players.uid, set: { email, updatedAt: now, ...promoted, ...(playerName ? { playerName } : {}) } });

  await db
    .insert(saves)
    .values({ uid, progressJson, updatedAt: now })
    .onConflictDoUpdate({ target: saves.uid, set: { progressJson, updatedAt: now } });

  return c.json({ ok: true, updatedAt: now.toISOString() });
});

// ---------------------------------------------------------------------------
// Admin: player lookup, currency/item grants, audit log. All require
// requireAdmin on top of requireFirebaseUser, and every write is logged.
// ---------------------------------------------------------------------------

app.get("/api/admin/players", requireAdmin, async (c) => {
  const db = getDb(c.env);
  const search = c.req.query("q");
  const rows = search
    ? await db.select().from(players).where(like(players.playerName, `%${search}%`)).limit(50).all()
    : await db.select().from(players).orderBy(desc(players.updatedAt)).limit(50).all();
  return c.json({ players: rows });
});

app.get("/api/admin/players/:uid", requireAdmin, async (c) => {
  const db = getDb(c.env);
  const targetUid = c.req.param("uid");
  const player = await db.select().from(players).where(eq(players.uid, targetUid)).get();
  if (!player) return c.json({ error: "Not found" }, 404);
  const save = await db.select().from(saves).where(eq(saves.uid, targetUid)).get();
  return c.json({ player, progress: save ? JSON.parse(save.progressJson) : null });
});

/** Adds a numeric delta to one of the 7 promoted `players` columns
 * (crystals/sigils/materials/stamina/wins/losses/bestWave) via an atomic
 * SQL `col = col + delta` update -- race-free, unlike the old reference
 * project's admin/grant-event.js (and this codebase's own pre-migration
 * approach) which read-parsed-mutated-rewrote a JSON blob. */
app.post("/api/admin/grant", requireAdmin, async (c) => {
  const body = await c.req.json<{ targetUid?: string; patch?: Record<string, number> }>().catch(() => null);
  if (!body?.targetUid || !body.patch || typeof body.patch !== "object") {
    return c.json({ error: "Body must include `targetUid` and a `patch` object of numeric deltas" }, 400);
  }

  const db = getDb(c.env);
  const existing = await db.select({ uid: players.uid }).from(players).where(eq(players.uid, body.targetUid)).get();
  if (!existing) return c.json({ error: "Player not found" }, 404);

  const applied: Partial<Record<PromotedProgressField, number>> = {};
  const setClause: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, delta] of Object.entries(body.patch)) {
    if ((PROMOTED_PROGRESS_FIELDS as readonly string[]).includes(key) && typeof delta === "number" && Number.isFinite(delta)) {
      const field = key as PromotedProgressField;
      setClause[field] = sql`${players[field]} + ${delta}`;
      applied[field] = delta;
    }
  }
  if (Object.keys(applied).length === 0) {
    return c.json({ error: `No matching fields in patch (must be one of: ${PROMOTED_PROGRESS_FIELDS.join(", ")})` }, 400);
  }

  await db.update(players).set(setClause).where(eq(players.uid, body.targetUid));
  await db.insert(adminAuditLog).values({ adminUid: c.get("uid"), action: "grant", targetUid: body.targetUid, detail: JSON.stringify(applied) });

  const updated = await db.select().from(players).where(eq(players.uid, body.targetUid)).get();
  return c.json({ ok: true, applied, player: updated });
});

app.get("/api/admin/audit-log", requireAdmin, async (c) => {
  const db = getDb(c.env);
  const rows = await db.select().from(adminAuditLog).orderBy(desc(adminAuditLog.createdAt)).limit(100).all();
  return c.json({ entries: rows });
});

export default app;
