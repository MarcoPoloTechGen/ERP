import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { App as AntdApp, ConfigProvider } from "antd";
import { Refine } from "@refinedev/core";
import { useNotificationProvider } from "@refinedev/antd";
import { dataProvider, liveProvider } from "@refinedev/supabase";
import { Component, lazy, Suspense, type ErrorInfo, type ReactNode, useEffect, useState } from "react";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import Layout from "@/components/Layout";
import { AuthProvider, useAuth } from "@/lib/auth";
import AuthPage from "@/pages/Auth";
import { refineResources } from "@/lib/refine";
import { LangProvider, getStoredLang, getTranslationsForLang, useLang } from "@/lib/i18n";
import { ProjectScopeProvider } from "@/lib/project-scope";
import { supabase, supabaseConfigError } from "@/lib/supabase";

// AI note: UI copy in this app must stay English or Kurdish only. Never add French text.
import { handleQueryError, handleMutationError, shouldRetryError, getRetryDelay } from "@/lib/error-handler";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Ne pas afficher d'erreur pour les requêtes silencieuses (préférences utilisateur, etc.)
      if (query.meta?.silent) return;
      handleQueryError(error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Ne pas afficher d'erreur pour les mutations silencieuses
      if (mutation.meta?.silent) return;
      handleMutationError(error);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        // Retry uniquement pour les erreurs réseau/serveur avec exponential backoff
        if (!shouldRetryError(error)) return false;
        return failureCount < 2; // Max 2 retries
      },
      retryDelay: getRetryDelay,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Admin = lazy(() => import("@/pages/Admin"));
const CalendarPage = lazy(() => import("@/pages/Calendar"));
const Income = lazy(() => import("@/pages/Income"));
const InvoiceDetail = lazy(() => import("@/pages/InvoiceDetail"));
const Invoices = lazy(() => import("@/pages/Invoices"));
const Products = lazy(() => import("@/pages/Products"));
const ProjectDetail = lazy(() => import("@/pages/ProjectDetail"));
const Projects = lazy(() => import("@/pages/Projects"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const SupplierDetail = lazy(() => import("@/pages/SupplierDetail"));
const Suppliers = lazy(() => import("@/pages/Suppliers"));
const WorkerDetail = lazy(() => import("@/pages/WorkerDetail"));
const Workers = lazy(() => import("@/pages/Workers"));

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; errorMessage: string | null }
> {
  state = {
    hasError: false,
    errorMessage: null as string | null,
  };

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : null,
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error("Application render failure", error, errorInfo);
  }

  render() {
    const t = getTranslationsForLang(getStoredLang());
    const errorMessage = this.state.errorMessage ?? t.unexpectedError;

    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.18),_transparent_28%),linear-gradient(180deg,_#fff7f7_0%,_#f4eeee_100%)] px-6 py-10 text-slate-900">
          <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center">
            <div className="w-full rounded-[28px] border border-rose-200/80 bg-white/95 p-8 shadow-xl shadow-rose-950/10 backdrop-blur sm:p-10">
              <div className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-800">
                {t.renderErrorBadge}
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {t.renderErrorTitle}
              </h1>
              <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
                {t.renderErrorDescription}
              </p>
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {errorMessage}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function NotFound() {
  const { t } = useLang();
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">{t.pageNotFound}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.pageNotFoundSub}</p>
      </div>
    </div>
  );
}

function RouteLoading() {
  const { t } = useLang();

  return (
    <div className="h-32 animate-pulse rounded-2xl border border-card-border bg-card p-6">
      <p className="text-sm font-medium text-foreground">{t.loading}</p>
    </div>
  );
}

function StandardProviders({ children }: { children: ReactNode }) {
  const { t } = useLang();
  const content = supabaseConfigError ? (
    children
  ) : (
    <Refine
      dataProvider={dataProvider(supabase)}
      liveProvider={liveProvider(supabase)}
      notificationProvider={useNotificationProvider}
      resources={refineResources}
      options={{
        disableRouteChangeHandler: true,
        disableTelemetry: true,
        syncWithLocation: false,
        reactQuery: {
          clientConfig: queryClient,
        },
      }}
    >
      {children}
    </Refine>
  );

  return (
    <ConfigProvider
      direction={t.dir}
      theme={{
        token: {
          borderRadius: 6,
          colorPrimary: "#f59e0b",
          fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        },
      }}
    >
      <AntdApp>{content}</AntdApp>
    </ConfigProvider>
  );
}

function AppRouter() {
  const { loading, session } = useAuth();
  const { t } = useLang();
  const [location] = useLocation();
  const [showDelayedMessage, setShowDelayedMessage] = useState(false);
  const isResetPasswordRoute = location === "/reset-password" || location === "/reset-password/";

  useEffect(() => {
    if (!loading) {
      setShowDelayedMessage(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowDelayedMessage(true);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-[28px] border border-card-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto h-16 w-16 animate-pulse rounded-3xl border border-card-border bg-card" />
          <h1 className="mt-5 text-xl font-semibold text-foreground">{t.loading}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.appLoadingDescription}
          </p>
          {showDelayedMessage ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-950">
              {t.appLoadingSlowDescription}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (isResetPasswordRoute) {
    return (
      <Suspense fallback={<RouteLoading />}>
        <ResetPassword />
      </Suspense>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <ProjectScopeProvider>
      <Layout>
        <Suspense fallback={<RouteLoading />}>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/workers" component={Workers} />
            <Route path="/workers/:id" component={WorkerDetail} />
            <Route path="/projects" component={Projects} />
            <Route path="/projects/:id" component={ProjectDetail} />
            <Route path="/suppliers" component={Suppliers} />
            <Route path="/suppliers/:id" component={SupplierDetail} />
            <Route path="/products" component={Products} />
            <Route path="/calendar" component={CalendarPage} />
            <Route path="/income" component={Income} />
            <Route path="/expenses" component={Invoices} />
            <Route path="/expenses/:id" component={InvoiceDetail} />
            <Route path="/admin" component={Admin} />
            <Route path="/invoices" component={Invoices} />
            <Route path="/invoices/:id" component={InvoiceDetail} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </Layout>
    </ProjectScopeProvider>
  );
}

function MissingConfigScreen() {
  const { t } = useLang();
  const envVars = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.18),_transparent_32%),linear-gradient(180deg,_#fffaf0_0%,_#f6efe0_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl items-center">
        <div className="w-full rounded-[28px] border border-amber-200/70 bg-white/90 p-8 shadow-xl shadow-amber-950/10 backdrop-blur sm:p-10">
          <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
            {t.configRequiredBadge}
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {t.configRequiredTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            {t.configRequiredDescription}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {envVars.map((envVar) => (
              <div key={envVar} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{t.variableLabel}</p>
                <p className="mt-2 font-mono text-sm text-slate-900">{envVar}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950">
            <p className="font-semibold">{t.whereToCheckInVercel}</p>
            <p className="mt-2 leading-6">{t.vercelEnvHint}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LangProvider>
            <StandardProviders>
              {supabaseConfigError ? (
                <MissingConfigScreen />
              ) : (
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <AppRouter />
                </WouterRouter>
              )}
              <Analytics />
              <SpeedInsights />
            </StandardProviders>
          </LangProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
