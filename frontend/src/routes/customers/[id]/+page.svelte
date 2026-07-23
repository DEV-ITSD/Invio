<script lang="ts">
  import { getContext } from "svelte";
  import { Pencil, Trash2 } from "lucide-svelte";
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { hasPermission } from "$lib/types";
  import { formatPostalCityLine } from "$lib/address";

  let { data, form } = $props();
  let t = getContext("i18n") as (key: string) => string;
  const getLoc = getContext("localization") as () => any;

  let c = $derived(data.customer);
  let user = $derived(data.user);
  let canUpdate = $derived(hasPermission(user, "customers", "update"));
  let canDelete = $derived(hasPermission(user, "customers", "delete"));

  function confirmDelete(): SubmitFunction {
    return ({ cancel }) => {
      if (!confirm(t("Are you sure you want to delete this customer? This cannot be undone."))) cancel();
    };
  }
</script>

{#if form?.error || data.error}
  <div class="alert alert-error mb-4">
    <span>{form?.error || data.error}</span>
  </div>
{/if}

{#if c}
  <div class="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
    <div>
      <h1 class="text-2xl font-semibold">{t("Customer")} {c.name || c.id}</h1>
    </div>

    <div class="flex flex-wrap gap-2">
      {#if canUpdate}
        <a href={`/customers/${c.id}/edit`} class="btn btn-sm">
          <Pencil size={16} />
          {t("Edit")}
        </a>
      {/if}

      {#if canDelete}
        <form method="post" action="?/delete" use:enhance={confirmDelete()}>
          <button type="submit" class="btn btn-sm btn-error">
            <Trash2 size={16} />
            {t("Delete")}
          </button>
        </form>
      {/if}
    </div>
  </div>

  <div class="bg-base-100 rounded-box border-base-200 border p-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <div class="mb-1 text-sm opacity-70">{t("Name")}</div>
        <div class="font-medium">{c.name || "-"}</div>
      </div>
      <div>
        <div class="mb-1 text-sm opacity-70">{t("Customer type")}</div>
        <div class="font-medium">{c.customerType === "private" ? t("Private person") : t("Company customer")}</div>
      </div>
      <div>
        <div class="mb-1 text-sm opacity-70">{t("Customer Abbreviation")}</div>
        <div class="font-medium">{c.customerAbbreviation || "-"}</div>
      </div>
      <div>
        <div class="mb-1 text-sm opacity-70">{t("PDF Name")}</div>
        <div class="font-medium">{c.pdfName || "-"}</div>
      </div>
      <div>
        <div class="mb-1 text-sm opacity-70">{t("Contact Name")}</div>
        <div class="font-medium">{c.contactName || "-"}</div>
      </div>
      <div>
        <div class="mb-1 text-sm opacity-70">{t("Email")}</div>
        <div class="font-medium">{c.email || "-"}</div>
      </div>
      <div>
        <div class="mb-1 text-sm opacity-70">{t("Support Email")}</div>
        <div class="font-medium">{c.supportEmail || "-"}</div>
      </div>
      <div>
        <div class="mb-1 text-sm opacity-70">{t("Phone")}</div>
        <div class="font-medium">{c.phone || "-"}</div>
      </div>
      <div>
        <div class="mb-1 text-sm opacity-70">{t("Address")}</div>
        <div class="font-medium whitespace-pre-wrap">{c.address || "-"}</div>
      </div>
      <div>
        <div class="mb-1 text-sm opacity-70">
          {t("City")} / {t("Postal Code")}
        </div>
        <div class="font-medium">{formatPostalCityLine(c.city, c.postalCode, c.countryCode, getLoc()?.postalCityFormat) || "-"}</div>
      </div>
      <div>
        <div class="mb-1 text-sm opacity-70">{t("Tax ID")}</div>
        <div class="font-medium">{c.taxId || "-"}</div>
      </div>
      <div>
        <div class="mb-1 text-sm opacity-70">{t("Country Code")}</div>
        <div class="font-medium">{c.countryCode || "-"}</div>
      </div>
    </div>
  </div>
{/if}
