# aklman-blog-app

Native iOS + web mobile reader for [aklman.com](https://aklman.com), backed by a small Express API that pulls and caches RSS content.

## Quick start

```bash
pnpm install
pnpm --filter @aklman/api run dev        # API on http://localhost:5001
pnpm --filter @aklman/mobile run ios     # build + launch in iOS simulator
```

For dev on a physical device:
```bash
EXPO_PUBLIC_DOMAIN=<your-mac-lan-ip>:5001 pnpm --filter @aklman/mobile run dev
```

## Layout

```
apps/
  api/         Express 5 + Drizzle ORM (@aklman/api)
  mobile/      Expo SDK 54 / React Native 0.81 (@aklman/mobile)
packages/
  api-client/  Generated react-query hooks (@aklman/api-client)
  api-schema/  Generated Zod schemas       (@aklman/api-schema)
  api-types/   OpenAPI spec + orval config (@aklman/api-types)
  db/          Drizzle schema & client     (@aklman/db)
scripts/       Misc dev scripts
docs/tasks/    Historical task archive (delivered features)
```

## Common commands

- `pnpm run typecheck` — full repo typecheck
- `pnpm --filter @aklman/api run dev` — API server (port 5001 by default; override with `PORT`)
- `pnpm --filter @aklman/mobile run ios` — build native dev client + launch sim
- `pnpm --filter @aklman/mobile run dev` — Metro only (requires existing dev client install)
- `pnpm --filter @aklman/api-types run codegen` — regenerate `packages/api-client` and `packages/api-schema` from `packages/api-types/openapi.yaml`
- `pnpm --filter @aklman/db run push` — push Drizzle schema to local DB

## Environment

API:
- `PORT` (default `5001`)
- `DATABASE_URL` — Postgres connection string

Mobile (Expo public, baked into bundle):
- `EXPO_PUBLIC_DOMAIN` — `host:port` for the API (default `localhost:5001`)
- `EXPO_PUBLIC_SCHEME` — `http` or `https`; auto-resolves based on whether domain is RFC1918/loopback

## Stack

- pnpm workspaces, Node 24, TypeScript 5.9
- API: Express 5, esbuild bundling, pino logging
- DB: PostgreSQL + Drizzle ORM, validation via Zod (`zod/v4`) and `drizzle-zod`
- Mobile: Expo Router (Liquid Glass NativeTabs on iOS 26+), React Query, react-native-webview for article HTML
- Codegen: Orval reads `openapi.yaml` → react-query hooks + Zod schemas

## Notes

- The bottom Liquid Glass tab bar reads from `UITraitCollection`, not RN `Appearance`. Theme picker calls `Appearance.setColorScheme` to sync them — see `apps/mobile/context/ThemeContext.tsx`.
- `apps/api/data/cache/` is local RSS cache, gitignored.
- Three pages (`about`, `showcases`, post detail) render content from aklman.com via WebView rather than native RN.

