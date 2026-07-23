<script lang="ts">
  import { getContext } from "svelte";
  import { UserPlus } from "lucide-svelte";
  import { enhance } from "$app/forms";

  let { data, form } = $props();
  let t = getContext("i18n") as (key: string) => string;
</script>

<form method="post" use:enhance>
  <div class="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
    <h1 class="text-2xl font-semibold">{t("Create Customer")}</h1>
    <div class="flex w-full items-center gap-2 sm:w-auto">
      <a href="/customers" class="btn btn-ghost btn-sm flex-1 sm:flex-none">
        {t("Cancel")}
      </a>
      <button type="submit" class="btn btn-primary btn-sm flex-1 sm:flex-none">
        <UserPlus size={16} />
        {t("Create Customer")}
      </button>
    </div>
  </div>

  {#if form?.error}
    <div class="alert alert-error mb-4">
      <span>{form?.error}</span>
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
      <label class="label pb-1" for="customerType">
        <span class="label-text">{t("Customer type")}</span>
      </label>
      <select id="customerType" name="customerType" class="select select-sm select-bordered w-full">
        <option value="company">{t("Company customer")}</option>
        <option value="private">{t("Private person")}</option>
      </select>
    </div>

    <div class="form-control w-full">
      <label class="label pb-1" for="customerAbbreviation">
        <span class="label-text">{t("Customer Abbreviation")}</span>
      </label>
      <input type="text" id="customerAbbreviation" name="customerAbbreviation" maxlength="3" pattern="[A-Za-z0-9]+" placeholder="ABC" class="input input-sm input-bordered w-full uppercase" />
      <div class="label pt-1"><span class="label-text-alt">{t("Customer abbreviation help")}</span></div>
    </div>

    <div class="form-control w-full">
      <label class="label pb-1" for="pdfName">
        <span class="label-text">{t("PDF Name")}</span>
      </label>
      <input type="text" id="pdfName" name="pdfName" maxlength="80" placeholder="Muster AG" class="input input-sm input-bordered w-full" />
      <div class="label pt-1"><span class="label-text-alt">{t("PDF name help")}</span></div>
    </div>

    <div class="form-control w-full">
      <label class="label pb-1" for="contactName">
        <span class="label-text">{t("Contact Name")}</span>
      </label>
      <input type="text" id="contactName" name="contactName" class="input input-sm input-bordered w-full" />
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="form-control w-full">
        <label class="label pb-1" for="email">
          <span class="label-text">{t("Email")}</span>
        </label>
        <input type="email" id="email" name="email" class="input input-sm input-bordered w-full" />
      </div>

      <div class="form-control w-full">
        <label class="label pb-1" for="phone">
          <span class="label-text">{t("Phone")}</span>
        </label>
        <input type="text" id="phone" name="phone" class="input input-sm input-bordered w-full" />
      </div>
    </div>

    <div class="form-control w-full">
      <label class="label pb-1" for="supportEmail">
        <span class="label-text">{t("Support Email")}</span>
      </label>
      <input type="email" id="supportEmail" name="supportEmail" class="input input-sm input-bordered w-full" />
    </div>

    <div class="form-control w-full">
      <label class="label pb-1" for="address">
        <span class="label-text">{t("Address")}</span>
      </label>
      <textarea id="address" name="address" class="textarea textarea-bordered w-full" rows="3"></textarea>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="form-control w-full">
        <label class="label pb-1" for="city">
          <span class="label-text">{t("City")}</span>
        </label>
        <input type="text" id="city" name="city" class="input input-sm input-bordered w-full" />
      </div>

      <div class="form-control w-full">
        <label class="label pb-1" for="postalCode">
          <span class="label-text">{t("Postal Code")}</span>
        </label>
        <input type="text" id="postalCode" name="postalCode" class="input input-sm input-bordered w-full" />
      </div>
    </div>

    <div class="form-control w-full">
      <label class="label pb-1" for="taxId">
        <span class="label-text">{t("Tax ID")}</span>
      </label>
      <input type="text" id="taxId" name="taxId" class="input input-sm input-bordered w-full" />
    </div>

    <div class="form-control w-full">
      <label class="label pb-1" for="countryCode">
        <span class="label-text">{t("Country Code (ISO alpha-2)")}</span>
      </label>
      <input type="text" id="countryCode" name="countryCode" placeholder={t("e.g. US, NL, DE")} class="input input-sm input-bordered w-full" />
    </div>
  </div>
</form>
