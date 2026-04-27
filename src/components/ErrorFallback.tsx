import { useLang } from "@/lib/i18n";
import { Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

interface ErrorFallbackProps {
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

export function ErrorFallback({ error, onRetry, className = "" }: ErrorFallbackProps) {
  const { t } = useLang();

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/80 p-8 text-center ${className}`}
    >
      <div className="mb-4 rounded-full bg-rose-100 p-3">
        <svg
          className="h-6 w-6 text-rose-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="mb-2 text-base font-semibold text-rose-900">{t.unexpectedError}</h3>
      {error?.message && (
        <p className="mb-4 max-w-md text-sm text-rose-700">{error.message}</p>
      )}
      {onRetry && (
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={onRetry}
          className="bg-rose-600 hover:bg-rose-700"
        >
          {t.tryAgain}
        </Button>
      )}
    </div>
  );
}

interface QueryErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function QueryErrorFallback({ error, resetErrorBoundary }: QueryErrorFallbackProps) {
  const { t } = useLang();

  return (
    <div className="flex min-h-[200px] items-center justify-center p-6">
      <ErrorFallback error={error} onRetry={resetErrorBoundary} />
    </div>
  );
}
