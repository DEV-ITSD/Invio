import type { InvoiceTaxMode } from "../types/index.ts";

export function normalizeTaxMode(value: unknown): InvoiceTaxMode {
  if (value === undefined || value === null || value === "") return "invoice";
  if (value === "invoice" || value === "line" || value === "none") {
    return value;
  }
  throw new Error("Tax mode must be 'invoice', 'line', or 'none'.");
}

export function resolveNoTaxText(
  taxMode: InvoiceTaxMode,
  value: unknown,
  defaultValue: unknown = "",
): string {
  if (taxMode !== "none") return "";
  return String(value ?? defaultValue ?? "").trim();
}
