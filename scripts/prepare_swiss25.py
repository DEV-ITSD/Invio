from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


for path in ["VERSION", "frontend/static/VERSION"]:
    current = read(path).strip()
    if current != "2.1.1-swiss.24":
        raise SystemExit(f"{path}: expected 2.1.1-swiss.24, found {current}")
    write(path, "2.1.1-swiss.25\n")

path = "frontend/src/routes/invoices/[id]/+page.svelte"
text = read(path)
old = '''          <dt class="opacity-60">{t("Quote Number")}</dt>\n          <dd class="text-right font-medium break-all">{invoice.quoteNumber || "-"}</dd>\n          <dt class="opacity-60">{t("Status")}</dt>'''
new = '''          <dt class="opacity-60">{t("Quote Number")}</dt>\n          <dd class="text-right font-medium break-all">{invoice.quoteNumber || "-"}</dd>\n          <dt class="opacity-60">{t("Title")}</dt>\n          <dd class="text-right font-medium break-all">{invoice.title || "-"}</dd>\n          <dt class="opacity-60">{t("Status")}</dt>'''
text = replace_once(text, old, new, "document details title row")
write(path, text)

# Regression/consistency checks.
updated = read(path)
if updated.count('{t("Title")}') < 1:
    raise SystemExit("Title label missing from invoice detail page")
if '<dd class="text-right font-medium break-all">{invoice.title || "-"}</dd>' not in updated:
    raise SystemExit("Invoice title value missing from document details")
