# Nexus — Cognito SSO

OIDC no App Router (Authorization Code + PKCE). Sessão continua no cookie HttpOnly `auth_token` (mesmo JWT do login por senha).

**Autorização:** tag `nexus` em `public.users.platforms`.

O login por senha (`POST /api/auth`) permanece em `AUTH_MODE=legacy|hybrid`.

## Fluxo SSO

1. `GET /auth/login` → Hosted UI Cognito (cookie `nexus_oauth` com PKCE/state/nonce)
2. Callback `GET /auth/callback`
3. Resolve usuário em `public.users` (`cognito_sub` ou e-mail) + exige tag `nexus`
4. Vincula `cognito_sub` se ainda estiver nulo
5. Emite cookie `auth_token` → `/mapa`

## Feature flag

`AUTH_MODE` = `legacy` | `hybrid` | `cognito`

- `legacy` — só senha (padrão)
- `hybrid` — senha + SSO
- `cognito` — só SSO

`GET /api/auth/mode` devolve `{ mode, credentials, cognito, platformCode: "nexus" }`.

## Dev local

Porta **3005**.

```bash
# após terraform apply do client nexus-web
node scripts/append-cognito-env.mjs
npm run dev
```

Abrir `http://localhost:3005/login` → **Entrar com SSO**.

## Rollback

`AUTH_MODE=legacy` no `.env` / `.env.local` e reiniciar.
