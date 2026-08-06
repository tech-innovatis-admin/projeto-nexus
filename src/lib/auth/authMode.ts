export type AuthMode = "legacy" | "hybrid" | "cognito";

export function getAuthMode(): AuthMode {
  const mode = (process.env.AUTH_MODE || "legacy").trim().toLowerCase();
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

export const NEXUS_PLATFORM_TAG = "nexus";
