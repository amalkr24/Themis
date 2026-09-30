# Themis — Digital Legal Aid & Guidance Platform

> Simplifying justice, one step at a time.

Themis is a full-stack web application that empowers citizens to access legal information, generate official documents, track court cases, and connect with verified advocates — all in one platform.

---

## Features

| Module | Description |
|---|---|
| **Legal Knowledge Search** | Search bare acts & clauses with simplified plain-language summaries |
| **Guided Legal Assessment** | Step-by-step questionnaire wizard to evaluate your legal standing |
| **Document Automation** | Generate RTI applications, consumer complaints, tenant notices from templates |
| **Case Management** | Register cases, add hearings, upload secure documents, track timelines |
| **Advocate Directory** | Browse Bar Council-verified advocates, filter by practice area |
| **Admin Verification** | Admin panel to approve/reject advocate registrations |
| **User Profile** | View account details and advocate verification status |

---

## Tech Stack

### Frontend
- **React** + **TypeScript** — Component framework
- **Vite** — Build tool and dev server
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** + **Radix UI** — Headless component primitives
- **tRPC React Query** — End-to-end type-safe API calls

### Backend
- **Node.js** + **Hono** — Lightweight HTTP server
- **tRPC** — Type-safe API protocol
- **Zod** — Runtime schema validation
- **JWT (jsonwebtoken + bcryptjs)** — Auth tokens & password hashing

### Database
- **PostgreSQL** — Relational database
- **Drizzle ORM** — Type-safe query builder

---

## Getting Started

### Prerequisites
- Node.js v18+
- PostgreSQL v14+ (or run Docker with the included `docker-compose.yml`)

### 1. Clone & Install Dependencies

```bash
git clone <your-repo-url>
cd Themisis
npm install
```

### 2. Start PostgreSQL Database

Using Docker:
```bash
docker-compose up -d
```

Or ensure you have a local PostgreSQL instance running on port `5432` with a database named `themis`.

### 3. Configure Environment

Copy the example env file for the backend:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your actual values:
```
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/themis
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

### 4. Push Database Schema

```bash
$env:PATH = "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Microsoft\VisualStudio\NodeJs;" + $env:PATH
cd backend
npm run db:push
```

### 5. Run Development Servers

From the root:
```bash
# Terminal 1 — Backend (port 4000)
npm run dev:backend

# Terminal 2 — Frontend (port 3000)
npm run dev:frontend
```

Then open: [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
Themisis/
├── docs/
│   ├── SRS.md                 # Software Requirement Specification
│   └── system_design.md       # Architecture, ERD, UML Diagrams
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── client.ts      # Drizzle DB connection
│   │   │   └── schema.ts      # All database table definitions
│   │   ├── trpc/
│   │   │   ├── context.ts     # JWT auth context
│   │   │   ├── trpc.ts        # Middleware & procedures
│   │   │   └── routers/       # Auth, Cases, Advocates, Admin, Templates
│   │   └── index.ts           # Hono server entry point
│   └── drizzle.config.ts
├── frontend/
│   └── src/
│       ├── pages/             # All page components
│       ├── hooks/             # useAuth hook
│       ├── utils/             # tRPC client setup
│       ├── App.tsx            # Router + providers
│       └── index.css          # Global design system
└── docker-compose.yml
```

---

## Default Accounts

After registering, you can create test accounts with different roles:

| Role | How |
|---|---|
| **Citizen** | Register with role "Citizen" |
| **Advocate** | Register with role "Advocate" and fill Bar Council details |
| **Admin** | Manually set role to `admin` in database after first signup |

---

## License
MIT — For educational/academic project purposes.
