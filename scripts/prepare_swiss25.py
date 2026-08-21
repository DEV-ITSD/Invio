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

# Invoice detail: show title in Document details directly after Quote Number.
path = "frontend/src/routes/invoices/[id]/+page.svelte"
text = read(path)
old = '''          <dt class="opacity-60">{t("Quote Number")}</dt>\n          <dd class="text-right font-medium break-all">{invoice.quoteNumber || "-"}</dd>\n          <dt class="opacity-60">{t("Status")}</dt>'''
new = '''          <dt class="opacity-60">{t("Quote Number")}</dt>\n          <dd class="text-right font-medium break-all">{invoice.quoteNumber || "-"}</dd>\n          <dt class="opacity-60">{t("Title")}</dt>\n          <dd class="text-right font-medium break-all">{invoice.title || "-"}</dd>\n          <dt class="opacity-60">{t("Status")}</dt>'''
text = replace_once(text, old, new, "document details title row")
write(path, text)

# /invoices: add sortable Title column directly after Invoice No.
path = "frontend/src/routes/invoices/+page.svelte"
text = read(path)
text = replace_once(
    text,
    'let sortKey = $state<"invoiceNumber" | "documentType" | "customer" | "total" | "status" | "issueDate" | "updatedAt">("invoiceNumber");',
    'let sortKey = $state<"invoiceNumber" | "title" | "documentType" | "customer" | "total" | "status" | "issueDate" | "updatedAt">("invoiceNumber");',
    "invoice list sortKey title",
)
text = replace_once(
    text,
    'function handleSort(key: "invoiceNumber" | "documentType" | "customer" | "total" | "status" | "issueDate" | "updatedAt") {',
    'function handleSort(key: "invoiceNumber" | "title" | "documentType" | "customer" | "total" | "status" | "issueDate" | "updatedAt") {',
    "invoice list handleSort title",
)
text = replace_once(
    text,
    'function sortMarker(key: "invoiceNumber" | "documentType" | "customer" | "total" | "status" | "issueDate" | "updatedAt") {',
    'function sortMarker(key: "invoiceNumber" | "title" | "documentType" | "customer" | "total" | "status" | "issueDate" | "updatedAt") {',
    "invoice list sortMarker title",
)
text = replace_once(
    text,
    '''      if (sortKey === "invoiceNumber") {\n        result = compareText(a.invoiceNumber, b.invoiceNumber);\n      } else if (sortKey === "documentType") {''',
    '''      if (sortKey === "invoiceNumber") {\n        result = compareText(a.invoiceNumber, b.invoiceNumber);\n      } else if (sortKey === "title") {\n        result = compareText(a.title, b.title);\n      } else if (sortKey === "documentType") {''',
    "invoice list title sorting",
)
text = replace_once(
    text,
    '''          </th>\n          <th>\n            <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("documentType")}>''',
    '''          </th>\n          <th>\n            <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("title")}>\n              {t("Title")}{sortMarker("title")}\n            </button>\n          </th>\n          <th>\n            <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("documentType")}>''',
    "invoice list title header",
)
text = replace_once(
    text,
    '''            </td>\n            <td>\n              <div class="badge badge-outline badge-sm">\n                {inv.documentType === "receipt" ? t("Receipt") : t("Invoice")}''',
    '''            </td>\n            <td class="max-w-[16rem] truncate" title={inv.title || ""}>\n              {inv.title || "-"}\n            </td>\n            <td>\n              <div class="badge badge-outline badge-sm">\n                {inv.documentType === "receipt" ? t("Receipt") : t("Invoice")}''',
    "invoice list title cell",
)
write(path, text)

# Dashboard server type: recent invoices carry the title from the backend.
path = "frontend/src/routes/dashboard/+page.server.ts"
text = read(path)
text = replace_once(
    text,
    '''  id: string;\n  invoiceNumber: string;\n  customerId?: string;''',
    '''  id: string;\n  invoiceNumber: string;\n  title?: string;\n  customerId?: string;''',
    "dashboard Invoice title type",
)
write(path, text)

# Dashboard: show Title directly after Invoice No in Recent Invoices.
path = "frontend/src/routes/dashboard/+page.svelte"
text = read(path)
text = replace_once(
    text,
    '''          <th>{t("Invoice No")}</th>\n          <th>{t("Customer")}</th>''',
    '''          <th>{t("Invoice No")}</th>\n          <th>{t("Title")}</th>\n          <th>{t("Customer")}</th>''',
    "dashboard title header",
)
text = replace_once(
    text,
    '''            </td>\n            <td>{inv.customer?.name || ""}</td>''',
    '''            </td>\n            <td class="max-w-[16rem] truncate" title={inv.title || ""}>{inv.title || "-"}</td>\n            <td>{inv.customer?.name || ""}</td>''',
    "dashboard title cell",
)
write(path, text)

# Regression/consistency checks.
detail = read("frontend/src/routes/invoices/[id]/+page.svelte")
if '<dd class="text-right font-medium break-all">{invoice.title || "-"}</dd>' not in detail:
    raise SystemExit("Invoice title value missing from document details")

invoice_list = read("frontend/src/routes/invoices/+page.svelte")
if 'handleSort("title")' not in invoice_list or '{inv.title || "-"}' not in invoice_list:
    raise SystemExit("Invoice list title column/sort missing")

dashboard = read("frontend/src/routes/dashboard/+page.svelte")
if '<th>{t("Title")}</th>' not in dashboard or '{inv.title || "-"}' not in dashboard:
    raise SystemExit("Dashboard title column missing")

server = read("frontend/src/routes/dashboard/+page.server.ts")
if "  title?: string;" not in server:
    raise SystemExit("Dashboard Invoice title type missing")
