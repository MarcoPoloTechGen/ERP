import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Alert, Button, Form, Input, Space, Typography } from "antd";
import BrandMark from "@/components/BrandMark";
import { useAuth } from "@/lib/auth";
import { localizeAuthErrorMessage } from "@/lib/auth-utils";
import { erpKeys, getAppSettings } from "@/lib/erp";
import { useLang, type Lang } from "@/lib/i18n";

const languages: Array<{ value: Lang; label: string }> = [
  { value: "ku", label: "سۆرانی" },
  { value: "en", label: "EN" },
];

export default function ResetPasswordPage() {
  const { session, isPasswordRecovery, authCallbackError, updatePassword } = useAuth();
  const { t, lang, setLang } = useLang();
  const [, navigate] = useLocation();
  const { data: appSettings } = useQuery({ queryKey: erpKeys.appSettings, queryFn: getAppSettings });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRecoveryFallback, setShowRecoveryFallback] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!isPasswordRecovery || session || authCallbackError) { setShowRecoveryFallback(false); return; }
    const timeoutId = window.setTimeout(() => setShowRecoveryFallback(true), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [authCallbackError, isPasswordRecovery, session]);

  async function handleSubmit(values: { newPassword: string; confirmPassword: string }) {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      if (values.newPassword.length < 8) throw new Error(t.passwordTooShort);
      if (values.newPassword !== values.confirmPassword) throw new Error(t.passwordMismatch);
      await updatePassword(values.newPassword);
      setSuccess(t.passwordUpdated);
      form.resetFields();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.updatePasswordFailed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #fffaf0 0%, #f5efe3 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ width: "100%", maxWidth: 900, display: "grid", gridTemplateColumns: "1fr 1fr", borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 60px rgba(180,100,0,0.12)", border: "1px solid #fde68a" }}>
        {/* Left panel */}
        <div style={{ background: "#1e2433", padding: 40, color: "#e8dfc8" }}>
          <BrandMark
            companyLogoUrl={appSettings?.companyLogoUrl}
            alt={t.siteTitle}
            style={{ width: 56, height: 56, borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <Typography.Title level={2} style={{ color: "#e8dfc8", marginTop: 32, fontWeight: 600 }}>
            {t.siteTitle}
          </Typography.Title>
          <Typography.Text style={{ color: "rgba(232,223,200,0.7)", display: "block", marginTop: 12, lineHeight: 1.7 }}>
            {t.resetPasswordPageIntro}
          </Typography.Text>
        </div>

        {/* Right panel */}
        <div style={{ background: "#fff", padding: 40 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
            <Space>
              {languages.map((item) => (
                <Button
                  key={item.value}
                  size="small"
                  type={lang === item.value ? "primary" : "default"}
                  onClick={() => setLang(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </Space>
          </div>

          <Typography.Title level={4} style={{ marginBottom: 4 }}>{t.resetPasswordPageTitle}</Typography.Title>
          <Typography.Text type="secondary" style={{ display: "block", marginBottom: 20, fontSize: 13 }}>
            {session?.user.email ?? t.resetPasswordPageIntro}
          </Typography.Text>

          {success ? (
            <Space direction="vertical" style={{ width: "100%" }}>
              <Alert type="success" message={success} showIcon />
              <Button type="primary" onClick={() => navigate("/")}>{t.dashboard}</Button>
            </Space>
          ) : isPasswordRecovery && !session && !authCallbackError && !showRecoveryFallback ? (
            <Alert type="warning" message={t.preparingRecoveryLink} showIcon />
          ) : session ? (
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item name="newPassword" label={t.newPasswordPlaceholder} rules={[{ required: true, min: 8 }]}>
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              <Form.Item name="confirmPassword" label={t.confirmPasswordPlaceholder} rules={[{ required: true, min: 8 }]}>
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />}
              <Space>
                <Button type="primary" htmlType="submit" loading={submitting}>{t.updatePassword}</Button>
                <Button onClick={() => navigate("/")}>{t.dashboard}</Button>
              </Space>
            </Form>
          ) : (
            <Space direction="vertical" style={{ width: "100%" }}>
              <Alert type="error" message={localizeAuthErrorMessage(authCallbackError) ?? t.invalidRecoveryLink} showIcon />
              <Button type="primary" onClick={() => navigate("/")}>{t.requestNewResetLink}</Button>
            </Space>
          )}
        </div>
      </div>
    </div>
  );
}
