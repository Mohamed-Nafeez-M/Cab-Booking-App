# Cab Marketplace

A local-first cab service marketplace MVP for connecting customers with cab and vehicle providers across Indian routes. Customers can search listings, request quotes, compare responses, and accept a provider. Providers can manage vehicles, drivers, listings, and incoming leads. Admins can review platform totals and user accounts.

## Run locally

This workspace uses the Replit-provided PostgreSQL database for local development.

```bash
pnpm install
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run seed
```

The managed workflows start the services automatically:

- Web app: the project preview
- API: `/api`

To run the same services manually:

```bash
PORT=4000 pnpm --filter @workspace/api-server run dev
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/cab-marketplace run dev
```

The app uses the workspace's Vite + Express + Drizzle runtime so the complete MVP can run in one local monorepo. The data model is relational and keeps geographic search fields modular for a future PostGIS migration.

## Demo accounts

All seeded accounts use:

```text
Password: CabMVP123!
```

| Role | Email |
| --- | --- |
| Admin | admin@cabmarket.local |
| Customer | arjun@cabmarket.local |
| Customer | meera@cabmarket.local |
| Customer | rohan@cabmarket.local |
| Provider | karthik@cabmarket.local |
| Provider | suresh@cabmarket.local |
| Provider | coastal@cabmarket.local |
| Provider | southern@cabmarket.local |
| Provider | greenline@cabmarket.local |

## API surface

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Customer/provider profile read and update
- Role-aware dashboard summaries
- Public listing search with source, destination, vehicle type, seat count, and price filters
- Provider vehicle, driver, and listing CRUD
- Customer lead creation and provider quote submission
- Quotation accept/reject state changes
- Customer ratings for accepted quotations
- Protected admin overview and user list

Authentication is password-based for this local MVP. Passwords are hashed with bcryptjs and sessions are signed with a JWT secret from `JWT_SECRET` or the provided local session secret fallback.

## Useful checks

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/cab-marketplace run typecheck
```