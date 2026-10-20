# maewoeste.com (Mae's site)

Vercel / Next.js app for the public shop plus signed-in Study, games, and a parent dashboard. Kevin approves every PR and deploy. This branch does **not** change DNS, the production `CNAME`, or deploy to production.

The public shop and free-item request form still use Web3Forms. Games, spelling, the count game, and Study sit behind Google sign-in.

## Local dev

```bash
cp .env.example .env.local
npm install
npm test
npm run build
npm run dev
```

## Environment variables

Set these in Vercel (Preview and Production separately) and in `.env.local`. No secrets belong in the repo.

| Variable | Required | Purpose |
|---|---|---|
| `AUTH_SECRET` | yes | Auth.js session secret (32+ random chars). `next build` also needs it. |
| `AUTH_TRUST_HOST` | on Vercel | `true` so Auth.js trusts the preview host |
| `AUTH_GOOGLE_ID` | yes | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | yes | Google OAuth client secret |
| `AUTH_URL` | local only | App origin, e.g. `http://localhost:3000` |
| `STUDENT_EMAILS` | no | Default `mae.woeste@gmail.com` |
| `ADMIN_EMAILS` | no | Default `kevinw@mcsteen.com,woeste.kevin@gmail.com,molly.woeste@gmail.com` |
| `DATABASE_URL` | migrations | Neon owner. Used to apply SQL. Bypasses RLS. |
| `DATABASE_URL_STUDENT` | yes (prod) | `app_student` login: learner data, user lookup, audit inserts |
| `DATABASE_URL_ADMIN` | yes (prod) | `app_admin` login: dashboard, config |
| `DATABASE_URL_ASSISTANT` | optional | `assistant_ro`: `admin_api` views only |
| `NEXT_PUBLIC_WEB3FORMS_KEY` | no | Overrides the public Web3Forms key |
| `GITHUB_ISSUE_TOKEN` | for Report a problem | Fine-grained token with Issues: write on `GITHUB_REPO` only. Without it, reports are audited and return 202 but no issue is opened. |
| `GITHUB_REPO` | no | Default `kwoeste/SpellingGame`. Point it at a **private** repo; reports are kid-written. |
| `BIBLE_TRANSLATION` | no | Default `NABRE`. Confirm before religion content goes live. |

Aliases `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` are also accepted. `NEXT_PUBLIC_SITE_URL` is no longer read; the shop sets its thank-you redirect from the page origin.

Runtime connection rules (`lib/db/client.ts`, `lib/engine/repos.ts`):

- When `DATABASE_URL_STUDENT` / `DATABASE_URL_ADMIN` are unset, previews fall back to `DATABASE_URL` with a warning. RLS is not enforced on that connection. With `VERCEL_ENV=production` the fallback is refused and the request fails.
- With no database at all, local dev uses in-memory storage. Production refuses in-memory storage.

Role assignment must agree in **both** the env allowlist and `engine.app_user` (`disabled = false`). An email on only one list is denied. Role changes take effect on the next request: the session is dropped when the env role no longer matches, and admin sessions expire 8 hours after sign-in.

## Database

SQL lives in `db/migrations/`. Apply all four, in order, with the owner `DATABASE_URL`, on a Neon branch Kevin creates:

1. `001_engine_schema.sql` – schema, roles, views
2. `002_seed_users.sql` – Mae and the three admins in `engine.app_user`
3. `003_runtime_persistence.sql` – **required.** Role-scoped RLS policies (admin sees every learner, student sees only her rows via a transaction-local `app.learner_id`), `security_invoker` student views, `student_api.resolve_user`, persisted audit log, engine state columns. Safe to re-run.
4. `004_admin_dashboard.sql` – assignments, learner goals, richer `admin_api` views (knowledge map, session history, holes, accuracy), RLS on the new tables. Safe to re-run.

Then set passwords for the login roles and use them in the role-scoped URLs:

```sql
ALTER ROLE app_student PASSWORD '…';
ALTER ROLE app_admin PASSWORD '…';
ALTER ROLE assistant_ro PASSWORD '…';
```

Never edit an applied migration; add `005_…` instead. Do not create a production Neon project or point DNS at this preview without Kevin's yes.

Demo parent-dashboard rows exist only in `scripts/seed-admin-demo.mjs`. That script refuses `VERCEL_ENV=production` and requires `MAE_ALLOW_DEMO_SEED=1`. Do not run it against Mae's real database.

## GitHub Pages

`main` still publishes the old static site to maewoeste.com (legacy Jekyll build from the repo root). `_config.yml` excludes the Next.js source so only the root `*.html`, `favicon.png`, `CNAME`, and `public/` are served. A test fails if a new top-level folder is not excluded.

## Routes

Public: `/`, `/store`, `/thank-you`, request form.  
Signed-in student or admin: `/study`, `/games`, `/spelling-game`, `/number-match`, `/api/engine/*`, `/api/report-problem`.  
Admin only: `/admin`, `/api/admin/*`.

Each layer checks on its own: middleware, the server layouts, and every route handler. Religion games stay hidden from the student until they are reviewed.

## Tests

```bash
npm test
npm run check:student-bundle
```

Section 16 role tests live in `tests/role/section16.test.ts`. Engine tests cover BKT, Elo/zone, XP, gating, spaced review, and the session service. `tests/role/gated-content.test.ts` also scans `.next/static` (after `npm run build`) for chapter and game text.

The Postgres RLS tests in `tests/db/postgres.integration.test.ts` are skipped unless a throwaway superuser URL is set. They create a scratch database, apply 001–003, and check the role boundaries:

```bash
TEST_PG_SUPERUSER_URL=postgresql://user:pass@127.0.0.1/postgres npm test
```

## Created by

Mae, with family help.
