export type AuthMode = "legacy" | "hybrid" | "cognito";

/** Bracket access so Docker/runtime AUTH_MODE is not inlined at `next build`. */
function env(name: string): string | undefined {
  return process.env[name];
}

export function getAuthMode(): AuthMode {
  const mode = (env("AUTH_MODE") || "legacy").trim().toLowerCase();
  if (mode === "legacy" || mode === "hybrid" || mode === "cognito") {
    return mode;
  }
  return "legacy";
}

export function credentialsEnabled(mode: AuthMode = getAuthMode()) {
  return mode === "legacy" || mode === "hybrid";
}

export function cognitoEnabled(mode: AuthMode = getAuthMode()) {
  return mode === "hybrid" || mode === "cognito";
}

export function unauthenticatedLoginPath() {
  return cognitoEnabled() ? "/auth/login" : "/login";
}

export const NEXUS_PLATFORM_TAG = "nexus";
