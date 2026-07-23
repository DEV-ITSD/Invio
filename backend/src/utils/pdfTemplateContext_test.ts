import type { InvoiceWithDetails } from "../types/index.ts";
import { buildInvoiceHTML } from "./pdf.ts";

function assertIncludes(actual: string, expected: string): void {
  if (!actual.includes(expected)) {
    throw new Error(`Expected output to include ${JSON.stringify(expected)}`);
  }
}

function assertNotIncludes(actual: string, expected: string): void {
  if (actual.includes(expected)) {
    throw new Error(
      `Expected output not to include ${JSON.stringify(expected)}`,
    );
  }
}

function invoiceFixture(
  customerType: "company" | "private",
  quoteNumber?: string,
): InvoiceWithDetails {
  const now = new Date("2026-07-23T00:00:00.000Z");
  return {
    id: "invoice-1",
    invoiceNumber: "INV-2026-001",
    quoteNumber,
    customerId: "customer-1",
    issueDate: now,
    currency: "CHF",
    status: "draft",
    documentType: "invoice",
    taxMode: "none",
    subtotal: 0,
    discountAmount: 0,
    discountPercentage: 0,
    taxRate: 0,
    taxAmount: 0,
    total: 0,
    shareToken: "share-token",
    createdAt: now,
    updatedAt: now,
    templateHtmlSnapshot:
      "{{#isCompanyCustomer}}COMPANY {{customerName}}{{/isCompanyCustomer}}" +
      "{{#isPrivateCustomer}}PRIVATE{{/isPrivateCustomer}}" +
      "{{#quoteNumber}}|{{labels.quoteNumberShortLabel}} {{quoteNumber}}{{/quoteNumber}}",
    customer: {
      id: "customer-1",
      name: "Musterkunde",
      customerType,
      createdAt: now,
    },
    items: [],
  };
}

Deno.test("template context hides the company name for private customers", () => {
  const html = buildInvoiceHTML(
    invoiceFixture("private", "OFF-2026-42"),
    { companyName: "Test AG", currency: "CHF", locale: "de" },
  );

  assertIncludes(html, "PRIVATE");
  assertIncludes(html, "Offerten # OFF-2026-42");
  assertNotIncludes(html, "COMPANY Musterkunde");
});

Deno.test("template context renders no quote row for an empty quote number", () => {
  const html = buildInvoiceHTML(
    invoiceFixture("company", "   "),
    { companyName: "Test AG", currency: "CHF", locale: "de" },
  );

  assertIncludes(html, "COMPANY Musterkunde");
  assertNotIncludes(html, "Offerten #");
});
