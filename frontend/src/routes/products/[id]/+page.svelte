<script lang="ts">
  import { getContext } from "svelte";
  import { Pencil, Trash2 } from "lucide-svelte";
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { hasPermission } from "$lib/types";

  let { data } = $props();
  let t = getContext("i18n") as (key: string) => string;

  let p = $derived(data.product);
  let taxDef = $derived(data.taxDefinition);
  let user = $derived(data.user);
  let canUpdate = $derived(hasPermission(user, "products", "update"));
  let canDelete = $derived(hasPermission(user, "products", "delete"));

  function fmtMoney(cur: string | undefined, n: number) {
    if (!cur) cur = "USD";
    try {
      const locale = data.localization?.numberFormat === "period" ? "de-DE" : data.localization?.numberFormat === "swiss" ? "de-CH" : "en-US";
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: cur,
      }).format(n || 0);
    } catch {
      return `${cur} ${Number(n || 0).toFixed(2)}`;
    }
  }

  function confirmDelete(): SubmitFunction {
    return ({ cancel }) => {
      if (!confirm(t("Are you sure you want to delete this product?"))) cancel();
    };
  }
</script>

{#if data.error}
  <div class="alert alert-error mb-4">
    <span>{data.error}</span>
  </div>
{/if}

{#if p}
  <div class="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
    <div>
      <h1 class="text-2xl font-semibold">{t("Product")} {p.name || p.id}</h1>
      {#if p.isActive === false}
        <span class="badge badge-ghost mt-1">{t("Inactive")}</span>
      {/if}
    </div>

    <div class="flex flex-wrap gap-2">
      {#if canUpdate}
        <a href={`/products/${p.id}/edit`} class="btn btn-sm">
          <Pencil size={16} />
          {t("Edit")}
        </a>
      {/if}

      {#if p.isActive === false && canUpdate}
        <form method="post" action="?/reactivate" use:enhance>
          <button type="submit" class="btn btn-sm btn-success">
            {t("Reactivate")}
          </button>
        </form>
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
        <div class="font-medium">{p.name || "-"}</div>
      </div>
      <div>
        <div class="mb-1 text-sm opacity-70">{t("Unit Price")}</div>
        <div class="font-medium">
          {fmtMoney(data.settings?.currency, p.unitPrice)}
        </div>
      </div>
      <div>
        <div class="mb-1 text-sm opacity-70">{t("Description")}</div>
        <div class="font-medium">{p.description || "-"}</div>
      </div>
      <div>
        <div class="mb-1 text-sm opacity-70">{t("Notes")}</div>
        <div class="font-medium whitespace-pre-wrap">{p.notes || "-"}</div>
      </div>
      <div>
        <div class="mb-1 text-sm opacity-70">{t("SKU")}</div>
        <div class="font-medium">{p.sku || "-"}</div>
      </div>
      <div>
        <div class="mb-1 text-sm opacity-70">{t("Unit")}</div>
        <div class="font-medium">{p.unit || "-"}</div>
      </div>
      <div>
        <div class="mb-1 text-sm opacity-70">{t("Category")}</div>
        <div class="font-medium">{p.category || "-"}</div>
      </div>
      {#if taxDef}
        <div>
          <div class="mb-1 text-sm opacity-70">{t("Tax Definition")}</div>
          <div class="font-medium">
            {taxDef.name || taxDef.code || `${taxDef.percent}%`} ({taxDef.percent}%)
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
