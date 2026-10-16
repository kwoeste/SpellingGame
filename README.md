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
| `AUTH_SECRET` | yes | Auth.js session secret |
| `AUTH_GOOGLE_ID` | yes | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | yes | Google OAuth client secret |
| `AUTH_URL` | yes | App origin, e.g. `http://localhost:3000` |
| `STUDENT_EMAILS` | no | Default `mae.woeste@gmail.com` |
| `ADMIN_EMAILS` | no | Default `kevinw@mcsteen.com,woeste.kevin@gmail.com,molly.woeste@gmail.com` |
| `DATABASE_URL` | for live data | Neon migrator / default connection |
| `DATABASE_URL_STUDENT` | for RLS | `app_student` role connection |
| `DATABASE_URL_ADMIN` | for RLS | `app_admin` role connection |
| `DATABASE_URL_ASSISTANT` | optional | `assistant_ro` read-only analytics |
| `NEXT_PUBLIC_SITE_URL` | recommended | Origin used if a thank-you redirect must be absolute |
| `NEXT_PUBLIC_WEB3FORMS_KEY` | no | Overrides the public Web3Forms key |
| `GITHUB_ISSUE_TOKEN` | for Report a problem | Fine-grained token that can create issues |
| `GITHUB_REPO` | no | Default `kwoeste/SpellingGame` |
| `BIBLE_TRANSLATION` | no | Default `NABRE` (still an open item) |

Aliases `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` are also accepted.

Role assignment must agree in **both** the env allowlist and `engine.app_user`. An email on only one list is denied.

## Database

SQL lives in `db/migrations/`. Apply `001_engine_schema.sql` then `002_seed_users.sql` on a Neon branch Kevin creates. Do not create a production Neon project or point DNS at this preview without Kevin's yes.

The schema includes `engine` tables (interactions, strategies, mastery, review schedule, XP), `student_api` views, `admin_api` views, Postgres roles, and row-level security.

## Routes

Public: `/`, `/store`, `/thank-you`, request form.  
Signed-in student or admin: `/study`, `/games`, `/spelling-game`, `/number-match`, `/api/engine/*`.  
Admin only: `/admin`, `/api/admin/*`.

## Tests

```bash
npm test
npm run check:student-bundle
```

Section 16 role tests live in `tests/role/section16.test.ts`. Engine unit tests cover BKT, Elo/zone, XP, gating, and spaced review.

## Created by

Mae, with family help.
