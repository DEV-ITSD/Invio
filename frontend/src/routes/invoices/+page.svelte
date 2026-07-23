<script lang="ts">
  import { Filter, RotateCcw, SquarePen } from "lucide-svelte";
  import { getContext } from "svelte";

  let { data } = $props();

  let t = getContext("i18n") as (key: string, params?: Record<string, string | number>) => string;
  let numberFormat = $derived(data.localization?.numberFormat || "comma");
  let dateLocale = $derived(data.localization?.locale || "en");
  let user = $derived(data.user);
  let canCreate = $derived(user?.isAdmin || user?.permissions?.some((p) => p.resource === "invoices" && p.action === "create"));
  let canViewCustomers = $derived(user?.isAdmin || user?.permissions?.some((p) => p.resource === "customers" && p.action === "read"));

  function fmtMoney(cur: string | undefined, n: number) {
    if (!cur) cur = "USD";
    try {
      const locale = numberFormat === "period" ? "de-DE" : numberFormat === "swiss" ? "de-CH" : "en-US";
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: cur,
      }).format(n || 0);
    } catch {
      return `${cur} ${Number(n || 0).toFixed(2)}`;
    }
  }

  let invoices = $derived(data.invoices || []);
  let filterDocumentType = $state("all");
  let filterCustomer = $state("all");
  let filterStatus = $state("all");
  let filterYear = $state("all");
  let sortKey = $state<"invoiceNumber" | "documentType" | "customer" | "total" | "status" | "issueDate" | "updatedAt">("invoiceNumber");
  let sortDirection = $state<"asc" | "desc">("desc");

  function toDateMs(v: unknown) {
    return new Date((v as string) || 0).getTime();
  }

  function compareText(a: unknown, b: unknown) {
    return String(a || "").localeCompare(String(b || ""), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }

  function invoiceYear(value: unknown) {
    const raw = String(value || "");
    const match = raw.match(/^(\d{4})/);
    if (match) return match[1];
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? "" : String(date.getFullYear());
  }

  let customerOptions = $derived.by(() => {
    const customers: Record<string, string> = {};
    for (const invoice of invoices) {
      const id = String(invoice.customerId || "");
      const name = String(invoice.customer?.name || "");
      if (id && name) customers[id] = name;
    }
    return Object.entries(customers)
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => compareText(a.name, b.name));
  });

  let yearOptions = $derived([...new Set(invoices.map((invoice) => invoiceYear(invoice.issueDate || invoice.issue_date)).filter(Boolean))].sort((a, b) => Number(b) - Number(a)));

  function handleSort(key: "invoiceNumber" | "documentType" | "customer" | "total" | "status" | "issueDate" | "updatedAt") {
    if (sortKey === key) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
      return;
    }
    sortKey = key;
    sortDirection = key === "invoiceNumber" ? "desc" : "asc";
  }

  function sortMarker(key: "invoiceNumber" | "documentType" | "customer" | "total" | "status" | "issueDate" | "updatedAt") {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? " ▲" : " ▼";
  }

  let filtered = $derived(
    invoices.filter((i) => {
      if (filterDocumentType !== "all" && i.documentType !== filterDocumentType) return false;
      if (filterCustomer !== "all" && i.customerId !== filterCustomer) return false;
      if (filterStatus !== "all" && i.status !== filterStatus) return false;
      if (filterYear !== "all" && invoiceYear(i.issueDate || i.issue_date) !== filterYear) return false;
      return true;
    }),
  );

  let sortedFiltered = $derived(
    [...filtered].sort((a, b) => {
      let result = 0;
      if (sortKey === "invoiceNumber") {
        result = compareText(a.invoiceNumber, b.invoiceNumber);
      } else if (sortKey === "documentType") {
        result = compareText(a.documentType, b.documentType);
      } else if (sortKey === "customer") {
        result = compareText(a.customer?.name, b.customer?.name);
      } else if (sortKey === "total") {
        result = Number(a.total || 0) - Number(b.total || 0);
      } else if (sortKey === "status") {
        result = compareText(a.status, b.status);
      } else if (sortKey === "issueDate") {
        result = toDateMs(a.issueDate) - toDateMs(b.issueDate);
      } else if (sortKey === "updatedAt") {
        result = toDateMs(a.updatedAt) - toDateMs(b.updatedAt);
      }

      if (result === 0) {
        result = compareText(a.invoiceNumber, b.invoiceNumber);
      }

      return sortDirection === "asc" ? result : -result;
    }),
  );

  function clearFilters() {
    filterDocumentType = "all";
    filterCustomer = "all";
    filterStatus = "all";
    filterYear = "all";
  }

  // Show "Paid with" only when at least one visible (filtered) invoice has a payment method.
  // This hides the column automatically when filtering to statuses that can never carry one
  // (e.g. Draft, Sent, Voided) — the column would otherwise appear with all cells empty.
  let showPaidWith = $derived(sortedFiltered.some((i: any) => i.paidWith));
</script>

<div class="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
  <h1 class="text-2xl font-semibold">{t("Invoices")}</h1>
  {#if canCreate}
    <a href="/invoices/new" class="btn btn-primary btn-sm w-full sm:w-auto">
      <SquarePen size={16} />
      {t("Create Invoice")}
    </a>
  {/if}
</div>

{#if data.error}
  <div class="alert alert-error mb-4">
    <span>{data.error}</span>
  </div>
{/if}

<div class="bg-base-100 border-base-300 rounded-box mb-4 overflow-x-auto border p-4">
  <div class="mb-3 flex items-center gap-2 text-sm font-semibold">
    <Filter size={16} />
    {t("Filters")}
  </div>
  <div class="grid min-w-[44rem] grid-cols-4 items-end gap-3 xl:min-w-0 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
    <label class="form-control">
      <div class="label py-1"><span class="label-text">{t("Document Type")}</span></div>
      <select class="select select-bordered select-sm w-full" bind:value={filterDocumentType}>
        <option value="all">{t("All document types")}</option>
        <option value="invoice">{t("Invoice")}</option>
        <option value="receipt">{t("Receipt")}</option>
      </select>
    </label>
    {#if canViewCustomers}
      <label class="form-control">
        <div class="label py-1"><span class="label-text">{t("Customer")}</span></div>
        <select class="select select-bordered select-sm w-full" bind:value={filterCustomer}>
          <option value="all">{t("All customers")}</option>
          {#each customerOptions as customer (customer.id)}
            <option value={customer.id}>{customer.name}</option>
          {/each}
        </select>
      </label>
    {/if}
    <label class="form-control">
      <div class="label py-1"><span class="label-text">{t("Status")}</span></div>
      <select class="select select-bordered select-sm w-full" bind:value={filterStatus}>
        <option value="all">{t("All statuses")}</option>
        <option value="draft">{t("Draft")}</option>
        <option value="sent">{t("Sent")}</option>
        <option value="overdue">{t("Overdue")}</option>
        <option value="paid">{t("Paid")}</option>
        <option value="complete">{t("Complete")}</option>
        <option value="voided">{t("Voided")}</option>
      </select>
    </label>
    <label class="form-control">
      <div class="label py-1"><span class="label-text">{t("Year")}</span></div>
      <select class="select select-bordered select-sm w-full" bind:value={filterYear}>
        <option value="all">{t("All years")}</option>
        {#each yearOptions as year (year)}
          <option value={year}>{year}</option>
        {/each}
      </select>
    </label>
    <button type="button" class="btn btn-ghost btn-sm" onclick={clearFilters}>
      <RotateCcw size={15} />
      {t("Clear filters")}
    </button>
  </div>
</div>

{#if invoices.length === 0}
  <div class="bg-base-100 border-base-300 rounded-box border py-12 text-center">
    <div class="mb-4 text-lg opacity-50">{t("No invoices found")}</div>
    {#if canCreate}
      <a href="/invoices/new" class="btn btn-primary">{t("Create your first invoice")}</a>
    {/if}
  </div>
{:else}
  <div class="bg-base-100 border-base-300 rounded-box overflow-x-auto border">
    <table class="table-sm sm:table-md table w-full whitespace-nowrap">
      <thead class="bg-base-200">
        <tr>
          <th>
            <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("invoiceNumber")}>
              {t("Invoice No")}{sortMarker("invoiceNumber")}
            </button>
          </th>
          <th>
            <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("documentType")}>
              {t("Document Type")}{sortMarker("documentType")}
            </button>
          </th>
          {#if canViewCustomers}
            <th>
              <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("customer")}>
                {t("Customer")}{sortMarker("customer")}
              </button>
            </th>
          {/if}
          <th>
            <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("total")}>
              {t("Total")}{sortMarker("total")}
            </button>
          </th>
          <th>
            <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("status")}>
              {t("Status")}{sortMarker("status")}
            </button>
          </th>
          <th class="hidden sm:table-cell">
            <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("issueDate")}>
              {t("Issue Date")}{sortMarker("issueDate")}
            </button>
          </th>
          {#if showPaidWith}
            <th class="hidden sm:table-cell">
              {t("Paid with")}
            </th>
          {/if}
          <th class="hidden text-right md:table-cell">
            <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("updatedAt")}>
              {t("Updated")}{sortMarker("updatedAt")}
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        {#each sortedFiltered as inv (inv.id)}
          <tr class="hover">
            <td class="font-medium hover:underline">
              <a href={`/invoices/${inv.id}`}>{inv.invoiceNumber}</a>
              <div class="text-xs opacity-70 sm:hidden">
                {#if inv.issueDate}
                  {new Date(inv.issueDate).toLocaleDateString(dateLocale, { year: "numeric", month: "short", day: "numeric" })}
                {/if}
              </div>
            </td>
            <td>
              <div class="badge badge-outline badge-sm">
                {inv.documentType === "receipt" ? t("Receipt") : t("Invoice")}
              </div>
            </td>
            {#if canViewCustomers}
              <td class="max-w-[12rem] truncate sm:max-w-xs" title={inv.customer?.name}>
                {inv.customer?.name || "-"}
              </td>
            {/if}
            <td class="font-medium">{fmtMoney(inv.currency, inv.total)}</td>
            <td>
              {#if inv.status === "draft"}
                <div class="badge badge-ghost badge-sm">{t("Draft")}</div>
              {:else if inv.status === "sent"}
                <div class="badge badge-info badge-sm">{t("Sent")}</div>
              {:else if inv.status === "paid"}
                <div class="badge badge-success badge-sm">{t("Paid")}</div>
              {:else if inv.status === "complete"}
                <div class="badge badge-secondary badge-sm">
                  {t("Complete")}
                </div>
              {:else if inv.status === "overdue"}
                <div class="badge badge-error badge-sm">{t("Overdue")}</div>
              {:else if inv.status === "voided"}
                <div class="badge badge-neutral badge-sm">{t("Voided")}</div>
              {/if}
            </td>
            <td class="hidden text-sm tabular-nums sm:table-cell">
              {#if inv.issueDate}
                {new Date(inv.issueDate).toLocaleDateString(dateLocale, { year: "numeric", month: "short", day: "numeric" })}
              {/if}
            </td>
            {#if showPaidWith}
              <td class="hidden text-sm sm:table-cell">
                {(inv as any).paidWith || ""}
              </td>
            {/if}
            <td class="hidden text-right text-sm tabular-nums opacity-70 md:table-cell">
              {#if inv.updatedAt}
                {new Date(inv.updatedAt).toLocaleDateString(dateLocale, { year: "numeric", month: "short", day: "numeric" })}
              {/if}
            </td>
          </tr>
        {/each}
        {#if sortedFiltered.length === 0}
          <tr>
            <td colspan="99" class="py-8 text-center opacity-50">{t("No invoices match this filter")}</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
{/if}
