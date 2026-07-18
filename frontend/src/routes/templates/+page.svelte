<script lang="ts">
  import { FilePlus } from "lucide-svelte";
  import { getContext } from "svelte";

  let { data } = $props();
  let t = getContext("i18n") as (key: string) => string;

  let user = $derived(data.user);
  let canCreate = $derived(user?.isAdmin || user?.permissions?.some((p) => p.resource === "templates" && p.action === "create"));
  let templates = $derived(data.templates || []);
</script>

<div class="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
  <div class="flex flex-col">
    <h1 class="text-2xl font-semibold">{t("Templates")}</h1>
    <span class="text-sm opacity-60">
      {t("Manage invoice HTML templates.")}
    </span>
  </div>
  {#if canCreate}
    <div class="flex gap-2">
      <a href="/templates/new" class="btn btn-sm btn-primary w-full sm:w-auto">
        <FilePlus size={16} />
        {t("New Template")}
      </a>
    </div>
  {/if}
</div>

{#if data.error}
  <div class="alert alert-error mb-3">
    <span>{data.error}</span>
  </div>
{/if}

<!-- Mobile List -->
<div class="block space-y-3 md:hidden">
  {#each templates as tpl (tpl.id)}
    <a href={`/templates/${tpl.id}`} class="card bg-base-100 border-base-300 border transition-shadow hover:shadow-md">
      <div class="card-body p-4">
        <div class="font-semibold">{tpl.name || tpl.id}</div>
        <div class="mt-1 text-sm opacity-70">
          {t("Active version")}
          {tpl.activeVersionNumber || 1} · {tpl.versionCount || 1}
          {t("Versions")}
        </div>
      </div>
    </a>
  {/each}
</div>

<!-- Desktop Table -->
<div class="rounded-box bg-base-100 border-base-300 hidden overflow-x-auto border md:block">
  <table class="table-zebra table w-full text-sm">
    <thead class="bg-base-200 text-base-content">
      <tr class="font-medium">
        <th>{t("Name")}</th>
        <th>{t("Description")}</th>
        <th>{t("Versions")}</th>
      </tr>
    </thead>
    <tbody>
      {#each templates as tpl (tpl.id)}
        <tr class="hover">
          <td>
            <a class="link" href={`/templates/${tpl.id}`}>{tpl.name || tpl.id}</a>
          </td>
          <td class="opacity-70">{tpl.description || ""}</td>
          <td><span class="badge badge-ghost">v{tpl.activeVersionNumber || 1}</span> <span class="text-xs opacity-60">/ {tpl.versionCount || 1}</span></td>
        </tr>
      {/each}
      {#if templates.length === 0}
        <tr>
          <td colspan="3" class="py-10 text-center text-sm opacity-70">
            {t("No templates found.")}
          </td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>
