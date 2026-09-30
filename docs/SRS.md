# Software Requirement Specification (SRS)

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for **Themis** (also referred to as **Themisis**), a digital legal aid and guidance platform designed to make legal information and services accessible, comprehensible, and structured for citizens while providing case management and verification features for legal advocates.

### 1.2 Scope
Themis is a web-based portal. For **citizens**, it offers legal knowledge search, automated legal assessment (decision assistance), secure document management, document automation (generating complaints/RTIs), and case tracking. For **advocates**, it offers client management, case timeline tracking, hearing schedules, and profile verification. For **admins**, it provides a verification panel to authenticate advocates and platform analytics.

### 1.3 Definitions, Acronyms, and Abbreviations
* **SRS**: Software Requirement Specification
* **RTI**: Right to Information (India)
* **JWT**: JSON Web Token (for authentication)
* **ORACLE/LLM**: Large Language Model / AI engine (proposed for future extension)
* **ERD**: Entity Relationship Diagram

---

## 2. Overall Description

### 2.1 Product Perspective
Themis is an independent, responsive web application utilizing a modern monorepo layout:
* **Frontend**: React, TypeScript, Tailwind CSS, Vite, and shadcn/ui.
* **Backend**: Node.js, Hono framework, tRPC for typesafe API communication, and Zod for schema validation.
* **Database**: PostgreSQL with Drizzle ORM.

```
+--------------------------------------------------------+
|                      React Frontend                    |
|       (Vite, TypeScript, Tailwind, shadcn/ui)          |
+---------------------------+----------------------------+
                            |
                            | (tRPC / HTTP)
                            v
+--------------------------------------------------------+
|                     Hono Backend                       |
|               (TypeScript, tRPC, Zod)                  |
+---------------------------+----------------------------+
                            |
                            | (Drizzle ORM)
                            v
+--------------------------------------------------------+
|                  PostgreSQL Database                   |
+--------------------------------------------------------+
```

### 2.2 Product Functions
* **User Authentication**: Secure sign-up/login for Citizens, Advocates, and Admins.
* **Legal Knowledge Search**: Simple search for bare acts, judgments, and legal terminology.
* **Legal Assessment (Guided Questionnaire)**: Interactive Q&A trees that help citizens evaluate if they have a legal case.
* **Document Automation**: Guided forms to generate pre-filled legal documents (e.g., RTI applications, tenant notices, consumer complaints) in PDF/Text format.
* **Secure Document Management**: Uploading relevant identity documents or case files securely.
* **Case Management**: Tracking hearings, lawyers, key dates, case timelines, and history.
* **Advocate Directory & Verification**: Directory of verified advocates, advocate application form, and admin verification dashboard.

### 2.3 User Classes and Characteristics
1. **Citizen**: Non-legal background. Needs simplified interfaces, step-by-step guidance, legal term explanations, document generators, and case progress updates.
2. **Advocate**: Legal professionals. Need case management tools, scheduling details, and document review screens. Requires verification by submitting Bar Council details.
3. **Admin**: Platform managers. Review advocate credentials, handle user reports, and view platform metrics.

---

## 3. Specific Requirements

### 3.1 Functional Requirements

#### Module 1: User Authentication & Profiles
* **FR-1.1**: The system shall support Registration and Login for three roles: Citizen, Advocate, and Admin.
* **FR-1.2**: Authentication shall use JSON Web Tokens (JWT) stored securely (e.g., HTTP-only cookies or authorization headers).
* **FR-1.3**: Advocates must upload proof of registration (Bar Council Certificate/ID number) during registration.
* **FR-1.4**: Users shall be able to update their profiles, credentials, and settings.

#### Module 2: Legal Knowledge Search
* **FR-2.1**: The system shall provide a search bar to search through legal acts, sections, and summaries.
* **FR-2.2**: The search results shall highlight search keywords and display simplified human-readable summaries.

#### Module 3: Legal Assessment (Guided Questionnaire)
* **FR-3.1**: The platform shall provide a wizard interface asking citizens simple questions about their dispute (e.g., Consumer dispute, Rent dispute, Labor issue).
* **FR-3.2**: The system shall process responses to provide a preliminary assessment of legal options and relevant laws.

#### Module 4: Legal Document Automation
* **FR-4.1**: The system shall provide templates for common legal drafts:
  * RTI (Right to Information) Application
  * Consumer Complaint
  * Rent Agreement / Eviction Notice
* **FR-4.2**: The system shall prompt the user step-by-step for facts (names, dates, addresses, facts of the issue) and auto-fill the selected template.
* **FR-4.3**: Users shall be able to download the generated document in PDF or editable format.

#### Module 5: Secure Document Management
* **FR-5.1**: Users shall be able to upload case files, identity documents, and legal proofs (supported formats: PDF, PNG, JPG; size limit: 5MB).
* **FR-5.2**: Documents must be stored securely, and access must be restricted based on role-based permissions (only the owner citizen and the assigned advocate can view files).

#### Module 6: Case Management
* **FR-6.1**: Citizens can create a new Case entry and link it with an advocate (or keep it self-managed).
* **FR-6.2**: Advocates/Citizens can add hearing dates, tasks, and notes to the case timeline.
* **FR-6.3**: The system shall provide a timeline visualization of the case from initiation to resolution.
* **FR-6.4**: The system shall notify users of upcoming hearing dates.

#### Module 7: Advocate Verification & Directory
* **FR-7.1**: The system shall maintain a public directory of verified advocates.
* **FR-7.2**: Admin accounts shall have access to a Verification panel listing pending advocate registrations.
* **FR-7.3**: Admins can approve or reject advocate applications based on submitted credentials.

---

### 3.2 Non-Functional Requirements

#### Security
* **NFR-1.1**: All API communication must be encrypted via HTTPS/SSL.
* **NFR-1.2**: User passwords must be hashed using a strong hashing algorithm (e.g., bcrypt) before saving to the database.
* **NFR-1.3**: Role-based access control (RBAC) must restrict tRPC endpoints to authorized roles.

#### Reliability & Availability
* **NFR-2.1**: Database schema backups should be automated.
* **NFR-2.2**: System availability target of 99.5% uptime during standard usage.

#### Performance
* **NFR-3.1**: Search queries must return initial matches in less than 1.5 seconds under typical server load.
* **NFR-3.2**: PDF generation must complete within 3 seconds.

#### Usability & Accessibility
* **NFR-4.1**: The user interface must be fully responsive, adapting seamlessly to desktop, tablet, and mobile screens.
* **NFR-4.2**: Clear typography and visual cues must support non-technical citizens.
