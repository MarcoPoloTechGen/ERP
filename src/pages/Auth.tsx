import { useState } from "react";
import { HardHat } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { useLang, type Lang } from "@/lib/i18n";

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/25";

const languages: Array<{ value: Lang; label: string }> = [
  { value: "ku", label: "سۆرانی" },
  { value: "en", label: "EN" },
];

export default function AuthPage() {
  const { signIn, signUp, requestPasswordReset } = useAuth();
  const { t, lang, setLang } = useLang();
  const [mode, setMode] = useState<"signin" | "signup" | "recover">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function switchMode(nextMode: "signin" | "signup" | "recover") {
    setMode(nextMode);
    setError(null);
    setNotice(null);

    if (nextMode !== "signup") {
      setFullName("");
    }

    if (nextMode === "recover") {
      setPassword("");
    }
  }

  async function handleSubmit(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      setNotice(null);

      const normalizedEmail = email.trim();
      if (!normalizedEmail) {
        throw new Error(t.requiredField);
      }

      if (mode === "signin") {
        await signIn(normalizedEmail, password);
      } else if (mode === "signup") {
        await signUp(normalizedEmail, password, fullName.trim());
      } else {
        await requestPasswordReset(normalizedEmail);
        setNotice(t.resetPasswordEmailSent);
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
              {t.authIntro}
            </p>
          </div>

          <div className="p-8 sm:p-10">
            <div className="flex justify-end">
              <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                {languages.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setLang(item.value)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                      lang === item.value ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 inline-flex rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={`rounded-xl px-4 py-2 text-sm font-medium ${mode !== "signup" ? "bg-white shadow-sm" : "text-slate-500"}`}
              >
                {t.signIn}
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`rounded-xl px-4 py-2 text-sm font-medium ${mode === "signup" ? "bg-white shadow-sm" : "text-slate-500"}`}
              >
                {t.createAccount}
              </button>
            </div>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {mode === "recover" ? t.forgotPassword : mode === "signin" ? t.signIn : t.createAccount}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {mode === "recover" ? t.forgotPasswordIntro : t.authIntro}
                </p>
              </div>
              {mode === "signup" ? (
                <input
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className={inputClassName}
                  name="fullName"
                  placeholder={t.fullNamePlaceholder}
                />
              ) : null}
              <input
                autoCapitalize="none"
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClassName}
                name="email"
                placeholder={t.emailPlaceholder}
                type="email"
              />
              {mode !== "recover" ? (
                <>
                  <input
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={inputClassName}
                    name="password"
                    placeholder={t.passwordPlaceholder}
                    type="password"
                  />
                  {mode === "signin" ? (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => switchMode("recover")}
                        className="text-sm font-medium text-amber-700 transition hover:text-amber-800"
                      >
                        {t.forgotPassword}
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}
              {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
              {error ? <p className="text-sm text-rose-700">{error}</p> : null}
              <div className="flex gap-3">
                <PrimaryButton type="submit" disabled={submitting}>
                  {mode === "signin" ? t.signIn : mode === "signup" ? t.createAccount : t.sendResetLink}
                </PrimaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    if (mode === "recover") {
                      switchMode("signin");
                      return;
                    }

                    setError(null);
                    setNotice(null);
                    setFullName("");
                    setEmail("");
                    setPassword("");
                  }}
                >
                  {mode === "recover" ? t.backToSignIn : t.reset}
                </SecondaryButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
