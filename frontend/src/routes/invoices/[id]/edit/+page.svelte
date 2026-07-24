<script lang="ts">
  import InvoiceEditor from "$lib/components/InvoiceEditor.svelte";
  import { Save } from "lucide-svelte";
  import { getContext } from "svelte";

  let { data } = $props();
  let t = getContext("i18n") as (key: string, params?: Record<string, string | number>) => string;
  const formId = "invoice-edit-form";

  function statusLabel(status?: string) {
    const labels: Record<string, string> = {
      draft: "Draft",
      sent: "Sent",
      complete: "Complete",
      paid: "Paid",
      overdue: "Overdue",
      voided: "Voided",
    };
    return status ? t(labels[status] || status) : "-";
  }
</script>

<div class="mb-6 flex items-center justify-between gap-3">
  <h1 class="text-2xl font-bold">
    {t("Edit Invoice")} #{data.invoice?.invoiceNumber || data.invoice?.id}
  </h1>
  <button type="submit" form={formId} class="btn btn-primary">
    <Save size={16} />
    <span>{t("Save")}</span>
  </button>
</div>

{#if data.allowProtectedInvoiceChanges && data.invoice && data.invoice.status !== "draft" && data.invoice.status !== "voided"}
  <div class="alert alert-warning mb-6">
    <span>{t("Warning: you are editing an issued invoice with status {{status}}. Ensure this is legally allowed in your jurisdiction.", { status: statusLabel(data.invoice?.status) })}</span>
  </div>
{/if}

{#if data.invoice}
  <InvoiceEditor {data} {formId} invoice={data.invoice} />
{/if}
