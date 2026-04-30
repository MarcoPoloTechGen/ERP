import { supabase } from "@/lib/supabase";
import { normalizeError } from "@/lib/error-handler";
import type { Json } from "@/lib/database.types";

export interface ErrorNotificationData {
  error_type: string;
  error_message: string;
  error_details?: Json;
  url?: string;
  user_agent?: string;
  app_version?: string;
}

// Envoyer une notification d'erreur au backend
export async function sendErrorNotification(
  error: unknown,
  options?: {
    extraDetails?: Record<string, unknown>;
    critical?: boolean;
  }
): Promise<void> {
  try {
    const normalizedError = normalizeError(error);
    const { data: userData } = await supabase.auth.getUser();

    const notificationData: ErrorNotificationData = {
      error_type: normalizedError.type,
      error_message: normalizedError.message,
      error_details: {
        originalError: String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ...options?.extraDetails,
      },
      url: typeof window !== "undefined" ? window.location.href : undefined,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      app_version: import.meta.env.VITE_APP_VERSION || "2.1.0",
    };

    // Insérer dans la base de données
    const { data: inserted, error: insertError } = await supabase
      .from("error_notifications")
      .insert(notificationData)
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to save error notification:", insertError);
      return;
    }

    // Appeler la Edge Function pour envoyer l'email
    if (options?.critical || normalizedError.type === "server" || normalizedError.type === "auth") {
      await triggerEmailNotification(inserted.id);
    }
  } catch (e) {
    // Ne pas bloquer l'application si la notification échoue
    console.error("Failed to send error notification:", e);
  }
}

// Déclencher l'envoi d'email via la Edge Function
async function triggerEmailNotification(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("send-error-notification", {
      body: { error_notification_id: notificationId },
    });

    if (error) {
      console.error("Failed to trigger email notification:", error);
    }
  } catch (e) {
    console.error("Edge function call failed:", e);
  }
}

// Wrapper pour capturer automatiquement les erreurs critiques
export function withErrorNotification<T extends (...args: any[]) => any>(
  fn: T,
  options?: { critical?: boolean; context?: Record<string, unknown> }
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      await sendErrorNotification(error, {
        critical: options?.critical,
        extraDetails: {
          functionName: fn.name,
          args: args.map((arg) => (typeof arg === "object" ? "[Object]" : arg)),
          ...options?.context,
        },
      });
      throw error;
    }
  }) as T;
}

// Configurer l'email du super admin
export async function setSuperAdminEmail(email: string): Promise<void> {
  const { error } = await supabase
    .from("notification_settings")
    .update({ super_admin_email: email, updated_at: new Date().toISOString() })
    .eq("id", (await supabase.from("notification_settings").select("id").single()).data?.id);

  if (error) throw error;
}

// Récupérer les paramètres de notification
export async function getNotificationSettings(): Promise<{
  super_admin_email: string | null;
  notify_on_error: boolean;
  notify_on_critical_only: boolean;
} | null> {
  const { data, error } = await supabase
    .from("notification_settings")
    .select("super_admin_email, notify_on_error, notify_on_critical_only")
    .single();

  if (error) {
    console.error("Failed to get notification settings:", error);
    return null;
  }

  return data;
}
