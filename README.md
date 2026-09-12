# Cab Marketplace

A local-first cab service marketplace MVP for connecting customers with cab and vehicle providers across Indian routes. Customers can search listings, request quotes, compare responses, and accept a provider. Providers can manage vehicles, drivers, listings, and incoming leads. Admins can review platform totals and user accounts.

---

## 🚀 Quick Start (Local & Windows Setup)

### Prerequisites

- **Node.js** (v18+) & **pnpm** (v9+)
- **PostgreSQL** (running locally via Docker or native PostgreSQL installation)

---

### Step 1: Install Dependencies

```bash
pnpm install
```

---

### Step 2: Start PostgreSQL Database

#### Option A: Using Docker (Recommended)

Run a local PostgreSQL container in PowerShell or Terminal:

```powershell
docker run -d `
  --name cab-postgres `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=cab_marketplace `
  -p 5432:5432 `
  postgres:16-alpine
```

#### Option B: Using Local PostgreSQL

Ensure PostgreSQL is running locally on port `5432` with a database named `cab_marketplace`.

---

### Step 3: Set Environment Variables & Provision Database

#### On Windows (PowerShell):

```powershell
# Set database connection string
$env:DATABASE_URL="postgres://postgres:postgres@localhost:5432/cab_marketplace"

# Push database schema
pnpm --filter @workspace/db run push

# Seed initial data (demo accounts, listings, vehicles)
pnpm --filter @workspace/api-server run seed
```

#### On Linux / macOS / Git Bash:

```bash
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/cab_marketplace"

pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run seed
```

---

### Step 4: Run the Application

You will need **two terminal windows**:

#### Terminal 1: Backend API Server (Port 4000)

- **PowerShell (Windows):**
  ```powershell
  $env:DATABASE_URL="postgres://postgres:postgres@localhost:5432/cab_marketplace"; $env:PORT=4000; pnpm --filter @workspace/api-server run dev
  ```
- **Linux / macOS:**
  ```bash
  DATABASE_URL="postgres://postgres:postgres@localhost:5432/cab_marketplace" PORT=4000 pnpm --filter @workspace/api-server run dev
  ```

#### Terminal 2: Frontend Web App (Port 3000)

- **PowerShell (Windows):**
  ```powershell
  $env:PORT=3000; $env:BASE_PATH="/"; pnpm --filter @workspace/cab-marketplace run dev
  ```
- **Linux / macOS:**
  ```bash
  PORT=3000 BASE_PATH=/ pnpm --filter @workspace/cab-marketplace run dev
  ```

Once running, navigate to **`http://localhost:3000`** in your browser.

---

## 🔑 Demo Accounts

All seeded accounts use password: **`CabMVP123!`**

| Role | Email | Description |
| --- | --- | --- |
| **Admin** | `admin@cabmarket.local` | Overview totals & user management |
| **Customer** | `arjun@cabmarket.local` | Search listings & request quotes |
| **Customer** | `meera@cabmarket.local` | Active quote comparison |
| **Customer** | `rohan@cabmarket.local` | Customer profile |
| **Provider** | `karthik@cabmarket.local` | Vehicle & driver fleet owner |
| **Provider** | `suresh@cabmarket.local` | Active quote responses |
| **Provider** | `coastal@cabmarket.local` | Intercity routes provider |
| **Provider** | `southern@cabmarket.local` | Regional cab agency |
| **Provider** | `greenline@cabmarket.local` | Fleet operator |

---

## ⚙️ API Surface

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Customer/provider profile read and update
- Role-aware dashboard summaries
- Public listing search with source, destination, vehicle type, seat count, and price filters
- Provider vehicle, driver, and listing CRUD
- Customer lead creation and provider quote submission
- Quotation accept/reject state changes
- Customer ratings for accepted quotations
- Protected admin overview and user list

Authentication is password-based for this local MVP. Passwords are hashed with `bcryptjs` and sessions are signed with a JWT secret from `JWT_SECRET` (defaults to local fallback).

---

## 🧪 Useful Commands

```bash
# Typecheck entire monorepo
pnpm run typecheck

# Typecheck API server
pnpm --filter @workspace/api-server run typecheck

# Typecheck Frontend
pnpm --filter @workspace/cab-marketplace run typecheck
```