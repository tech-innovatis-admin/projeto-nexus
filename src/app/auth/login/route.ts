import { NextRequest, NextResponse } from "next/server";

import { cognitoEnabled } from "@/lib/auth/authMode";
import {
  buildAuthorizeUrl,
  CognitoConfigError,
  cookieSecure,
  createNonce,
  createOAuthState,
  createPkcePair,
  encodeOAuthCookie,
  publicAppOrigin,
  REAUTH_COOKIE,
  reauthCookieOptions,
  type AuthorizePrompt,
} from "@/lib/auth/cognitoOidc";

const OAUTH_COOKIE = "nexus_oauth";

export async function GET(request: NextRequest) {
  if (!cognitoEnabled()) {
    return NextResponse.redirect(new URL("/login", publicAppOrigin(request)));
  }

  try {
    const resume =
      request.nextUrl.searchParams.get("resume") === "1" ||
      request.cookies.get(REAUTH_COOKIE)?.value === "1";
    const prompt: AuthorizePrompt = resume ? "login" : "none";
    const { verifier, challenge } = createPkcePair();
    const state = createOAuthState();
    const nonce = createNonce();
    const authorizeUrl = buildAuthorizeUrl({
      state,
      nonce,
      codeChallenge: challenge,
      prompt,
    });

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(REAUTH_COOKIE, "", reauthCookieOptions(0));
    response.cookies.set(
      OAUTH_COOKIE,
      encodeOAuthCookie({
        state,
        nonce,
        code_verifier: verifier,
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: cookieSecure(),
        path: "/",
        maxAge: 600,
      },
    );
    return response;
  } catch (error) {
    const message =
      error instanceof CognitoConfigError
        ? error.message
        : "Falha ao iniciar SSO.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
