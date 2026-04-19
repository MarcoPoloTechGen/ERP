"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const next = safeNextPath(searchParams.get("next"));

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (error) {
        setMessage(error.message);
        return;
      }
      router.push(next);
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(
      "Compte créé. Connecte-toi avec le même e-mail et mot de passe (après confirmation éventuelle par e-mail).",
    );
  }

  return (
    <div style={{ maxWidth: "22rem" }}>
      {urlError && (
        <p style={{ color: "tomato", marginTop: 0 }} role="alert">
          {decodeURIComponent(urlError)}
        </p>
      )}

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setMessage(null);
          }}
          style={{
            fontWeight: mode === "signin" ? 700 : 400,
            padding: "0.35rem 0.6rem",
          }}
        >
          Connexion
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setMessage(null);
          }}
          style={{
            fontWeight: mode === "signup" ? 700 : 400,
            padding: "0.35rem 0.6rem",
          }}
        >
          Créer un compte
        </button>
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span>E-mail</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "0.5rem" }}
          />
        </label>
        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span>Mot de passe</span>
          <input
            type="password"
            name="password"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "0.5rem" }}
          />
        </label>
        <button type="submit" disabled={loading} style={{ padding: "0.6rem" }}>
          {loading
            ? "…"
            : mode === "signin"
              ? "Se connecter"
              : "S’inscrire"}
        </button>
      </form>

      {message && (
        <p style={{ marginTop: "1rem", lineHeight: 1.5 }} role="status">
          {message}
        </p>
      )}

      <p style={{ marginTop: "1.5rem", fontSize: "0.85rem", lineHeight: 1.5 }}>
        L’authentification est intégrée à l’ERP : e-mail et mot de passe
        uniquement. Après connexion, ta session est enregistrée dans des
        cookies (rafraîchissement géré par le middleware).
      </p>
    </div>
  );
}
