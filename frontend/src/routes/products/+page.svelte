<script lang="ts">
  import { PackagePlus } from "lucide-svelte";
  import { getContext } from "svelte";

  let { data } = $props();
  let t = getContext("i18n") as (key: string) => string;

  let numberFormat = $derived(data.localization?.numberFormat || "comma");
  let user = $derived(data.user);
  let canCreate = $derived(user?.isAdmin || user?.permissions?.some((p) => p.resource === "products" && p.action === "create"));
  let products = $derived(data.products || []);

  function getProductPrice(p: { unitPrice?: number; unit_price?: number; price?: number }) {
    return Number(p.unitPrice ?? p.unit_price ?? p.price ?? 0);
  }

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
</script>

<div class="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
  <h1 class="text-2xl font-semibold">{t("Products")}</h1>
  {#if canCreate}
    <a href="/products/new" class="btn btn-sm btn-primary w-full sm:w-auto">
      <PackagePlus size={16} />
      {t("New Product")}
    </a>
  {/if}
</div>

{#if data.error}
  <div class="alert alert-error mb-3">
    <span>{data.error}</span>
  </div>
{/if}

<!-- Mobile List -->
<div class="block space-y-3 md:hidden">
  {#each products as p (p.id)}
    <a href={`/products/${p.id}`} class="card bg-base-100 border-base-300 border transition-shadow hover:shadow-md">
      <div class="card-body p-4">
        <div class="mb-2 flex items-start justify-between">
          <div class="line-clamp-2 pr-2 font-semibold">{p.name || p.id}</div>
          <div class="font-medium whitespace-nowrap">
            {fmtMoney(p.currency, getProductPrice(p))}
          </div>
        </div>
        {#if p.description}
          <div class="line-clamp-2 text-sm opacity-70">{p.description}</div>
        {/if}
        {#if p.notes}
          <div class="line-clamp-2 text-sm opacity-60">{p.notes}</div>
        {/if}
      </div>
    </a>
  {/each}
  {#if products.length === 0}
    <div class="card bg-base-100 border-base-300 border">
      <div class="card-body py-10 text-center text-sm opacity-70">
        <span>
          {t("No products yet.")}
          <a href="/products/new" class="link">{t("Create your first product")}</a>.
        </span>
      </div>
    </div>
  {/if}
</div>

<!-- Desktop Table -->
<div class="rounded-box bg-base-100 border-base-300 hidden overflow-x-auto border md:block">
  <table class="table-zebra table w-full text-sm">
    <thead class="bg-base-200 text-base-content">
      <tr class="font-medium">
        <th>{t("Name")}</th>
        <th>{t("Description")}</th>
        <th>{t("Notes")}</th>
        <th class="w-24 pr-4 text-right">{t("Price")}</th>
      </tr>
    </thead>
    <tbody>
      {#each products as p (p.id)}
        <tr class="hover">
          <td class="max-w-[12rem] truncate">
            <a class="link" href={`/products/${p.id}`}>{p.name || p.id}</a>
          </td>
          <td class="max-w-[20rem] truncate opacity-70">{p.description || ""}</td>
          <td class="max-w-[20rem] truncate opacity-70">{p.notes || ""}</td>
          <td class="pr-4 text-right font-medium">{fmtMoney(p.currency, getProductPrice(p))}</td>
        </tr>
      {/each}
      {#if products.length === 0}
        <tr>
          <td colspan="4" class="py-10 text-center text-sm opacity-70">
            <span>
              {t("No products yet.")}
              <a href="/products/new" class="link">{t("Create your first product")}</a>.
            </span>
          </td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>
