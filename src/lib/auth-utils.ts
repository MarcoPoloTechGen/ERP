import type { User } from "@supabase/supabase-js";
import { getStoredLang } from "@/lib/i18n";

const DUPLICATE_SIGN_UP_MARKERS = [
  "user already registered",
  "already registered",
  "already exists",
];

const EMAIL_CONFIRMATION_MARKERS = [
  "email not confirmed",
  "email is not confirmed",
];

const EMAIL_RATE_LIMIT_MARKERS = [
  "email rate limit exceeded",
  "rate limit exceeded",
];

const INVALID_LOGIN_MARKERS = [
  "invalid login credentials",
  "invalid email or password",
];

function normalizeAuthMessage(message: string | null | undefined) {
  return message?.trim().toLowerCase() ?? "";
}

function normalizeOptionalAuthParam(value: string | null) {
  const normalizedValue = normalizeAuthMessage(value);
  return normalizedValue || null;
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
  accessToken: string | null;
  errorCode: string | null;
  errorDescription: string | null;
};

export function readAuthCallbackParams(urlLike?: string | URL) {
  if (typeof window === "undefined" && !urlLike) {
    return {
      type: null,
      tokenHash: null,
      accessToken: null,
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
    type: normalizeOptionalAuthParam(getUrlParam(url, "type")),
    tokenHash: getUrlParam(url, "token_hash"),
    accessToken: getUrlParam(url, "access_token"),
    errorCode: getUrlParam(url, "error_code"),
    errorDescription: decodeAuthParam(
      getUrlParam(url, "error_description") ?? getUrlParam(url, "error"),
    ),
  } satisfies AuthCallbackParams;
}

export function isPasswordRecoveryCallback(params: AuthCallbackParams) {
  // Recovery can be indicated by explicit type=recovery OR by presence of access_token/token_hash in URL
  return params.type === "recovery" || Boolean(params.accessToken) || Boolean(params.tokenHash);
}

export function isDuplicateSignUpErrorMessage(message: string | null | undefined) {
  const normalizedMessage = normalizeAuthMessage(message);
  return DUPLICATE_SIGN_UP_MARKERS.some((marker) => normalizedMessage.includes(marker));
}

export function isEmailConfirmationRequiredErrorMessage(message: string | null | undefined) {
  const normalizedMessage = normalizeAuthMessage(message);
  return EMAIL_CONFIRMATION_MARKERS.some((marker) => normalizedMessage.includes(marker));
}

export function isEmailRateLimitErrorMessage(message: string | null | undefined) {
  const normalizedMessage = normalizeAuthMessage(message);
  return EMAIL_RATE_LIMIT_MARKERS.some((marker) => normalizedMessage.includes(marker));
}

export function isObfuscatedDuplicateSignUpUser(user: Pick<User, "identities"> | null | undefined) {
  return Array.isArray(user?.identities) && user.identities.length === 0;
}

export function localizeAuthErrorMessage(message: string | null | undefined) {
  if (!message) {
    return null;
  }

  const normalizedMessage = normalizeAuthMessage(message);
  const isKurdish = getStoredLang() === "ku";

  if (INVALID_LOGIN_MARKERS.some((marker) => normalizedMessage.includes(marker))) {
    return isKurdish ? "ئیمەیڵ یان وشەی نهێنی هەڵەیە." : "Invalid email or password.";
  }

  if (EMAIL_CONFIRMATION_MARKERS.some((marker) => normalizedMessage.includes(marker))) {
    return isKurdish
      ? "هێشتا ئیمەیڵەکەت پشتڕاست نەکراوەتەوە."
      : "Email is not confirmed.";
  }

  if (EMAIL_RATE_LIMIT_MARKERS.some((marker) => normalizedMessage.includes(marker))) {
    return isKurdish
      ? "ئاستی ناردنی ئیمەیڵ زۆر بووە. تکایە دوای ماوەیەک هەوڵبدەوە."
      : "Email rate limit exceeded. Please try again later.";
  }

  if (DUPLICATE_SIGN_UP_MARKERS.some((marker) => normalizedMessage.includes(marker))) {
    return isKurdish
      ? "هەژمارێک پێشتر بۆ ئەم ئیمەیڵە هەیە."
      : "An account already exists for this email.";
  }

  if (
    (normalizedMessage.includes("expired") || normalizedMessage.includes("invalid")) &&
    (normalizedMessage.includes("link") ||
      normalizedMessage.includes("token") ||
      normalizedMessage.includes("otp"))
  ) {
    return isKurdish
      ? "ئەم بەستەرە یان تۆکنە ناڕەوا یان بەسەرچووە."
      : "This link or token is invalid or has expired.";
  }

  return message;
}
