import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

export class CognitoConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CognitoConfigError";
  }
}

export type CognitoConfig = {
  region: string;
  userPoolId: string;
  clientId: string;
  clientSecret: string | null;
  domain: string;
  redirectUri: string;
  logoutUri: string;
  issuer: string;
  scopes: string[];
};

export type CognitoIdentity = {
  sub: string;
  email: string | null;
  name: string | null;
  emailVerified: boolean;
};

function env(name: string): string | undefined {
  return process.env[name]?.trim();
}

function required(name: string) {
  const value = env(name);
  if (!value) {
    throw new CognitoConfigError(`Missing env: ${name}`);
  }
  return value;
}

export function getCognitoConfig(): CognitoConfig {
  const region = env("AWS_REGION") || "us-east-1";
  const userPoolId = required("COGNITO_USER_POOL_ID");
  const clientId = required("COGNITO_CLIENT_ID");
  const clientSecret = env("COGNITO_CLIENT_SECRET") || null;
  const domain = required("COGNITO_DOMAIN").replace(/\/$/, "");
  const redirectUri = required("COGNITO_REDIRECT_URI");
  const logoutUri =
    env("COGNITO_LOGOUT_URI") ||
    env("APP_URL") ||
    "https://nexus.innovatismc.com/login";
  const issuer =
    env("COGNITO_ISSUER") ||
    `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  const scopes = (env("COGNITO_SCOPES") || "openid email profile")
    .split(/\s+/)
    .filter(Boolean);

  return {
    region,
    userPoolId,
    clientId,
    clientSecret,
    domain,
    redirectUri,
    logoutUri,
    issuer,
    scopes,
  };
}

function toBase64Url(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function createPkcePair() {
  const verifier = toBase64Url(randomBytes(32));
  const challenge = toBase64Url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function createOAuthState() {
  return toBase64Url(randomBytes(24));
}

export function createNonce() {
  return toBase64Url(randomBytes(24));
}

export type AuthorizePrompt = "none" | "login";

export const REAUTH_COOKIE = "sso_reauth";

const SILENT_AUTH_ERRORS = new Set(["login_required", "interaction_required"]);

export function isSilentAuthError(error: string | null | undefined) {
  return Boolean(error && SILENT_AUTH_ERRORS.has(error));
}

export function reauthCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: cookieSecure(),
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function buildAuthorizeUrl(input: {
  state: string;
  nonce: string;
  codeChallenge: string;
  prompt?: AuthorizePrompt;
}) {
  const cfg = getCognitoConfig();
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: "code",
    scope: cfg.scopes.join(" "),
    redirect_uri: cfg.redirectUri,
    state: input.state,
    nonce: input.nonce,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
  });
  if (input.prompt) {
    params.set("prompt", input.prompt);
  }
  return `${cfg.domain}/oauth2/authorize?${params.toString()}`;
}

export function buildLogoutUrl(logoutUri?: string) {
  const cfg = getCognitoConfig();
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    logout_uri: logoutUri || cfg.logoutUri,
  });
  return `${cfg.domain}/logout?${params.toString()}`;
}

export async function exchangeCode(code: string, codeVerifier: string) {
  const cfg = getCognitoConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: cfg.clientId,
    code,
    redirect_uri: cfg.redirectUri,
    code_verifier: codeVerifier,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (cfg.clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(
      `${cfg.clientId}:${cfg.clientSecret}`,
    ).toString("base64")}`;
  }

  const response = await fetch(`${cfg.domain}/oauth2/token`, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new CognitoConfigError(
      `Token exchange failed: ${response.status} ${text}`,
    );
  }

  return (await response.json()) as {
    id_token: string;
    access_token?: string;
    refresh_token?: string;
  };
}

export async function verifyIdToken(
  idToken: string,
  expectedNonce: string,
): Promise<CognitoIdentity> {
  const cfg = getCognitoConfig();
  const jwks = createRemoteJWKSet(
    new URL(`${cfg.issuer}/.well-known/jwks.json`),
  );

  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: cfg.issuer,
    audience: cfg.clientId,
  });

  if (payload.nonce !== expectedNonce) {
    throw new CognitoConfigError("Invalid nonce in ID token");
  }

  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!sub) {
    throw new CognitoConfigError("ID token missing sub");
  }

  return {
    sub,
    email: typeof payload.email === "string" ? payload.email : null,
    name: typeof payload.name === "string" ? payload.name : null,
    emailVerified: payload.email_verified === true,
  };
}

export function encodeOAuthCookie(payload: {
  state: string;
  nonce: string;
  code_verifier: string;
}) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeOAuthCookie(value: string): {
  state?: string;
  nonce?: string;
  code_verifier?: string;
} {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
    state?: string;
    nonce?: string;
    code_verifier?: string;
  };
}

export function cookieSecure() {
  const flag = env("AUTH_COOKIE_SECURE")?.toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  const origin = env("APP_URL") || env("NEXT_PUBLIC_APP_URL") || "";
  if (origin.startsWith("https://")) return true;
  return env("NODE_ENV") === "production";
}

const BIND_HOSTS = new Set(["0.0.0.0", "::", "[::]"]);

export function publicAppOrigin(request: { headers: Headers; nextUrl: URL }) {
  for (const raw of [env("APP_URL"), env("APP_ORIGIN"), env("NEXT_PUBLIC_APP_URL")]) {
    const origin = raw?.replace(/\/$/, "") || "";
    if (origin && !origin.includes("0.0.0.0")) {
      return origin;
    }
  }

  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim() ||
    request.nextUrl.host ||
    "";
  const hostname = host.replace(/:\d+$/, "");
  if (hostname && !BIND_HOSTS.has(hostname)) {
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      request.nextUrl.protocol.replace(":", "") ||
      "https";
    return `${proto}://${host}`;
  }

  return "https://nexus.innovatismc.com";
}
