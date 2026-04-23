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
