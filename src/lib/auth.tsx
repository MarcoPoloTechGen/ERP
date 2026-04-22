import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getMyProfile, type AppUserProfile } from "@/lib/erp";
import { clearSupabaseBrowserState, supabase } from "@/lib/supabase";

type AuthContextValue = {
  session: Session | null;
  profile: AppUserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

const AUTH_BOOTSTRAP_TIMEOUT_MS = 8000;

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

async function resetBrokenSession() {
  clearSupabaseBrowserState();

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    console.warn("Local Supabase sign out failed during recovery", error);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
        const nextProfile = nextSession
          ? await withTimeout(
              getMyProfile().catch(() => null),
              AUTH_BOOTSTRAP_TIMEOUT_MS,
              "Timed out while loading the user profile.",
            )
          : null;

        if (!active) {
          return;
        }

        setSession(nextSession);
        setProfile(nextProfile);
      } catch (error) {
        console.error("Failed to load auth session", error);
        if (!active) {
          return;
        }
        await resetBrokenSession();
        setSession(null);
        setProfile(null);
      } finally {
        finishBootstrap();
      }
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      try {
        const nextProfile = nextSession
          ? await withTimeout(
              getMyProfile().catch(() => null),
              AUTH_BOOTSTRAP_TIMEOUT_MS,
              "Timed out while refreshing the user profile.",
            )
          : null;
        if (!active) {
          return;
        }
        setSession(nextSession);
        setProfile(nextProfile);
      } catch (error) {
        console.error(`Failed to refresh auth state during ${event}`, error);
        if (!active) {
          return;
        }
        await resetBrokenSession();
        setSession(null);
        setProfile(null);
        return;
      } finally {
        finishBootstrap();
      }
    });

    // A final safety net so the UI never stays on the loading screen forever.
    const bootstrapGuardId = window.setTimeout(() => {
      if (!active || bootstrapFinished) {
        return;
      }

      console.warn("Auth bootstrap guard triggered; resetting local session state.");
      void resetBrokenSession().finally(() => {
        if (!active) {
          return;
        }
        setSession(null);
        setProfile(null);
        finishBootstrap();
      });
    }, AUTH_BOOTSTRAP_TIMEOUT_MS * 2);

    return () => {
      active = false;
      window.clearTimeout(bootstrapGuardId);
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      signIn: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }
      },
      signUp: async (email: string, password: string, fullName: string) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) {
          throw error;
        }
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
          throw error;
        }
      },
    }),
    [loading, profile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
