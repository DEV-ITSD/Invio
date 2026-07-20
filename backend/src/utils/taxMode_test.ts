import { normalizeTaxMode, resolveNoTaxText } from "./taxMode.ts";

Deno.test("normalizeTaxMode accepts every supported mode", () => {
  for (const mode of ["invoice", "line", "none"] as const) {
    if (normalizeTaxMode(mode) !== mode) {
      throw new Error(`Expected ${mode} to remain unchanged`);
    }
  }
});

Deno.test("normalizeTaxMode defaults missing values to invoice", () => {
  for (const value of [undefined, null, ""]) {
    if (normalizeTaxMode(value) !== "invoice") {
      throw new Error("Expected missing tax mode to default to invoice");
    }
  }
});

Deno.test("normalizeTaxMode rejects unsupported values", () => {
  let threw = false;
  try {
    normalizeTaxMode("exempt");
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("Expected unsupported tax mode to be rejected");
});

Deno.test("resolveNoTaxText uses the configured default only when omitted", () => {
  if (
    resolveNoTaxText("none", undefined, "  Exempt from VAT  ") !==
      "Exempt from VAT"
  ) {
    throw new Error("Expected the configured default tax text");
  }
  if (resolveNoTaxText("none", "", "Exempt from VAT") !== "") {
    throw new Error("Expected an explicitly cleared tax text to remain empty");
  }
});

Deno.test("resolveNoTaxText clears text for taxable modes", () => {
  for (const mode of ["invoice", "line"] as const) {
    if (resolveNoTaxText(mode, "Exempt from VAT", "Default") !== "") {
      throw new Error(`Expected ${mode} mode to clear the tax text`);
    }
  }
});
