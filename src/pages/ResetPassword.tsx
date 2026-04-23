import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import BrandMark from "@/components/BrandMark";
import { PrimaryButton, SecondaryButton } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { erpKeys, getAppSettings } from "@/lib/erp";
import { useLang, type Lang } from "@/lib/i18n";

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/25";

const languages: Array<{ value: Lang; label: string }> = [
  { value: "ku", label: "Ø³Û†Ø±Ø§Ù†ÛŒ" },
  { value: "en", label: "EN" },
];

export default function ResetPasswordPage() {
  const { session, updatePassword } = useAuth();
  const { t, lang, setLang } = useLang();
  const [, navigate] = useLocation();
  const { data: appSettings } = useQuery({
    queryKey: erpKeys.appSettings,
    queryFn: getAppSettings,
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      if (password.length < 8) {
        throw new Error(t.passwordTooShort);
      }

      if (password !== confirmPassword) {
        throw new Error(t.passwordMismatch);
      }

      await updatePassword(password);
      setSuccess(t.passwordUpdated);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update password.");
    } finally {
      setSubmitting(false);
    }
  }

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
              {t.resetPasswordPageIntro}
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

            <div className="mt-8 space-y-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {t.resetPasswordPageTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {session?.user.email ?? t.resetPasswordPageIntro}
                </p>
              </div>

              {success ? (
                <div className="space-y-4">
                  <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {success}
                  </p>
                  <PrimaryButton type="button" onClick={() => navigate("/")}>
                    {t.dashboard}
                  </PrimaryButton>
                </div>
              ) : session ? (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <input
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={inputClassName}
                    name="newPassword"
                    placeholder={t.newPasswordPlaceholder}
                    type="password"
                  />
                  <input
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={inputClassName}
                    name="confirmPassword"
                    placeholder={t.confirmPasswordPlaceholder}
                    type="password"
                  />
                  {error ? <p className="text-sm text-rose-700">{error}</p> : null}
                  <div className="flex gap-3">
                    <PrimaryButton type="submit" disabled={submitting}>
                      {t.updatePassword}
                    </PrimaryButton>
                    <SecondaryButton type="button" onClick={() => navigate("/")}>
                      {t.dashboard}
                    </SecondaryButton>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {t.invalidRecoveryLink}
                  </p>
                  <PrimaryButton type="button" onClick={() => navigate("/")}>
                    {t.requestNewResetLink}
                  </PrimaryButton>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
