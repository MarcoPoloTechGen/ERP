import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from "react";
import { Route, Router as WouterRouter, Switch } from "wouter";
import Layout from "@/components/Layout";
import { AuthProvider, useAuth } from "@/lib/auth";
import Dashboard from "@/pages/Dashboard";
import AuthPage from "@/pages/Auth";
import Admin from "@/pages/Admin";
import Income from "@/pages/Income";
import InvoiceDetail from "@/pages/InvoiceDetail";
import Invoices from "@/pages/Invoices";
import Products from "@/pages/Products";
import ProjectDetail from "@/pages/ProjectDetail";
import Projects from "@/pages/Projects";
import Suppliers from "@/pages/Suppliers";
import WorkerDetail from "@/pages/WorkerDetail";
import Workers from "@/pages/Workers";
import { LangProvider, useLang } from "@/lib/i18n";
import { supabaseConfigError } from "@/lib/supabase";

const queryClient = new QueryClient();

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
      errorMessage: error instanceof Error ? error.message : "Une erreur inattendue est survenue.",
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error("Application render failure", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.18),_transparent_28%),linear-gradient(180deg,_#fff7f7_0%,_#f4eeee_100%)] px-6 py-10 text-slate-900">
          <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center">
            <div className="w-full rounded-[28px] border border-rose-200/80 bg-white/95 p-8 shadow-xl shadow-rose-950/10 backdrop-blur sm:p-10">
              <div className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-800">
                Erreur d&apos;affichage
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                L&apos;application a rencontre une erreur.
              </h1>
              <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
                Un probleme empeche l&apos;interface de s&apos;afficher correctement. Vous pouvez
                recharger la page pour tenter une reprise immediate.
              </p>
              {this.state.errorMessage ? (
                <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {this.state.errorMessage}
                </div>
              ) : null}
              <div className="mt-8">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Recharger la page
                </button>
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

function AppRouter() {
  const { loading, session } = useAuth();
  const [showDelayedMessage, setShowDelayedMessage] = useState(false);

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
          <h1 className="mt-5 text-xl font-semibold text-foreground">Chargement en cours</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            L&apos;application prepare votre session et la connexion a la base.
          </p>
          {showDelayedMessage ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-950">
              Le chargement prend plus de temps que prevu. Si rien ne change, rechargez la page ou
              verifiez Supabase.
            </div>
          ) : null}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Recharger
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/workers" component={Workers} />
        <Route path="/workers/:id" component={WorkerDetail} />
        <Route path="/projects" component={Projects} />
        <Route path="/projects/:id" component={ProjectDetail} />
        <Route path="/suppliers" component={Suppliers} />
        <Route path="/products" component={Products} />
        <Route path="/income" component={Income} />
        <Route path="/expenses" component={Invoices} />
        <Route path="/expenses/:id" component={InvoiceDetail} />
        <Route path="/admin" component={Admin} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/invoices/:id" component={InvoiceDetail} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function MissingConfigScreen() {
  const envVars = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.18),_transparent_32%),linear-gradient(180deg,_#fffaf0_0%,_#f6efe0_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl items-center">
        <div className="w-full rounded-[28px] border border-amber-200/70 bg-white/90 p-8 shadow-xl shadow-amber-950/10 backdrop-blur sm:p-10">
          <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
            Configuration Vercel requise
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            L&apos;application ne peut pas se connecter a Supabase.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            {supabaseConfigError} Ajoute les variables d&apos;environnement suivantes dans le projet
            Vercel, puis redeploie.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {envVars.map((envVar) => (
              <div key={envVar} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Variable</p>
                <p className="mt-2 font-mono text-sm text-slate-900">{envVar}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950">
            <p className="font-semibold">Ou verifier dans Vercel</p>
            <p className="mt-2 leading-6">
              Project Settings {'>'} Environment Variables. Renseigne les memes valeurs que dans le
              fichier <code className="rounded bg-white px-1.5 py-0.5 text-xs">.env</code> local pour
              les environnements de production et preview.
            </p>
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
            {supabaseConfigError ? (
              <MissingConfigScreen />
            ) : (
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <AppRouter />
              </WouterRouter>
            )}
          </LangProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
