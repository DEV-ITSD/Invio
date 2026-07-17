import { createSequencePatternRegex } from "./invoiceNumberPattern.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  }
}

const now = new Date("2026-07-17T12:00:00Z");

Deno.test("global SEQ matches across customer abbreviations", () => {
  const re = createSequencePatternRegex("INV-{YYYY}-{CUST}-{SEQ}", "SEQ", now);
  assertEquals("INV-2026-ABC-0042".match(re)?.[1], "0042");
  assertEquals("INV-2026-X-0007".match(re)?.[1], "0007");
});

Deno.test("CSEQ supports CUST and CNUM", () => {
  const re = createSequencePatternRegex("{CUST}-{CNUM}-{CSEQ}", "CSEQ", now);
  assertEquals("A1-012-009".match(re)?.[1], "009");
});
