<script lang="ts">
  import { getContext } from "svelte";
  import { Upload, Link, Trash2, RefreshCw } from "lucide-svelte";
  import { invalidateAll } from "$app/navigation";
  import TemplateVersionEditor from "./TemplateVersionEditor.svelte";

  let { templates = [], selectedTemplateId = "", previewLocale = "en" } = $props();
  let t = getContext("i18n") as (key: string, params?: any) => string;

  // File Upload
  let uploadBusy = $state(false);
  let uploadErr = $state<string | null>(null);
  let fileInput: HTMLInputElement;

  async function handleUpload(e: SubmitEvent) {
    e.preventDefault();
    uploadErr = null;

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      uploadErr = t("Please select a .zip file");
      return;
    }

    const file = fileInput.files[0];
    if (!file.name.endsWith(".zip")) {
      uploadErr = t("File must be a .zip archive");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      uploadErr = t("File too large (max 5MB)");
      return;
    }

    uploadBusy = true;
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Note: the backend route is /api/v1/templates/upload or /api/templates/upload.
      // The proxy to backend might just use standard endpoint
      const res = await fetch("/api/v1/templates/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(t("Upload failed"));
      fileInput.value = "";
      invalidateAll();
    } catch (e: any) {
      uploadErr = e.message;
    } finally {
      uploadBusy = false;
    }
  }

  // URL Install
  let installUrl = $state("");
  let installBusy = $state(false);
  let installErr = $state<string | null>(null);

  async function handleInstall(e: SubmitEvent) {
    e.preventDefault();
    installErr = null;
    const u = installUrl.trim();
    if (!u) return (installErr = t("Enter a manifest URL"));

    installBusy = true;
    try {
      const res = await fetch("/api/v1/templates/install-from-manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      if (!res.ok) throw new Error(t("Install failed"));
      installUrl = "";
      invalidateAll();
    } catch (e: any) {
      installErr = e.message;
    } finally {
      installBusy = false;
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("Are you sure you want to delete this template?"))) return;
    try {
      const res = await fetch(`/api/v1/templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t("Failed to delete"));
      invalidateAll();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleUpdate(id: string) {
    try {
      const res = await fetch(`/api/v1/templates/${id}/update`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(t("Failed to update"));
      invalidateAll();
    } catch (err: any) {
      alert(err.message);
    }
  }
</script>

<div class="space-y-8">
  <div class="space-y-4">
    <h3 class="text-xl font-semibold">{t("Installed Templates")}</h3>
    {#if templates.length === 0}
      <div class="alert alert-info">
        <span>{t("No custom templates installed.")}</span>
      </div>
    {:else}
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        {#each templates as tmpl (tmpl.id)}
          <div class="card bg-base-200 border-base-300 border">
            <div class="card-body p-4">
              <h4 class="card-title text-base">
                <a class="link link-hover" href={`/settings?section=templates&template=${encodeURIComponent(tmpl.id)}`}>{tmpl.name}</a>
              </h4>
              <p class="text-sm opacity-70">
                Type: <span class="badge badge-sm">{tmpl.templateType || "Unknown"}</span>
              </p>
              <p class="text-xs opacity-60">{t("Active version")} {tmpl.activeVersionNumber || 1} · {tmpl.versionCount || 1} {t("Versions")}</p>
              <div class="card-actions mt-4 justify-end">
                {#if tmpl.updatable && tmpl.templateType === "remote"}
                  <button class="btn btn-sm btn-outline" onclick={() => handleUpdate(tmpl.id)} title={t("Update")}><RefreshCw size={16} /></button>
                {/if}
                <button class="btn btn-sm btn-error btn-outline" disabled={tmpl.isDefault} onclick={() => handleDelete(tmpl.id)} title={t("Delete")}><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if selectedTemplateId}
      <TemplateVersionEditor templateId={selectedTemplateId} {previewLocale} />
    {/if}
  </div>

  <div class="divider"></div>

  <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
    <form onsubmit={handleUpload} class="bg-base-200 rounded-box p-4">
      <h4 class="mb-2 flex items-center gap-2 font-medium">
        <Upload size={18} />
        {t("Upload Template")}
      </h4>
      <div class="form-control">
        <label class="label"
          ><span class="label-text">{t("Select .zip archive")}</span><input bind:this={fileInput} type="file" accept=".zip" class="file-input file-input-bordered mt-2 w-full" /></label
        >
        {#if uploadErr}<span class="label-text-alt text-error mt-1">{uploadErr}</span>{/if}
      </div>
      <button type="submit" class="btn btn-primary mt-4 w-full" disabled={uploadBusy}>
        {uploadBusy ? t("Uploading...") : t("Upload")}
      </button>
    </form>

    <form onsubmit={handleInstall} class="bg-base-200 rounded-box p-4">
      <h4 class="mb-2 flex items-center gap-2 font-medium">
        <Link size={18} />
        {t("Install from URL")}
      </h4>
      <div class="form-control">
        <label class="label"><span class="label-text">{t("Manifest URL")}</span><input type="url" class="input input-bordered mt-2 w-full" bind:value={installUrl} placeholder="https://..." /></label>
        {#if installErr}<span class="label-text-alt text-error mt-1">{installErr}</span>{/if}
      </div>
      <button type="submit" class="btn btn-primary mt-4 w-full" disabled={installBusy}>
        {installBusy ? t("Installing...") : t("Install")}
      </button>
    </form>
  </div>
</div>
