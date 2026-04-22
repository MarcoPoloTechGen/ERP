import { useState } from "react";
import { HardHat } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/25";

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    try {
      setSubmitting(true);
      setError(null);
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password, fullName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.18),_transparent_28%),linear-gradient(180deg,_#fffaf0_0%,_#f5efe3_100%)] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-amber-100 bg-white shadow-2xl shadow-amber-950/10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-slate-900 p-10 text-slate-100">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
              <HardHat size={24} />
            </div>
            <h1 className="mt-8 text-4xl font-semibold tracking-tight">BTP Manager</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
              Sign in to track projects, expenses, income, and team access.
            </p>
          </div>

          <div className="p-8 sm:p-10">
            <div className="inline-flex rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`rounded-xl px-4 py-2 text-sm font-medium ${mode === "signin" ? "bg-white shadow-sm" : "text-slate-500"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded-xl px-4 py-2 text-sm font-medium ${mode === "signup" ? "bg-white shadow-sm" : "text-slate-500"}`}
              >
                Create account
              </button>
            </div>

            <div className="mt-8 space-y-4">
              {mode === "signup" ? (
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className={inputClassName}
                  placeholder="Full name"
                />
              ) : null}
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClassName}
                placeholder="email@entreprise.com"
                type="email"
              />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClassName}
                placeholder="Mot de passe"
                type="password"
              />
              {error ? <p className="text-sm text-rose-700">{error}</p> : null}
              <div className="flex gap-3">
                <PrimaryButton type="button" onClick={handleSubmit} disabled={submitting}>
                  {mode === "signin" ? "Sign in" : "Create account"}
                </PrimaryButton>
                <SecondaryButton type="button" onClick={() => setError(null)}>
                  Reset
                </SecondaryButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
