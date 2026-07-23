import { formatMoney, shouldShowPriceDecimals } from "./priceFormatting.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  }
}

const wholeInvoice = {
  decimalDisplay: "automatic" as const,
  items: [
    {
      id: "item-1",
      invoiceId: "invoice-1",
      description: "Pauschale",
      quantity: 1,
      unitPrice: 100,
      lineTotal: 100,
      sortOrder: 0,
    },
  ],
  subtotal: 100,
  discountAmount: 0,
  taxAmount: 0,
  total: 100,
  taxes: [],
};

Deno.test("automatic price decimals stay hidden for whole prices", () => {
  assertEquals(shouldShowPriceDecimals(wholeInvoice), false);
  assertEquals(formatMoney(100, "CHF", "swiss", false).includes(".00"), false);
});

Deno.test("automatic price decimals are shown invoice-wide for a fractional price", () => {
  const invoice = {
    ...wholeInvoice,
    items: [
      ...wholeInvoice.items,
      {
        ...wholeInvoice.items[0],
        id: "item-2",
        unitPrice: 12.5,
        lineTotal: 12.5,
      },
    ],
    subtotal: 112.5,
    total: 112.5,
  };
  assertEquals(shouldShowPriceDecimals(invoice), true);
  assertEquals(formatMoney(100, "CHF", "swiss", true).includes(".00"), true);
});

Deno.test("always price decimals keeps the currency decimals", () => {
  assertEquals(
    shouldShowPriceDecimals({ ...wholeInvoice, decimalDisplay: "always" }),
    true,
  );
});
