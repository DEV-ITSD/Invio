<script lang="ts">
  import { getContext } from "svelte";
  import { PackagePlus } from "lucide-svelte";
  import { enhance } from "$app/forms";

  let { data, form } = $props();
  let t = getContext("i18n") as (key: string) => string;
</script>

<form method="post" use:enhance>
  <div class="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
    <h1 class="text-2xl font-semibold">{t("Create Product")}</h1>
    <div class="flex w-full items-center gap-2 sm:w-auto">
      <a href="/products" class="btn btn-ghost btn-sm flex-1 sm:flex-none">
        {t("Cancel")}
      </a>
      <button type="submit" class="btn btn-primary btn-sm flex-1 sm:flex-none">
        <PackagePlus size={16} />
        {t("Create Product")}
      </button>
    </div>
  </div>

  {#if form?.error || data.error}
    <div class="alert alert-error mb-4">
      <span>{form?.error || data.error}</span>
    </div>
  {/if}

  <div class="space-y-4">
    <div class="form-control w-full">
      <label class="label pb-1" for="name">
        <span class="label-text">
          {t("Name")} <span class="text-error">*</span>
        </span>
      </label>
      <input type="text" id="name" name="name" class="input input-sm input-bordered w-full" required />
    </div>

    <div class="form-control w-full">
      <label class="label pb-1" for="description">
        <span class="label-text">{t("Description")}</span>
      </label>
      <textarea id="description" name="description" class="textarea textarea-bordered w-full" rows="3"></textarea>
    </div>

    <div class="form-control w-full">
      <label class="label pb-1" for="notes">
        <span class="label-text">{t("Notes")}</span>
      </label>
      <textarea id="notes" name="notes" class="textarea textarea-bordered w-full" rows="3"></textarea>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="form-control w-full">
        <label class="label pb-1" for="unitPrice">
          <span class="label-text">
            {t("Unit Price")} <span class="text-error">*</span>
          </span>
        </label>
        <input type="number" id="unitPrice" name="unitPrice" step="0.01" min="0" class="input input-sm input-bordered w-full" required />
      </div>

      <div class="form-control w-full">
        <label class="label pb-1" for="sku">
          <span class="label-text">{t("SKU")}</span>
        </label>
        <input type="text" id="sku" name="sku" class="input input-sm input-bordered w-full" />
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="form-control w-full">
        <label class="label pb-1" for="unit">
          <span class="label-text">{t("Unit")}</span>
        </label>
        <select id="unit" name="unit" class="select select-sm select-bordered w-full">
          <option value="">{t("Select unit")}</option>
          {#each data.units as u (u.id)}
            <option value={u.code}>{u.name}</option>
          {/each}
        </select>
      </div>

      <div class="form-control w-full">
        <label class="label pb-1" for="category">
          <span class="label-text">{t("Category")}</span>
        </label>
        <select id="category" name="category" class="select select-sm select-bordered w-full">
          <option value="">{t("Select category")}</option>
          {#each data.categories as c (c.id)}
            <option value={c.code}>{c.name}</option>
          {/each}
        </select>
      </div>
    </div>

    {#if data.taxDefinitions && data.taxDefinitions.length > 0}
      <div class="form-control w-full pr-0 sm:w-1/2 sm:pr-2">
        <label class="label pb-1" for="taxDefinitionId">
          <span class="label-text">{t("Tax Definition")}</span>
        </label>
        <select id="taxDefinitionId" name="taxDefinitionId" class="select select-sm select-bordered w-full">
          <option value="">{t("No default tax")}</option>
          {#each data.taxDefinitions as tax (tax.id)}
            <option value={tax.id}>
              {tax.name || tax.code || `${tax.percent}%`} ({tax.percent}%)
            </option>
          {/each}
        </select>
      </div>
    {/if}
  </div>
</form>
