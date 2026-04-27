import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { App, Button, Card, Empty, InputNumber, Typography } from "antd";
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
import { useLang } from "@/lib/i18n";
import { hasAdminAccess, isSuperAdmin } from "@/lib/permissions";
import { deleteCompanyLogo, uploadCompanyLogo } from "@/lib/supabase";
import { useErpInvalidation } from "@/hooks/use-erp-invalidation";

const selectClassName =
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

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

  function updateTransactionLimitDraft(key: keyof TransactionAmountLimitsInput, value: number | null) {
    setTransactionLimitsDraft((current) => ({
      ...current,
      [key]: typeof value === "number" ? value : null,
    }));
  }

  if (!canAccessAdmin) {
    return <Empty description={t.adminRestricted} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          {t.adminTitle}
        </Typography.Title>
        <Typography.Text type="secondary">{t.adminSubtitle}</Typography.Text>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-base font-semibold text-foreground">{t.brandingTitle}</p>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t.brandingSubtitle}</p>
            <p className="mt-2 text-xs text-muted-foreground">{t.companyLogoHint}</p>
          </div>

          <div className="w-full max-w-xl rounded-3xl border border-border bg-background/60 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <BrandMark
                companyLogoUrl={logoPreviewUrl ?? appSettings?.companyLogoUrl}
                alt={t.companyLogo}
                className="h-20 w-20 border border-border bg-white"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{t.companyLogo}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {appSettings?.companyLogoPath || selectedLogoFile ? t.changeCompanyLogo : t.noCompanyLogo}
                </p>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-3 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-xl file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:opacity-90"
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
              <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {brandingNotice}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
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

      <Card className="p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-base font-semibold text-foreground">{t.transactionAmountLimitsTitle}</p>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t.transactionAmountLimitsSubtitle}</p>
          </div>

          <div className="w-full max-w-2xl rounded-3xl border border-border bg-background/60 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground">{t.minUsd}</span>
                <InputNumber
                  min={0}
                  step={0.01}
                  value={transactionLimitsDraft.transactionAmountMinUsd}
                  style={{ width: "100%" }}
                  onChange={(value) => updateTransactionLimitDraft("transactionAmountMinUsd", value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground">{t.maxUsd}</span>
                <InputNumber
                  min={0}
                  step={0.01}
                  value={transactionLimitsDraft.transactionAmountMaxUsd}
                  style={{ width: "100%" }}
                  onChange={(value) => updateTransactionLimitDraft("transactionAmountMaxUsd", value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground">{t.minIqd}</span>
                <InputNumber
                  min={0}
                  step={1}
                  precision={0}
                  value={transactionLimitsDraft.transactionAmountMinIqd}
                  style={{ width: "100%" }}
                  onChange={(value) => updateTransactionLimitDraft("transactionAmountMinIqd", value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground">{t.maxIqd}</span>
                <InputNumber
                  min={0}
                  step={1}
                  precision={0}
                  value={transactionLimitsDraft.transactionAmountMaxIqd}
                  style={{ width: "100%" }}
                  onChange={(value) => updateTransactionLimitDraft("transactionAmountMaxIqd", value)}
                />
              </label>
            </div>

            {transactionLimitsInvalid ? (
              <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {t.transactionAmountLimitsInvalid}
              </p>
            ) : null}

            <div className="mt-4">
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
        <Card className="p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-base font-semibold text-foreground">{t.errorNotificationsTitle}</p>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {t.errorNotificationsSubtitle}
              </p>
            </div>

            <div className="w-full max-w-xl rounded-3xl border border-border bg-background/60 p-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground">
                  {t.superAdminEmailLabel}
                </span>
                <input
                  type="email"
                  value={superAdminEmailDraft}
                  onChange={(e) => {
                    setSuperAdminEmailDraft(e.target.value);
                    setEmailNotice(null);
                  }}
                  placeholder={t.superAdminEmailPlaceholder}
                  className={selectClassName}
                />
              </label>

              {emailNotice && (
                <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {emailNotice}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
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
        <div className="space-y-3">
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
              <Card key={user.id} className="p-5">
                <div className="flex flex-col gap-5">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground">
                      {user.fullName ?? user.email ?? t.user}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{user.email ?? "-"}</p>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_16rem]">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        {t.fullName}
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          value={draftName}
                          disabled={!canUpdateThisRole || isSavingName}
                          onChange={(event) =>
                            setDraftNames((current) => ({
                              ...current,
                              [user.id]: event.target.value,
                            }))
                          }
                          className={`${selectClassName} flex-1`}
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

                    <div className="w-full max-w-xs">
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        {t.roleLabel}
                      </label>
                      <select
                        className={selectClassName}
                        value={user.role}
                        disabled={!canUpdateThisRole || isUpdatingRole}
                        onChange={(event) =>
                          roleMutation.mutate({
                            userId: user.id,
                            role: event.target.value as "super_admin" | "admin" | "user",
                          })
                        }
                      >
                        <option value="super_admin" disabled={!currentUserIsSuperAdmin}>
                          {t.superAdminTitle}
                        </option>
                        <option value="admin">{t.adminTitle}</option>
                        <option value="user">{t.user}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t.allowedProjects}
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {(projects ?? []).map((project) => {
                        const checked = userHasAllProjects ? true : allowedProjectIds.includes(project.id);
                        return (
                          <label
                            key={project.id}
                            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
                              checked ? "border-primary/30 bg-primary/5" : "border-border bg-background"
                            } ${userHasAllProjects ? "opacity-70" : ""}`}
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
    </div>
  );
}
