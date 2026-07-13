# RecipeCatalog

Exports all recipes from [app.groei-maatje.nl](https://app.groei-maatje.nl) to an Excel file.

## Setup

1. `pip install -r requirements.txt`
2. Create a `.env` file next to `scraper.py` (it is gitignored):

   ```
   GM_SESSION_TOKEN=<value of the __Secure-authjs.session-token cookie>
   ```

   Get the cookie value from your browser: DevTools (F12) → Application → Cookies →
   `https://app.groei-maatje.nl` → copy the value of `__Secure-authjs.session-token`.
   Refresh it when the session expires (the script exits with a 401/403 message).

## Usage

```
python scraper.py                     # scrape whole recipe library -> recipes.xlsx
python scraper.py --out custom.xlsx   # custom output path
python scraper.py --ids <id> <id>     # only specific recipe ids
python scraper.py --delay 0.5         # slow down between requests
```

Close `recipes.xlsx` in Excel before re-running, or the save will fail.

## Output

Three sheets:

- **Recipes** — one row per recipe: name, description, servings, prep/cook time,
  kcal / protein / carbs / fat per serving (summed from all ingredients, including
  optional ones, so it can differ a few kcal from the app), id, slug, cover image URL.
- **Ingredients** — one row per ingredient per recipe: amount, grams (total and
  per serving), macros per serving, optional/seasoning flags.
- **Instructions** — one row per preparation step.

## How it works

The app is Next.js; recipes come from server actions (POST to the page URL with a
`next-action` header). The scraper calls `listRecipesForClientAction` to enumerate
the library, then `getRecipeForClientAction` per recipe id, and parses the React
flight response. If the app is redeployed these action hashes can change — grab the
new `next-action` header value from DevTools → Network and update the constants at
the top of `scraper.py`.
