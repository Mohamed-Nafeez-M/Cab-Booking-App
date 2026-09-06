# Cab Marketplace

Local-first cab marketplace connecting customers with providers for searchable rides, quote requests, and provider operations.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/api-server run seed` — load demo users, vehicles, listings, leads, and quotations
- `pnpm --filter @workspace/cab-marketplace run dev` — run the web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `JWT_SECRET` — signing key for local bearer sessions

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Web: React + Vite + Wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/cab-marketplace` — marketplace web app and role-aware dashboards
- `artifacts/api-server/src/routes/marketplace.ts` — REST handlers and access checks
- `lib/db/src/schema/index.ts` — relational marketplace schema
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `artifacts/api-server/src/seed.ts` — repeatable local demo seed

## Architecture decisions

- Local bearer JWT auth is intentional for this MVP because the requested workflow is password-based and must work without external services.
- Drizzle is used with the workspace's managed Postgres runtime so schema pushes and preview workflows stay simple.
- Listings store route strings now; the schema keeps geographic search isolated so PostGIS can be introduced later.

## Product

Customers search routes, request quotations, compare provider responses, and accept a quote. Providers manage vehicles, drivers, listings, and leads. Admins see platform totals and users.

## User preferences

The MVP is local-only and should not add payment, SMS, WhatsApp, cloud storage, Docker, or other external services.

## Gotchas

- Run `pnpm --filter @workspace/db run push` before the first seed if the database is new.
- Run API codegen after changing `lib/api-spec/openapi.yaml`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
