import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { backendGet, SESSION_COOKIE } from "$lib/backend";
import { getVersion } from "$lib/version";

type Invoice = {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customer?: { name?: string };
  issueDate?: string | Date;
  updatedAt?: string | Date;
  currency?: string;
  status?: "draft" | "sent" | "complete" | "paid" | "overdue" | "voided";
  total?: number;
};

function getInvoiceYear(value?: string | Date): string {
  if (!value) return "";
  const raw = String(value);
  const match = raw.match(/^(\d{4})/);
  if (match) return match[1];
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : String(date.getFullYear());
}

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }

  const token = cookies.get(SESSION_COOKIE);
  const auth = token ? `Bearer ${token}` : "";

  const user = locals.user;
  const canViewInvoices =
    user.isAdmin ||
    user.permissions?.some(
      (p) => p.resource === "invoices" && p.action === "read",
    );
  const canViewCustomers =
    user.isAdmin ||
    user.permissions?.some(
      (p) => p.resource === "customers" && p.action === "read",
    );

  try {
    const [invoices, customers, settings] = await Promise.all([
      canViewInvoices
        ? (backendGet("/api/v1/invoices", auth) as Promise<Invoice[]>)
        : Promise.resolve([] as Invoice[]),
      canViewCustomers
        ? (backendGet("/api/v1/customers", auth) as Promise<unknown[]>)
        : Promise.resolve([] as unknown[]),
      backendGet("/api/v1/settings", auth).catch(() => ({})) as Promise<
        Record<string, unknown>
      >,
    ]);

    const currentYear = String(new Date().getFullYear());
    const years = [
      ...new Set([
        currentYear,
        ...invoices
          .map((invoice) => getInvoiceYear(invoice.issueDate))
          .filter(Boolean),
      ]),
    ].sort((a, b) => Number(b) - Number(a));
    const requestedYear = url.searchParams.has("year")
      ? url.searchParams.get("year") || currentYear
      : currentYear;
    const selectedYear =
      requestedYear === "all" || years.includes(requestedYear)
        ? requestedYear
        : currentYear;
    const filteredInvoices =
      selectedYear === "all"
        ? invoices
        : invoices.filter(
            (invoice) => getInvoiceYear(invoice.issueDate) === selectedYear,
          );
    const filteredCustomerIds = new Set(
      filteredInvoices.map((invoice) => invoice.customerId).filter(Boolean),
    );

    const currency =
      (filteredInvoices[0]?.currency as string) ||
      (invoices[0]?.currency as string) ||
      "USD";
    const dateFormat = String(settings.dateFormat || "YYYY-MM-DD");
    const billed = filteredInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
    const paid = filteredInvoices
      .filter((i) => i.status === "paid" || i.status === "complete")
      .reduce((s, i) => s + (i.total || 0), 0);
    const outstanding = filteredInvoices
      .filter((i) => i.status === "sent" || i.status === "overdue")
      .reduce((s, i) => s + (i.total || 0), 0);
    const status = {
      draft: filteredInvoices.filter((i) => i.status === "draft").length,
      sent: filteredInvoices.filter((i) => i.status === "sent").length,
      complete: filteredInvoices.filter((i) => i.status === "complete").length,
      paid: filteredInvoices.filter((i) => i.status === "paid").length,
      overdue: filteredInvoices.filter((i) => i.status === "overdue").length,
      voided: filteredInvoices.filter((i) => i.status === "voided").length,
    };

    const configuredRecentLimit = Number(settings.dashboardRecentInvoicesLimit);
    const recentInvoiceLimit = Number.isFinite(configuredRecentLimit)
      ? Math.min(50, Math.max(1, Math.trunc(configuredRecentLimit)))
      : 5;
    const recent = filteredInvoices
      .slice()
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.issueDate || 0).getTime() -
          new Date(a.updatedAt || a.issueDate || 0).getTime(),
      )
      .slice(0, recentInvoiceLimit);

    const version = getVersion();
    const visibleCustomerCount = !canViewCustomers
      ? 0
      : selectedYear === "all"
        ? customers.length
        : filteredCustomerIds.size;

    return {
      counts: {
        invoices: filteredInvoices.length,
        customers: visibleCustomerCount,
        totalCustomers: customers.length,
      },
      money: { billed, paid, outstanding, currency },
      status,
      recent,
      recentInvoiceLimit,
      years,
      selectedYear,
      version,
      dateFormat,
    };
  } catch (err) {
    return { error: String(err) };
  }
};
