/**
 * Verifies Firebase Authentication ID tokens without the firebase-admin SDK
 * (which needs Node APIs unavailable in the Workers runtime). This is the
 * piece the old reference project (DiceHeroSpriteIntegratedGame_v2) never
 * had -- its `/save/[uid]` endpoint trusted whatever uid was in the URL. Here
 * the uid always comes from a verified token, never a client-supplied param.
 *
 * Verification per https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library:
 * RS256, issuer `https://securetoken.google.com/<projectId>`, audience
 * `<projectId>`, signed by Google's rotating x509 certs.
 */
import { importX509, jwtVerify } from "jose";

const CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const DEFAULT_CERTS_TTL_MS = 60 * 60 * 1000; // Google typically sends max-age around this; used as a fallback only.

let certsCache: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getGoogleCerts(): Promise<Record<string, string>> {
  if (certsCache && certsCache.expiresAt > Date.now()) return certsCache.certs;
  const response = await fetch(CERTS_URL);
  if (!response.ok) throw new Error(`Failed to fetch Firebase signing certs: ${response.status}`);
  const certs = (await response.json()) as Record<string, string>;
  const cacheControl = response.headers.get("cache-control") ?? "";
  const maxAgeMatch = /max-age=(\d+)/.exec(cacheControl);
  const ttlMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : DEFAULT_CERTS_TTL_MS;
  certsCache = { certs, expiresAt: Date.now() + ttlMs };
  return certs;
}

export interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
}

export class FirebaseAuthError extends Error {}

/** Verifies a raw ID token (the `Authorization: Bearer <token>` value, already
 * stripped of the "Bearer " prefix). Throws FirebaseAuthError on any failure --
 * callers should turn that into a 401, never fall back to trusting the token. */
export async function verifyFirebaseIdToken(token: string, projectId: string): Promise<VerifiedFirebaseUser> {
  if (!token) throw new FirebaseAuthError("Missing token");

  const [headerB64] = token.split(".");
  let kid: string | undefined;
  try {
    const header = JSON.parse(atob(headerB64.replace(/-/g, "+").replace(/_/g, "/")));
    kid = header.kid;
  } catch {
    throw new FirebaseAuthError("Malformed token header");
  }
  if (!kid) throw new FirebaseAuthError("Token header missing kid");

  const certs = await getGoogleCerts();
  const pem = certs[kid];
  if (!pem) throw new FirebaseAuthError("Unknown signing key (kid not in Google's current cert set)");

  const key = await importX509(pem, "RS256");
  const { payload } = await jwtVerify(token, key, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  }).catch((error) => {
    throw new FirebaseAuthError(`Token verification failed: ${(error as Error).message}`);
  });

  if (typeof payload.sub !== "string" || !payload.sub) throw new FirebaseAuthError("Token missing subject (uid)");
  return { uid: payload.sub, email: typeof payload.email === "string" ? payload.email : undefined };
}

/** Extracts and verifies the bearer token from a Request's Authorization header. */
export async function requireFirebaseUser(request: Request, projectId: string): Promise<VerifiedFirebaseUser> {
  const header = request.headers.get("Authorization") ?? "";
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) throw new FirebaseAuthError("Missing Authorization: Bearer <token> header");
  return verifyFirebaseIdToken(match[1], projectId);
}
