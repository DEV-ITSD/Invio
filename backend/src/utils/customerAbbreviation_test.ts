import { normalizeCustomerAbbreviation } from "./customerAbbreviation.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertThrows(fn: () => unknown): void {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error("Expected function to throw");
}

Deno.test("normalizes customer abbreviations", () => {
  assertEquals(normalizeCustomerAbbreviation(" ch "), "CH");
  assertEquals(normalizeCustomerAbbreviation("a1b"), "A1B");
  assertEquals(normalizeCustomerAbbreviation(""), null);
});

Deno.test("rejects invalid customer abbreviations", () => {
  for (const value of ["ABCD", "A-B", "A B", "Ä"]) {
    assertThrows(() => normalizeCustomerAbbreviation(value));
  }
});
