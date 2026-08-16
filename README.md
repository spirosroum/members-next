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
3. ⏭️ **Phase 2 — Staff/Admin check-in**
4. ⏭️ **Phase 3 — Payments + ledger**
5. ⏭️ Then member directory, member portal, plans/closed dates, schedules, analytics, settings, i18n, mobile, deploy.

## Known wiring steps (before `pnpm dev` works)

- Vite resolves PostCSS/Tailwind config from each app root. Copy `tailwind.config.js` + `postcss.config.js` (or a symlink) into `apps/kiosk/`, `apps/member/`, `apps/admin/`.
- Install `tailwindcss` + `autoprefixer` as devDeps in each app.
- Add `supabase/migrations/` contents from the production repo (not included here to avoid duplicating secrets).
- The `Attendance Feedback` config still reads `attendanceEmojis` in the production app; the rewrite drops emojis, so the `attendance_emojis` setting can be removed from `settings` on migration.

