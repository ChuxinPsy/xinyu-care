# Xinyu Care MySQL Rewrite Verification Audit

Date: 2026-05-28 UTC
Live site: `https://jp.jerrypsy.top/xinyu-care/`
Backend health: `http://127.0.0.1:8088/api/health`
Method: real browser navigation and clicks against the live deployment, with targeted API/database reads only to confirm what the UI wrote or loaded.

## Browser scenarios used

- `auth`
- `assessment-dialogue`
- `assessment-full`
- `health-report`
- `health-report-history`
- `record-update`
- `personal-info`
- `profile-assets`
- `smartband-persistence`
- `healing-depth`
- `knowledge-engagement`
- `patient-profile`
- `profile-doctor-login`
- `doctor-dashboard-audit`
- `doctor-patient-tabs`
- `doctor-alert-handle`
- `doctor-code-signup`
- `doctor-code-delete`
- `doctor-knowledge-crud`

## Scope

This audit covers the current routed application after the Supabase-to-MySQL + Spring Boot rewrite. It separates:

- browser-proven backend/database flows
- browser-proven storage flows
- frontend-only or mock flows that do not currently have a backend contract

## Browser-proven backend/database flows

### Auth and session

- patient signup and login: passed
- doctor login: passed
- doctor signup with verification code: passed
- verification code one-time consumption: passed
- patient profile -> doctor backend login redirect: passed
- patient logout: passed
- doctor logout: passed

## Patient-side flows

### Assessment

- scale dialogue starts correctly with natural question text: passed
- scale progress increments from `0 / 9` to `1 / 9` with no raw JSON leaked into dialogue: passed
- full assessment chain scale -> voice -> expression -> fusion report persistence: passed
- progress `0 / 3` -> `3 / 3` and fusion report generation: passed
- risk alert creation from fusion report: passed
- health report entry from profile opens real multimodal report data: passed
- health report history list loads from backend and can switch to an older report: passed

### Record / emotion diary

- create diary entry from `/record`: passed
- reopen same day entry and update emotion level: passed
- update same entry image selection: passed
- persistence confirmed in `emotion_diaries`: passed

### Profile and personal data

- profile basic info edit/save/persist: passed
- dedicated personal info page save/persist: passed
- avatar upload/save/persist: passed
- background upload/save/persist: passed
- personal info save: passed

### Smart band

- device connect flow from profile/smart-band page: passed
- wearable row creation/update persistence in `wearable_data`: passed
- disconnect flow: passed

### Healing

- meditation completion save from healing page: passed
- persistence in `meditation_sessions`: passed
- healing diary save from healing page: passed
- persistence in `emotion_diaries`: passed
- knowledge detail open increments `view_count`: passed
- knowledge like increments `like_count`: passed
- favorite toggle persists in `user_favorites`: passed

## Doctor-side flows

### Dashboard and alerts

- doctor dashboard loads real aggregates: passed
- doctor alert handling via page dialog persists: passed

### Patient management

- patient list loads from backend: passed
- patient detail dialog loads real patient profile: passed
- tabbed reads for scale / voice / expression / conversation: passed
- counts align with backend data for audited patient: passed

### Verification code management

- create verification code: passed
- delete verification code: passed
- delete confirmed in `doctor_verification_codes`: passed

### Knowledge management

- create assessment knowledge entry: passed
- edit assessment knowledge entry: passed
- upload knowledge document: passed
- delete knowledge document entry: passed

## Frontend-only or mock flows

These routes or interactions are currently not backed by meaningful database/business logic, so they are not backend blockers:

- `/profile/connect-doctor`
- `/profile/healing-plan`
- `/assessment/htp` history save
- privacy toggle state on `/profile/privacy`
- subscription purchase CTA on `/profile/subscription`

Notes:

- HTP currently saves only to local component state and toast feedback. It does not persist to backend storage.
- connect-doctor and healing-plan are presentation flows with navigation/toast behavior, not data workflows.

## Fixes validated during verification

- doctor login launched from patient profile now refreshes auth/profile state correctly and lands on `/doctor/dashboard`
- healing game icon path works under the `/xinyu-care/` subpath deployment
- assessment scale dialogue no longer exposes embedded JSON/config text in the live UI

## Current evidence highlights

- patient auth current run created user `auto_75581931` and confirmed signup + fresh login on the live site
- doctor dashboard current run showed UI values matching backend audit: patients `21`, active alerts `0`, today assessments `11`, average emotion `3.3`
- personal info current run persisted `full_name`, `gender`, `birth_date`, `phone`, `wechat`, `email`, `bio.height`, `bio.weight`
- report history current run switched the visible fusion score from `31` to `41`
- profile asset current run uploaded avatar and background through storage, then confirmed the saved public URLs in `profiles`
- doctor verification-code signup current run created doctor `doctor_auto_615910`, marked code `DOC615910` as used, and rejected code reuse with HTTP `400`
- doctor alert current run created a fresh alert, handled it through the page, and confirmed `is_handled=true`, `handled_by`, `handled_at`, and `notes`
- doctor knowledge current run created and edited an assessment entry, uploaded `README.md` as a knowledge document, then deleted the document entry and confirmed it was gone

## Known non-blocking observations

- the live page still loads some external CDN assets from the legacy `index.html` shell
- one doctor patient detail dialog emits an accessibility warning about missing `Description` / `aria-describedby`
- `HealthReportDialog` exists in code, but the current profile entry opens `FusionReport`; this is current behavior, not a broken link

## Conclusion

As of 2026-05-28 UTC, the current routed backend-facing patient and doctor workflows are passing under real browser-driven verification on the live deployment. Remaining gaps are limited to flows that are currently frontend-only by design, plus a few non-blocking cleanup items.
