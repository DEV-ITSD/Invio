import { normalizeCustomerPdfName } from "./customerPdfName.ts";

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

Deno.test("normalizes optional customer PDF names", () => {
  assertEquals(normalizeCustomerPdfName("  Muster   AG "), "Muster AG");
  assertEquals(normalizeCustomerPdfName("Bäckerei-7"), "Bäckerei-7");
  assertEquals(normalizeCustomerPdfName(""), null);
});

Deno.test("rejects unsafe customer PDF names", () => {
  for (const value of ["../Muster", "Muster_AG", "Muster/AG", "Muster\nAG"]) {
    assertThrows(() => normalizeCustomerPdfName(value));
  }
});
