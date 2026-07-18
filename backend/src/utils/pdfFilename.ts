import type { BusinessSettings, InvoiceWithDetails } from "../types/index.ts";
import { getInvoiceLabels } from "../i18n/translations.ts";
import { normalizeDocumentType, resolveDocumentTitle } from "./documentType.ts";

function sanitizeFilenamePart(value: unknown, fallback: string): string {
  const normalized = String(value ?? "")
    .normalize("NFC")
    .trim();
  const safe = normalized
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return safe || fallback;
}

function formatCompactDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "00000000";
  return [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");
}

export function buildInvoicePdfFilename(
  invoice: InvoiceWithDetails,
  settings?: BusinessSettings,
  localeOverride?: string,
): string {
  const { labels } = getInvoiceLabels(
    localeOverride ?? invoice.locale ?? settings?.locale,
  );
  const documentType = normalizeDocumentType(invoice.documentType);
  const documentTitle = resolveDocumentTitle(documentType, labels, settings);
  const customerPrefix = sanitizeFilenamePart(
    invoice.customer.pdfName || invoice.customer.name,
    "Customer",
  );
  const typePart = sanitizeFilenamePart(documentTitle, "Invoice");
  const numberPart = sanitizeFilenamePart(
    invoice.invoiceNumber || invoice.id,
    "unknown",
  );
  const datePart = formatCompactDate(invoice.issueDate);
  return `${customerPrefix}_${typePart}_${numberPart}_${datePart}.pdf`;
}

export function attachmentContentDisposition(filename: string): string {
  const asciiFallback =
    filename
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9._-]+/g, "-") || "invoice.pdf";
  const encoded = encodeURIComponent(filename).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}
