import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Form, Input, Segmented, Space, Typography } from "antd";
import BrandMark from "@/components/BrandMark";
import { useAuth } from "@/lib/auth";
import { isEmailRateLimitErrorMessage, localizeAuthErrorMessage } from "@/lib/auth-utils";
import { erpKeys, getAppSettings } from "@/lib/erp";
import { useLang, type Lang } from "@/lib/i18n";

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
  if (typeof window === "undefined") return 0;
  const normalizedEmail = normalizeEmailForCooldown(email);
  if (!normalizedEmail) return 0;
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
  if (typeof window === "undefined") return;
  const normalizedEmail = normalizeEmailForCooldown(email);
  if (!normalizedEmail) return;
  try {
    window.localStorage.setItem(getPasswordResetCooldownKey(normalizedEmail), String(Date.now() + seconds * 1000));
  } catch { /* ignore */ }
}

export default function AuthPage() {
  const { signIn, signUp, requestPasswordReset } = useAuth();
  const { t, lang, setLang } = useLang();
  const { data: appSettings } = useQuery({ queryKey: erpKeys.appSettings, queryFn: getAppSettings });
  const [mode, setMode] = useState<"signin" | "signup" | "recover">("signin");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showResetSuggestion, setShowResetSuggestion] = useState(false);
  const [recoverCooldownSeconds, setRecoverCooldownSeconds] = useState(0);
  const [email, setEmail] = useState("");
  const [form] = Form.useForm();

  useEffect(() => {
    if (mode !== "recover") { setRecoverCooldownSeconds(0); return; }
    const syncCooldown = () => setRecoverCooldownSeconds(readPasswordResetCooldownSeconds(email));
    syncCooldown();
    if (!email.trim()) return;
    const intervalId = window.setInterval(syncCooldown, 1000);
    return () => window.clearInterval(intervalId);
  }, [email, mode]);

  function switchMode(nextMode: "signin" | "signup" | "recover") {
    setMode(nextMode);
    setError(null);
    setNotice(null);
    setShowResetSuggestion(false);
    form.resetFields();
  }

  async function handleSubmit(values: { fullName?: string; email: string; password?: string }) {
    const normalizedEmail = values.email.trim();
    setEmail(normalizedEmail);
    try {
      setSubmitting(true);
      setError(null);
      setNotice(null);
      setShowResetSuggestion(false);

      if (mode === "signin") {
        await signIn(normalizedEmail, values.password ?? "");
      } else if (mode === "signup") {
        const result = await signUp(normalizedEmail, values.password ?? "", (values.fullName ?? "").trim());
        if (result.status === "existing-account") {
          setError(t.accountAlreadyExists);
          setShowResetSuggestion(true);
          return;
        }
        if (result.status === "email-confirmation-required") {
          setNotice(t.accountCreatedCheckEmail);
          form.resetFields(["password"]);
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
        const cooldownSeconds = readPasswordResetCooldownSeconds(normalizedEmail) || PASSWORD_RESET_COOLDOWN_SECONDS;
        setRecoverCooldownSeconds(cooldownSeconds);
        setError(t.resetPasswordRateLimit(cooldownSeconds));
      } else {
        setError(err instanceof Error ? localizeAuthErrorMessage(err.message) ?? t.authenticationFailed : t.authenticationFailed);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const isRecoverCoolingDown = mode === "recover" && recoverCooldownSeconds > 0;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #fffaf0 0%, #f5efe3 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ width: "100%", maxWidth: 900, display: "grid", gridTemplateColumns: "1fr 1fr", borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 60px rgba(180,100,0,0.12)", border: "1px solid #fde68a" }}>
        {/* Left panel */}
        <div style={{ background: "#1e2433", padding: 40, color: "#e8dfc8" }}>
          <BrandMark
            companyLogoUrl={appSettings?.companyLogoUrl}
            alt={t.siteTitle}
            style={{ width: 56, height: 56, borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", background: "#fff" }}
          />
          <Typography.Title level={2} style={{ color: "#e8dfc8", marginTop: 32, fontWeight: 600 }}>
            {t.siteTitle}
          </Typography.Title>
          <Typography.Text style={{ color: "rgba(232,223,200,0.7)", display: "block", marginTop: 12, lineHeight: 1.7 }}>
            {t.authIntro}
          </Typography.Text>
        </div>

        {/* Right panel */}
        <div style={{ background: "#fff", padding: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <Segmented
              options={[
                { label: t.signIn, value: "signin" },
                { label: t.createAccount, value: "signup" },
              ]}
              value={mode === "recover" ? "signin" : mode}
              onChange={(val) => switchMode(val as "signin" | "signup")}
            />
            <Segmented
              options={languages.map((l) => ({ label: l.label, value: l.value }))}
              value={lang}
              onChange={(val) => setLang(val as Lang)}
              size="small"
            />
          </div>

          <Typography.Title level={4} style={{ marginBottom: 4 }}>
            {mode === "recover" ? t.forgotPassword : mode === "signin" ? t.signIn : t.createAccount}
          </Typography.Title>
          <Typography.Text type="secondary" style={{ display: "block", marginBottom: 20, fontSize: 13 }}>
            {mode === "recover" ? t.forgotPasswordIntro : t.authIntro}
          </Typography.Text>

          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            {mode === "signup" && (
              <Form.Item name="fullName" label={t.fullNamePlaceholder} rules={[{ required: true }]}>
                <Input autoComplete="name" />
              </Form.Item>
            )}
            <Form.Item name="email" label={t.emailPlaceholder} rules={[{ required: true, type: "email" }]}>
              <Input autoComplete="email" type="email" autoCapitalize="none" spellCheck={false} />
            </Form.Item>
            {mode !== "recover" && (
              <Form.Item name="password" label={t.passwordPlaceholder} rules={[{ required: true, min: mode === "signup" ? 8 : 1 }]}>
                <Input.Password autoComplete={mode === "signin" ? "current-password" : "new-password"} />
              </Form.Item>
            )}
            {mode === "signin" && (
              <div style={{ textAlign: "right", marginTop: -8, marginBottom: 12 }}>
                <Typography.Link onClick={() => switchMode("recover")} style={{ fontSize: 13, color: "#d97706" }}>
                  {t.forgotPassword}
                </Typography.Link>
              </div>
            )}

            {notice && <Alert type="success" message={notice} style={{ marginBottom: 16 }} showIcon />}
            {error && (
              <Alert
                type="error"
                message={error}
                style={{ marginBottom: 16 }}
                showIcon
                action={
                  mode === "signup" && showResetSuggestion ? (
                    <Button size="small" onClick={() => { setShowResetSuggestion(false); switchMode("recover"); }}>
                      {t.resetPasswordAction}
                    </Button>
                  ) : undefined
                }
              />
            )}

            <Space>
              <Button type="primary" htmlType="submit" loading={submitting} disabled={isRecoverCoolingDown}>
                {mode === "signin" ? t.signIn : mode === "signup" ? t.createAccount : isRecoverCoolingDown ? t.sendResetLinkCooldown(recoverCooldownSeconds) : t.sendResetLink}
              </Button>
              <Button htmlType="button" onClick={() => { setError(null); setNotice(null); form.resetFields(); if (mode === "recover") switchMode("signin"); }}>
                {mode === "recover" ? t.backToSignIn : t.reset}
              </Button>
            </Space>
          </Form>
        </div>
      </div>
    </div>
  );
}
