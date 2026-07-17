export const CUSTOMER_ABBREVIATION_PATTERN = /^[A-Z0-9]{1,3}$/;

export function normalizeCustomerAbbreviation(
  value?: string | null,
): string | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!normalized) return null;
  if (!CUSTOMER_ABBREVIATION_PATTERN.test(normalized)) {
    throw new Error(
      "Customer abbreviation must contain 1 to 3 alphanumeric characters",
    );
  }
  return normalized;
}
