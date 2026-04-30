import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { App as AntdApp, ConfigProvider, Result, Spin, Alert, Typography, Space } from "antd";
import { Refine } from "@refinedev/core";
import { useNotificationProvider } from "@refinedev/antd";
import { dataProvider, liveProvider } from "@refinedev/supabase";
import {
  Component,
  lazy,
  Suspense,
  type ComponentType,
  type ErrorInfo,
  type LazyExoticComponent,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import Layout from "@/components/Layout";
import { AuthProvider, useAuth } from "@/lib/auth";
import AuthPage from "@/pages/Auth";
import { refineResources } from "@/lib/refine";
import { LangProvider, getStoredLang, getTranslationsForLang, useLang } from "@/lib/i18n";
import { ProjectScopeProvider } from "@/lib/project-scope";
import { supabase, supabaseConfigError } from "@/lib/supabase";
import { isDynamicImportFailure, reloadAfterChunkFailure } from "@/lib/chunk-recovery";

// AI note: UI copy in this app must stay English or Kurdish only. Never add French text.
import { handleQueryError, handleMutationError, shouldRetryError, getRetryDelay } from "@/lib/error-handler";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.silent) return;
      handleQueryError(error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.silent) return;
      handleMutationError(error);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (!shouldRetryError(error)) return false;
        return failureCount < 2;
      },
      retryDelay: getRetryDelay,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

function lazyPage<T extends ComponentType<unknown>>(loader: () => Promise<{ default: T }>): LazyExoticComponent<T> {
  return lazy(() =>
    loader().catch((error: unknown) => {
      if (isDynamicImportFailure(error) && reloadAfterChunkFailure()) {
        return new Promise<{ default: T }>(() => {});
      }

      throw error;
    }),
  );
}

const Dashboard = lazyPage(() => import("@/pages/Dashboard"));
const Admin = lazyPage(() => import("@/pages/Admin"));
const CalendarPage = lazyPage(() => import("@/pages/Calendar"));
const Income = lazyPage(() => import("@/pages/Income"));
const InvoiceDetail = lazyPage(() => import("@/pages/InvoiceDetail"));
const Invoices = lazyPage(() => import("@/pages/Invoices"));
const Products = lazyPage(() => import("@/pages/Products"));
const ProjectDetail = lazyPage(() => import("@/pages/ProjectDetail"));
const Projects = lazyPage(() => import("@/pages/Projects"));
const ResetPassword = lazyPage(() => import("@/pages/ResetPassword"));
const SupplierDetail = lazyPage(() => import("@/pages/SupplierDetail"));
const Suppliers = lazyPage(() => import("@/pages/Suppliers"));
const WorkerDetail = lazyPage(() => import("@/pages/WorkerDetail"));
const Workers = lazyPage(() => import("@/pages/Workers"));

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; errorMessage: string | null }
> {
  state = { hasError: false, errorMessage: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, errorMessage: error instanceof Error ? error.message : null };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error("Application render failure", error, errorInfo);
  }

  render() {
    const t = getTranslationsForLang(getStoredLang());
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff7f7", padding: 24 }}>
          <Result
            status="error"
            title={t.renderErrorTitle}
            subTitle={this.state.errorMessage ?? t.unexpectedError}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

function NotFound() {
  const { t } = useLang();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <Result
        status="404"
        title={t.pageNotFound}
        subTitle={t.pageNotFoundSub}
      />
    </div>
  );
}

function RouteLoading() {
  return (
    <div style={{ padding: 24, borderRadius: 12, border: "1px solid #e5e0d5", background: "#fff", minHeight: 120, display: "flex", alignItems: "center" }}>
      <Spin size="small" />
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
        reactQuery: { clientConfig: queryClient },
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
          borderRadius: 8,
          colorPrimary: "#f59e0b",
          fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
          colorBgLayout: "#f8f6f0",
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
    if (!loading) { setShowDelayedMessage(false); return; }
    const timeoutId = window.setTimeout(() => setShowDelayedMessage(true), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [loading]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f6f0", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 400, background: "#fff", borderRadius: 20, border: "1px solid #e5e0d5", padding: 32, textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <Spin size="large" />
          <Typography.Title level={4} style={{ marginTop: 20, marginBottom: 4 }}>{t.loading}</Typography.Title>
          <Typography.Text type="secondary">{t.appLoadingDescription}</Typography.Text>
          {showDelayedMessage && (
            <Alert type="warning" message={t.appLoadingSlowDescription} style={{ marginTop: 16, textAlign: "left" }} showIcon />
          )}
        </div>
      </div>
    );
  }

  if (isResetPasswordRoute) {
    return <Suspense fallback={<RouteLoading />}><ResetPassword /></Suspense>;
  }

  if (!session) return <AuthPage />;

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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fffaf0", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 700, background: "#fff", borderRadius: 20, border: "1px solid #fde68a", padding: 40, boxShadow: "0 10px 40px rgba(180,100,0,0.08)" }}>
        <Result
          status="warning"
          title={t.configRequiredTitle}
          subTitle={t.configRequiredDescription}
        />
        <Space direction="vertical" style={{ width: "100%", marginTop: 16 }}>
          {envVars.map((envVar) => (
            <Alert
              key={envVar}
              type="info"
              message={envVar}
              description={t.variableLabel}
              showIcon
            />
          ))}
          <Alert type="warning" message={t.whereToCheckInVercel} description={t.vercelEnvHint} showIcon />
        </Space>
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
