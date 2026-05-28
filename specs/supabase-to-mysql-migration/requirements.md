# Supabase To MySQL Migration Requirements

## Status

Document status: closure update after the MySQL 8.0 + Spring Boot rewrite.

Runtime status as of 2026-05-28 UTC:

- the live routed application runs on a Spring Boot backend and MySQL 8.0
- browser runtime no longer depends on Supabase for auth, CRUD, storage, or AI routes
- Supabase SQL and functions remain in-repo only as migration reference material
- verification evidence is recorded in [verification-audit.md](/root/jerry/xinyu-care/app/specs/supabase-to-mysql-migration/verification-audit.md)

## Background

The original project used Supabase as a combined platform for auth, browser-side relational access, storage, and edge functions. That architecture was replaced with a conventional backend boundary so the application can run on a self-managed stack centered on MySQL 8.0.

This document now records the delivered requirements baseline, the scope proven in browser-driven verification, and the remaining obligations that still matter for future development.

## Delivered Outcome

The current delivered stack is:

- `Vite + React` frontend
- `Spring Boot` backend API
- `MySQL 8.0` relational store managed by Flyway
- backend-managed file storage with filesystem mode in development and S3-compatible mode in production
- backend-managed AI endpoints using OpenRouter

The active runtime no longer requires:

- Supabase Auth
- browser-direct Supabase table access
- Supabase Storage
- Supabase Edge Functions

## Goals

- Keep the frontend product surface operational after removing Supabase runtime usage.
- Preserve backend-backed patient and doctor workflows.
- Move auth, authorization, storage, and AI integration behind backend APIs.
- Keep local development and hosted deployment operable on the new stack.
- Preserve enough migration traceability that future work can continue without rediscovering the rewrite.

## Non-Goals

- Reproducing Supabase as a platform-compatible abstraction layer.
- Keeping browser-direct database access.
- Rewriting the frontend routing structure during the migration.
- Migrating file binaries into MySQL.
- Treating frontend-only placeholder flows as blockers for backend cutover.

## Runtime Scope In The Current Repository

### Frontend runtime boundary

- auth state is handled through [src/lib/backend-auth.ts](/root/jerry/xinyu-care/app/src/lib/backend-auth.ts:1) and [src/contexts/AuthContext.tsx](/root/jerry/xinyu-care/app/src/contexts/AuthContext.tsx:1)
- business CRUD and upload calls are handled through [src/lib/backend-api.ts](/root/jerry/xinyu-care/app/src/lib/backend-api.ts:1) and [src/db/api.ts](/root/jerry/xinyu-care/app/src/db/api.ts:1)
- AI calls are routed through backend function endpoints from [src/db/openrouter.ts](/root/jerry/xinyu-care/app/src/db/openrouter.ts:1)

### Backend runtime boundary

- auth routes are served from [server/src/main/java/com/xinyucare/backend/auth/AuthController.java](/root/jerry/xinyu-care/app/server/src/main/java/com/xinyucare/backend/auth/AuthController.java:1)
- AI routes are served from [server/src/main/java/com/xinyucare/backend/functions/FunctionController.java](/root/jerry/xinyu-care/app/server/src/main/java/com/xinyucare/backend/functions/FunctionController.java:1)
- schema and seed data are managed by Flyway in [server/src/main/resources/db/migration](/root/jerry/xinyu-care/app/server/src/main/resources/db/migration)
- hosted deployment is managed through [deploy/xinyu-care-backend.service](/root/jerry/xinyu-care/app/deploy/xinyu-care-backend.service:1)

### Current relational data domains

- users and profiles
- emotion diaries
- assessments and multimodal reports
- wearable data
- healing content, favorites, and meditation sessions
- community posts, comments, and likes
- doctor-patient links and risk alerts
- knowledge base and knowledge documents
- doctor verification codes

### Current storage namespaces

- `avatars/`
- `backgrounds/`
- `diary-images/`
- `knowledge-documents/`

## Actors

- patient user
- doctor user
- admin user
- operator/developer

## Functional Requirements

### FR-1 Authentication

The system shall provide backend-issued signup, login, logout, refresh, and current-session APIs without Supabase Auth.

Status: delivered and browser-verified.

### FR-2 Authorization

The system shall enforce user, doctor, and admin permissions on the backend for protected operations that previously relied on frontend state or Supabase RLS.

Status: delivered for the currently verified user and doctor flows. Future features must continue using backend authorization as the only trust boundary.

### FR-3 Profile And Identity Data

The system shall preserve the profile fields used by the existing frontend, including role, avatar/background URLs, contact fields, personal details, and profile display fields.

Status: delivered and browser-verified.

### FR-4 Core Domain CRUD

The system shall preserve backend persistence for the current patient and doctor domains used by the routed application.

Status: delivered for the verified flows listed in [verification-audit.md](/root/jerry/xinyu-care/app/specs/supabase-to-mysql-migration/verification-audit.md).

### FR-5 File Storage

The system shall support upload, delete, and public URL access for profile assets, diary images, and knowledge documents without Supabase Storage.

Status: delivered and browser-verified.

### FR-6 AI Services

The system shall provide backend endpoints for chat completion, multimodal analysis, speech recognition, retrieval, and multimodal fusion using the configured AI provider.

Status: delivered. Browser-backed assessment verification passed; shell smoke coverage exists for the full AI route set.

### FR-7 Workflow Equivalence

The system shall preserve the business workflows needed by the live routed experience, including doctor verification-code usage, risk alert creation/handling, report history reads, favorites, and content counters.

Status: delivered for the verified flows.

### FR-8 Local Operations

The system shall run locally with frontend, Spring Boot backend, MySQL 8.0, and development storage without Supabase runtime dependencies.

Status: delivered through repo scripts and backend configuration.

### FR-9 Hosted Operations

The system shall support hosted deployment as a long-running backend service paired with the built frontend site.

Status: delivered in the current hosted environment.

### FR-10 Regression Preservation

The project shall keep a reusable regression harness that covers backend-critical flows through real browser interaction where possible, with supplemental shell checks for non-UI endpoints.

Status: delivered through the archived regression harness and verification audit.

### FR-11 Migration Traceability

The repository shall retain enough migration reference material to support future refactors, audits, and source-data migration work.

Status: delivered. Supabase artifacts remain as reference only, and the migration docs now record the implemented target state.

### FR-12 Source Data Migration

If historical Supabase production data must be imported into MySQL, the project shall provide an explicit export, transform, import, and validation process rather than relying on ad hoc manual steps.

Status: still open unless and until a real source-data migration run is executed.

## Acceptance Baseline

The migration is considered functionally accepted for the current runtime when all of the following remain true:

1. The hosted frontend authenticates users through `/api/auth/*`.
2. Patient assessment, report, record, profile, smart-band, and healing flows persist real MySQL-backed data.
3. Doctor dashboard, patient tabs, alert handling, verification-code flows, and knowledge management persist real MySQL-backed data.
4. Profile assets and knowledge documents upload through backend storage routes and remain readable through public URLs.
5. Backend AI endpoints remain callable by the frontend assessment flows.
6. Regression scripts remain runnable for local or hosted verification.

Evidence for the current acceptance run is captured in [verification-audit.md](/root/jerry/xinyu-care/app/specs/supabase-to-mysql-migration/verification-audit.md).

## Residual Requirements

The following requirements remain intentionally open after this closure pass:

1. execute a real historical data migration from Supabase if legacy production data must be retained
2. remove obsolete Supabase development dependencies and dead assets once no migration tooling still needs them
3. replace remaining legacy frontend shell/CDN usage in the hosted page where it does not belong in production
4. expand regression coverage when currently frontend-only placeholder routes become real backend features

## Constraints

- MySQL target remains `8.0`.
- frontend routes should remain stable unless a new feature explicitly changes them
- browser clients must continue to use backend APIs only
- OpenRouter remains the configured AI provider unless separately changed
- future development should treat the Spring Boot backend as the system of record

## Assumptions

- future development will continue on the MySQL + Spring Boot stack rather than reintroducing Supabase into the runtime path
- filesystem storage is acceptable for local development, while production uses an S3-compatible provider
- the verification archive is maintained whenever backend-critical flows change
- any future production data migration will be planned explicitly and validated with row counts plus representative record checks
