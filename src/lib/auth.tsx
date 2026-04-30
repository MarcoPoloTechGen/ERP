import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  isPasswordRecoveryCallback,
  isDuplicateSignUpErrorMessage,
  isEmailConfirmationRequiredErrorMessage,
  isObfuscatedDuplicateSignUpUser,
  readAuthCallbackParams,
} from "@/lib/auth-utils";
import { getMyProfile, type AppUserProfile } from "@/lib/erp";
import { supabase } from "@/lib/supabase";

export type SignUpResult = {
  status: "signed-in" | "existing-account" | "email-confirmation-required";
};

type AuthContextValue = {
  session: Session | null;
  profile: AppUserProfile | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  authCallbackError: string | null;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<SignUpResult>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  loading: true,
  isPasswordRecovery: false,
  authCallbackError: null,
  refreshProfile: async () => {},
  signIn: async () => {},
  signUp: async (): Promise<SignUpResult> => ({ status: "signed-in" }),
  requestPasswordReset: async () => {},
  updatePassword: async () => {},
  signOut: async () => {},
});

const AUTH_BOOTSTRAP_TIMEOUT_MS = 8000;

function buildAppUrl(pathname: string) {
  if (typeof window === "undefined") {
    return pathname;
  }

  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  return new URL(pathname.replace(/^\/+/, ""), baseUrl).toString();
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

async function loadProfileSafely(nextSession: Session | null) {
  if (!nextSession) {
    return null;
  }

  try {
    return await withTimeout(
      getMyProfile().catch(() => null),
      AUTH_BOOTSTRAP_TIMEOUT_MS,
      "Timed out while loading the user profile.",
    );
  } catch (error) {
    console.warn("Failed to load the user profile without clearing the active session.", error);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialAuthCallback = useMemo(() => readAuthCallbackParams(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() =>
    isPasswordRecoveryCallback(initialAuthCallback),
  );
  const [authCallbackError, setAuthCallbackError] = useState<string | null>(
    initialAuthCallback.errorDescription,
  );

  useEffect(() => {
    let active = true;
    let bootstrapFinished = false;

    function finishBootstrap() {
      bootstrapFinished = true;
      if (active) {
        setLoading(false);
      }
    }

    async function loadSession() {
      try {
        const { data: sessionData, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_BOOTSTRAP_TIMEOUT_MS,
          "Timed out while restoring the saved session.",
        );
        if (error) {
          throw error;
        }

        const nextSession = sessionData.session;
        const nextProfile = await loadProfileSafely(nextSession);

        if (!active) {
          return;
        }

        setSession(nextSession);
        setProfile(nextProfile);
        setAuthCallbackError(initialAuthCallback.errorDescription);
        if (nextSession && isPasswordRecoveryCallback(initialAuthCallback)) {
          setIsPasswordRecovery(true);
        }
      } catch (error) {
        console.error("Failed to restore auth session", error);
        if (!active) {
          return;
        }
        setSession(null);
        setProfile(null);
      } finally {
        finishBootstrap();
      }
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) {
        return;
      }

      setSession(nextSession);
      setAuthCallbackError(initialAuthCallback.errorDescription);

      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      } else if (event === "SIGNED_OUT") {
        setIsPasswordRecovery(false);
      }

      finishBootstrap();

      void loadProfileSafely(nextSession).then((nextProfile) => {
        if (!active) {
          return;
        }
        setProfile(nextProfile);
      }).catch((error) => {
        console.error(`Failed to refresh auth state during ${event}`, error);
      });
    });

    // A final safety net so the UI never stays on the loading screen forever.
    const bootstrapGuardId = window.setTimeout(() => {
      if (!active || bootstrapFinished) {
        return;
      }

      console.warn("Auth bootstrap guard triggered; continuing without clearing the saved session.");
      finishBootstrap();
    }, AUTH_BOOTSTRAP_TIMEOUT_MS * 2);

    return () => {
      active = false;
      window.clearTimeout(bootstrapGuardId);
      subscription.unsubscribe();
    };
  }, [initialAuthCallback]);

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      isPasswordRecovery,
      authCallbackError,
      refreshProfile: async () => {
        setProfile(await loadProfileSafely(session));
      },
      signIn: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }
      },
      signUp: async (email: string, password: string, fullName: string): Promise<SignUpResult> => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) {
          if (isDuplicateSignUpErrorMessage(error.message)) {
            return { status: "existing-account" };
          }

          throw error;
        }

        if (isObfuscatedDuplicateSignUpUser(data.user)) {
          return { status: "existing-account" };
        }

        if (data.session) {
          return { status: "signed-in" };
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (!signInError) {
          return { status: "signed-in" };
        }

        if (isEmailConfirmationRequiredErrorMessage(signInError.message)) {
          return { status: "email-confirmation-required" };
        }

        throw signInError;
      },
      requestPasswordReset: async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: buildAppUrl("/reset-password"),
        });
        if (error) {
          throw error;
        }
      },
      updatePassword: async (password: string) => {
        const { error } = await supabase.auth.updateUser({
          password,
        });
        if (error) {
          throw error;
        }
        setIsPasswordRecovery(false);
        setAuthCallbackError(null);
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
          throw error;
        }
        setIsPasswordRecovery(false);
      },
    }),
    [authCallbackError, isPasswordRecovery, loading, profile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
