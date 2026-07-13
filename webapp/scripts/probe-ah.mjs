// Verifies whether AH accepts a custom redirect_uri (decides connect flow).
// Usage: npm run probe:ah
const base = "https://login.ah.nl/secure/oauth/authorize";

async function probe(redirect) {
  const url = `${base}?client_id=appie&redirect_uri=${encodeURIComponent(
    redirect,
  )}&response_type=code`;
  const res = await fetch(url, { redirect: "manual" });
  return res.status;
}

const custom = await probe("https://example.com/callback");
const native = await probe("appie://login-exit");
console.log(`custom redirect_uri  -> HTTP ${custom}`);
console.log(`appie://login-exit   -> HTTP ${native}`);
console.log(
  custom >= 400
    ? "\n=> AH rejects custom redirect_uri. Use the paste-based connect flow (/api/ah/exchange)."
    : "\n=> AH accepts a custom redirect_uri. A zero-paste callback is possible.",
);
