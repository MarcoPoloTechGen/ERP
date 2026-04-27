import { describe, expect, it } from "vitest";
import {
  isPasswordRecoveryCallback,
  isDuplicateSignUpErrorMessage,
  isEmailConfirmationRequiredErrorMessage,
  isEmailRateLimitErrorMessage,
  isObfuscatedDuplicateSignUpUser,
  readAuthCallbackParams,
} from "./auth-utils";

describe("auth helpers", () => {
  it("detects duplicate sign-up errors", () => {
    expect(isDuplicateSignUpErrorMessage("User already registered")).toBe(true);
    expect(isDuplicateSignUpErrorMessage("This user already exists.")).toBe(true);
    expect(isDuplicateSignUpErrorMessage("Invalid login credentials")).toBe(false);
  });

  it("detects email confirmation requirements", () => {
    expect(isEmailConfirmationRequiredErrorMessage("Email not confirmed")).toBe(true);
    expect(isEmailConfirmationRequiredErrorMessage("Email is not confirmed")).toBe(true);
    expect(isEmailConfirmationRequiredErrorMessage("User already registered")).toBe(false);
  });

  it("detects auth email rate limits", () => {
    expect(isEmailRateLimitErrorMessage("Email rate limit exceeded")).toBe(true);
    expect(isEmailRateLimitErrorMessage("Rate limit exceeded")).toBe(true);
    expect(isEmailRateLimitErrorMessage("Invalid login credentials")).toBe(false);
  });

  it("detects obfuscated duplicate users returned by sign-up", () => {
    expect(isObfuscatedDuplicateSignUpUser({ identities: [] } as never)).toBe(true);
    expect(isObfuscatedDuplicateSignUpUser({ identities: [{ id: "1" }] } as never)).toBe(false);
    expect(isObfuscatedDuplicateSignUpUser(null)).toBe(false);
  });

  it("reads auth callback params from the URL hash", () => {
    const params = readAuthCallbackParams(
      "https://example.com/reset-password#type=recovery&access_token=abc&error_description=Link+expired",
    );

    expect(params.type).toBe("recovery");
    expect(params.accessToken).toBe("abc");
    expect(params.errorDescription).toBe("Link expired");
    expect(isPasswordRecoveryCallback(params)).toBe(true);
  });

  it("detects password recovery from access_token alone (no type=recovery)", () => {
    const params = readAuthCallbackParams(
      "http://localhost:3000/#access_token=eyJhbGc&refresh_token=xyz",
    );

    expect(params.type).toBeNull();
    expect(params.accessToken).toBe("eyJhbGc");
    expect(isPasswordRecoveryCallback(params)).toBe(true);
  });

  it("reads auth callback params from the query string", () => {
    const params = readAuthCallbackParams(
      "https://example.com/reset-password?type=recovery&token_hash=hashed-token",
    );

    expect(params.type).toBe("recovery");
    expect(params.tokenHash).toBe("hashed-token");
  });
});
