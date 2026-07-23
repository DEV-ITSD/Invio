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

Deno.test("customer support email replaces the company email in documents", () => {
  const invoice = invoiceFixture("company");
  invoice.customer.email = "billing@example.test";
  invoice.customer.supportEmail = "vip-support@example.test";
  invoice.templateHtmlSnapshot = "{{companyEmail}}|{{customerEmail}}";

  const html = buildInvoiceHTML(invoice, {
    companyName: "Test AG",
    companyEmail: "info@example.test",
    currency: "CHF",
  });

  assertIncludes(html, "vip-support@example.test|billing@example.test");
  assertNotIncludes(html, "info@example.test");
});

Deno.test("template items expose positions and resolved unit names", () => {
  const invoice = invoiceFixture("company");
  invoice.items = [
    {
      id: "item-1",
      invoiceId: invoice.id,
      description: "Beratung",
      quantity: 1,
      unit: "hour",
      unitName: "Stunde",
      unitPrice: 100,
      lineTotal: 100,
      notes: "Details zur Position",
      sortOrder: 0,
    },
  ];
  invoice.subtotal = 100;
  invoice.total = 100;
  invoice.templateHtmlSnapshot =
    "{{#items}}{{position}}|{{unit}}|{{notesColspan}}|{{unitPrice}}{{/items}}";

  const html = buildInvoiceHTML(invoice, {
    companyName: "Test AG",
    currency: "CHF",
  });

  assertIncludes(html, "1|Stunde|5|");
  assertNotIncludes(html, "|hour|");
});

Deno.test("item notes span from description through amount without a unit column", () => {
  const invoice = invoiceFixture("company");
  invoice.items = [
    {
      id: "item-1",
      invoiceId: invoice.id,
      description: "Pauschale",
      quantity: 1,
      unitPrice: 100,
      lineTotal: 100,
      notes: "Details über die ganze Breite",
      sortOrder: 0,
    },
  ];
  invoice.subtotal = 100;
  invoice.total = 100;
  invoice.templateHtmlSnapshot =
    "{{#items}}{{notesColspan}}|{{notes}}{{/items}}";

  const html = buildInvoiceHTML(invoice, {
    companyName: "Test AG",
    currency: "CHF",
  });

  assertIncludes(html, "4|Details über die ganze Breite");
});

Deno.test("receipts never render a stored due date", () => {
  const invoice = invoiceFixture("company");
  invoice.documentType = "receipt";
  invoice.dueDate = new Date("2026-08-31T00:00:00.000Z");
  invoice.templateHtmlSnapshot = "{{#dueDate}}{{dueDate}}{{/dueDate}}";

  const html = buildInvoiceHTML(invoice, {
    companyName: "Test AG",
    currency: "CHF",
    locale: "de",
  });

  assertNotIncludes(html, "31.08.2026");
});

Deno.test("automatic decimal display hides decimals when all prices are whole", () => {
  const invoice = invoiceFixture("company");
  invoice.decimalDisplay = "automatic";
  invoice.subtotal = 100;
  invoice.total = 100;
  invoice.items = [
    {
      id: "item-1",
      invoiceId: invoice.id,
      description: "Pauschale",
      quantity: 1,
      unitPrice: 100,
      lineTotal: 100,
      sortOrder: 0,
    },
  ];
  invoice.templateHtmlSnapshot =
    "{{subtotal}}|{{#items}}{{unitPrice}}|{{lineTotal}}{{/items}}|{{total}}";

  const html = buildInvoiceHTML(
    invoice,
    { companyName: "Test AG", currency: "CHF" },
    undefined,
    undefined,
    undefined,
    "swiss",
  );

  assertNotIncludes(html, ".00");
});

Deno.test("always decimal display keeps currency decimals", () => {
  const invoice = invoiceFixture("company");
  invoice.decimalDisplay = "always";
  invoice.subtotal = 100;
  invoice.total = 100;
  invoice.templateHtmlSnapshot = "{{subtotal}}|{{total}}";

  const html = buildInvoiceHTML(
    invoice,
    { companyName: "Test AG", currency: "CHF" },
    undefined,
    undefined,
    undefined,
    "swiss",
  );

  assertIncludes(html, ".00");
});

Deno.test("automatic decimal display shows decimals for all prices when one is fractional", () => {
  const invoice = invoiceFixture("company");
  invoice.decimalDisplay = "automatic";
  invoice.subtotal = 112.5;
  invoice.total = 112.5;
  invoice.items = [
    {
      id: "item-1",
      invoiceId: invoice.id,
      description: "Ganz",
      quantity: 1,
      unitPrice: 100,
      lineTotal: 100,
      sortOrder: 0,
    },
    {
      id: "item-2",
      invoiceId: invoice.id,
      description: "Teil",
      quantity: 1,
      unitPrice: 12.5,
      lineTotal: 12.5,
      sortOrder: 1,
    },
  ];
  invoice.templateHtmlSnapshot =
    "{{#items}}{{unitPrice}}|{{lineTotal}};{{/items}}{{subtotal}}|{{total}}";

  const html = buildInvoiceHTML(
    invoice,
    { companyName: "Test AG", currency: "CHF" },
    undefined,
    undefined,
    undefined,
    "swiss",
  );

  assertIncludes(html, "100.00");
  assertIncludes(html, "12.50");
});
