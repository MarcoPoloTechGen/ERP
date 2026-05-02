import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  BadgeDollarSign,
  Building2,
  CalendarDays,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Package2,
  Save,
  ShieldCheck,
  Truck,
  Users,
  X,
} from "lucide-react";
import { App, Button, Divider, InputNumber, Layout as AntLayout, Select, Space, Tooltip, Typography } from "antd";
import BrandMark from "@/components/BrandMark";
import { useAuth } from "@/lib/auth";
import { erpKeys, getAppSettings, updateExchangeRateIqdPer100Usd } from "@/lib/erp";
import { useLang, type Lang } from "@/lib/i18n";
import { currencyInputProps, formatCurrency } from "@/lib/format";
import { hasAdminAccess, isSuperAdmin } from "@/lib/permissions";
import { useProjectScope } from "@/lib/project-scope";

const { Sider, Content } = AntLayout;

const MIN_EXCHANGE_RATE_IQD_PER_100_USD = 100_000;
const MAX_EXCHANGE_RATE_IQD_PER_100_USD = 1_000_000;
const DESKTOP_NAV_QUERY = "(min-width: 768px)";

const languages: Array<{ value: Lang; label: string }> = [
  { value: "en", label: "EN" },
  { value: "ku", label: "سۆرانی" },
];

function getIsDesktopNav() {
  return typeof window === "undefined" || window.matchMedia(DESKTOP_NAV_QUERY).matches;
}

function NavLink({
  href,
  label,
  icon: Icon,
  currentPath,
  onSelect,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  currentPath: string;
  onSelect: () => void;
}) {
  const active = href === "/" ? currentPath === "/" : currentPath.startsWith(href);

  return (
    <Link href={href} onClick={onSelect}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 10,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 500,
          transition: "background 0.15s",
          background: active ? "#f59e0b" : "transparent",
          color: active ? "#fff" : "rgba(232,223,200,0.85)",
        }}
        onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.08)"; }}
        onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
      >
        <Icon size={17} />
        <span>{label}</span>
      </div>
    </Link>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isDesktopNav, setIsDesktopNav] = useState(getIsDesktopNav);
  const [navOpen, setNavOpen] = useState(getIsDesktopNav);
  const [exchangeRateDraft, setExchangeRateDraft] = useState<number | null>(null);
  const [location] = useLocation();
  const { t, lang, setLang } = useLang();
  const { message } = App.useApp();
  const { profile, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { forcedProjectId, loading: projectScopeLoading, projects, selectedProjectId, setSelectedProjectId } =
    useProjectScope();
  const { data: appSettings } = useQuery({
    queryKey: erpKeys.appSettings,
    queryFn: getAppSettings,
  });
  const canEditAppSettings = hasAdminAccess(profile?.role);
  const exchangeRateValue = appSettings?.exchangeRateIqdPer100Usd ?? null;
  const exchangeRateDisplay = formatCurrency(exchangeRateValue ?? 0, "IQD");
  const isRtl = t.dir === "rtl";
  const exchangeRateMutation = useMutation({
    mutationFn: updateExchangeRateIqdPer100Usd,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: erpKeys.appSettings });
    },
    onError: (error) => {
      void message.error(error instanceof Error ? error.message : t.unexpectedError);
    },
  });

  useEffect(() => {
    setExchangeRateDraft(exchangeRateValue);
  }, [exchangeRateValue]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(DESKTOP_NAV_QUERY);
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktopNav(event.matches);
      setNavOpen(event.matches);
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const navItems = [
    { href: "/", label: t.dashboard, icon: LayoutDashboard },
    { href: "/workers", label: t.workers, icon: Users },
    { href: "/projects", label: t.projects, icon: FolderKanban },
    { href: "/suppliers", label: t.suppliers, icon: Truck },
    { href: "/products", label: t.products, icon: Package2 },
    { href: "/batiments", label: t.buildingsTitle, icon: Building2 },
    { href: "/calendar", label: t.calendar, icon: CalendarDays },
    { href: "/income", label: t.income, icon: BadgeDollarSign },
    { href: "/expenses", label: t.expenses, icon: FileText },
  ];

  const sidebarContent = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "20px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BrandMark
            companyLogoUrl={appSettings?.companyLogoUrl}
            alt={t.siteTitle}
            style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "#fff" }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(232,223,200,0.95)" }}>{t.siteTitle}</div>
            <div style={{ fontSize: 11, color: "rgba(232,223,200,0.7)" }}>{t.siteSub}</div>
          </div>
        </div>
        {!isDesktopNav && navOpen && (
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(232,223,200,0.7)", padding: 4 }}
            aria-label={t.close}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            currentPath={location}
            onSelect={() => {
              if (!isDesktopNav) {
                setNavOpen(false);
              }
            }}
            {...item}
          />
        ))}
        {hasAdminAccess(profile?.role) && (
          <NavLink
            href="/admin"
            label={t.adminTitle}
            icon={ShieldCheck}
            currentPath={location}
            onSelect={() => {
              if (!isDesktopNav) {
                setNavOpen(false);
              }
            }}
          />
        )}
      </nav>

      <Divider style={{ borderColor: "rgba(255,255,255,0.1)", margin: "16px 0" }} />

      {/* Project scope */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(232,223,200,0.72)", marginBottom: 6 }}>
          {t.projectScope}
        </div>
        <Select<string>
          className="erp-sidebar-select"
          value={selectedProjectId == null ? "all" : String(selectedProjectId)}
          loading={projectScopeLoading}
          disabled={projects.length <= 1 || forcedProjectId != null}
          optionFilterProp="label"
          showSearch
          style={{ width: "100%" }}
          onChange={(value) => setSelectedProjectId(value === "all" ? null : Number(value))}
          options={[
            { label: t.allProjects, value: "all", disabled: forcedProjectId != null },
            ...projects.map((project) => ({ label: project.name, value: String(project.id) })),
          ]}
        />
      </div>

      {/* Exchange rate */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(232,223,200,0.72)", marginBottom: 6 }}>
          {t.exchangeRate}
        </div>
        {!canEditAppSettings && (
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(232,223,200,0.85)" }}>
            <span className="erp-exchange-rate-readonly">
              100 $ = {exchangeRateValue == null ? "-" : exchangeRateDisplay}
            </span>
          </div>
        )}
        {canEditAppSettings && (
          <Space.Compact className="erp-exchange-rate-control" style={{ width: "100%" }}>
            <InputNumber
              addonBefore={<span dir="ltr">100 $ =</span>}
              min={MIN_EXCHANGE_RATE_IQD_PER_100_USD}
              max={MAX_EXCHANGE_RATE_IQD_PER_100_USD}
              value={exchangeRateDraft}
              controls={false}
              style={{ flex: 1 }}
              {...currencyInputProps("IQD")}
              onChange={(value) => setExchangeRateDraft(typeof value === "number" ? value : null)}
            />
            <Tooltip title={t.save}>
              <Button
                aria-label={t.save}
                icon={<Save size={16} />}
                loading={exchangeRateMutation.isPending}
                disabled={
                  exchangeRateDraft === exchangeRateValue ||
                  exchangeRateDraft == null ||
                  exchangeRateDraft < MIN_EXCHANGE_RATE_IQD_PER_100_USD ||
                  exchangeRateDraft > MAX_EXCHANGE_RATE_IQD_PER_100_USD
                }
                onClick={() => exchangeRateMutation.mutate(exchangeRateDraft)}
              />
            </Tooltip>
          </Space.Compact>
        )}
      </div>

      {/* User info */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(232,223,200,0.9)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {profile?.fullName ?? profile?.email ?? t.user}
        </div>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(232,223,200,0.72)", marginTop: 2 }}>
          {isSuperAdmin(profile?.role) ? t.superAdminTitle : profile?.role === "admin" ? t.adminTitle : t.user}
        </div>
      </div>

      {/* Language switcher */}
      <div style={{ display: "flex", background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: 4, marginBottom: 10 }}>
        {languages.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setLang(item.value)}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 7,
              padding: "6px 0",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
              background: lang === item.value ? "#f59e0b" : "transparent",
              color: lang === item.value ? "#fff" : "rgba(232,223,200,0.6)",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Button
        block
        icon={<LogOut size={15} />}
        onClick={() => { void signOut(); }}
      >
        {t.signOut}
      </Button>

      <div style={{ textAlign: "center", fontSize: 11, color: "rgba(232,223,200,0.3)", marginTop: 10 }}>{t.version}</div>
    </div>
  );

  return (
    <AntLayout style={{ minHeight: "100vh" }}>
      {/* Mobile overlay */}
      {!isDesktopNav && navOpen && (
        <button
          type="button"
          onClick={() => setNavOpen(false)}
          aria-label={t.closeNavigation}
          style={{
            position: "fixed", inset: 0, zIndex: 30,
            background: "rgba(15,20,40,0.5)",
            border: "none", cursor: "pointer",
            display: "block",
          }}
        />
      )}

      {/* Sidebar desktop */}
      <Sider
        width={272}
        style={{
          background: "var(--sidebar-bg, #1e2433)",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "auto",
          display: isDesktopNav && navOpen ? "block" : "none",
        }}
      >
        {sidebarContent}
      </Sider>

      {/* Mobile sidebar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          bottom: 0,
          insetInlineStart: 0,
          zIndex: 40,
          width: 272,
          background: "#1e2433",
          borderInlineEnd: "1px solid rgba(255,255,255,0.07)",
          transform: !isDesktopNav && navOpen ? "translateX(0)" : `translateX(${isRtl ? "100%" : "-100%"})`,
          transition: "transform 0.2s ease",
          overflowY: "auto",
        }}
      >
        {sidebarContent}
      </div>

      <AntLayout style={{ background: "#f8f6f0" }}>
        {/* Mobile header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            background: "rgba(248,246,240,0.92)",
            borderBottom: "1px solid #e5e0d5",
            position: "sticky",
            top: 0,
            zIndex: 20,
            backdropFilter: "blur(8px)",
          }}
          
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Button
              icon={navOpen ? <X size={17} /> : <Menu size={17} />}
              onClick={() => setNavOpen((open) => !open)}
              size="small"
              aria-expanded={navOpen}
              aria-label={navOpen ? t.closeNavigation : t.openNavigation}
            />
            <BrandMark
              companyLogoUrl={appSettings?.companyLogoUrl}
              alt={t.siteTitle}
              style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e0d5" }}
            />
            <Typography.Text strong style={{ fontSize: 14 }}>{t.siteTitle}</Typography.Text>
          </div>
        </div>

        <Content className="erp-app-content">
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
