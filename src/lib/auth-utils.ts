import type { User } from "@supabase/supabase-js";

const DUPLICATE_SIGN_UP_MARKERS = [
  "user already registered",
  "already registered",
  "already exists",
];

const EMAIL_CONFIRMATION_MARKERS = [
  "email not confirmed",
  "email is not confirmed",
];

function normalizeAuthMessage(message: string | null | undefined) {
  return message?.trim().toLowerCase() ?? "";
}

function decodeAuthParam(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function getUrlParam(url: URL, key: string) {
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  return hashParams.get(key) ?? url.searchParams.get(key);
}

export type AuthCallbackParams = {
  type: string | null;
  tokenHash: string | null;
  errorCode: string | null;
  errorDescription: string | null;
};

export function readAuthCallbackParams(urlLike?: string | URL) {
  if (typeof window === "undefined" && !urlLike) {
    return {
      type: null,
      tokenHash: null,
      errorCode: null,
      errorDescription: null,
    } satisfies AuthCallbackParams;
  }

  const fallbackOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const url =
    urlLike instanceof URL
      ? urlLike
      : new URL(urlLike ?? window.location.href, fallbackOrigin);

  return {
    type: normalizeAuthMessage(getUrlParam(url, "type")),
    tokenHash: getUrlParam(url, "token_hash"),
    errorCode: getUrlParam(url, "error_code"),
    errorDescription: decodeAuthParam(
      getUrlParam(url, "error_description") ?? getUrlParam(url, "error"),
    ),
  } satisfies AuthCallbackParams;
}

export function isPasswordRecoveryCallback(params: AuthCallbackParams) {
  return params.type === "recovery";
}

export function isDuplicateSignUpErrorMessage(message: string | null | undefined) {
  const normalizedMessage = normalizeAuthMessage(message);
  return DUPLICATE_SIGN_UP_MARKERS.some((marker) => normalizedMessage.includes(marker));
}

export function isEmailConfirmationRequiredErrorMessage(message: string | null | undefined) {
  const normalizedMessage = normalizeAuthMessage(message);
  return EMAIL_CONFIRMATION_MARKERS.some((marker) => normalizedMessage.includes(marker));
}

export function isObfuscatedDuplicateSignUpUser(user: Pick<User, "identities"> | null | undefined) {
  return Array.isArray(user?.identities) && user.identities.length === 0;
}
