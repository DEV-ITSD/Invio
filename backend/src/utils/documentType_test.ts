import { normalizeDocumentType, resolveDocumentTitle } from "./documentType.ts";
import type { InvoiceLabels } from "../i18n/translations.ts";

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

const labels = {
  invoiceTitle: "Rechnung",
  receiptTitle: "Quittung",
} as InvoiceLabels;

Deno.test("normalizes supported document types", () => {
  assertEquals(normalizeDocumentType(undefined), "invoice");
  assertEquals(normalizeDocumentType("invoice"), "invoice");
  assertEquals(normalizeDocumentType("receipt"), "receipt");
  assertThrows(() => normalizeDocumentType("quote"));
});

Deno.test("resolves localized and customized document titles", () => {
  assertEquals(resolveDocumentTitle("invoice", labels), "Rechnung");
  assertEquals(resolveDocumentTitle("receipt", labels), "Quittung");
  assertEquals(
    resolveDocumentTitle("receipt", labels, {
      companyName: "Test",
      currency: "CHF",
      receiptDocumentTitle: "Zahlungsbeleg",
    }),
    "Zahlungsbeleg",
  );
});
