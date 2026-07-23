<script lang="ts">
  import { getContext } from "svelte";
  import {
    FileText,
    Edit,
    Copy,
    ExternalLink,
    Download,
    ArrowLeft,
    MoreHorizontal,
    FileCode2,
    ShieldOff,
    Send,
    Ban,
    Trash2,
    CheckCircle,
    Upload,
    Check,
    Pencil,
    ChevronDown,
    Mail,
    Building2,
    CalendarDays,
    CircleDollarSign,
  } from "lucide-svelte";
  import { enhance } from "$app/forms";
  import { page } from "$app/state";
  import type { SubmitFunction } from "@sveltejs/kit";

  import { hasPermission } from "$lib/types";
  import { formatPostalCityLine } from "$lib/address";

  let { data, form } = $props();
  let t = getContext("i18n") as (key: string) => string;
  const getLoc = getContext("localization") as () => any;

  let invoice = $derived(data.invoice);
  let documentTitle = $derived(data.documentTitle || (invoice?.documentType === "receipt" ? t("Receipt") : t("Invoice")));
  let showPublishedBanner = $derived(data.showPublishedBanner);
  let user = $derived(data.user);

  let isOverdue = $derived.by(() => {
    if (!invoice) return false;
    if (invoice.status === "paid" || invoice.status === "voided") return false;
    const due = invoice.dueDate ? new Date(invoice.dueDate as string) : null;
    if (!due) return false;
    const today = new Date();
    const dueDateObj = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const todayObj = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return dueDateObj.valueOf() < todayObj.valueOf();
  });

  let canUpdate = $derived(hasPermission(user, "invoices", "update"));
  let canDelete = $derived(hasPermission(user, "invoices", "delete"));
  let canPublish = $derived(hasPermission(user, "invoices", "publish"));
  let canVoid = $derived(hasPermission(user, "invoices", "void"));
  let allowProtectedInvoiceChanges = $derived(Boolean(data.allowProtectedInvoiceChanges));
  let isRetentionProtectedInvoice = $derived(invoice?.status === "sent" || invoice?.status === "paid" || invoice?.status === "complete" || invoice?.status === "overdue");
  let canEditInvoice = $derived(canUpdate && Boolean(invoice && (invoice.status === "draft" || (allowProtectedInvoiceChanges && invoice.status !== "voided"))));
  let canDeleteInvoice = $derived(canDelete && Boolean(invoice && (invoice.status === "draft" || invoice.status === "voided" || (allowProtectedInvoiceChanges && invoice.status !== "voided"))));

  let paidPaymentMethod = $state("");
  let emailSending = $state(false);
  let emailDialog: HTMLDialogElement;

  let emailEnabled = $derived(Boolean(data.emailEnabled));
  let canExport = $derived(hasPermission(user, "invoices", "export"));
  let showItemTaxes = $derived(Boolean(invoice?.items?.some((item: any) => Array.isArray(item.taxes) && item.taxes.length > 0)));

  let defaultEmailSubject = $derived(invoice ? `${documentTitle} #${invoice.invoiceNumber || invoice.id}` : documentTitle);
  let defaultEmailTo = $derived(invoice?.customer?.email ?? "");

  $effect(() => {
    if ((form as any)?.emailSent) {
      emailDialog?.close();
    }
  });

  function openEmailModal() {
    emailDialog?.showModal();
  }

  function fmtDate(d?: string | Date) {
    if (!d) return "";
    const dt = typeof d === "string" ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return "";
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    if (getLoc()?.dateFormat === "DD.MM.YYYY") {
      return `${day}.${month}.${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  function fmtMoney(v?: number) {
    return `${Number(v || 0).toFixed(2)} ${invoice?.currency || "EUR"}`;
  }

  function fmtDateTime(d: Date) {
    if (!d || Number.isNaN(d.getTime())) return "";
    const date = fmtDate(d);
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${date} ${h}:${m}`;
  }

  function statusLabel(status?: string) {
    if (!status) return "-";
    const labels: Record<string, string> = {
      draft: "Draft",
      sent: "Sent",
      complete: "Complete",
      paid: "Paid",
      overdue: "Overdue",
      voided: "Voided",
    };
    return t(labels[status] || status);
  }

  function copyLink() {
    navigator.clipboard.writeText(`${page.url.origin}/public/invoices/${invoice.shareToken}`);
    alert(t("Link copied!"));
  }

  function confirmAction(message: string | (() => string)): SubmitFunction {
    return ({ cancel }) => {
      const text = typeof message === "function" ? message() : message;
      if (!confirm(text)) cancel();
    };
  }

  function confirmEditNavigation(event: MouseEvent) {
    if (!allowProtectedInvoiceChanges || !isRetentionProtectedInvoice) return;
    if (!confirm(t("You are about to edit a sent/paid invoice. Ensure this is legally allowed in your jurisdiction. Continue?"))) {
      event.preventDefault();
    }
  }
</script>

<!-- Send via Email dialog -->
<dialog bind:this={emailDialog} class="modal">
  <div class="modal-box max-w-lg">
    <form method="dialog">
      <button class="btn btn-sm btn-circle btn-ghost absolute top-3 right-3">✕</button>
    </form>
    <h3 class="mb-4 text-lg font-semibold">{t("Send via Email")}</h3>

    {#if (form as any)?.emailError}
      <div class="alert alert-error mb-4 text-sm">
        <span>{(form as any).emailError}</span>
      </div>
    {/if}

    <form
      method="post"
      use:enhance={() => {
        emailSending = true;
        return async ({ result, update }) => {
          await update({ reset: false });
          emailSending = false;
          if (result.type === "success") emailDialog?.close();
        };
      }}
    >
      <input type="hidden" name="intent" value="send-email" />

      <div class="form-control mb-3">
        <label class="label pb-1" for="emailTo">
          <span class="label-text font-medium">{t("To")}</span>
          <span class="label-text-alt opacity-60">{t("Separate multiple with commas")}</span>
        </label>
        <input
          id="emailTo"
          type="text"
          name="emailTo"
          class="input input-bordered w-full"
          value={defaultEmailTo}
          placeholder="customer@example.com, other@example.com"
          disabled={emailSending}
          required
        />
      </div>

      <div class="form-control mb-3">
        <label class="label pb-1" for="emailSubject">
          <span class="label-text font-medium">{t("Subject")}</span>
        </label>
        <input id="emailSubject" type="text" name="emailSubject" class="input input-bordered w-full" value={defaultEmailSubject} disabled={emailSending} required />
      </div>

      <div class="form-control mb-4">
        <label class="label pb-1" for="emailMessage">
          <span class="label-text font-medium">{t("Message")}</span>
          <span class="label-text-alt opacity-60">{t("Optional")}</span>
        </label>
        <textarea id="emailMessage" name="emailMessage" class="textarea textarea-bordered w-full" rows="4" placeholder={t("Add a personal note...")} disabled={emailSending}></textarea>
      </div>

      <div class="text-base-content/60 mb-4 flex items-center gap-2 text-sm">
        <FileText size={14} />
        <span>{t("The invoice PDF will be attached automatically.")}</span>
      </div>

      <div class="modal-action mt-0">
        <button type="button" class="btn btn-ghost" disabled={emailSending} onclick={() => emailDialog?.close()}>{t("Cancel")}</button>
        <button type="submit" class="btn btn-primary" disabled={emailSending}>
          {#if emailSending}
            <span class="loading loading-spinner loading-sm"></span>
          {:else}
            <Mail size={16} />
          {/if}
          {t("Send")}
        </button>
      </div>
    </form>
  </div>
  <form method="dialog" class="modal-backdrop"><button>close</button></form>
</dialog>

<div class="mb-6">
  {#if form?.error}
    <div class="alert alert-error mb-4 text-sm shadow sm:text-base">
      <div class="flex-1 overflow-hidden">
        <div class="font-medium">{form.error}</div>
      </div>
    </div>
  {/if}

  {#if (form as any)?.emailSent}
    <div class="alert alert-success mb-4 text-sm shadow sm:text-base">
      <CheckCircle size={18} />
      <div class="flex-1">
        <div class="font-medium">{t("Invoice sent successfully")}</div>
        <div class="opacity-80">{t("Sent to")} {(form as any).emailRecipients?.join(", ")}</div>
      </div>
    </div>
  {/if}

  {#if showPublishedBanner && invoice?.shareToken}
    <div class="alert alert-success mb-4 text-sm shadow sm:text-base">
      <CheckCircle size={20} />
      <div class="flex-1 overflow-hidden">
        <div class="font-medium">{t("Invoice published")}</div>
        <div class="truncate text-sm break-all opacity-80">
          {t("Public link")}:
          <a class="link" href="/public/invoices/{invoice.shareToken}" target="_blank">
            {page.url.origin}/public/invoices/{invoice.shareToken}
          </a>
        </div>
      </div>
      <div class="flex shrink-0 gap-2">
        <a class="btn btn-xs sm:btn-sm btn-ghost" target="_blank" href="/public/invoices/{invoice.shareToken}">
          {t("Open")}
        </a>
        <button type="button" class="btn btn-xs sm:btn-sm" onclick={copyLink}>
          {t("Copy link")}
        </button>
        <a class="btn btn-xs sm:btn-sm btn-primary" href="/api/v1/invoices/{invoice.id}/pdf" target="_blank">
          {t("Download PDF")}
        </a>
      </div>
    </div>
  {/if}

  <div class="border-base-200 flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
    <div class="flex items-center gap-3">
      <a href="/invoices" class="btn btn-ghost btn-circle btn-sm">
        <ArrowLeft size={20} />
      </a>
      <h1 class="flex items-center gap-2 text-2xl font-semibold">
        {documentTitle} #
        {invoice?.invoiceNumber || invoice?.id}
      </h1>
      {#if invoice?.status}
        <span
          class="badge {invoice.status === 'paid'
            ? 'badge-success'
            : invoice.status === 'complete'
              ? 'badge-secondary'
              : invoice.status === 'voided'
                ? 'badge-warning'
                : isOverdue && invoice?.status !== 'paid' && invoice?.status !== 'complete'
                  ? 'badge-error'
                  : invoice.status === 'sent'
                    ? 'badge-info'
                    : ''}"
        >
          {invoice.status === "voided"
            ? t("Voided")
            : invoice.status === "complete"
              ? t("Complete")
              : isOverdue && invoice?.status !== "paid" && invoice?.status !== "complete"
                ? t("Overdue")
                : t(invoice?.status === "draft" ? "Draft" : invoice?.status === "sent" ? "Sent" : invoice?.status === "paid" ? "Paid" : "Overdue")}
        </span>
      {/if}
    </div>

    <!-- Hidden forms for dropdown actions -->
    <form id="inv-duplicate" method="post" class="hidden" use:enhance>
      <input type="hidden" name="intent" value="duplicate" />
    </form>
    <form id="inv-unpublish" method="post" class="hidden" use:enhance>
      <input type="hidden" name="intent" value="unpublish" />
    </form>
    <form id="inv-mark-sent" method="post" class="hidden" use:enhance>
      <input type="hidden" name="intent" value="mark-sent" />
    </form>
    <form id="inv-mark-complete" method="post" class="hidden" use:enhance>
      <input type="hidden" name="intent" value="mark-complete" />
    </form>
    <form id="inv-void" method="post" class="hidden" use:enhance={confirmAction(t("Void this invoice?"))}>
      <input type="hidden" name="intent" value="void" />
    </form>
    <form
      id="inv-delete"
      method="post"
      class="hidden"
      use:enhance={confirmAction(() =>
        isRetentionProtectedInvoice
          ? t("You are about to delete a sent/paid invoice. This may violate invoice retention laws and cannot be undone. Continue?")
          : t("Delete this invoice? This cannot be undone."),
      )}
    >
      <input type="hidden" name="intent" value="delete" />
    </form>

    {#if invoice}
      <div class="flex flex-wrap items-center gap-2">
        {#if canEditInvoice}
          <a href="/invoices/{invoice.id}/edit" class="btn btn-sm" onclick={confirmEditNavigation}>
            <Pencil size={16} />
            <span class="hidden sm:inline">{t("Edit")}</span>
          </a>
        {/if}

        {#if invoice.status === "draft" && canPublish}
          <form method="post" use:enhance>
            <input type="hidden" name="intent" value="publish" />
            <button type="submit" class="btn btn-sm btn-success" title={t("Make public and mark as sent")}>
              <Upload size={16} />
              <span class="hidden sm:inline">{t("Publish")}</span>
            </button>
          </form>
        {/if}

        {#if invoice.status === "paid" && canUpdate}
          <form method="post" use:enhance>
            <input type="hidden" name="intent" value="mark-complete" />
            <button type="submit" class="btn btn-sm btn-secondary" title={t("Mark as Complete")}>
              <CheckCircle size={16} />
              <span class="hidden sm:inline">{t("Mark as Complete")}</span>
            </button>
          </form>
        {/if}

        {#if (invoice.status === "sent" || invoice.status === "overdue") && canUpdate}
          <div class="join">
            <form method="post" use:enhance>
              <input type="hidden" name="intent" value="mark-paid" />
              <button type="submit" class="btn btn-sm btn-primary join-item" title={t("Mark as Paid")}>
                <Check size={16} />
                <span class="hidden sm:inline">{t("Mark as Paid")}</span>
              </button>
            </form>
            <div class="dropdown dropdown-end">
              <button tabindex="0" type="button" class="btn btn-sm btn-primary join-item border-l-primary-content/20 border-l px-2">
                <ChevronDown size={14} />
              </button>
              <div tabindex="0" class="dropdown-content bg-base-100 rounded-box border-base-200 z-10 mt-1 w-60 space-y-2 border p-3 shadow">
                <p class="text-sm font-medium opacity-70">{t("Payment Method")}</p>
                <form method="post" use:enhance>
                  <input type="hidden" name="intent" value="mark-paid" />
                  <input
                    class="input input-bordered input-sm w-full"
                    type="text"
                    name="paymentMethod"
                    bind:value={paidPaymentMethod}
                    placeholder={t("e.g. Bank Transfer, PayPal")}
                    autocomplete="off"
                  />
                  <div class="flex flex-wrap gap-1 pt-2">
                    {#each ["Bank Transfer", "PayPal", "Cash", "Credit Card", "Stripe"] as method (method)}
                      <button type="button" class="badge badge-outline hover:badge-primary cursor-pointer text-xs" onclick={() => (paidPaymentMethod = method)}>
                        {method}
                      </button>
                    {/each}
                  </div>
                  <button type="submit" class="btn btn-primary btn-sm btn-block mt-2">{t("Mark as Paid")}</button>
                </form>
              </div>
            </div>
          </div>
        {/if}

        {#if emailEnabled && canExport && invoice.status !== "voided"}
          <button type="button" class="btn btn-sm" onclick={openEmailModal}>
            <Mail size={16} />
            <span class="hidden sm:inline">{t("Send via Email")}</span>
          </button>
        {/if}

        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost btn-sm">
            <MoreHorizontal size={16} />
            <span class="hidden sm:inline">{t("More")}</span>
          </div>
          <ul tabindex="-1" class="menu menu-sm dropdown-content bg-base-100 rounded-box border-base-200 z-1 mt-2 w-56 border p-2 shadow">
            <li>
              <button type="submit" form="inv-duplicate" class="flex items-center gap-2 py-2">
                <Copy size={16} />
                {t("Duplicate")}
              </button>
            </li>
            <li>
              <a href="/api/v1/invoices/{invoice.id}/xml" target="_blank" title={t("Download XML")} class="flex items-center gap-2 py-2">
                <FileText size={16} />
                {t("Download XML")}
              </a>
            </li>
            <div class="divider my-0 py-0"></div>
            {#if (invoice.status === "sent" || invoice.status === "overdue") && canPublish}
              <li>
                <button type="submit" form="inv-unpublish" class="flex items-center gap-2 py-2">
                  <ShieldOff size={16} />
                  {t("Unpublish")}
                </button>
              </li>
            {/if}
            {#if invoice.status === "paid" && canUpdate}
              <li>
                <button type="submit" form="inv-mark-complete" class="flex items-center gap-2 py-2">
                  <CheckCircle size={16} />
                  {t("Mark as Complete")}
                </button>
              </li>
            {/if}
            {#if invoice.status === "draft" && canUpdate}
              <li>
                <button type="submit" form="inv-mark-sent" class="flex items-center gap-2 py-2">
                  <Send size={16} />
                  {t("Mark as Sent")}
                </button>
              </li>
            {/if}
            {#if (invoice.status === "sent" || invoice.status === "overdue") && canVoid}
              <li>
                <button type="submit" form="inv-void" class="text-warning flex items-center gap-2 py-2">
                  <Ban size={16} />
                  {t("Void Invoice")}
                </button>
              </li>
            {/if}
            {#if canDeleteInvoice}
              <li>
                <button type="submit" form="inv-delete" class="text-error flex items-center gap-2 py-2">
                  <Trash2 size={16} />
                  {t("Delete")}
                </button>
              </li>
            {/if}
          </ul>
        </div>
      </div>
    {/if}
  </div>
</div>

{#if invoice}
  <div class="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
    <section class="card bg-base-100 border-base-300 border">
      <div class="card-body gap-4 p-5">
        <h2 class="card-title text-base"><CalendarDays size={18} /> {t("Document details")}</h2>
        <dl class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-x-4 gap-y-2 text-sm">
          <dt class="opacity-60">{t("Document Type")}</dt>
          <dd class="text-right font-medium">{documentTitle}</dd>
          <dt class="opacity-60">{t("Invoice Number")}</dt>
          <dd class="text-right font-medium break-all">{invoice.invoiceNumber || "-"}</dd>
          <dt class="opacity-60">{t("Quote Number")}</dt>
          <dd class="text-right font-medium break-all">{invoice.quoteNumber || "-"}</dd>
          <dt class="opacity-60">{t("Status")}</dt>
          <dd class="text-right font-medium">{statusLabel(invoice.status)}</dd>
          <dt class="opacity-60">{t("Issue Date")}</dt>
          <dd class="text-right font-medium">{fmtDate(invoice.issueDate) || "-"}</dd>
          {#if invoice.documentType !== "receipt"}
            <dt class="opacity-60">{t("Due Date")}</dt>
            <dd class="text-right font-medium">{fmtDate(invoice.dueDate) || "-"}</dd>
          {/if}
          <dt class="opacity-60">{t("Currency")}</dt>
          <dd class="text-right font-medium">{invoice.currency || "-"}</dd>
          <dt class="opacity-60">{t("Decimal places")}</dt>
          <dd class="text-right font-medium">{invoice.decimalDisplay === "always" ? t("Always show") : t("Automatic")}</dd>
          <dt class="opacity-60">{t("Created")}</dt>
          <dd class="text-right font-medium">{invoice.createdAt ? fmtDateTime(new Date(invoice.createdAt)) : "-"}</dd>
          <dt class="opacity-60">{t("Updated")}</dt>
          <dd class="text-right font-medium">{invoice.updatedAt ? fmtDateTime(new Date(invoice.updatedAt)) : "-"}</dd>
        </dl>
      </div>
    </section>

    <section class="card bg-base-100 border-base-300 border">
      <div class="card-body gap-4 p-5">
        <h2 class="card-title text-base"><Building2 size={18} /> {t("Customer details")}</h2>
        <dl class="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] gap-x-4 gap-y-2 text-sm">
          <dt class="opacity-60">{t("Customer")}</dt>
          <dd class="text-right font-medium">{invoice.customer?.name || t("Unknown Customer")}</dd>
          <dt class="opacity-60">{t("Customer type")}</dt>
          <dd class="text-right font-medium">{invoice.customer?.customerType === "private" ? t("Private person") : t("Company customer")}</dd>
          <dt class="opacity-60">{t("Contact Name")}</dt>
          <dd class="text-right font-medium">{invoice.customer?.contactName || "-"}</dd>
          <dt class="opacity-60">{t("Address")}</dt>
          <dd class="text-right font-medium whitespace-pre-line">
            {#if invoice.customer?.address || invoice.customer?.city}
              {[invoice.customer?.address, formatPostalCityLine(invoice.customer?.city, invoice.customer?.postalCode, invoice.customer?.countryCode, getLoc()?.postalCityFormat)]
                .filter(Boolean)
                .join("\n")}
              {#if invoice.customer?.countryCode}
                <br />{invoice.customer.countryCode}
              {/if}
            {:else}
              -
            {/if}
          </dd>
          <dt class="opacity-60">{t("Email")}</dt>
          <dd class="text-right font-medium break-all">{invoice.customer?.email || "-"}</dd>
          <dt class="opacity-60">{t("Support Email")}</dt>
          <dd class="text-right font-medium break-all">{invoice.customer?.supportEmail || "-"}</dd>
          <dt class="opacity-60">{t("Phone")}</dt>
          <dd class="text-right font-medium">{invoice.customer?.phone || "-"}</dd>
          <dt class="opacity-60">{t("Tax ID")}</dt>
          <dd class="text-right font-medium">{invoice.customer?.taxId || "-"}</dd>
        </dl>
      </div>
    </section>

    <section class="card bg-base-100 border-base-300 border">
      <div class="card-body gap-4 p-5">
        <h2 class="card-title text-base"><CircleDollarSign size={18} /> {t("Financial details")}</h2>
        <dl class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 text-sm">
          <dt class="opacity-60">{t("Subtotal")}</dt>
          <dd class="text-right font-medium">{fmtMoney(invoice.subtotal)}</dd>
          <dt class="opacity-60">
            {invoice.discountText || t("Discount")}
            {#if Number(invoice.discountPercentage || 0) > 0}({invoice.discountPercentage}%){/if}
          </dt>
          <dd class="text-right font-medium">− {fmtMoney(invoice.discountAmount)}</dd>
          <dt class="opacity-60">{invoice.taxMode === "none" && invoice.taxText ? invoice.taxText : t("Tax")}</dt>
          <dd class="text-right font-medium">{fmtMoney(invoice.taxAmount)}</dd>
          <dt class="border-base-300 mt-1 border-t pt-3 font-semibold">{t("Total")}</dt>
          <dd class="border-base-300 mt-1 border-t pt-3 text-right text-lg font-bold">{fmtMoney(invoice.total)}</dd>
        </dl>
        <div class="border-base-200 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-4 text-xs">
          <span class="opacity-60">{t("Tax mode")}</span>
          <span class="text-right">{invoice.taxMode === "none" ? t("No tax") : invoice.taxMode === "line" ? t("Per line") : t("Invoice total")}</span>
          <span class="opacity-60">{t("Tax rate")}</span>
          <span class="text-right">{invoice.taxRate || 0}%</span>
          <span class="opacity-60">{t("Prices include tax")}</span>
          <span class="text-right">{invoice.pricesIncludeTax ? t("Yes") : t("No")}</span>
          <span class="opacity-60">{t("Rounding")}</span>
          <span class="text-right">{invoice.roundingMode === "total" ? t("Round on totals") : t("Round per line")}</span>
        </div>
      </div>
    </section>
  </div>

  <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
    <section class="bg-base-100 border-base-300 rounded-box border p-5">
      <h2 class="mb-2 text-sm font-semibold">{t("Payment Terms")}</h2>
      <div class="text-sm whitespace-pre-wrap opacity-80">{invoice.paymentTerms || "-"}</div>
    </section>
    <section class="bg-base-100 border-base-300 rounded-box border p-5">
      <h2 class="mb-2 text-sm font-semibold">{t("Notes")}</h2>
      <div class="text-sm whitespace-pre-wrap opacity-80">{invoice.notes || "-"}</div>
    </section>
  </div>

  <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
    <div class="text-sm opacity-60">{invoice.items?.length || 0} {t("item(s)")}</div>
    <div class="flex flex-wrap gap-2">
      <a class="btn btn-sm btn-outline" href="/api/v1/invoices/{invoice.id}/html" target="_blank">
        <FileCode2 size={16} />
        {t("View HTML")}
      </a>
      <a class="btn btn-sm btn-primary" href="/api/v1/invoices/{invoice.id}/pdf" target="_blank">
        <Download size={16} />
        {t("Download PDF")}
      </a>
      {#if invoice.status && invoice.status !== "draft" && invoice.shareToken}
        <a class="btn btn-sm btn-outline" href="/public/invoices/{invoice.shareToken}" target="_blank">
          <ExternalLink size={16} />
          {t("View public link")}
        </a>
      {/if}
    </div>
  </div>

  {#if invoice.items && invoice.items.length > 0}
    <div class="mt-8">
      <div class="bg-base-100 rounded-box border-base-200 overflow-hidden border shadow-sm">
        <table class="table-sm sm:table-md table w-full">
          <thead class="bg-base-200/50">
            <tr>
              <th class="w-16 text-center">{t("Pos.")}</th>
              <th>{t("Description")}</th>
              <th class="text-center">{t("Qty")}</th>
              <th class="text-center">{t("Unit")}</th>
              {#if showItemTaxes}<th class="text-center">{t("Tax")}</th>{/if}
              <th class="text-right">{t("Price")}</th>
              <th class="text-right">{t("Total")}</th>
            </tr>
          </thead>
          <tbody>
            {#each invoice.items as item, index (item.id)}
              <tr>
                <td class="text-center font-medium tabular-nums">{index + 1}</td>
                <td class="whitespace-pre-wrap">
                  <div>{item.description || t("Item")}</div>
                  {#if item.notes}<div class="mt-1 text-xs opacity-60">{item.notes}</div>{/if}
                </td>
                <td class="text-center">{item.quantity}</td>
                <td class="text-center">{item.unitName || item.unit || ""}</td>
                {#if showItemTaxes}
                  <td class="text-center">
                    {#if item.taxes?.length}
                      {item.taxes.map((tax: any) => `${tax.percent}%`).join(", ")}
                    {:else}
                      -
                    {/if}
                  </td>
                {/if}
                <td class="text-right">{fmtMoney(item.unitPrice)}</td>
                <td class="text-right font-medium">{fmtMoney(item.lineTotal ?? item.quantity * item.unitPrice)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  {#if invoice.statusHistory && invoice.statusHistory.length > 0}
    <div class="mt-8">
      <h2 class="mb-3 text-base font-semibold opacity-70">{t("Status History")}</h2>
      <ul class="border-base-300 space-y-4 border-l-2 pl-4">
        {#each invoice.statusHistory as entry (entry.id)}
          <li class="relative">
            <span class="bg-base-300 border-base-100 absolute top-1 -left-[1.3rem] h-3 w-3 rounded-full border-2"></span>
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="badge badge-sm {entry.status === 'paid'
                  ? 'badge-success'
                  : entry.status === 'voided'
                    ? 'badge-warning'
                    : entry.status === 'complete'
                      ? 'badge-secondary'
                      : entry.status === 'sent'
                        ? 'badge-info'
                        : 'badge-ghost'}"
              >
                {t(entry.status.charAt(0).toUpperCase() + entry.status.slice(1))}
              </span>
              <span class="text-sm opacity-60">{fmtDateTime(new Date(entry.changedAt))}</span>
              {#if entry.paymentMethod}
                <span class="text-sm opacity-80">· {entry.paymentMethod}</span>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
{/if}
