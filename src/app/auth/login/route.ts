import { NextResponse } from "next/server";

import { cognitoEnabled } from "@/lib/auth/authMode";
import {
  buildAuthorizeUrl,
  CognitoConfigError,
  createNonce,
  createOAuthState,
  createPkcePair,
} from "@/lib/auth/cognitoOidc";

const OAUTH_COOKIE = "nexus_oauth";

export async function GET() {
  if (!cognitoEnabled()) {
    return NextResponse.json(
      { error: "SSO Cognito desabilitado." },
      { status: 404 },
    );
  }

  try {
    const { verifier, challenge } = createPkcePair();
    const state = createOAuthState();
    const nonce = createNonce();
    const authorizeUrl = buildAuthorizeUrl({
      state,
      nonce,
      codeChallenge: challenge,
    });

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(
      OAUTH_COOKIE,
      JSON.stringify({
        state,
        nonce,
        code_verifier: verifier,
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
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
