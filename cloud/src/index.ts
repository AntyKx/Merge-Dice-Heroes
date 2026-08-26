import { desc, eq, like } from "drizzle-orm";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { adminAuditLog, players, saves } from "./db/schema";
import type { Env } from "./env";
import { getDb } from "./lib/db";
import { FirebaseAuthError, requireFirebaseUser } from "./lib/firebaseAuth";

type Bindings = { Bindings: Env; Variables: { uid: string; email?: string } };
const app = new Hono<Bindings>();

// CORS origins aren't secret, so they're just listed here rather than in an env
// var -- add the production Vercel URL alongside the local dev ports once the
// game's actual deployed domain is known.
const ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:5173", "http://localhost:4173", "https://merge-dice-heroes.vercel.app"];

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
  const row = await db.select().from(saves).where(eq(saves.uid, c.get("uid"))).get();
  return c.json({ progress: row ? JSON.parse(row.progressJson) : null, updatedAt: row?.updatedAt ?? null });
});

app.put("/api/save", async (c) => {
  const body = await c.req.json<{ progress: unknown; playerName?: string }>().catch(() => null);
  if (!body || typeof body.progress !== "object" || body.progress === null) {
    return c.json({ error: "Body must include a `progress` object" }, 400);
  }

  const db = getDb(c.env);
  const uid = c.get("uid");
  const email = c.get("email");
  const now = new Date();
  const progressJson = JSON.stringify(body.progress);
  const playerName = typeof body.playerName === "string" ? body.playerName.trim().slice(0, 12) || undefined : undefined;

  await db
    .insert(players)
    .values({ uid, email, playerName: playerName ?? "王都新秀" })
    .onConflictDoUpdate({ target: players.uid, set: { email, updatedAt: now, ...(playerName ? { playerName } : {}) } });

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

/** Adds a numeric delta to any numeric field of the target's saved progress
 * (crystals/sigils/materials/stamina/etc.) -- the generic-currency-grant
 * pattern the old reference project's admin/grant-event.js used, but logged
 * and scoped to numeric fields only. */
app.post("/api/admin/grant", requireAdmin, async (c) => {
  const body = await c.req.json<{ targetUid?: string; patch?: Record<string, number> }>().catch(() => null);
  if (!body?.targetUid || !body.patch || typeof body.patch !== "object") {
    return c.json({ error: "Body must include `targetUid` and a `patch` object of numeric deltas" }, 400);
  }

  const db = getDb(c.env);
  const save = await db.select().from(saves).where(eq(saves.uid, body.targetUid)).get();
  if (!save) return c.json({ error: "Player has no save yet" }, 404);

  const progress = JSON.parse(save.progressJson) as Record<string, unknown>;
  const applied: Record<string, number> = {};
  for (const [key, delta] of Object.entries(body.patch)) {
    if (typeof progress[key] === "number" && typeof delta === "number") {
      progress[key] = (progress[key] as number) + delta;
      applied[key] = delta;
    }
  }
  if (Object.keys(applied).length === 0) return c.json({ error: "No matching numeric fields in patch" }, 400);

  const now = new Date();
  await db.update(saves).set({ progressJson: JSON.stringify(progress), updatedAt: now }).where(eq(saves.uid, body.targetUid));
  await db.insert(adminAuditLog).values({ adminUid: c.get("uid"), action: "grant", targetUid: body.targetUid, detail: JSON.stringify(applied) });

  return c.json({ ok: true, applied, progress });
});

app.get("/api/admin/audit-log", requireAdmin, async (c) => {
  const db = getDb(c.env);
  const rows = await db.select().from(adminAuditLog).orderBy(desc(adminAuditLog.createdAt)).limit(100).all();
  return c.json({ entries: rows });
});

export default app;
