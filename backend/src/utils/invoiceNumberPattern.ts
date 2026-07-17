const TOKEN_PATTERN = /\{(SEQ|CSEQ|CNUM|CUST|YYYY|YY|MM|DD|DATE|RAND4)\}/g;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dateTokenValue(token: string, now: Date): string | null {
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  switch (token) {
    case "YYYY":
      return year;
    case "YY":
      return year.slice(-2);
    case "MM":
      return month;
    case "DD":
      return day;
    case "DATE":
      return `${year}${month}${day}`;
    default:
      return null;
  }
}

/** Build a regex that captures one sequence token while accepting customer-dependent tokens. */
export function createSequencePatternRegex(
  pattern: string,
  target: "SEQ" | "CSEQ",
  now = new Date(),
): RegExp {
  let output = "";
  let cursor = 0;
  let captured = false;

  for (const match of pattern.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    output += escapeRegex(pattern.slice(cursor, index));
    const token = match[1];
    const dateValue = dateTokenValue(token, now);

    if (token === target && !captured) {
      output += "(\\d+)";
      captured = true;
    } else if (dateValue !== null) {
      output += escapeRegex(dateValue);
    } else if (token === "CUST") {
      output += "[A-Z0-9]{1,3}";
    } else if (token === "RAND4") {
      output += "[A-Z0-9]{4}";
    } else {
      output += "\\d+";
    }
    cursor = index + match[0].length;
  }

  output += escapeRegex(pattern.slice(cursor));
  if (!captured) throw new Error(`Pattern does not contain {${target}}`);
  return new RegExp(`^${output}$`, "i");
}
