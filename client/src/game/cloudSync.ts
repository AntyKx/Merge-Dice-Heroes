/**
 * Talks to the Cloudflare Worker in cloud/ (deployed separately from this
 * Vercel-hosted app -- see cloud/README-equivalent commit message for why).
 * Every request carries the signed-in user's Firebase ID token; the Worker
 * derives the uid from that verified token, never from a request parameter.
 */
import { auth } from "./firebase";
import type { PlayerProgress } from "./types";

const DEFAULT_API_BASE = "https://merge-dice-heroes-api.antyk123.workers.dev";
const API_BASE = (import.meta.env.VITE_CLOUD_API_URL as string | undefined) ?? DEFAULT_API_BASE;

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const token = await user.getIdToken();
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
}

export async function cloudSaveProgress(progress: PlayerProgress): Promise<void> {
  const response = await authedFetch("/api/save", { method: "PUT", body: JSON.stringify({ progress, playerName: progress.playerName }) });
  if (!response.ok) throw new Error(`Cloud save failed: ${response.status}`);
}

export async function cloudLoadProgress(): Promise<PlayerProgress | null> {
  const response = await authedFetch("/api/save");
  if (!response.ok) throw new Error(`Cloud load failed: ${response.status}`);
  const data = (await response.json()) as { progress: PlayerProgress | null };
  return data.progress;
}
