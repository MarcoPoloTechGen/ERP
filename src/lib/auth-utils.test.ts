import { describe, expect, it } from "vitest";
import {
  isDuplicateSignUpErrorMessage,
  isEmailConfirmationRequiredErrorMessage,
  isObfuscatedDuplicateSignUpUser,
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

  it("detects obfuscated duplicate users returned by sign-up", () => {
    expect(isObfuscatedDuplicateSignUpUser({ identities: [] } as never)).toBe(true);
    expect(isObfuscatedDuplicateSignUpUser({ identities: [{ id: "1" }] } as never)).toBe(false);
    expect(isObfuscatedDuplicateSignUpUser(null)).toBe(false);
  });
});
