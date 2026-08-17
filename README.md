# GymDesk Next

A from-scratch rewrite blueprint for the GymDesk membership app (Sloth Submission Grappling), following the architecture we agreed on. This folder is a **scaffold/sketch** — it is not yet wired to the live Supabase project and does not touch the production app (`~/Desktop/members-9d7929df16dd237747c644c1be0469ab204e345e`).

## Architecture

```
pnpm + Turborepo monorepo
├── apps/
│   ├── kiosk/     Check-in terminal (site root, deliberately thin, insert-only key)
│   ├── member/    Member self-service portal (/member/)
│   └── admin/     Staff/admin panel (/admin/)
├── packages/
│   ├── shared-ui/  Vue 3 + Tailwind components (Button, Badge, Modal, Toggle, ProgressBar)
│   └── supabase/   DB row types, camelCase mappers, RPC wrappers, Vue composables
├── supabase/migrations/  (copy of the live migrations — single source of truth)
└── .github/workflows/deploy.yml
```

## Decisions locked in

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript, strict | The single biggest fix vs. today's global-`App` fragility |
| Framework | **Vue 3 + Vite** (plain SPA, `ssr: false`) | Nuxt's SSR is unused — we rejected it |
| Styling | Tailwind CSS | Utility-first, shared design tokens |
| State | Pinia stores per app + shared composables | Reactive, typed, testable |
| Backend | Supabase (Postgres + RLS) | Already the live backend; security stays in the DB |
| Per-portal keys | `kiosk` (insert/read only), `admin` (after real auth) | Enforced at the database, not in client code |
| Hosting | GitHub Pages, one repo, subpaths | `/` → kiosk, `/member/`, `/admin/` |
| Deploy | GitHub Actions on push to `main` | `node scripts/deploy-pages.mjs` stages all three apps |

## Quick start

```bash
pnpm install
pnpm dev:kiosk   # or dev:member / dev:admin
```

Dev credentials for the isolated project (see `.env.local`):
- Admin: `[REDACTED]` / `[REDACTED]`
- Test members: IDs `1001`–`1006` (various states: active time-based, active sessions, inactive, frozen)

Seeding: `SUPABASE_ACCESS_TOKEN=… node scripts/seed-dev.mjs` (idempotent). Schema migrations: `node scripts/apply-migrations.mjs`.

Env vars (per-app `.env.local` or CI vars):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_KIOSK_KEY=
VITE_SUPABASE_ADMIN_KEY=
```

## Deploy

GitHub Actions runs on every push to `main`: install → `node scripts/deploy-pages.mjs` (builds all three, stages into `dist/` with a `/ → /kiosk/` redirect) → `actions/deploy-pages`. Requires GitHub Pages configured with **Actions** as the source.

## Migration path from the current app

1. ✅ **Phase 0 — Foundation (DONE).** Ported the domain logic as pure, unit-tested TypeScript in `packages/supabase/src/domain/`:
   - `dates.ts` — `dateToLocalIso`, `getDaysRemaining`, Athens-day windows (`dayStart`/`dayEnd`), `buildClosedSet`, `calculateExpirationDate` (holidays don't count), `distinctLocalDays`
   - `reconcile.ts` — `computeVisitUnpaid`, `computeMemberFirstUnpaidDay`, `reconcileMemberPaymentVisitStatus` (session-quota consumption, time-window coverage, planDays heal, active→inactive convergence) — the exact logic from the production app's bug fixes
   - `attendance.ts` — `buildAvailableTrainings`, `getMemberAttendance` (effective start, per-class %, `onlyPublicOrAttended`), `getMemberTrainingCount`, `attendanceColor` (null below 50%)
   - Tests in `packages/supabase/tests/` (13 passing via `pnpm test`) lock in the timezone fix, the 0%-best-class fix, session stacking, and payment-deletion re-marking
2. ✅ **Phase 1 — Kiosk check-in (DONE).** Real check-in flow in `apps/kiosk`:
   - ID lookup via numpad or keyboard → member found/blocked states (frozen/cancelled)
   - Class-selection modal listing today's public classes, toggle multi-select, open-gym fallback
   - `check_in_member` RPC submission, unpaid/expired alert, success banner, already-checked-in handling
   - Live "Currently Inside" via realtime (`useVisits`), Training Schedule card, Training Leaderboard (using domain `getMemberTrainingCount`)
   - `useSchedules` composable added to `@gym/supabase` (schedules + slots + closed dates)
3. ✅ **Phase 2 — Staff/Admin check-in (DONE).** In `apps/admin`:
   - Admin auth via Supabase email/password + `profiles.role='admin'`
   - Search members by name / ID / phone (private fields merged via `loadPrivate`, RLS-gated)
   - Result card with live status badge (frozen / cancelled / inactive / expired / no-sessions / active)
   - Check-in modal with class selection + **backdate** (choose a past training date) → `check_in_member`, open-gym fallback
   - Checkout for currently-inside members, live "Currently Inside" list
   - **Broadcast notice** editor (message + color) → displayed as a banner on the kiosk
4. ✅ **Phase 3 — Payments + ledger (DONE).** In `apps/admin`:
   - Payment modal: member search, plan picker with quantity, sessions field, date/start/expiration auto-fill with renewal stacking (uses domain `calculateExpirationDate`)
   - Editing restores qty/sessions from the existing grant (no more halved bundles); delete via `delete_payment` RPC
   - Ledger view sorted by date, showing coverage (expiration or sessions), note, edit/delete
   - All writes go through `apply_payment` / `delete_payment` RPCs — server `recompute_member` is the single source of truth
5. ✅ **Phase 4 — Member directory + member modal (DONE).** In `apps/admin`:
   - Directory: search by name/ID/phone/email, status tabs, sortable columns, CSV export
   - Member modal: register/edit (belt, status, expiration, sessions, phone/email/dob/notes), plan apply with renewal stacking, **ID rename via `rename_member` RPC** (cascades server-side)
   - Recycle bin: soft-delete (deleted_at) + restore
6. ✅ **Phase 5 — Member portal (DONE).** In `apps/member`:
   - Login by member ID; dashboard with real data
   - Member Info card: belt, ID, status, expiration, sessions progress bar, expiry banner (≤7 days)
   - Training Stats: total trainings, hours, overall attendance %, per-class bars + Best Class (via domain `getMemberAttendance`)
   - Check-in history table (paid/unpaid badges)
   - Settings: change member ID (via `rename_member` RPC) + hide-from-leaderboard toggle
7. ✅ **Phase 6 — Closed dates wired + Plans CRUD (DONE).**
   - `calculateExpirationDate` now receives real closed dates in the payment modal and member plan-apply (holidays no longer count against memberships — fixing the correctness gap the port introduced)
   - Member attendance already passed `closedDates` to `getMemberAttendance` correctly
   - Plans view: create/edit/delete plans (validity days, sessions, price, color, public/trial flags)
   - Closed Dates view: add single or ranged days, yearly-repeat flag, reason; the kiosk schedule and attendance use them
   - Pinned dev ports: kiosk 5173, admin 5174, member 5175 (`strictPort`)
8. ✅ **Phase 7 — Schedules CRUD (DONE).**
   - Schedules view: create/edit/delete class schedules (name, color, capacity, public flag) with **weekly slot editing** (day + start/end times)
   - `useSchedules` composable gains `saveSchedule` (upsert + replace slots) and `deleteSchedule` (soft delete); kiosk + check-in class selection read the live data
9. ✅ **Phase 8 — Admin analytics (DONE).**
   - Dashboard (default tab): KPIs — currently inside, visits today, unpaid count, active subscriptions, total members, gender breakdown (via domain `computeDashboardKpis`)
   - Analytical calendar: month grid color-coded by visit volume, unpaid days highlighted red; click a day to filter the visit log
   - Visit log: filterable by date + paid/unpaid status, newest-first
10. ✅ **Phase 9–10 — Settings + mobile check-in (DONE).** (i18n EN/EL deferred.)
   - Admin Settings: portal name, currency, attendance feedback colors (tier color pickers)
   - Kiosk now exposes a **mobile check-in** at `#/mobile` (hash route): phone-friendly ID numpad → class selection → check-in, reusing the shared kiosk store; a link on the kiosk header points phones to it
11. ⏭️ Then i18n (EN/EL), deploy.

## Known wiring steps (before `pnpm dev` works)

- ✅ **Done:** the new app is fully isolated from production. A separate Supabase project was created (`gymdesk-next`, ref `vybzakdbifmnruponyzl`) and all 6 production migrations were applied to it verbatim (tables, RLS, RPCs, cron, realtime). The `.env.local` files point at the new project only. **Production (`lwmwihdfwafnhtykslbz`) is untouched.**
- Vite resolves PostCSS/Tailwind config from each app root. Copy `tailwind.config.js` + `postcss.config.js` (or a symlink) into `apps/kiosk/`, `apps/member/`, `apps/admin/`.
- Install `tailwindcss` + `autoprefixer` as devDeps in each app.
- Re-apply schema changes to the new project via `scripts/apply-migrations.mjs` (run with `SUPABASE_ACCESS_TOKEN`).
- The `Attendance Feedback` config still reads `attendanceEmojis` in the production app; the rewrite drops emojis, so the `attendance_emojis` setting can be removed from `settings` on migration.

