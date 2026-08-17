import { sign } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { NEXUS_PLATFORM_TAG } from "@/lib/auth/authMode";
import { cookieSecure } from "@/lib/auth/cognitoOidc";

export const AUTH_COOKIE_NAME = "auth_token";
export const AUTH_COOKIE_MAX_AGE = 3600;

export type NexusDbUser = {
  id: number | bigint;
  email: string | null;
  username: string | null;
  role: string | null;
  platforms: unknown;
  name: string | null;
  cargo: string | null;
  photo: string | null;
  cognito_sub?: string | null;
};

export type NexusSessionUser = {
  id: string | number;
  username: string | null;
  email: string | null;
  role: string | null;
  name: string | null;
  cargo: string | null;
  photo: string | null;
  isRestricted: boolean;
};

export type CreateNexusSessionResult =
  | { ok: true; token: string; user: NexusSessionUser; platforms: string[] }
  | { ok: false; status: number; error: string };

export function parsePlatformList(rawPlatforms: unknown): string[] {
  if (Array.isArray(rawPlatforms)) {
    return (rawPlatforms as unknown[]).map((p) => String(p));
  }
  if (typeof rawPlatforms === "string") {
    return rawPlatforms
      .replace(/[{}]/g, "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function hasNexusPlatformAccess(platforms: string[]) {
  return platforms.some((p) => p.toLowerCase() === NEXUS_PLATFORM_TAG);
}

function normalizeBigInt(value: unknown): string | number | null | undefined {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (
    typeof value === "number" &&
    (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER)
  ) {
    return value.toString();
  }
  return value as string | number | null | undefined;
}

function normalizeForJson(value: unknown): string | number {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value as string | number;
}

/**
 * Valida acesso nexus + validade de viewer e emite o JWT `auth_token`
 * (mesmas claims do login por senha).
 */
export async function createNexusSession(
  dbUser: NexusDbUser,
): Promise<CreateNexusSessionResult> {
  if (!process.env.JWT_SECRET) {
    return {
      ok: false,
      status: 500,
      error: "Erro de configuração do servidor",
    };
  }

  const platformList = parsePlatformList(dbUser.platforms);
  if (!hasNexusPlatformAccess(platformList)) {
    return {
      ok: false,
      status: 403,
      error: "Usuário não possui acesso à plataforma nexus",
    };
  }

  let viewerAcessosCount = 0;
  if ((dbUser.role || "").toLowerCase() === "viewer") {
    try {
      const userId =
        typeof dbUser.id === "bigint" ? Number(dbUser.id) : dbUser.id;
      const acessos = await prisma.municipio_acessos.findMany({
        where: { user_id: userId },
        select: { valid_until: true },
      });
      viewerAcessosCount = Array.isArray(acessos) ? acessos.length : 0;

      if (acessos && acessos.length > 0) {
        const now = new Date();
        const hasValid = acessos.some((a: { valid_until: Date | null }) => {
          if (!a.valid_until) return true;
          return new Date(a.valid_until) >= now;
        });

        if (!hasValid) {
          console.warn(
            `🚫 Login bloqueado: viewer ${dbUser.email || dbUser.username} com acessos expirados`,
          );
          return {
            ok: false,
            status: 403,
            error: "Seu acesso expirou. Entre em contato com o administrador.",
          };
        }
      } else {
        console.info(
          `ℹ️ Viewer ${dbUser.email || dbUser.username} sem registros em municipio_acessos. Permitindo login, mas acesso será restrito no mapa.`,
        );
      }
    } catch (err) {
      console.error(
        "Erro ao validar validade de viewer em municipio_acessos:",
        err,
      );
    }
  }

  const token = sign(
    {
      id: normalizeBigInt(dbUser.id),
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.role,
      platforms: platformList,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  return {
    ok: true,
    token,
    platforms: platformList,
    user: {
      id: normalizeForJson(dbUser.id),
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.role,
      name: dbUser.name,
      cargo: dbUser.cargo,
      photo: dbUser.photo,
      isRestricted:
        (dbUser.role || "").toLowerCase() === "viewer"
          ? viewerAcessosCount > 0
          : false,
    },
  };
}

export function authCookieOptions(maxAge = AUTH_COOKIE_MAX_AGE) {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
