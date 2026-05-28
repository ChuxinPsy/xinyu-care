# Regression Archive

Snapshot date: 2026-05-28 UTC

This directory archives the regression harness used to verify the Supabase-to-MySQL + Spring Boot rewrite. It exists so future development can rerun the same baseline checks without reconstructing the tooling from scattered shell history.

## Archived Files

- [scripts/cdp-smoke.mjs](/root/jerry/xinyu-care/app/specs/supabase-to-mysql-migration/regression-archive/scripts/cdp-smoke.mjs:1)
- [scripts/full_stack_check.sh](/root/jerry/xinyu-care/app/specs/supabase-to-mysql-migration/regression-archive/scripts/full_stack_check.sh:1)
- [scripts/smoke_mysql_backend.sh](/root/jerry/xinyu-care/app/specs/supabase-to-mysql-migration/regression-archive/scripts/smoke_mysql_backend.sh:1)
- [scripts/setup_mysql_backend.sh](/root/jerry/xinyu-care/app/specs/supabase-to-mysql-migration/regression-archive/scripts/setup_mysql_backend.sh:1)
- [commands.md](/root/jerry/xinyu-care/app/specs/supabase-to-mysql-migration/regression-archive/commands.md)

The active working copies still live under the repo-level `scripts/` directory. This archive is a dated snapshot tied to the migration closure.

## What This Archive Covers

### Browser-driven regression

`cdp-smoke.mjs` drives a real Chrome tab through the routed frontend and validates backend-backed behavior. This is the primary proof for:

- auth and session flows
- assessment completion and report persistence
- profile and personal info persistence
- diary updates
- smart-band persistence
- healing interactions
- doctor dashboard, patient tabs, alerts
- doctor verification-code flows
- doctor knowledge CRUD and document uploads

### Shell/API regression

`smoke_mysql_backend.sh` checks the fast backend baseline:

- health
- signup
- session
- CRUD
- storage upload/delete
- token refresh

`full_stack_check.sh` covers a broader backend and AI route sweep, including:

- auth
- diary and wearable persistence
- healing and community CRUD
- assessment persistence
- doctor workflows
- AI endpoints

### Local database bootstrap

`setup_mysql_backend.sh` creates the MySQL database and application user used by the backend.

## Operating Rules

1. Run CDP scenarios serially.
2. Point CDP at a clean Chrome debugging target.
3. Prefer browser scenarios for backend-critical user flows.
4. Use shell smokes to cover non-UI surfaces and fast local checks.
5. When backend contracts change, update both the live script in `scripts/` and this archive snapshot if the new flow becomes the new baseline.

## Prerequisites

- MySQL 8.0 reachable by the backend
- Spring Boot backend running
- frontend site running locally or reachable on the hosted URL
- Chrome started with remote debugging enabled on port `9222` unless `CDP_PORT` is overridden
- valid test accounts for patient and doctor scenarios where signup is not part of the flow
- fixture files for upload scenarios, such as sample images and documents

## Scenario Inventory

Current `cdp-smoke.mjs` snapshot scenarios:

- `auth`
- `assessment`
- `assessment-dialogue`
- `assessment-full`
- `assessment-expression-inspect`
- `inspect`
- `doctor`
- `patient-actions`
- `doctor-actions`
- `healing-favorite`
- `doctor-alert-handle`
- `doctor-dashboard-audit`
- `doctor-patient-tabs`
- `doctor-knowledge-crud`
- `profile-assets`
- `doctor-code-signup`
- `smartband-persistence`
- `knowledge-engagement`
- `health-report`
- `health-report-history`
- `profile-doctor-login`
- `doctor-code-delete`
- `record-update`
- `healing-depth`
- `patient-profile`
- `personal-info`
- `doctor-management`

Detailed evidence for the migration closure run is recorded in [verification-audit.md](/root/jerry/xinyu-care/app/specs/supabase-to-mysql-migration/verification-audit.md).
