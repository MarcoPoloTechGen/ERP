import { toast } from "sonner";
import { getTranslationsForLang, getStoredLang } from "@/lib/i18n";
import { sendErrorNotification } from "@/lib/notifications/error-notification";

// Types d'erreurs API
export type ErrorType =
  | "network"
  | "auth"
  | "permission"
  | "validation"
  | "not_found"
  | "server"
  | "unknown";

export interface AppError {
  type: ErrorType;
  message: string;
  originalError: unknown;
  statusCode?: number;
}

// Normaliser une erreur en AppError
export function normalizeError(error: unknown): AppError {
  const t = getTranslationsForLang(getStoredLang());

  // Erreur déjà normalisée
  if (isAppError(error)) {
    return error;
  }

  // Erreur Supabase
  if (isSupabaseError(error)) {
    return normalizeSupabaseError(error, t);
  }

  // Erreur HTTP/Fetch
  if (error instanceof Response) {
    return normalizeHttpError(error, t);
  }

  // Erreur réseau
  if (isNetworkError(error)) {
    return {
      type: "network",
      message: t.networkError || "Network error. Please check your connection.",
      originalError: error,
    };
  }

  // Erreur standard
  if (error instanceof Error) {
    return {
      type: "unknown",
      message: error.message,
      originalError: error,
    };
  }

  // Erreur inconnue
  return {
    type: "unknown",
    message: t.unexpectedError || "An unexpected error occurred",
    originalError: error,
  };
}

function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    "message" in error &&
    "originalError" in error
  );
}

function isSupabaseError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    ("code" in error || "message" in error || "details" in error)
  );
}

interface SupabaseError {
  code?: string;
  message?: string;
  details?: string;
  statusCode?: number;
}

function normalizeSupabaseError(error: SupabaseError, t: Record<string, string>): AppError {
  const code = error.code || "";
  const statusCode = error.statusCode;

  // Auth errors
  if (code.startsWith("auth/") || code.includes("JWT") || code.includes("token")) {
    return {
      type: "auth",
      message: t.authError || "Authentication error. Please sign in again.",
      originalError: error,
      statusCode,
    };
  }

  // Permission errors
  if (
    code.includes("permission") ||
    code.includes("policy") ||
    code.includes("PGRST") ||
    statusCode === 403
  ) {
    return {
      type: "permission",
      message: t.permissionError || "You don't have permission to perform this action.",
      originalError: error,
      statusCode,
    };
  }

  // Not found
  if (code.includes("not_found") || statusCode === 404) {
    return {
      type: "not_found",
      message: t.notFoundError || "The requested resource was not found.",
      originalError: error,
      statusCode,
    };
  }

  // Validation errors
  if (code.includes("validation") || code.includes("constraint") || statusCode === 422) {
    return {
      type: "validation",
      message: error.message || t.validationError || "Validation error. Please check your input.",
      originalError: error,
      statusCode,
    };
  }

  // Server errors
  if (statusCode && statusCode >= 500) {
    return {
      type: "server",
      message: t.serverError || "Server error. Please try again later.",
      originalError: error,
      statusCode,
    };
  }

  return {
    type: "unknown",
    message: error.message || t.unexpectedError || "An unexpected error occurred",
    originalError: error,
    statusCode,
  };
}

function normalizeHttpError(response: Response, t: Record<string, string>): AppError {
  const statusCode = response.status;

  if (statusCode === 401) {
    return {
      type: "auth",
      message: t.authError || "Authentication error. Please sign in again.",
      originalError: response,
      statusCode,
    };
  }

  if (statusCode === 403) {
    return {
      type: "permission",
      message: t.permissionError || "You don't have permission to perform this action.",
      originalError: response,
      statusCode,
    };
  }

  if (statusCode === 404) {
    return {
      type: "not_found",
      message: t.notFoundError || "The requested resource was not found.",
      originalError: response,
      statusCode,
    };
  }

  if (statusCode >= 500) {
    return {
      type: "server",
      message: t.serverError || "Server error. Please try again later.",
      originalError: response,
      statusCode,
    };
  }

  return {
    type: "unknown",
    message: t.unexpectedError || "An unexpected error occurred",
    originalError: response,
    statusCode,
  };
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("connection") ||
    message.includes("timeout") ||
    message.includes("offline") ||
    message.includes("abort")
  );
}

// Handler global pour les erreurs de requêtes
export function handleQueryError(error: unknown): void {
  const appError = normalizeError(error);

  // Log pour debugging
  console.error("[Query Error]", appError);

  // Ne pas afficher de toast pour les erreurs 404 silencieuses
  if (appError.type === "not_found") {
    return;
  }

  // Notifier le super admin pour les erreurs critiques (server, auth)
  if (appError.type === "server" || appError.type === "auth") {
    void sendErrorNotification(error, { critical: true, extraDetails: { source: "Query" } });
  }

  // Afficher toast pour les autres erreurs
  toast.error(appError.message, {
    duration: 5000,
    id: `error-${Date.now()}`, // Éviter les doublons
  });
}

// Handler global pour les erreurs de mutations
export function handleMutationError(error: unknown): void {
  const appError = normalizeError(error);

  console.error("[Mutation Error]", appError);

  // Notifier le super admin pour les erreurs critiques
  if (appError.type === "server" || appError.type === "auth" || appError.type === "permission") {
    void sendErrorNotification(error, { critical: true, extraDetails: { source: "Mutation" } });
  }

  toast.error(appError.message, {
    duration: 5000,
    id: `mutation-error-${Date.now()}`,
  });
}

// Déterminer si une erreur devrait déclencher un retry
export function shouldRetryError(error: unknown): boolean {
  const appError = normalizeError(error);

  // Retry uniquement pour les erreurs réseau et serveur
  return appError.type === "network" || appError.type === "server";
}

// Retry delay avec exponential backoff
export function getRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 30000); // Max 30s
}

// Formater un message d'erreur pour l'affichage
export function formatErrorMessage(error: unknown): string {
  return normalizeError(error).message;
}

// Vérifier si l'erreur est une erreur d'authentification
export function isAuthError(error: unknown): boolean {
  return normalizeError(error).type === "auth";
}

// Vérifier si l'erreur est une erreur de permission
export function isPermissionError(error: unknown): boolean {
  return normalizeError(error).type === "permission";
}
