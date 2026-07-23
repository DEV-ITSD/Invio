import type { InvoiceWithDetails } from "../types/index.ts";

export type NumberFormat = "comma" | "period" | "swiss";

export function formatMoney(
  value: number,
  currency: string,
  numberFormat: NumberFormat = "comma",
  showDecimals = true,
): string {
  const locale = numberFormat === "period"
    ? "de-DE"
    : numberFormat === "swiss"
    ? "de-CH"
    : "en-US";

  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
  };
  if (!showDecimals) {
    options.minimumFractionDigits = 0;
    options.maximumFractionDigits = 0;
  }
  return new Intl.NumberFormat(locale, options).format(value);
}

function hasFractionalPart(value: unknown): boolean {
  const number = Number(value);
  return Number.isFinite(number) &&
    Math.abs(number - Math.round(number)) > 1e-9;
}

export function shouldShowPriceDecimals(
  invoice: Pick<
    InvoiceWithDetails,
    | "decimalDisplay"
    | "items"
    | "subtotal"
    | "discountAmount"
    | "taxAmount"
    | "total"
    | "taxes"
  >,
): boolean {
  if (invoice.decimalDisplay === "always") return true;
  const values = [
    ...invoice.items.flatMap((item) => [item.unitPrice, item.lineTotal]),
    invoice.subtotal,
    invoice.discountAmount,
    invoice.taxAmount,
    invoice.total,
    ...(invoice.taxes || []).flatMap((tax) => [
      tax.taxableAmount,
      tax.taxAmount,
    ]),
  ];
  return values.some(hasFractionalPart);
}
