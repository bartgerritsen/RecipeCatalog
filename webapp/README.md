# Receptenboek — webapp

Next.js (App Router) + Supabase webapp. Browse recipes, personalize with macro
goals, connect your Albert Heijn account, view your cart, and push a recipe's
ingredients into it. Recipes live in Supabase; when a search finds fewer than 5
local hits, the Albert Heijn API is queried and cached for a week.

## Prerequisites

- Node 18+ (built on Node 24)
- A free [Supabase](https://supabase.com) project

## 1. Configure Supabase

1. Create a Supabase project.
2. In the SQL editor, run `supabase/schema.sql`, then `supabase/functions.sql`.
3. (Optional but recommended) In **Authentication → Providers → Email**, decide
   whether to require email confirmation. For a personal instance you can turn
   confirmation off for the smoothest signup.

## 2. Environment

```bash
cp .env.local.example .env.local
```

Fill in:

| Var | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page → anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | same page → service_role key (**secret**) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` for dev |
| `APP_SECRET` | any long random string |
| `AH_TOKEN_ENC_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CRON_SECRET` | any random string |

## 3. Install, seed, run

```bash
npm install
npm run seed     # loads the 97 local recipes into Supabase
npm run dev      # http://localhost:3000
```

> Windows: the first `npm run dev` may trigger a Windows Firewall prompt for
> `node.exe` — allow it so the dev server can accept local connections.

## Architecture

- **Pages** — `/` timeline (liked-this-week + fallback), `/browse` (search &
  filter), `/recipe/[id]` (detail, servings stepper, add-to-cart), `/connect`
  (AH login + cart), `/profile` (macro goals, favorites), `/login`.
- **API routes** (`src/app/api`) — all AH calls are server-side; AH tokens never
  reach the browser.
  - `recipes/search` — DB-first, AH fallback (<5 hits → fetch 20, cache 7d),
    stampede-guarded, negative-result cache.
  - `recipes/[id]` — lazy full-detail fetch for AH recipes.
  - `ah/authorize-url` + `ah/exchange` — connect flow (see below).
  - `cart` + `cart/add-recipe` — basket read + ingredient→product mapping.
  - `likes`, `ah/status`, `ah/disconnect`, `cron/expire-recipes`.
- **Caching** — `ah_service_token` (shared anon token), `recipes.expires_at`
  (7-day AH cache), `ah_product_map` (30-day ingredient→product), `ah_search_miss`
  (negative cache). Expired AH recipes are hidden and lazily refreshed on search.

## Albert Heijn connect flow

AH strictly validates the OAuth `redirect_uri` (a custom callback returns HTTP
400; only `appie://login-exit` is accepted — verify anytime with `npm run
probe:ah`). A hosted web app therefore cannot silently capture the code, so the
flow is:

1. `/connect` opens the **real** `login.ah.nl` in a new tab. Your AH password
   never touches this server.
2. After login the page tries `appie://login-exit?code=…` and shows an error —
   that's expected. Copy the full URL (or just the `code`).
3. Paste it into `/connect`; the server exchanges it for tokens (encrypted with
   AES-256-GCM in `ah_connections`) and refreshes them automatically thereafter.

## Deploy (Vercel)

1. Commit and push the `webapp/` directory to the GitHub repository.
2. In Vercel, select **Add New → Project**, import the repository, and set
   **Root Directory** to `webapp`. Keep the detected Next.js build settings.
3. Under **Environment Variables**, add all seven variables from
   `.env.local.example`. Use the real Supabase values and generate independent
   secrets instead of copying the example placeholders:

   ```bash
   # Generate APP_SECRET, AH_TOKEN_ENC_KEY, and CRON_SECRET separately
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Set `NEXT_PUBLIC_SITE_URL` to the production URL, including `https://` (for
   example `https://your-project.vercel.app`). Apply the variables to Production
   and Preview if preview deployments should be usable too. Never expose
   `SUPABASE_SERVICE_ROLE_KEY`, `APP_SECRET`, `AH_TOKEN_ENC_KEY`, or
   `CRON_SECRET` with a `NEXT_PUBLIC_` prefix.
4. Deploy. After changing any environment variable, redeploy because existing
   deployments do not receive environment-variable changes retroactively.
5. In Vercel, verify **Settings → Cron Jobs** lists
   `/api/cron/expire-recipes`. The schedule in `vercel.json` runs daily at
   04:00 UTC; Hobby accounts may execute it at any point during that hour.

The production build can be checked locally with `npm run build`. Vercel reads
`vercel.json` from the selected `webapp` root and registers the daily cleanup
job automatically.

## Notes / limitations

- The AH API is unofficial and undocumented; it can change without notice.
- Ingredient→product matching uses the top search result; corrections are stored
  per user as favorites (`user_favorite_products`).
- Cart quantities default to 1 per product (unit→pack conversion is not done).
