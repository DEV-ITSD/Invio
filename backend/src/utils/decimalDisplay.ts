import type { InvoiceDecimalDisplay } from "../types/index.ts";

export function normalizeInvoiceDecimalDisplay(
  value: unknown,
): InvoiceDecimalDisplay {
  return value === "always" ? "always" : "automatic";
}
