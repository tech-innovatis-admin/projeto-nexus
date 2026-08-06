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

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new CognitoConfigError(`Missing env: ${name}`);
  }
  return value;
}

export function getCognitoConfig(): CognitoConfig {
  const region = process.env.AWS_REGION?.trim() || "us-east-1";
  const userPoolId = required("COGNITO_USER_POOL_ID");
  const clientId = required("COGNITO_CLIENT_ID");
  const clientSecret = process.env.COGNITO_CLIENT_SECRET?.trim() || null;
  const domain = required("COGNITO_DOMAIN").replace(/\/$/, "");
  const redirectUri = required("COGNITO_REDIRECT_URI");
  const logoutUri =
    process.env.COGNITO_LOGOUT_URI?.trim() ||
    process.env.APP_URL?.trim() ||
    "http://localhost:3005/login";
  const issuer =
    process.env.COGNITO_ISSUER?.trim() ||
    `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  const scopes = (process.env.COGNITO_SCOPES || "openid email profile")
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

export function buildAuthorizeUrl(input: {
  state: string;
  nonce: string;
  codeChallenge: string;
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
  return `${cfg.domain}/oauth2/authorize?${params.toString()}`;
}

export function buildLogoutUrl() {
  const cfg = getCognitoConfig();
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    logout_uri: cfg.logoutUri,
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
