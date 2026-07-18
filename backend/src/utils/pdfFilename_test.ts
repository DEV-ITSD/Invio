import {
  attachmentContentDisposition,
  buildInvoicePdfFilename,
} from "./pdfFilename.ts";
import type { InvoiceWithDetails } from "../types/index.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  }
}

const invoice = {
  id: "invoice-id",
  invoiceNumber: "2026/0042",
  issueDate: new Date("2026-07-18T00:00:00.000Z"),
  documentType: "receipt",
  customer: { id: "customer-id", name: "Fallback AG", pdfName: "Bäckerei 7" },
} as InvoiceWithDetails;

Deno.test("builds the requested customer/type/number/date PDF filename", () => {
  assertEquals(
    buildInvoicePdfFilename(invoice, {
      companyName: "Test",
      currency: "CHF",
      locale: "de",
    }),
    "Bäckerei-7_Quittung_2026-0042_20260718.pdf",
  );
});

Deno.test(
  "uses customized document titles and an RFC 5987 download header",
  () => {
    const filename = buildInvoicePdfFilename(invoice, {
      companyName: "Test",
      currency: "CHF",
      locale: "de",
      receiptDocumentTitle: "Zahlungsbeleg",
    });
    assertEquals(filename, "Bäckerei-7_Zahlungsbeleg_2026-0042_20260718.pdf");
    const disposition = attachmentContentDisposition(filename);
    if (!disposition.includes("filename*=UTF-8''B%C3%A4ckerei-7_")) {
      throw new Error(`Missing UTF-8 filename in ${disposition}`);
    }
  },
);
