import { useCallback } from "react";
import { toast } from "sonner";
import { formatErrorMessage, isAuthError, normalizeError, type AppError } from "@/lib/error-handler";
import { useLang } from "@/lib/i18n";

interface UseApiErrorReturn {
  /** Affiche un toast avec le message d'erreur formaté */
  showError: (error: unknown, customMessage?: string) => void;
  /** Formate une erreur en message lisible */
  formatError: (error: unknown) => string;
  /** Normalise une erreur en AppError */
  normalizeError: (error: unknown) => AppError;
  /** Vérifie si c'est une erreur d'authentification */
  isAuthError: (error: unknown) => boolean;
  /** Affiche un toast de succès */
  showSuccess: (message: string) => void;
  /** Récupère le message de retry traduit */
  getRetryMessage: () => string;
}

export function useApiError(): UseApiErrorReturn {
  const { t } = useLang();

  const showError = useCallback(
    (error: unknown, customMessage?: string) => {
      const message = customMessage || formatErrorMessage(error);
      toast.error(message, {
        duration: 5000,
        id: `error-${Date.now()}`,
        action: {
          label: t.tryAgain,
          onClick: () => window.location.reload(),
        },
      });
    },
    [t.tryAgain]
  );

  const formatError = useCallback((error: unknown): string => {
    return formatErrorMessage(error);
  }, []);

  const normalize = useCallback((error: unknown): AppError => {
    return normalizeError(error);
  }, []);

  const checkAuthError = useCallback((error: unknown): boolean => {
    return isAuthError(error);
  }, []);

  const showSuccess = useCallback((message: string) => {
    toast.success(message, {
      duration: 3000,
    });
  }, []);

  const getRetryMessage = useCallback(() => t.tryAgain, [t.tryAgain]);

  return {
    showError,
    formatError,
    normalizeError: normalize,
    isAuthError: checkAuthError,
    showSuccess,
    getRetryMessage,
  };
}
