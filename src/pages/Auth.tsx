import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import BrandMark from "@/components/BrandMark";
import { PrimaryButton, SecondaryButton } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { isEmailRateLimitErrorMessage, localizeAuthErrorMessage } from "@/lib/auth-utils";
import { erpKeys, getAppSettings } from "@/lib/erp";
import { useLang, type Lang } from "@/lib/i18n";

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/25";

const PASSWORD_RESET_COOLDOWN_SECONDS = 60;
const PASSWORD_RESET_COOLDOWN_STORAGE_PREFIX = "btp-password-reset-cooldown:";

const languages: Array<{ value: Lang; label: string }> = [
  { value: "ku", label: "سۆرانی" },
  { value: "en", label: "EN" },
];

function normalizeEmailForCooldown(email: string) {
  return email.trim().toLowerCase();
}

function getPasswordResetCooldownKey(email: string) {
  return `${PASSWORD_RESET_COOLDOWN_STORAGE_PREFIX}${normalizeEmailForCooldown(email)}`;
}

function readPasswordResetCooldownSeconds(email: string) {
  if (typeof window === "undefined") {
    return 0;
  }

  const normalizedEmail = normalizeEmailForCooldown(email);
  if (!normalizedEmail) {
    return 0;
  }

  try {
    const storedValue = window.localStorage.getItem(getPasswordResetCooldownKey(normalizedEmail));
    const expiresAt = Number(storedValue);

    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      window.localStorage.removeItem(getPasswordResetCooldownKey(normalizedEmail));
      return 0;
    }

    return Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000));
  } catch {
    return 0;
  }
}

function storePasswordResetCooldown(email: string, seconds = PASSWORD_RESET_COOLDOWN_SECONDS) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedEmail = normalizeEmailForCooldown(email);
  if (!normalizedEmail) {
    return;
  }

  try {
    window.localStorage.setItem(
      getPasswordResetCooldownKey(normalizedEmail),
      String(Date.now() + seconds * 1000),
    );
  } catch {
    // Ignore storage errors and keep the reset flow working.
  }
}

export default function AuthPage() {
  const { signIn, signUp, requestPasswordReset } = useAuth();
  const { t, lang, setLang } = useLang();
  const { data: appSettings } = useQuery({
    queryKey: erpKeys.appSettings,
    queryFn: getAppSettings,
  });
  const [mode, setMode] = useState<"signin" | "signup" | "recover">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showResetSuggestion, setShowResetSuggestion] = useState(false);
  const [recoverCooldownSeconds, setRecoverCooldownSeconds] = useState(0);

  useEffect(() => {
    if (mode !== "recover") {
      setRecoverCooldownSeconds(0);
      return;
    }

    const syncCooldown = () => {
      setRecoverCooldownSeconds(readPasswordResetCooldownSeconds(email));
    };

    syncCooldown();

    if (!email.trim()) {
      return;
    }

    const intervalId = window.setInterval(syncCooldown, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [email, mode]);

  function switchMode(nextMode: "signin" | "signup" | "recover") {
    setMode(nextMode);
    setError(null);
    setNotice(null);
    setShowResetSuggestion(false);

    if (nextMode !== "signup") {
      setFullName("");
    }

    if (nextMode === "recover") {
      setPassword("");
    }
  }

  async function handleSubmit(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const normalizedEmail = email.trim();

    try {
      setSubmitting(true);
      setError(null);
      setNotice(null);
      setShowResetSuggestion(false);

      if (!normalizedEmail) {
        throw new Error(t.requiredField);
      }

      if (mode === "signin") {
        await signIn(normalizedEmail, password);
      } else if (mode === "signup") {
        const result = await signUp(normalizedEmail, password, fullName.trim());

        if (result.status === "existing-account") {
          setError(t.accountAlreadyExists);
          setShowResetSuggestion(true);
          return;
        }

        if (result.status === "email-confirmation-required") {
          setNotice(t.accountCreatedCheckEmail);
          setPassword("");
          return;
        }
      } else {
        const cooldownSeconds = readPasswordResetCooldownSeconds(normalizedEmail);
        if (cooldownSeconds > 0) {
          setRecoverCooldownSeconds(cooldownSeconds);
          setError(t.resetPasswordRateLimit(cooldownSeconds));
          return;
        }

        await requestPasswordReset(normalizedEmail);
        storePasswordResetCooldown(normalizedEmail);
        setRecoverCooldownSeconds(readPasswordResetCooldownSeconds(normalizedEmail));
        setNotice(t.resetPasswordEmailSent);
      }
    } catch (err) {
      if (mode === "recover" && err instanceof Error && isEmailRateLimitErrorMessage(err.message)) {
        storePasswordResetCooldown(normalizedEmail);
        const cooldownSeconds =
          readPasswordResetCooldownSeconds(normalizedEmail) || PASSWORD_RESET_COOLDOWN_SECONDS;
        setRecoverCooldownSeconds(cooldownSeconds);
        setError(t.resetPasswordRateLimit(cooldownSeconds));
      } else {
        setError(
          err instanceof Error ? localizeAuthErrorMessage(err.message) ?? t.authenticationFailed : t.authenticationFailed,
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const isRecoverCoolingDown = mode === "recover" && recoverCooldownSeconds > 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.18),_transparent_28%),linear-gradient(180deg,_#fffaf0_0%,_#f5efe3_100%)] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-amber-100 bg-white shadow-2xl shadow-amber-950/10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-slate-900 p-10 text-slate-100">
            <BrandMark
              companyLogoUrl={appSettings?.companyLogoUrl}
              alt={t.siteTitle}
              className="h-14 w-14 border border-white/10 bg-white shadow-lg shadow-amber-500/30"
            />
            <h1 className="mt-8 text-4xl font-semibold tracking-tight">{t.siteTitle}</h1>
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
                  required
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    setShowResetSuggestion(false);
                  }}
                  className={inputClassName}
                  name="fullName"
                  placeholder={t.fullNamePlaceholder}
                />
              ) : null}
              <input
                autoCapitalize="none"
                autoComplete="email"
                required
                spellCheck={false}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setShowResetSuggestion(false);
                }}
                className={inputClassName}
                name="email"
                placeholder={t.emailPlaceholder}
                type="email"
              />
              {mode !== "recover" ? (
                <>
                  <input
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    minLength={mode === "signup" ? 8 : undefined}
                    required
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setShowResetSuggestion(false);
                    }}
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
              {notice ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {notice}
                </div>
              ) : null}
              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  <p>{error}</p>
                  {mode === "signup" && showResetSuggestion ? (
                    <div className="mt-3">
                      <SecondaryButton
                        type="button"
                        className="border-rose-200 bg-white text-rose-900 hover:bg-rose-100"
                        onClick={() => {
                          setShowResetSuggestion(false);
                          switchMode("recover");
                        }}
                      >
                        {t.resetPasswordAction}
                      </SecondaryButton>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="flex gap-3">
                <PrimaryButton type="submit" disabled={submitting || isRecoverCoolingDown}>
                  {mode === "signin"
                    ? t.signIn
                    : mode === "signup"
                      ? t.createAccount
                      : isRecoverCoolingDown
                        ? t.sendResetLinkCooldown(recoverCooldownSeconds)
                        : t.sendResetLink}
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
