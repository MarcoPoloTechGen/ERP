import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Router as WouterRouter, Switch } from "wouter";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import InvoiceDetail from "@/pages/InvoiceDetail";
import Invoices from "@/pages/Invoices";
import Products from "@/pages/Products";
import ProjectDetail from "@/pages/ProjectDetail";
import Projects from "@/pages/Projects";
import Suppliers from "@/pages/Suppliers";
import WorkerDetail from "@/pages/WorkerDetail";
import Workers from "@/pages/Workers";
import { LangProvider, useLang } from "@/lib/i18n";

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
        <Route path="/invoices" component={Invoices} />
        <Route path="/invoices/:id" component={InvoiceDetail} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRouter />
        </WouterRouter>
      </LangProvider>
    </QueryClientProvider>
  );
}
