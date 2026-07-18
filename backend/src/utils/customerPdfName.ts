export const CUSTOMER_PDF_NAME_MAX_LENGTH = 80;

export function normalizeCustomerPdfName(value?: string | null): string | null {
  const normalized = String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/ +/g, " ");
  if (!normalized) return null;
  if (normalized.length > CUSTOMER_PDF_NAME_MAX_LENGTH) {
    throw new Error(
      `PDF name must not exceed ${CUSTOMER_PDF_NAME_MAX_LENGTH} characters`,
    );
  }
  if (!/^[\p{L}\p{N}]+(?:[ -][\p{L}\p{N}]+)*$/u.test(normalized)) {
    throw new Error(
      "PDF name may only contain letters, numbers, spaces, and hyphens",
    );
  }
  return normalized;
}
