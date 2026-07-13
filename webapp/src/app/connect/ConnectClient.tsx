"use client";

import { useCallback, useEffect, useState } from "react";
import ProductPicker, { type ProductOption } from "@/components/ProductPicker";

interface BasketItem {
  productId: number;
  quantity: number;
  title: string;
  brand: string | null;
  priceFormatted: string | null;
}
interface Basket {
  quantity: number;
  totalFormatted: string | null;
  items: BasketItem[];
}

export default function ConnectClient({ initiallyConnected }: { initiallyConnected: boolean }) {
  const [connected, setConnected] = useState(initiallyConnected);
  const [state, setState] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [basket, setBasket] = useState<Basket | null>(null);
  const [loadingBasket, setLoadingBasket] = useState(false);
  const [swapItem, setSwapItem] = useState<number | null>(null);

  async function modifyItem(body: Record<string, unknown>) {
    const res = await fetch("/api/cart/item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) await loadBasket();
    return res.ok;
  }

  async function removeItem(productId: number) {
    await modifyItem({ action: "remove", productId });
  }

  async function replaceItem(oldProductId: number, p: ProductOption) {
    setSwapItem(null);
    await modifyItem({
      action: "replace",
      oldProductId,
      newProductId: p.productId,
      quantity: p.quantity || 1,
    });
  }

  const loadBasket = useCallback(async () => {
    setLoadingBasket(true);
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        setBasket(data.basket);
      } else if (res.status === 409) {
        setConnected(false);
      }
    } finally {
      setLoadingBasket(false);
    }
  }, []);

  useEffect(() => {
    if (connected) loadBasket();
  }, [connected, loadBasket]);

  async function startConnect() {
    setError(null);
    const res = await fetch("/api/ah/authorize-url");
    if (!res.ok) {
      setError("Kon de Albert Heijn login niet starten.");
      return;
    }
    const data = await res.json();
    setState(data.state);
    // Open the real AH login. After login it redirects to appie://login-exit?code=…
    window.open(data.loginUrl, "_blank", "noopener");
  }

  async function submitCode() {
    if (!state) {
      setError("Start eerst het inloggen bij Albert Heijn.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ah/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeInput, state }),
      });
      if (res.ok) {
        setConnected(true);
        setCodeInput("");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error === "invalid_state"
            ? "De sessie is verlopen. Start het inloggen opnieuw."
            : "Code niet geldig. Controleer of je de volledige code (of URL) hebt geplakt.",
        );
      }
    } catch {
      setError("Er ging iets mis.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    await fetch("/api/ah/disconnect", { method: "POST" });
    setConnected(false);
    setBasket(null);
  }

  return (
    <div style={{ paddingBottom: 40, maxWidth: 640 }}>
      <h1>Albert Heijn</h1>

      {connected ? (
        <>
          <p className="row" style={{ gap: 8 }}>
            <span className="pill" style={{ background: "var(--carbs)", color: "#fff" }}>
              ✓ Verbonden
            </span>
            <button className="pill" onClick={disconnect}>
              Verbinding verbreken
            </button>
          </p>

          <div className="row wrap" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="section-title">🛒 Je mandje</h2>
            <button className="chip" onClick={loadBasket} disabled={loadingBasket}>
              {loadingBasket ? <span className="spinner" /> : "Vernieuwen"}
            </button>
          </div>

          {loadingBasket && !basket ? (
            <p className="muted">Mandje laden…</p>
          ) : basket && basket.items.length > 0 ? (
            <>
              <p className="muted">
                {basket.quantity} artikelen · totaal {basket.totalFormatted ?? "–"}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }} className="stack">
                {basket.items.map((it) => (
                  <li
                    key={it.productId}
                    className="row"
                    style={{
                      borderBottom: "1px solid var(--hairline)",
                      padding: "8px 0",
                      position: "relative",
                    }}
                  >
                    <span className="grow">
                      {it.quantity}× {it.title}
                      {it.brand ? <span className="muted"> · {it.brand}</span> : null}
                    </span>
                    <span className="muted">{it.priceFormatted ?? ""}</span>
                    <button
                      className="pill"
                      onClick={() => setSwapItem(swapItem === it.productId ? null : it.productId)}
                    >
                      Vervang
                    </button>
                    <button
                      className="icon-btn"
                      style={{ width: 30, height: 30 }}
                      aria-label="Verwijderen"
                      onClick={() => removeItem(it.productId)}
                    >
                      ×
                    </button>
                    {swapItem === it.productId && (
                      <ProductPicker
                        alternatives={[]}
                        onPick={(p) => replaceItem(it.productId, p)}
                        onClose={() => setSwapItem(null)}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted">Je mandje is leeg. Voeg ingrediënten toe vanaf een recept.</p>
          )}
        </>
      ) : (
        <>
          <p className="muted">
            Verbind je Albert Heijn account om je mandje te zien en recept-ingrediënten toe te
            voegen. Je logt in op de échte Albert Heijn site — wij zien je wachtwoord nooit.
          </p>

          <ol className="stack" style={{ paddingLeft: 18 }}>
            <li>
              <button className="btn primary" onClick={startConnect}>
                1. Open Albert Heijn login
              </button>
            </li>
            <li>
              Log in. Daarna probeert de pagina naar <code>appie://login-exit?code=…</code> te
              gaan en verschijnt een foutmelding — dat hoort zo.
            </li>
            <li>
              Kopieer die volledige adres-URL (of alleen de <code>code</code>-waarde) en plak hem
              hieronder.
            </li>
          </ol>

          <div className="stack" style={{ marginTop: 12 }}>
            <input
              className="input"
              placeholder="Plak hier de code of de appie://… URL"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
            />
            <button
              className="btn primary block"
              onClick={submitCode}
              disabled={busy || !codeInput.trim()}
            >
              {busy ? <span className="spinner" /> : "2. Verbind account"}
            </button>
          </div>
        </>
      )}

      {error && <p style={{ color: "#d33", fontSize: 14, marginTop: 12 }}>{error}</p>}
    </div>
  );
}
