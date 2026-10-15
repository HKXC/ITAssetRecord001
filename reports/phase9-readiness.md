# Phase 9: Production Readiness & Deployment Planning — Readiness Report

**Project:** IT Asset Management — Next.js 16.4 + Supabase admin dashboard with server-side Chromium PDF generation  
**Date of assessment:** 2026-10-12  
**Scope:** Module A–F only, as approved. No new features added during this assessment.

## 0. Grade

GRADES spec=6 design=5 correctness=5 quality=5; biggest gap: build is red and the security model is single-admin with no RBAC, no audit log, and no confirmed signed-URL scope check

This is a demanding read. The work is real and coherent, but “production readiness” is a high bar and the project has not cleared it yet.

---

## 1. Actual project status

### What exists on disk

- **Skeleton + app code present.** The repo has a real Next.js app with `src/app/(auth)`, `src/app/(app)`, `src/app/api`, `src/components`, `src/lib`, `src/env.ts`, `src/proxy.ts`, plus `supabase/migrations/`, `Dockerfile`, `compose.yaml`, `playwright.config.ts`, `vitest.config.mts`, `package.json`, `.env.example`.
- **Feature coverage is broad for the approved scope.** Login page, sign-out, authenticated app shell with sidebar, asset list with filters/pagination/selection, asset create and edit, asset detail with document list, consolidated register generation from a selected set, document list, document detail with revision history and register item list, asset-type settings (create / update / toggle-active), and a download route for generated PDFs.
- **Data layer is non-trivial.** Four tables (`asset_types`, `assets`, `documents`, `document_items`), RLS policies, a service-role-only numbering RPC, a service-role-only `create_document_with_items` function, a seeds file, and a dashboard stats RPC were all written.
- **PDF pipeline is not toy code.** Thai font is bundled and embedded, Chromium is launched once per process, register uses fixed `<colgroup>` widths, register HTML is escaped, and there are sample PDFs in `artifacts/`.
- **Tests exist but are incomplete.** There are unit tests (`tests/unit/*`) and an integration PDF test (`tests/integration/pdf.test.ts`) plus a measure diagnostic and an E2E skeleton. This report treats that as “some tests exist,” not “the suite is green.”

### Build state

- **`npm run build` is red.** The current error is a duplicate export in `src/app/(app)/assets/actions.ts`:
  - `export const _actionJustification = async () => { ... }` appears twice.
- This is the same class of issue seen repeatedly in this file: a `\"use server\"` module that Netlify/Turbopack wants to treat as a pure utility module unless it exports an async function, combined with a copy/paste that left two competing definitions.
- Because the build is red, **no production bundle has been verified**. TypeScript may be clean, but a red build means `/documents/[id]/download`, the document actions, and the asset actions are not confirmed to bundle and collect correctly in this run.

### Test state

- I did not re-run the suites during this assessment.
- Prior context indicates unit tests had wrong assertions that were then fixed, and the PDF integration test surfaced real rendering behavior (Thai combining marks as NUL in the text layer; register pagination measured in pages).
- What I cannot assert from evidence on disk right now:
  - whether `npm run test` / `npm run test:unit` is currently green
  - whether `npm run test:pdf` is currently green
  - whether the E2E suite is wired to a running app or still skips itself

Treat the test suite as **unknown-green** until re-run.

---

## 2. Critical issues

### C-1. The build is failing

- File: `src/app/(app)/assets/actions.ts`
- Problem: two conflicting exports of `_actionJustification`.
- Effect: Turbopack build fails during page-data collection. Nothing that imports this action module is confirmed shippable in the current state.

This is the first fix to make before any deployment conversation.

### C-2. Single-admin security model, not production multi-user

- Sign-in is email + password to a single Supabase auth account.
- There is no role, no team, no approval flow, no per-row ownership, no audit log.
- For an internal IT asset register this can be acceptable as an **initial** model, but it is not “production ready” in the sense of multi-admin organizations, delegated operators, or any accountability trail.
- This is a decision, not a defect: the project chose simplicity. The readiness impact is real, though: you cannot hand this to a 3-person IT team tomorrow without a plan for who can do what and who did what.

### C-3. PDF download is “any authenticated user can download any document”

- The download route authenticates the user, then creates a signed URL for the requested document.
- I see no check that the caller is allowed to download **that specific document**.
- In the current app, all authenticated users can read all assets and all documents, so this matches the data model. If the organization later wants HR to see assets but not finance PDFs, or wants a reviewer role, this download path does not have the hook for it.
- The signed URL itself is short-lived and the bucket is private, which is good. The missing piece is authorization, not cryptography.

---

## 3. Security and data-integrity findings

### 3.1 What is done well

- **Secret key stays server-side.**
  - `SUPABASE_SECRET_KEY` is read only in `src/lib/supabase/admin.ts`.
  - `createAdminSupabaseClient()` uses it to bypass RLS.
  - No `NEXT_PUBLIC_SUPABASE_ANON_KEY` or secret appears in browser code.
  - `.env.example` does not contain real secrets; it only documents the variable names.
- **Admin client is clearly labeled and used consistently.**
  - Document generation, numbering, document CRUD, storage upload/signed-URL, and document reads in `src/lib/services/documents.ts` all use the service-role client.
  - Asset reads/writes and asset-type settings use the server (cookie) client, so RLS applies.
- **RLS is enabled with a clean baseline.**
  - `supabase/migrations/20261012090100_rls.sql` enables RLS on all four tables and revokes anon/authenticated access before granting anything.
  - Policies are explicit: authenticated users can read/write assets, read asset types, write asset types, and read documents/document_items.
  - `service_role` is the only writer to documents and storage, and the migration explicitly says there are no storage policies because uploads and signed URLs happen server-side after app-level authorization.
- **Register integrity has defensive code.**
  - `generateRegisterDocument()` re-reads assets, restores order, and checks `document_items` count against the rendered row count before marking ready.
  - The document+items insert is atomic via `create_document_with_items()`.
- **Document immutability is real.**
  - Regeneration creates a new revision + new storage path instead of overwriting.
  - Storage upload uses `upsert: false`.
- **Error handling does not leak internals to users.**
  - `AppError` carries Thai messages and a code.
  - Non-`AppError` failures are logged server-side and converted to generic messages in actions.
  - Constraint errors are mapped to user-facing messages via `mapPostgresError()`.

### 3.2 Issues and gaps

- **Authentication is weakest-link password auth to one account.**
  - No MFA, no brute-force lockout visible in app code (the mitigation would be in Supabase project settings / email confirmations / password policy, which I cannot verify here).
  - The app itself gives the same generic “อีเมลหรือรหัสผ่านไม่ถูกต้อง” message, which is the right choice for a single admin account.
- **No per-document authorization in the download route.**
  - As noted in C-3, this is “authenticated = can download any document.”
  - If you want document-level sharing or restricted visibility later, the current path is not ready for it.
- **Asset types can be edited in place with no history.**
  - `asset_types` update is silent on history.
  - Since historical documents reference type codes via `asset_types(code, name)`, a rename changes what future lookups show, and there is no audit of who renamed what.
  - This is acceptable for a small internal system, but it is a data-integrity caveat, not a non-issue.
- **Database types are hand-written and must be regenerated.**
  - `src/lib/database.types.ts` has a comment saying it should be regenerated from Supabase after migrations.
  - If this drifts from the real schema, the app can build while the types lie. This is a normal Supabase workflow risk, not a unique flaw, but it should be in the deployment checklist.
- **Sign-out is a server action + redirect.**
  - That is fine for the happy path.
  - In a real deployment you would also want to confirm session refresh behavior (the proxy refreshes cookies), cookie `SameSite`/`Secure` settings for production HTTPS, and that a signed-out user cannot replay a stale signed URL beyond its TTL.
- **PDF pipeline depends on a long-lived Chromium process and disk fonts.**
  - Security surface is not huge, but it is real: the app runs untrusted HTML through Chromium, so the content being rendered must be trusted app output (it is, in this design — templates are server-controlled).
  - The risk is operational: if template code ever incorporated user input without escaping, Chromium would render it. The register template does escape; the asset template currently does **not** escape free-text fields into the HTML string, because it trusts database values. That assumption should be explicit in code and checked against the asset write path and any future public-facing reads.
- **No secrets or real Supabase values are present in the repo.**
  - This is correct. `.env.example` only.
  - Readiness item: confirm the deployment process sets `SUPABASE_SECRET_KEY` server-side and never bakes it into the browser bundle.

---

## 4. Tests required

These are the tests I would want to see before calling this production-ready. I have not run them in this pass; this is the checklist, not a pass report.

### 4.1 Build and typecheck
- [ ] `npm run build` green (fix C-1 first).
- [ ] `npm run typecheck` green.
- [ ] No secrets leaked into the client bundle (grep the built/client output for `SUPABASE_SECRET_KEY`, service-role URLs, or any server-only value).

### 4.2 Data layer
- [ ] Migrations apply cleanly against a fresh local Supabase / Postgres from `supabase/migrations/`.
- [ ] RLS actually blocks anon and restricts authenticated users the way the policies claim.
- [ ] Seed runs idempotently.
- [ ] `asset_stats` RPC returns sane values and does not error on an empty DB.
- [ ] Numbering RPC is service-role-only and fails for anon/authenticated.

### 4.3 Asset flows
- [ ] Create asset with valid data → asset appears in list.
- [ ] Duplicate asset code / serial → correct 409-style user error.
- [ ] Invalid asset code format / future acquisition date → field-level errors.
- [ ] Update asset → changes reflect, `updated_at` advances.
- [ ] Asset types: create, update, deactivate in-use type rejected, deactivate unused type succeeds.

### 4.4 Document flows
- [ ] Generate individual asset PDF → document row created, status ready, download works.
- [ ] Generate register from selection → document + document_items created, row count matches selection, download works.
- [ ] Register integrity: if the stored set and rendered set diverge, the document is not marked ready. This behavior needs a test, because it is the core of requirement E.
- [ ] Regenerate → new revision, old revision still downloadable.
- [ ] Download route returns 401 when not logged in, 404 for unknown document, 409 for not-ready document.
- [ ] Failed generation leaves asset data untouched and records an error message.

### 4.5 Auth and authorization
- [ ] Unauthenticated requests to app pages/actions redirect to login.
- [ ] Signed-out user cannot download a PDF.
- [ ] Two separate users cannot access each other’s session.
- [ ] Session refresh works without forcing a re-login mid-session (or there is a known, acceptable failure mode).

### 4.6 PDF correctness
- [ ] Thai text renders legibly in both document types.
- [ ] Register page count is acceptable for realistic selection sizes.
- [ ] Combining-tone rendering issue in the text layer is either fixed or explicitly accepted with a documented rationale (visual rendering may still be fine even if text extraction is imperfect).
- [ ] Generated PDFs contain the correct organization name, document number, revision, dates in พ.ศ., and the right asset data.

### 4.7 Deployment and ops
- [ ] Docker build succeeds.
- [ ] Container starts with the expected env and healthcheck passes.
- [ ] App fails safely when required env is missing, with a clear message.
- [ ] There is a documented backup/restore path for Postgres and for the private PDF bucket.
- [ ] There is a documented way to rotate the Supabase secret key and re-deploy.

---

## 5. Deployment prerequisites

### 5.1 Required before deploy
- Fix C-1 so the build is green.
- A Supabase project with:
  - the migrations applied
  - RLS enabled as written
  - the secret role available to the server only
  - one initial admin user created
- `.env` with the non-example values:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SECRET_KEY`
  - `NEXT_PUBLIC_APP_URL` set to the real origin
- A deployment target chosen and configured:
  - current code targets a self-hosted Docker / VPS model with Chromium, not a generic serverless worker.
  - if you want a serverless or managed-host deployment instead, that is a real decision point because the app currently depends on a long-lived Chromium process and shared memory.

### 5.2 Operational prerequisites
- Where Supabase Auth is hosted, confirm:
  - email confirmations / password policy / rate limiting as desired
  - the initial admin account exists and its credentials are handed to the right person out-of-band
- Where storage is hosted, confirm:
  - the `generated-pdfs` bucket exists and is private
  - storage admin is only via the service role
- Backups:
  - Postgres backup schedule and restore test
  - PDF bucket backup/export strategy if documents must survive bucket loss
- Monitoring:
  - failed PDF generations are currently logged; decide how you want alerts.
  - consider logging who generated or regenerated what, because today there is no audit trail.

### 5.3 Things that should be documented before launch
- How to create additional admins / operators, if that is ever desired.
- How to interpret document statuses and what to do on a failed generation.
- How to recover a failed or stuck PDF generation.
- How to reconcile orphaned storage objects if a generation fails between upload and status update.
- How to rotate secrets and regenerate types after migrations.

---

## 6. Recommended next actions

### Before anything is deployed
1. Fix the build failure in `src/app/(app)/assets/actions.ts` (remove the duplicate `_actionJustification` export and clean up the file so it is a legit server-actions module).
2. Re-run `npm run build`, `npm run typecheck`, `npm run test:unit`, and `npm run test:pdf` and record the actual results here.
3. Decide and write down the authorization model:
   - keep single-admin, or
   - add a second class of user / role, even if only as a documented future path.
4. Add a document-download authorization check if the org will ever need document-level restrictions. If single-admin is the final model, say so explicitly so the gap is a decision, not an oversight.

### Before launch
5. Add at least the tests in section 4 that exercise the money paths: asset create/update/duplicate errors, register integrity, document download authorization, and failed-generation behavior.
6. Confirm the Thai PDF rendering is acceptable end-to-end on real content, including the combining-mark/text-layer finding.
7. Create the ops docs that section 5.3 lists.
8. Run the Docker build and a local compose up, then sign in and exercise create → PDF → download end to end.

### After launch
9. Decide whether you want an audit log for asset/document changes before handing the system to more than one person.
10. Decide whether asset-type changes should retain history, given that documents reference type names.

---

## Appendix A: Verified vs unverified vs recommended

### Verified on disk
- App structure, migrations, RLS, actions, components, PDF pipeline code, env template, Docker/compose, test configuration, and sample artifacts exist as described above.
- Secret key is server-only in code.
- RLS migration disables public access and grants explicitly.
- Register generation has an explicit stored-vs-rendered integrity check.
- Document regeneration creates new revisions and paths.
- Storage upload uses `upsert: false` and the bucket is private.

### Unverified this pass
- Current greenness of unit / PDF / E2E suites.
- Whether migrations actually apply cleanly against a live DB.
- Whether RLS actually enforces what the migration claims.
- Whether the downloaded signed URL is scoped only to the requested object.
- Whether Supabase project settings (password policy, MFA, brute-force protection, email flow) match the org’s needs.
- Whether the Thai PDF combining-mark issue is accepted or still needs a fix.
- Whether the build is green after the current duplicate-export regression.

### Recommendations
- Treat C-1 as blocking.
- Treat the single-admin model as acceptable only if that is the deliberate final decision and is documented.
- Add a document-download authorization hook before any role model beyond “all authenticated users are equal” is needed.
- Add the audit/history items above before multi-person use.
