import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-16 w-16 animate-pulse rounded-3xl border border-card-border bg-card" />
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
  );
}
