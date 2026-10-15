import { describe, expect, it, vi } from "vitest";

// Avoid creating a real Supabase client during tests.
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { isValidStudentEmail } from "@/hooks/useAuth";

describe("isValidStudentEmail", () => {
  it("accepts a valid student email", () => {
    expect(isValidStudentEmail("ST10455321@rcconnect.edu.za")).toBe(true);
  });

  it("is case-insensitive and ignores surrounding spaces", () => {
    expect(isValidStudentEmail("  st10455321@RCCONNECT.edu.za  ")).toBe(true);
  });

  it("rejects the wrong domain", () => {
    expect(isValidStudentEmail("ST10455321@gmail.com")).toBe(false);
  });

  it("rejects the wrong number of digits", () => {
    expect(isValidStudentEmail("ST1045532@rcconnect.edu.za")).toBe(false);
    expect(isValidStudentEmail("ST104553211@rcconnect.edu.za")).toBe(false);
  });

  it("rejects empty and malformed input without crashing", () => {
    expect(isValidStudentEmail("")).toBe(false);
    expect(isValidStudentEmail("not an email")).toBe(false);
    expect(isValidStudentEmail("ST10455321")).toBe(false);
  });
});
