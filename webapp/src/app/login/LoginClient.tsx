"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else {
        setInfo(
          "Account aangemaakt. Als e-mailbevestiging aanstaat, check dan je inbox. Anders kun je nu inloggen.",
        );
        setMode("login");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else {
        router.push(next);
        router.refresh();
      }
    }
    setBusy(false);
  }

  return (
    <div style={{ maxWidth: 380, margin: "48px auto" }}>
      <h1>{mode === "login" ? "Inloggen" : "Account aanmaken"}</h1>
      <form onSubmit={submit} className="stack">
        <input
          className="input"
          type="email"
          placeholder="E-mailadres"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          className="input"
          type="password"
          placeholder="Wachtwoord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        <button className="btn primary block" type="submit" disabled={busy}>
          {busy ? <span className="spinner" /> : mode === "login" ? "Inloggen" : "Aanmaken"}
        </button>
      </form>

      {error && (
        <p style={{ color: "#d33", fontSize: 14, marginTop: 12 }}>{error}</p>
      )}
      {info && <p style={{ fontSize: 14, marginTop: 12 }}>{info}</p>}

      <p className="muted" style={{ marginTop: 16, fontSize: 14 }}>
        {mode === "login" ? "Nog geen account? " : "Al een account? "}
        <button
          className="pill"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setInfo(null);
          }}
        >
          {mode === "login" ? "Aanmaken" : "Inloggen"}
        </button>
      </p>
    </div>
  );
}
