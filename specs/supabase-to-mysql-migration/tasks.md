# Supabase To MySQL Migration Tasks

## Status Snapshot

This task list has been converted from implementation planning into a closure tracker.

Rule of interpretation:

- checked items are implemented and, where noted, already verified against the current runtime
- unchecked items are remaining operational follow-ups, not blockers for the currently deployed MySQL + Spring Boot stack

## Completed Migration Work

- [x] 1. Freeze the Supabase contract surface and define the migration target
  - auth, tables, storage buckets, AI routes, and frontend touch points were audited
  - the migration scope was captured under `specs/supabase-to-mysql-migration/`

- [x] 2. Scaffold the Spring Boot backend inside the repository
  - backend service exists under `server/`
  - health endpoint, config loading, logging, and deployment unit are in place
  - hosted runtime uses `deploy/xinyu-care-backend.service`

- [x] 3. Implement the MySQL schema and seed baseline data
  - Flyway migrations define the active MySQL schema
  - baseline healing content and category seed data exist
  - UUID-style IDs, UTC timestamps, JSON columns, and foreign keys were carried over

- [x] 4. Implement backend auth and session handling
  - signup, login, refresh, logout, and current-session flows are live
  - doctor verification-code signup is live
  - browser verification passed for patient auth and doctor auth flows

- [x] 5. Move runtime data access from Supabase SDK calls to backend APIs
  - frontend runtime now goes through `src/lib/backend-api.ts` and `src/lib/backend-auth.ts`
  - `src/db/api.ts` remains the main frontend facade while delegating to the backend
  - browser runtime no longer depends on Supabase for active CRUD

- [x] 6. Implement backend domain APIs for routed product flows
  - patient-side and doctor-side routed flows now persist through the Spring Boot backend
  - business behavior previously tied to Supabase-side logic is now served by backend endpoints
  - critical flows were validated through live browser interaction

- [x] 7. Implement storage abstraction and file endpoints
  - filesystem mode works for local development
  - S3-compatible production mode is configured as the production path
  - avatar, background, diary image, and knowledge document workflows are live

- [x] 8. Consolidate AI routes into the backend
  - chat completion, multimodal analysis, speech recognition, RAG retrieval, and fusion endpoints are live
  - assessment browser verification passed after fixing the raw JSON leakage issue in dialogue rendering

- [x] 9. Add local setup and smoke tooling
  - `npm run setup:mysql`
  - `npm run smoke:mysql-backend`
  - `npm run verify:mysql-migration`
  - `scripts/full_stack_check.sh`
  - `scripts/cdp-smoke.mjs`

- [x] 10. Deploy and verify the hosted runtime
  - live site and backend are running on the rewritten stack
  - browser-driven verification covered backend-critical patient and doctor workflows
  - evidence is recorded in `verification-audit.md`

- [x] 11. Archive the regression harness for future development
  - reusable regression scripts are archived under `specs/supabase-to-mysql-migration/regression-archive/`
  - archive includes command guidance and scenario inventory for future reruns

## Browser-Verified Flow Coverage

- [x] 12. Patient auth, session, and logout
- [x] 13. Assessment dialogue, full completion, report generation, and history switching
- [x] 14. Record create/update persistence
- [x] 15. Personal info, avatar, and background persistence
- [x] 16. Smart-band connect, persist, and disconnect
- [x] 17. Healing completion, favorites, and knowledge engagement counters
- [x] 18. Doctor dashboard aggregates and patient detail tabs
- [x] 19. Doctor alert handling persistence
- [x] 20. Doctor verification-code create, signup, consume, reject reuse, and delete
- [x] 21. Doctor knowledge CRUD and document upload/delete

## Remaining Follow-Ups

- [ ] 22. Execute a real historical Supabase data migration if legacy production data must be retained
  - export source rows and assets
  - import into MySQL and replacement storage
  - produce row-count and representative-record validation

- [ ] 23. Remove obsolete Supabase dependencies and dead compatibility assets once they are no longer needed for traceability or tooling
  - confirm no active script still depends on them
  - then clean repo dependencies and stale runtime artifacts

- [ ] 24. Clean remaining hosted shell issues that are outside the core migration path
  - remove production-inappropriate CDN usage from the outer shell
  - clear minor accessibility and shell-level warnings that do not currently block backend correctness

- [ ] 25. Expand regression coverage when frontend-only placeholder flows become real backend features
  - connect-doctor
  - healing-plan
  - HTP history persistence
  - privacy settings persistence
  - subscription workflows

## Maintenance Rule

- [x] 26. Keep the migration docs aligned with the implemented runtime
  - `requirements.md` records delivered requirements and residual obligations
  - `design.md` records the implemented architecture
  - `verification-audit.md` records current proof
  - this `tasks.md` now separates delivered scope from remaining follow-ups
