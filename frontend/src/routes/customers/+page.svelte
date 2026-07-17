<script lang="ts">
  import { UserPlus } from "lucide-svelte";
  import { getContext } from "svelte";
  import { formatPostalCityLine } from "$lib/address";

  const getLoc = getContext("localization") as () => any;

  let { data } = $props();
  let t = getContext("i18n") as (key: string) => string;

  let user = $derived(data.user);
  let canCreate = $derived(user?.isAdmin || user?.permissions?.some((p) => p.resource === "customers" && p.action === "create"));
  let customers = $derived(data.customers || []);
</script>

<div class="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
  <h1 class="text-2xl font-semibold">{t("Customers")}</h1>
  {#if canCreate}
    <a href="/customers/new" class="btn btn-sm btn-primary w-full sm:w-auto">
      <UserPlus size={16} />
      {t("New Customer")}
    </a>
  {/if}
</div>

{#if data.error}
  <div class="alert alert-error mb-3">
    <span>{data.error}</span>
  </div>
{/if}

<!-- Mobile Card View -->
<div class="block space-y-3 md:hidden">
  {#each customers as c (c.id)}
    <a href={`/customers/${c.id}`} class="card bg-base-100 border-base-300 border transition-shadow hover:shadow-md">
      <div class="card-body p-4">
        <div class="link font-semibold">{c.name || c.id}</div>
        {#if c.customerAbbreviation}
          <div class="badge badge-ghost badge-sm mt-1">{c.customerAbbreviation}</div>
        {/if}
        {#if c.email}
          <div class="mt-1 text-sm opacity-70">{c.email}</div>
        {/if}
      </div>
    </a>
  {/each}
  {#if customers.length === 0}
    <div class="card bg-base-100 border-base-300 border">
      <div class="card-body py-10 text-center text-sm opacity-70">
        <span>
          {t("No customers yet.")}
          <a href="/customers/new" class="link">{t("Create your first customer")}</a>.
        </span>
      </div>
    </div>
  {/if}
</div>

<!-- Desktop Table View -->
<div class="rounded-box bg-base-100 border-base-300 hidden overflow-x-auto border md:block">
  <table class="table-zebra table w-full text-sm">
    <thead class="bg-base-200 text-base-content">
      <tr class="font-medium">
        <th>{t("Name")}</th>
        <th>{t("Customer Abbreviation")}</th>
        <th>{t("Contact Name")}</th>
        <th>{t("Address")}</th>
        <th>{t("City")} / {t("Postal Code")}</th>
        <th>{t("Email")}</th>
      </tr>
    </thead>
    <tbody>
      {#each customers as c (c.id)}
        <tr class="hover">
          <td>
            <a class="link" href={`/customers/${c.id}`}>{c.name || c.id}</a>
          </td>
          <td class="font-mono opacity-70">{c.customerAbbreviation || "-"}</td>
          <td class="opacity-70">{c.contactName || ""}</td>
          <td class="opacity-70">{c.address || ""}</td>
          <td class="opacity-70">{formatPostalCityLine(c.city, c.postalCode, c.countryCode, getLoc()?.postalCityFormat) || "-"}</td>
          <td class="opacity-70">{c.email || ""}</td>
        </tr>
      {/each}
      {#if customers.length === 0}
        <tr>
          <td colspan="6" class="py-10 text-center text-sm opacity-70">
            <span>
              {t("No customers yet.")}
              <a href="/customers/new" class="link">{t("Create your first customer")}</a>.
            </span>
          </td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>
