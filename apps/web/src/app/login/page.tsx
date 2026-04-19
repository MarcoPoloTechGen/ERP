import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main style={{ padding: "2rem", maxWidth: "40rem" }}>
      <h1 style={{ marginTop: 0 }}>Connexion</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
