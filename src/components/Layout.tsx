import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  BadgeDollarSign,
  FileText,
  FolderKanban,
  HardHat,
  LayoutDashboard,
  LogOut,
  Menu,
  Package2,
  ShieldCheck,
  Truck,
  Users,
  X,
} from "lucide-react";
import { SecondaryButton } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { useLang, type Lang } from "@/lib/i18n";

const languages: Array<{ value: Lang; label: string }> = [
  { value: "en", label: "EN" },
  { value: "ku", label: "KU" },
];

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
        className={`flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        }`}
      >
        <Icon size={18} />
        <span>{label}</span>
      </div>
    </Link>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const { t, lang, setLang } = useLang();
  const { profile, signOut } = useAuth();

  const navItems = [
    { href: "/", label: t.dashboard, icon: LayoutDashboard },
    { href: "/workers", label: t.workers, icon: Users },
    { href: "/projects", label: t.projects, icon: FolderKanban },
    { href: "/suppliers", label: t.suppliers, icon: Truck },
    { href: "/products", label: t.products, icon: Package2 },
    { href: "/income", label: "Revenus", icon: BadgeDollarSign },
    { href: "/expenses", label: "Depenses", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.95),_rgba(248,250,252,1))] text-foreground">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      ) : null}

      <div className="flex min-h-screen w-full">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 transition-transform md:static md:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-sidebar-border pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-amber-400/20">
                <HardHat size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-sidebar-foreground">{t.siteTitle}</p>
                <p className="text-xs text-sidebar-foreground/60">{t.siteSub}</p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-sidebar-foreground md:hidden"
              onClick={() => setMobileOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <nav className="mt-5 flex-1 space-y-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                currentPath={location}
                onSelect={() => setMobileOpen(false)}
                {...item}
              />
            ))}
            {profile?.role === "admin" ? (
              <NavLink
                href="/admin"
                label="Administration"
                icon={ShieldCheck}
                currentPath={location}
                onSelect={() => setMobileOpen(false)}
              />
            ) : null}
          </nav>

          <div className="space-y-3 border-t border-sidebar-border pt-4">
            <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/50 px-3 py-3">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {profile?.fullName ?? profile?.email ?? "Utilisateur"}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-sidebar-foreground/55">
                {profile?.role === "admin" ? "Admin" : "Utilisateur"}
              </p>
            </div>

            <div className="flex rounded-2xl bg-sidebar-accent p-1">
              {languages.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setLang(item.value)}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    lang === item.value
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground/70"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <SecondaryButton
              className="w-full justify-center border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => {
                void signOut();
              }}
            >
              <LogOut size={16} />
              Deconnexion
            </SecondaryButton>

            <p className="text-center text-xs text-sidebar-foreground/45">{t.version}</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur md:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-border p-2 text-foreground"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu size={18} />
                </button>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.siteTitle}</p>
                  <p className="text-xs text-muted-foreground">{t.siteSub}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
