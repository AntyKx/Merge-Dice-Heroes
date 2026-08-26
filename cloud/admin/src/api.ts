import { auth } from "./firebase";

const API_BASE = (import.meta.env.VITE_CLOUD_API_URL as string | undefined) ?? "https://merge-dice-heroes-api.antyk123.workers.dev";

/** Mirrors cloud/src/db/schema.ts's PROMOTED_PROGRESS_FIELDS -- kept in sync
 * by hand since this app has its own build and doesn't share node_modules
 * (drizzle-orm) with the Worker. */
export const PROMOTED_FIELDS = ["wins", "losses", "bestWave", "crystals", "sigils", "materials", "stamina"] as const;
export type PromotedField = (typeof PROMOTED_FIELDS)[number];

export interface Player {
  uid: string;
  email: string | null;
  playerName: string;
  wins: number;
  losses: number;
  bestWave: number;
  crystals: number;
  sigils: number;
  materials: number;
  stamina: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: number;
  adminUid: string;
  action: string;
  targetUid: string | null;
  detail: string | null;
  createdAt: string;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new ApiError(401, "尚未登入");
  const token = await user.getIdToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new ApiError(res.status, body.error ?? `HTTP ${res.status}`);
  }
  return res;
}

export { ApiError };

export async function listPlayers(query?: string): Promise<Player[]> {
  const qs = query ? `?q=${encodeURIComponent(query)}` : "";
  const res = await authedFetch(`/api/admin/players${qs}`);
  const body = (await res.json()) as { players: Player[] };
  return body.players;
}

export async function getPlayer(uid: string): Promise<{ player: Player; progress: Record<string, unknown> | null }> {
  const res = await authedFetch(`/api/admin/players/${encodeURIComponent(uid)}`);
  return res.json();
}

export async function grant(targetUid: string, patch: Partial<Record<PromotedField, number>>): Promise<{ player: Player }> {
  const res = await authedFetch("/api/admin/grant", { method: "POST", body: JSON.stringify({ targetUid, patch }) });
  return res.json();
}

export async function fetchAuditLog(): Promise<AuditLogEntry[]> {
  const res = await authedFetch("/api/admin/audit-log");
  const body = (await res.json()) as { entries: AuditLogEntry[] };
  return body.entries;
}
