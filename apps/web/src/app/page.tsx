import { SignOutButton } from "@/app/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { isAuthSessionMissingError } from "@supabase/supabase-js";

export default async function Home() {
  const hasEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  let supabaseMessage =
    "Définis NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local (ou sur Vercel).";
  let user: { email?: string | null; id: string } | null = null;
  let authUnreachable = false;

  if (hasEnv) {
    try {
      const supabase = await createClient();
      const { data: authData, error } = await supabase.auth.getUser();
      if (error && !isAuthSessionMissingError(error)) {
        supabaseMessage = `Erreur d’authentification : ${error.message}`;
        authUnreachable = true;
      } else if (authData.user) {
        user = authData.user;
        supabaseMessage = `Session active : ${authData.user.email ?? authData.user.id}.`;
      } else {
        supabaseMessage =
          "Aucune session (tu ne devrais pas voir ce message : reconnecte-toi).";
      }
    } catch (e) {
      authUnreachable = true;
      supabaseMessage =
        e instanceof Error ? e.message : "Impossible de joindre Supabase.";
    }
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "40rem" }}>
      <h1 style={{ marginTop: 0 }}>ERP</h1>
      <p>Application protégée : la connexion est exigée pour toutes les pages sauf /login.</p>
      <section style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem" }}>Session</h2>
        <p style={{ margin: "0.5rem 0 0", lineHeight: 1.5 }}>{supabaseMessage}</p>
        {hasEnv && user && (
          <p style={{ margin: "0.75rem 0 0" }}>
            <SignOutButton />
          </p>
        )}
        {hasEnv && !user && !authUnreachable && (
          <p style={{ margin: "0.75rem 0 0" }}>
            <a href="/login">Aller à la connexion</a>
          </p>
        )}
      </section>
    </main>
  );
}
