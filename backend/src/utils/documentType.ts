import type { BusinessSettings, InvoiceDocumentType } from "../types/index.ts";
import type { InvoiceLabels } from "../i18n/translations.ts";

export function normalizeDocumentType(value: unknown): InvoiceDocumentType {
  if (value === undefined || value === null || value === "") return "invoice";
  if (value === "invoice" || value === "receipt") return value;
  throw new Error("Document type must be 'invoice' or 'receipt'.");
}

export function resolveDocumentTitle(
  documentType: InvoiceDocumentType,
  labels: InvoiceLabels,
  settings?: BusinessSettings,
): string {
  const configured =
    documentType === "receipt"
      ? settings?.receiptDocumentTitle
      : settings?.invoiceDocumentTitle;
  const trimmed = typeof configured === "string" ? configured.trim() : "";
  if (trimmed) return trimmed;
  return documentType === "receipt" ? labels.receiptTitle : labels.invoiceTitle;
}
