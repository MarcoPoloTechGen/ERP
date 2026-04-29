import { Alert, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useLang } from "@/lib/i18n";

interface ErrorFallbackProps {
  error?: Error | null;
  onRetry?: () => void;
}

export function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  const { t } = useLang();

  return (
    <Alert
      type="error"
      message={t.unexpectedError}
      description={error?.message}
      action={
        onRetry ? (
          <Button
            danger
            icon={<ReloadOutlined />}
            onClick={onRetry}
            size="small"
          >
            {t.tryAgain}
          </Button>
        ) : undefined
      }
      showIcon
    />
  );
}

interface QueryErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function QueryErrorFallback({ error, resetErrorBoundary }: QueryErrorFallbackProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, padding: 24 }}>
      <ErrorFallback error={error} onRetry={resetErrorBoundary} />
    </div>
  );
}
