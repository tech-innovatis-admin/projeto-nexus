import { NextResponse } from "next/server";

import {
  cognitoEnabled,
  credentialsEnabled,
  getAuthMode,
  NEXUS_PLATFORM_TAG,
} from "@/lib/auth/authMode";

export async function GET() {
  const mode = getAuthMode();
  return NextResponse.json({
    mode,
    credentials: credentialsEnabled(mode),
    cognito: cognitoEnabled(mode),
    platformCode: NEXUS_PLATFORM_TAG,
  });
}
