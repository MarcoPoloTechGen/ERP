import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { App, Button, Card, Empty, Input, InputNumber, Select as AntSelect, Space, Typography } from "antd";
import {
  erpKeys,
  getAppSettings,
  listProfiles,
  listProjectMemberships,
  listProjects,
  replaceUserProjectMemberships,
  updateCompanyLogoPath,
  updateProfileName,
  updateProfileRole,
  updateTransactionAmountLimits,
  type TransactionAmountLimitsInput,
} from "@/lib/erp";
import {
  getNotificationSettings,
  setSuperAdminEmail,
} from "@/lib/notifications/error-notification";
import BrandMark from "@/components/BrandMark";
import { useAuth } from "@/lib/auth";
import { currencyInputProps } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { hasAdminAccess, isSuperAdmin } from "@/lib/permissions";
import { deleteCompanyLogo, uploadCompanyLogo } from "@/lib/supabase";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";



export default function Admin() {
  const { t } = useLang();
  const { profile, refreshProfile } = useAuth();
  const { message } = App.useApp();
  const canAccessAdmin = hasAdminAccess(profile?.role);
  const currentUserIsSuperAdmin = isSuperAdmin(profile?.role);
  const erpInvalidation = useErpInvalidation();
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [brandingNotice, setBrandingNotice] = useState<string | null>(null);
  const [transactionLimitsDraft, setTransactionLimitsDraft] = useState<TransactionAmountLimitsInput>({
    transactionAmountMinUsd: null,
    transactionAmountMaxUsd: null,
    transactionAmountMinIqd: null,
    transactionAmountMaxIqd: null,
  });
  const [superAdminEmailDraft, setSuperAdminEmailDraft] = useState<string>("");
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  const { data: appSettings } = useQuery({
    queryKey: erpKeys.appSettings,
    queryFn: getAppSettings,
    enabled: canAccessAdmin,
  });
  const { data: profiles } = useQuery({
    queryKey: erpKeys.users,
    queryFn: listProfiles,
    enabled: canAccessAdmin,
  });
  const { data: projects } = useQuery({
    queryKey: erpKeys.projects,
    queryFn: listProjects,
    enabled: canAccessAdmin,
  });
  const { data: memberships } = useQuery({
    queryKey: erpKeys.projectMemberships,
    queryFn: listProjectMemberships,
    enabled: canAccessAdmin,
  });
  const { data: notificationSettings } = useQuery({
    queryKey: ["notificationSettings"],
    queryFn: getNotificationSettings,
    enabled: currentUserIsSuperAdmin,
  });

  useEffect(() => {
    if (!appSettings) {
      return;
    }

    setTransactionLimitsDraft({
      transactionAmountMinUsd: appSettings.transactionAmountMinUsd,
      transactionAmountMaxUsd: appSettings.transactionAmountMaxUsd,
      transactionAmountMinIqd: appSettings.transactionAmountMinIqd,
      transactionAmountMaxIqd: appSettings.transactionAmountMaxIqd,
    });
  }, [appSettings]);

  useEffect(() => {
    if (notificationSettings?.super_admin_email) {
      setSuperAdminEmailDraft(notificationSettings.super_admin_email);
    }
  }, [notificationSettings]);

  const membershipMap = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const membership of memberships ?? []) {
      map.set(membership.userId, [...(map.get(membership.userId) ?? []), membership.projectId]);
    }
    return map;
  }, [memberships]);

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "super_admin" | "admin" | "user" }) => {
      await updateProfileRole(userId, role);
    },
    onSuccess: async (_data, variables) => {
      await erpInvalidation.users();
      if (variables.userId === profile?.id) {
        await refreshProfile();
      }
    },
  });

  const nameMutation = useMutation({
    mutationFn: async ({ userId, fullName }: { userId: string; fullName: string }) => {
      await updateProfileName(userId, fullName);
    },
    onSuccess: async (_data, variables) => {
      await erpInvalidation.users();
      if (variables.userId === profile?.id) {
        await refreshProfile();
      }
      setDraftNames((current) => {
        const next = { ...current };
        delete next[variables.userId];
        return next;
      });
    },
  });

  const membershipMutation = useMutation({
    mutationFn: async ({ userId, projectIds }: { userId: string; projectIds: number[] }) => {
      await replaceUserProjectMemberships(userId, projectIds);
    },
    onSuccess: async () => {
      await erpInvalidation.users();
    },
  });

  const brandingMutation = useMutation({
    mutationFn: async ({ remove }: { remove: boolean }) => {
      const previousPath = appSettings?.companyLogoPath ?? null;
      let uploadedPath: string | null = null;

      if (!remove && !selectedLogoFile) {
        return;
      }

      let resolvedNextPath: string | null = null;
      if (!remove && selectedLogoFile) {
        const uploaded = await uploadCompanyLogo(selectedLogoFile);
        uploadedPath = uploaded.path;
        resolvedNextPath = uploaded.path;
      }

      const targetPath = remove ? null : resolvedNextPath;

      try {
        await updateCompanyLogoPath(targetPath);
      } catch (error) {
        if (uploadedPath) {
          await deleteCompanyLogo(uploadedPath);
        }
        throw error;
      }

      if (previousPath && previousPath !== targetPath) {
        await deleteCompanyLogo(previousPath);
      }
    },
    onSuccess: async (_data, variables) => {
      await erpInvalidation.appSettings();
      setSelectedLogoFile(null);
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
      setLogoPreviewUrl(null);
      setBrandingNotice(variables.remove ? t.companyLogoRemoved : t.companyLogoUpdated);
    },
  });

  const transactionLimitsMutation = useMutation({
    mutationFn: updateTransactionAmountLimits,
    onSuccess: async () => {
      await erpInvalidation.appSettings();
      void message.success(t.settingsUpdated);
    },
    onError: (error) => void message.error(error instanceof Error ? error.message : t.unexpectedError),
  });

  const superAdminEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      await setSuperAdminEmail(email);
    },
    onSuccess: async () => {
      setEmailNotice("Email de notification mis à jour avec succès.");
      void message.success("Paramètres de notification mis à jour");
    },
    onError: (error) => void message.error(error instanceof Error ? error.message : t.unexpectedError),
  });

  const transactionLimitsChanged =
    transactionLimitsDraft.transactionAmountMinUsd !== (appSettings?.transactionAmountMinUsd ?? null) ||
    transactionLimitsDraft.transactionAmountMaxUsd !== (appSettings?.transactionAmountMaxUsd ?? null) ||
    transactionLimitsDraft.transactionAmountMinIqd !== (appSettings?.transactionAmountMinIqd ?? null) ||
    transactionLimitsDraft.transactionAmountMaxIqd !== (appSettings?.transactionAmountMaxIqd ?? null);
  const transactionLimitsInvalid =
    (transactionLimitsDraft.transactionAmountMinUsd != null &&
      transactionLimitsDraft.transactionAmountMaxUsd != null &&
      transactionLimitsDraft.transactionAmountMinUsd > transactionLimitsDraft.transactionAmountMaxUsd) ||
    (transactionLimitsDraft.transactionAmountMinIqd != null &&
      transactionLimitsDraft.transactionAmountMaxIqd != null &&
      transactionLimitsDraft.transactionAmountMinIqd > transactionLimitsDraft.transactionAmountMaxIqd);

  function updateTransactionLimitDraft(key: keyof TransactionAmountLimitsInput, value: string | number | null) {
    const parsedValue = typeof value === "number" ? value : value ? Number(value) : null;
    setTransactionLimitsDraft((current) => ({
      ...current,
      [key]: typeof parsedValue === "number" && Number.isFinite(parsedValue) ? parsedValue : null,
    }));
  }

  if (!canAccessAdmin) {
    return <Empty description={t.adminRestricted} />;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          {t.adminTitle}
        </Typography.Title>
        <Typography.Text type="secondary">{t.adminSubtitle}</Typography.Text>
      </div>

      <Card style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t.brandingTitle}</p>
            <p style={{ fontSize: 13, color: "#6b7280", maxWidth: 480, marginBottom: 4 }}>{t.brandingSubtitle}</p>
            <p style={{ fontSize: 12, color: "#9ca3af" }}>{t.companyLogoHint}</p>
          </div>

          <div style={{ width: "100%", maxWidth: 480, borderRadius: 16, border: "1px solid #e5e0d5", background: "#fafaf8", padding: 16 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <BrandMark
                companyLogoUrl={logoPreviewUrl ?? appSettings?.companyLogoUrl}
                alt={t.companyLogo}
                style={{ width: 80, height: 80, borderRadius: 12, border: "1px solid #e5e0d5", background: "#fff" }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500 }}>{t.companyLogo}</p>
                <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                  {appSettings?.companyLogoPath || selectedLogoFile ? t.changeCompanyLogo : t.noCompanyLogo}
                </p>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "block", width: "100%", fontSize: 13, marginTop: 12, color: "#6b7280" }}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setSelectedLogoFile(file);
                    setBrandingNotice(null);
                    if (logoPreviewUrl) {
                      URL.revokeObjectURL(logoPreviewUrl);
                    }
                    setLogoPreviewUrl(file ? URL.createObjectURL(file) : null);
                  }}
                />
              </div>
            </div>

            {brandingNotice ? (
              <p style={{ marginTop: 16, borderRadius: 12, border: "1px solid #bbf7d0", background: "#f0fdf4", padding: "10px 16px", fontSize: 13, color: "#166534" }}>
                {brandingNotice}
              </p>
            ) : null}

            <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Button
                type="primary"
                onClick={() => brandingMutation.mutate({ remove: false })}
                disabled={!selectedLogoFile || brandingMutation.isPending}
              >
                {t.saveCompanyLogo}
              </Button>
              <Button
                onClick={() => {
                  setSelectedLogoFile(null);
                  setBrandingNotice(null);
                  if (logoPreviewUrl) {
                    URL.revokeObjectURL(logoPreviewUrl);
                  }
                  setLogoPreviewUrl(null);
                }}
                disabled={!selectedLogoFile || brandingMutation.isPending}
              >
                {t.reset}
              </Button>
              <Button
                onClick={() => brandingMutation.mutate({ remove: true })}
                disabled={!appSettings?.companyLogoPath || brandingMutation.isPending}
              >
                {t.removeCompanyLogo}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t.transactionAmountLimitsTitle}</p>
            <p style={{ fontSize: 13, color: "#6b7280", maxWidth: 480, marginBottom: 4 }}>{t.transactionAmountLimitsSubtitle}</p>
          </div>

          <div style={{ width: "100%", maxWidth: 640, borderRadius: 16, border: "1px solid #e5e0d5", background: "#fafaf8", padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <label >
                <span style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{t.minUsd}</span>
                <InputNumber
                  min={0}
                  step={0.01}
                  value={transactionLimitsDraft.transactionAmountMinUsd}
                  style={{ width: "100%" }}
                  {...currencyInputProps("USD")}
                  onChange={(value) => updateTransactionLimitDraft("transactionAmountMinUsd", value)}
                />
              </label>
              <label >
                <span style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{t.maxUsd}</span>
                <InputNumber
                  min={0}
                  step={0.01}
                  value={transactionLimitsDraft.transactionAmountMaxUsd}
                  style={{ width: "100%" }}
                  {...currencyInputProps("USD")}
                  onChange={(value) => updateTransactionLimitDraft("transactionAmountMaxUsd", value)}
                />
              </label>
              <label >
                <span style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{t.minIqd}</span>
                <InputNumber
                  min={0}
                  step={0.01}
                  value={transactionLimitsDraft.transactionAmountMinIqd}
                  style={{ width: "100%" }}
                  {...currencyInputProps("IQD")}
                  onChange={(value) => updateTransactionLimitDraft("transactionAmountMinIqd", value)}
                />
              </label>
              <label >
                <span style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{t.maxIqd}</span>
                <InputNumber
                  min={0}
                  step={0.01}
                  value={transactionLimitsDraft.transactionAmountMaxIqd}
                  style={{ width: "100%" }}
                  {...currencyInputProps("IQD")}
                  onChange={(value) => updateTransactionLimitDraft("transactionAmountMaxIqd", value)}
                />
              </label>
            </div>

            {transactionLimitsInvalid ? (
              <p style={{ marginTop: 16, borderRadius: 12, border: "1px solid #fecdd3", background: "#fff1f2", padding: "10px 16px", fontSize: 13, color: "#9f1239" }}>
                {t.transactionAmountLimitsInvalid}
              </p>
            ) : null}

            <div style={{ marginTop: 16 }}>
              <Button
                type="primary"
                loading={transactionLimitsMutation.isPending}
                disabled={!transactionLimitsChanged || transactionLimitsInvalid || transactionLimitsMutation.isPending}
                onClick={() => transactionLimitsMutation.mutate(transactionLimitsDraft)}
              >
                {t.save}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {currentUserIsSuperAdmin && (
        <Card style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t.errorNotificationsTitle}</p>
              <p style={{ fontSize: 13, color: "#6b7280", maxWidth: 480, marginBottom: 4 }}>
                {t.errorNotificationsSubtitle}
              </p>
            </div>

            <div style={{ width: "100%", maxWidth: 480, borderRadius: 16, border: "1px solid #e5e0d5", background: "#fafaf8", padding: 16 }}>
              <label >
                <span style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  {t.superAdminEmailLabel}
                </span>
                <Input
                  type="email"
                  value={superAdminEmailDraft}
                  onChange={(e) => {
                    setSuperAdminEmailDraft(e.target.value);
                    setEmailNotice(null);
                  }}
                  placeholder={t.superAdminEmailPlaceholder}
                />
              </label>

              {emailNotice && (
                <p style={{ marginTop: 16, borderRadius: 12, border: "1px solid #bbf7d0", background: "#f0fdf4", padding: "10px 16px", fontSize: 13, color: "#166534" }}>
                  {emailNotice}
                </p>
              )}

              <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Button
                  type="primary"
                  loading={superAdminEmailMutation.isPending}
                  disabled={
                    superAdminEmailDraft === ((notificationSettings as { super_admin_email?: string } | null)?.super_admin_email ?? "") ||
                    superAdminEmailMutation.isPending
                  }
                  onClick={() => superAdminEmailMutation.mutate(superAdminEmailDraft)}
                >
                  {t.save}
                </Button>
                <Button
                  onClick={() => {
                    setSuperAdminEmailDraft((notificationSettings as { super_admin_email?: string } | null)?.super_admin_email ?? "");
                    setEmailNotice(null);
                  }}
                  disabled={
                    superAdminEmailDraft === ((notificationSettings as { super_admin_email?: string } | null)?.super_admin_email ?? "") ||
                    superAdminEmailMutation.isPending
                  }
                >
                  {t.reset}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {!profiles?.length ? (
        <Empty description={t.noUsersFound} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {profiles.map((user) => {
            const allowedProjectIds = membershipMap.get(user.id) ?? [];
            const draftName = draftNames[user.id] ?? user.fullName ?? "";
            const normalizedDraftName = draftName.trim();
            const canSaveName =
              normalizedDraftName.length > 0 && normalizedDraftName !== (user.fullName ?? "").trim();
            const isSavingName = nameMutation.isPending && nameMutation.variables?.userId === user.id;
            const isUpdatingRole = roleMutation.isPending && roleMutation.variables?.userId === user.id;
            const canUpdateThisRole = currentUserIsSuperAdmin || !isSuperAdmin(user.role);
            const userHasAllProjects = hasAdminAccess(user.role);

            return (
              <Card key={user.id} style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.fullName ?? user.email ?? t.user}
                    </p>
                    <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{user.email ?? "-"}</p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 256px", gap: 16, flexWrap: "wrap" }}>
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                        {t.fullName}
                      </label>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Input
                          value={draftName}
                          disabled={!canUpdateThisRole || isSavingName}
                          onChange={(event) =>
                            setDraftNames((current) => ({
                              ...current,
                              [user.id]: event.target.value,
                            }))
                          }
                          style={{ flex: 1 }}
                          placeholder={t.fullNamePlaceholder}
                        />
                        <Button
                          type="primary"
                          onClick={() =>
                            nameMutation.mutate({
                              userId: user.id,
                              fullName: normalizedDraftName,
                            })
                          }
                          disabled={!canUpdateThisRole || !canSaveName || isSavingName}
                        >
                          {t.save}
                        </Button>
                      </div>
                    </div>

                    <div style={{ width: "100%", maxWidth: 280 }}>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                        {t.roleLabel}
                      </label>
                      <AntSelect
                        value={user.role}
                        disabled={!canUpdateThisRole || isUpdatingRole}
                        style={{ width: "100%" }}
                        onChange={(value) =>
                          roleMutation.mutate({
                            userId: user.id,
                            role: value as "super_admin" | "admin" | "user",
                          })
                        }
                        options={[
                          { value: "super_admin", label: t.superAdminTitle, disabled: !currentUserIsSuperAdmin },
                          { value: "admin", label: t.adminTitle },
                          { value: "user", label: t.user },
                        ]}
                      />
                    </div>
                  </div>

                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>
                      {t.allowedProjects}
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 12 }}>
                      {(projects ?? []).map((project) => {
                        const checked = userHasAllProjects ? true : allowedProjectIds.includes(project.id);
                        return (
                          <label
                            key={project.id}
                            style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 12, border: checked ? "1px solid rgba(245,158,11,0.4)" : "1px solid #e5e0d5", padding: "10px 16px", fontSize: 13, background: checked ? "rgba(245,158,11,0.05)" : "#fff", opacity: userHasAllProjects ? 0.7 : 1, cursor: userHasAllProjects ? "default" : "pointer" }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={userHasAllProjects}
                              onChange={(event) => {
                                const nextIds = event.target.checked
                                  ? [...allowedProjectIds, project.id]
                                  : allowedProjectIds.filter((currentId) => currentId !== project.id);
                                membershipMutation.mutate({
                                  userId: user.id,
                                  projectIds: Array.from(new Set(nextIds)),
                                });
                              }}
                            />
                            <span>{project.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Space>
  );
}
