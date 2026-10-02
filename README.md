# Themis — Digital Legal Aid & Statutory Guidance Platform

> **Simplifying Indian Justice & Statutory Intelligence, One Step at a Time.**

Themis is an advanced full-stack legal technology platform designed to empower citizens, advocates, and legal researchers. Built on an editorial monochrome Neomorphism design system, it provides high-precision search across 150+ Central Acts and the 2024 Bharatiya Nyaya Sanhita (BNS), calculates dispute merits through an automated evidentiary sandbox, generates legally binding procedural notices, and connects litigants with Bar Council-verified advocates.

---

## 🏛️ Core Features

| Module | Description |
|---|---|
| **National Statutory Repository** | Search bare acts, sections, bailable status, and plain-language summaries across Central Acts (India Code) & 2024 BNS/BNSS criminal laws. |
| **Claim Standing Sandbox** | Interactive merits calculator assessing evidentiary proof, limitation periods, and RPAD statutory notice requirements. |
| **Pleadings & Notice Automation** | Dynamic drafting of Section 138 NI Act notices, landlord-tenant eviction demands, RTI applications, and Consumer Forum petitions. |
| **Bar Council Verified Directory** | Search and consult enrolled advocates filtered by practice jurisdiction, High Court experience, and Bar Council Enrollment IDs. |
| **Case & Dossier Management** | Register legal matters, record hearing notes, track limitation deadlines, and upload evidentiary documents securely. |
| **Interactive 3D Monument** | GPU-accelerated Three.js Lady Justice monument with continuous, liquid scroll transitions and studio gallery lighting. |
| **Registry Admin Panel** | Administrative dashboard to audit Bar Council credentials, manage statutory databases, and review platform metrics. |

---

## 💻 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Three.js (WebGL GLTF 3D), Tailwind CSS, Lucide Icons, Neomorphic Clay Tokens.
- **Backend**: Node.js, Hono HTTP framework, tRPC v10 (end-to-end type safety), Zod validation, JWT authentication, bcrypt.js.
- **Database & ORM**: PostgreSQL 14+, Drizzle ORM, Drizzle Kit.
- **Infrastructure**: Docker & Docker Compose (PostgreSQL container), npm workspaces monorepo.

---

## 📋 Prerequisites

Before installing, ensure your system meets the following requirements:

- **Node.js**: `v18.0.0` or higher ([Download Node.js](https://nodejs.org/))
- **npm**: `v9.0.0` or higher (bundled with Node.js)
- **Docker & Docker Compose** (Recommended for PostgreSQL) — [Download Docker](https://www.docker.com/)  
  *OR* a standalone local **PostgreSQL 14+** service running on port `5432`.
- **Git** ([Download Git](https://git-scm.com/))

---

## 🚀 Complete Installation Guide

Follow these steps sequentially to set up and run Themis locally:

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd Themis
```

### Step 2: Install Monorepo Dependencies

Themis utilizes npm workspaces to manage both frontend and backend dependencies in a unified monorepo. Install all root, client, and server packages with a single command:

```bash
npm install
```

---

### Step 3: Configure Environment Variables

The backend requires a `.env` file for database connectivity and JWT authentication.

1. Navigate to or create `backend/.env` (an example template is provided in `backend/.env.example`):

```bash
# On Windows PowerShell:
cp backend/.env.example backend/.env

# On Linux / macOS:
cp backend/.env.example backend/.env
```

2. Open `backend/.env` and ensure the values match your local setup:

```env
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/themis
JWT_SECRET=themis_super_secure_jwt_dev_secret_key_2026
NODE_ENV=development
```

*(Note: The default `DATABASE_URL` matches the included Docker Compose configuration).*

---

### Step 4: Start the PostgreSQL Database

#### Option A: Using Docker (Recommended)

Start the preconfigured PostgreSQL 15 container in the background:

```bash
docker-compose up -d
```

Verify that the database container is healthy:
```bash
docker ps
```
You should see `themis-postgres` running and forwarding port `5432:5432`.

#### Option B: Using Local PostgreSQL

If running PostgreSQL locally without Docker:
1. Ensure the PostgreSQL service is active on port `5432`.
2. Connect to psql and create the `themis` database:
   ```sql
   CREATE DATABASE themis;
   ```
3. Update `DATABASE_URL` in `backend/.env` with your local PostgreSQL username and password.

---

### Step 5: Push Database Schema (Drizzle ORM)

Synchronize the database schema with Drizzle ORM to generate all tables (users, advocate profiles, cases, documents, bare acts, etc.):

```bash
npm run db:push
```

*(Alternatively, you can run `npm run db:push -w backend`)*.

---

### Step 6: Seed Database with Indian Law & Test Accounts

Populate the database with preconfigured Admin, Advocate, and Citizen accounts, along with 150+ codified bare act sections and verified High Court advocate rosters:

```bash
npm run db:seed
```

*(Alternatively: `npm run db:seed -w backend`)*.

---

### Step 7: Launch Development Servers

Start both the backend tRPC server (port 4000) and frontend Vite server (port 3000) concurrently:

```bash
npm run dev
```

Once launched:
- **Frontend Web Application**: [http://localhost:3000](http://localhost:3000)
- **Backend tRPC Server**: [http://localhost:4000](http://localhost:4000)

---

## 🔑 Pre-Seeded Demo Credentials

The platform includes pre-seeded accounts for immediate testing:

| Role | Email Address | Password | Capabilities |
|---|---|---|---|
| **System Administrator** | `admin@themis.legal` *(or `admin@themis.com`)* | `Admin123!` *(or `admin123`)* | Audit Bar Council IDs, approve/verify advocates, view system health. |
| **Verified Advocate** | `kurup.advocate@themis.kerala` | `Advocate123!` | Case docket management, consultation inbox, client notice issuance. |
| **Verified Advocate** | `vijayabhanu.adv@themis.kerala` | `Advocate123!` | Criminal trial advocacy, client messages, case hearings timeline. |
| **Citizen Litigant** | `citizen@themis.legal` | `Citizen123!` | Merits assessment sandbox, notice generation, consultation booking. |

*You can also register any new account as a Citizen or Advocate directly from the homepage or Sign Up modal.*

---

## 🛠️ Available Scripts Reference

All commands can be executed directly from the root repository directory:

| Command | Description |
|---|---|
| `npm run dev` | Runs both backend and frontend development servers concurrently. |
| `npm run dev:frontend` | Starts only the frontend Vite development server (`http://localhost:3000`). |
| `npm run dev:backend` | Starts only the backend Hono/tRPC server (`http://localhost:4000`). |
| `npm run db:push` | Pushes Drizzle ORM schema changes directly to the PostgreSQL database. |
| `npm run db:seed` | Seeds acts, sections, verified advocate profiles, and default accounts. |
| `npm run build` | Compiles both backend TypeScript and production frontend Vite bundle. |
| `npm run build:frontend` | Type-checks and builds the production frontend bundle into `frontend/dist`. |
| `npm run build:backend` | Compiles the backend TypeScript into `backend/dist`. |

---

## 📁 Repository Structure

```
Themis/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── client.ts          # Drizzle ORM Postgres connection instance
│   │   │   ├── schema.ts          # Relational DB schema (Users, Advocates, Cases, Acts)
│   │   │   ├── runSeed.ts         # Central database seeding pipeline
│   │   │   ├── seedAdmin.ts       # Administrator credentials seeder
│   │   │   ├── seedAdvocates.ts   # Kerala High Court verified advocates seeder
│   │   │   └── seedIndiaCode.ts   # Central Acts & 2024 BNS statutory provisions
│   │   ├── trpc/
│   │   │   ├── context.ts         # JWT authentication context
│   │   │   ├── trpc.ts            # Procedure builders & protected middleware
│   │   │   └── routers/           # Auth, Cases, Advocates, Acts, Notifications, Messages
│   │   └── index.ts               # Hono HTTP server & tRPC handler
│   ├── drizzle.config.ts          # Drizzle Kit migration configuration
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── models/
│   │       └── lady-justice.glb   # 3D Lady Justice model asset (Three.js WebGL)
│   ├── src/
│   │   ├── components/
│   │   │   ├── LadyJusticeViewer.tsx # 3D Three.js viewer with smooth scroll transitions
│   │   │   ├── LegalDocumentPreview.tsx # Interactive notice & pleading renderer
│   │   │   └── DocumentOCRScanner.tsx   # Evidence OCR text extraction tool
│   │   ├── pages/
│   │   │   ├── Home.tsx           # Editorial landing page with 3D monument
│   │   │   ├── Dashboard.tsx      # Unified Citizen & Advocate workspace
│   │   │   ├── Search.tsx         # Bare Acts & 2024 BNS search engine
│   │   │   ├── Assessment.tsx     # Evidentiary merits & standing questionnaire
│   │   │   ├── Documents.tsx      # Statutory notice & petition generator
│   │   │   ├── Advocates.tsx      # Bar Council verified counsel directory
│   │   │   ├── CaseDetails.tsx    # Case hearings, timeline & dossier manager
│   │   │   └── Profile.tsx        # Profile & Bar Council credentials
│   │   ├── hooks/                 # Authentication & responsive state hooks
│   │   ├── utils/                 # tRPC client & React Query bindings
│   │   ├── App.tsx                # Main router & layout shell
│   │   └── index.css              # Neomorphic tactile clay design system tokens
│   ├── vite.config.ts
│   └── package.json
│
├── docker-compose.yml             # PostgreSQL 15 database service definition
├── package.json                   # Root monorepo workspace configuration
└── README.md
```

---

## 🔧 Troubleshooting & FAQ

### 1. `DATABASE_URL` Connection Refused
- **Symptom**: `ECONNREFUSED 127.0.0.1:5432`.
- **Fix**: Verify Docker is running with `docker ps`. If the container stopped, run `docker-compose up -d`. If using native PostgreSQL, ensure the Windows/macOS service is running.

### 2. Port Conflicts
- Backend uses port `4000`, Frontend uses port `3000`, PostgreSQL uses port `5432`.
- If port `3000` or `4000` is occupied, identify the process using `netstat -ano | findstr :3000` (on Windows) or `lsof -i :3000` (on Unix) and terminate it, or adjust the port configuration.

### 3. 3D Model Loading
- The Lady Justice 3D asset is served from `frontend/public/models/lady-justice.glb`.
- Ensure browser hardware acceleration is enabled for optimal WebGL performance.

---

## ⚖️ Compliance & Disclaimer

Themis provides legal information, plain-language summaries of enacted statutes, and procedural document templates. It is designed to assist citizens and advocates in evaluating procedural requirements and does not constitute formal legal representation. Consultation with verified advocates registered with the Bar Council of India is recommended for court representation.

---

## 📄 License
This project is licensed under the MIT License — open for academic, educational, and public legal aid research.
