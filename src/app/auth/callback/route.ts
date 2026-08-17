import { NextRequest, NextResponse } from "next/server";

import { cognitoEnabled } from "@/lib/auth/authMode";
import {
  CognitoConfigError,
  decodeOAuthCookie,
  exchangeCode,
  publicAppOrigin,
  verifyIdToken,
  buildLogoutUrl,
  isSilentAuthError,
  REAUTH_COOKIE,
  reauthCookieOptions,
} from "@/lib/auth/cognitoOidc";
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  createNexusSession,
  type NexusDbUser,
} from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const OAUTH_COOKIE = "nexus_oauth";

type UserRow = NexusDbUser & { cognito_sub: string | null };

function errorRedirect(request: NextRequest, code: string) {
  const url = new URL("/login", publicAppOrigin(request));
  url.searchParams.set("sso_error", code);
  return NextResponse.redirect(url);
}

async function findUserByCognitoSub(sub: string): Promise<UserRow | null> {
  const rows = await prisma.$queryRaw<UserRow[]>`
    SELECT id, email, username, role, platforms, name, cargo, photo, cognito_sub
    FROM "users"
    WHERE cognito_sub = ${sub}
    LIMIT 1`;
  return rows[0] ?? null;
}

async function findUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await prisma.$queryRaw<UserRow[]>`
    SELECT id, email, username, role, platforms, name, cargo, photo, cognito_sub
    FROM "users"
    WHERE email ILIKE ${email}
    LIMIT 1`;
  return rows[0] ?? null;
}

async function linkCognitoSub(userId: number | bigint, sub: string) {
  await prisma.$executeRaw`
    UPDATE "users"
    SET cognito_sub = ${sub}
    WHERE id = ${userId}
      AND cognito_sub IS NULL`;
}

export async function GET(request: NextRequest) {
  if (!cognitoEnabled()) {
    return NextResponse.json(
      { error: "SSO Cognito desabilitado." },
      { status: 404 },
    );
  }

  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) {
    if (isSilentAuthError(oauthError)) {
      const response = NextResponse.redirect(buildLogoutUrl());
      response.cookies.set(REAUTH_COOKIE, "1", reauthCookieOptions(120));
      response.cookies.set(OAUTH_COOKIE, "", reauthCookieOptions(0));
      return response;
    }
    return errorRedirect(request, "cognito_denied");
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) {
    return errorRedirect(request, "missing_code");
  }

  const rawCookie = request.cookies.get(OAUTH_COOKIE)?.value;
  if (!rawCookie) {
    return errorRedirect(request, "missing_oauth_cookie");
  }

  let oauth: { state?: string; nonce?: string; code_verifier?: string };
  try {
    oauth = decodeOAuthCookie(rawCookie);
  } catch {
    return errorRedirect(request, "invalid_oauth_cookie");
  }

  if (
    !oauth.state ||
    oauth.state !== state ||
    !oauth.nonce ||
    !oauth.code_verifier
  ) {
    return errorRedirect(request, "state_mismatch");
  }

  try {
    const tokens = await exchangeCode(code, oauth.code_verifier);
    const identity = await verifyIdToken(tokens.id_token, oauth.nonce);

    let user = await findUserByCognitoSub(identity.sub);

    if (!user && identity.email) {
      const byEmail = await findUserByEmail(identity.email);
      if (byEmail) {
        if (byEmail.cognito_sub && byEmail.cognito_sub !== identity.sub) {
          return errorRedirect(request, "user_not_linked");
        }
        if (!byEmail.cognito_sub) {
          await linkCognitoSub(byEmail.id, identity.sub);
          user = await findUserByCognitoSub(identity.sub);
        } else {
          user = byEmail;
        }
      }
    }

    if (!user) {
      return errorRedirect(request, "user_not_linked");
    }

    const session = await createNexusSession(user);
    if (!session.ok) {
      return errorRedirect(
        request,
        session.status === 403 ? "user_not_linked" : "callback_failed",
      );
    }

    const response = NextResponse.redirect(
      new URL("/mapa", publicAppOrigin(request)),
    );
    response.cookies.set(
      AUTH_COOKIE_NAME,
      session.token,
      authCookieOptions(),
    );
    response.cookies.set(OAUTH_COOKIE, "", {
      ...authCookieOptions(0),
      maxAge: 0,
    });
    return response;
  } catch (err) {
    console.error(
      "[auth/callback]",
      err instanceof CognitoConfigError ? err.message : err,
    );
    return errorRedirect(request, "callback_failed");
  }
}
