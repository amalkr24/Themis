# System Design Document

This document describes the architectural design, database schema, and component structure for **Themis**.

---

## 1. High-Level Architecture

Themis follows a multi-tier Client-Server architecture utilizing a modern typesafe monorepo stack:

```mermaid
graph TD
    subgraph Client [Client Tier - Frontend]
        A[React UI + Vite] --> B[tRPC Client]
        A --> C[Tailwind CSS & shadcn/ui]
    end

    subgraph Server [Application Tier - Backend]
        B -->|tRPC HTTP Requests| D[Hono HTTP Framework]
        D --> E[tRPC Router & Middleware]
        E --> F[Zod Schemas]
        E --> G[Business Logic Service Layer]
    end

    subgraph Data [Data Tier]
        G -->|Drizzle ORM queries| H[(PostgreSQL Database)]
        G -->|Local or Cloud File API| I[[Storage Bucket / Local Storage]]
    end
```

---

## 2. Database Schema Design (ERD)

The database schema is designed to support users (citizens, advocates, and admins), case workflows, document management, and lawyer verification.

```mermaid
erDiagram
    users ||--o| advocate_profiles : "has profile (if advocate)"
    users ||--o{ cases : "creates (citizen)"
    users ||--o{ cases : "handles (advocate)"
    users ||--o{ case_documents : "uploads"
    users ||--o{ generated_documents : "generates"
    
    cases ||--o{ case_hearings : "scheduled hearings"
    cases ||--o{ case_documents : "associated files"
    
    document_templates ||--o{ generated_documents : "instantiated by"

    users {
        uuid id PK
        varchar name
        varchar email UK
        varchar password_hash
        varchar role "citizen | advocate | admin"
        timestamp created_at
        timestamp updated_at
    }

    advocate_profiles {
        uuid id PK
        uuid user_id FK
        varchar bar_council_number UK
        varchar practice_areas "comma-separated or array"
        integer experience_years
        text bio
        varchar status "pending | approved | rejected"
        timestamp verified_at
        uuid verified_by FK
        timestamp created_at
        timestamp updated_at
    }

    cases {
        uuid id PK
        varchar title
        text description
        varchar category "consumer | rent | labor | other"
        varchar status "active | closed | pending"
        uuid citizen_id FK
        uuid advocate_id FK "nullable"
        timestamp created_at
        timestamp updated_at
    }

    case_hearings {
        uuid id PK
        uuid case_id FK
        timestamp hearing_date
        text notes
        varchar status "scheduled | completed | postponed"
        timestamp created_at
        timestamp updated_at
    }

    case_documents {
        uuid id PK
        uuid case_id FK
        uuid uploader_id FK
        varchar title
        varchar file_path
        varchar file_type
        integer file_size
        timestamp created_at
        timestamp updated_at
    }

    document_templates {
        uuid id PK
        varchar title
        text description
        varchar category
        text content_template
        jsonb fields_schema
        timestamp created_at
        timestamp updated_at
    }

    generated_documents {
        uuid id PK
        uuid template_id FK
        uuid user_id FK
        jsonb filled_data
        varchar file_path
        timestamp created_at
    }
```

---

## 3. Key Sequence Flows

### 3.1 Advocate Registration & Verification
This flow details how an advocate registers and gets verified by an admin to gain platform credibility and list in the public directory.

```mermaid
sequenceDiagram
    actor Adv as Advocate
    actor Adm as Admin
    participant FE as Frontend (React)
    participant BE as Backend (Hono + tRPC)
    participant DB as Database (Postgres)

    Adv->>FE: Register with role="advocate" & Bar Details
    FE->>BE: tRPC auth.register(advocateData)
    BE->>DB: Insert User & Advocate Profile (status="pending")
    BE-->>FE: Return success & JWT token
    FE-->>Adv: Prompt "Awaiting Verification" message

    Adm->>FE: Visit Admin Dashboard
    FE->>BE: tRPC admin.getPendingAdvocates()
    BE->>DB: Fetch profiles where status="pending"
    DB-->>BE: Return profiles list
    BE-->>FE: Return profiles list
    FE-->>Adm: Display pending advocates

    Adm->>FE: Click "Approve" on Advocate Profile
    FE->>BE: tRPC admin.verifyAdvocate({ id, status: "approved" })
    BE->>DB: Update profile status="approved", verified_by=adminId
    BE-->>FE: Action successful
    FE-->>Adm: Show approved state
```

### 3.2 Legal Document Automation
This flow shows how a citizen utilizes guided templates to generate automated legal documents (e.g., RTI application).

```mermaid
sequenceDiagram
    actor Cit as Citizen
    participant FE as Frontend (React)
    participant BE as Backend (Hono + tRPC)
    participant DB as Database (Postgres)

    Cit->>FE: Select Document Template (e.g., RTI)
    FE->>BE: tRPC templates.getById({ id })
    BE->>DB: Fetch template content & fields_schema
    DB-->>BE: Return template data
    BE-->>FE: Return template fields schema
    FE->>FE: Render Step-by-Step Questionnaire Form
    Cit->>FE: Fill details (Name, Address, Query) & Submit
    FE->>BE: tRPC templates.generate({ templateId, filledData })
    BE->>BE: Parse schema & compile document string
    BE->>BE: Generate PDF document on server
    BE->>DB: Save Generated Document record & file details
    BE-->>FE: Return file URL or download stream
    FE-->>Cit: Download generated PDF / Display Preview
```

---

## 4. Module & Directory Structure

To structure our monorepo cleanly, we organize our files as follows:

```text
/
├── docs/                      # Technical specification documentation
│   ├── SRS.md
│   └── system_design.md
├── package.json               # Monorepo workspaces definition
├── frontend/                  # React + Vite + TS client app
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css          # Design system variables & custom styles
│   │   ├── components/        # Reusable shadcn/ui & generic components
│   │   │   └── ui/            # shadcn component templates
│   │   ├── hooks/             # Custom React hooks (tRPC queries/mutations)
│   │   ├── pages/             # Route-level page views (Dashboard, Search, etc.)
│   │   ├── utils/             # Helper utilities (tRPC client config)
│   │   └── types/             # Frontend-specific types
└── backend/                   # Hono + tRPC + Drizzle server app
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts           # Hono entry point
    │   ├── db/                # Drizzle DB config and schemas
    │   │   ├── client.ts      # Database connection client
    │   │   └── schema.ts      # Single file or split schemas
    │   ├── trpc/              # tRPC router declarations
    │   │   ├── context.ts     # tRPC context setup
    │   │   ├── trpc.ts        # Router initialization & middlewares
    │   │   └── routers/       # Module routers (auth, case, advocate, etc.)
    │   └── utils/             # Common helper modules (JWT token handling, etc.)
```
