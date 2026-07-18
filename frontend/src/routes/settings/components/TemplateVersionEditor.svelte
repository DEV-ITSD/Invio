<script lang="ts">
  import { getContext } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { Check, Code2, Copy, Eye, History, RotateCcw, Trash2, X } from "lucide-svelte";

  let { templateId, previewLocale = "en" } = $props();
  let t = getContext("i18n") as (key: string) => string;
  let template = $state<any>(null);
  let versions = $state<any[]>([]);
  let loading = $state(false);
  let busy = $state(false);
  let error = $state("");
  let success = $state("");
  let loadedFor = $state("");
  let selectedId = $state("");
  let compareA = $state("");
  let compareB = $state("");
  let editorHtml = $state("");
  let changeDescription = $state("");
  let activateImmediately = $state(true);
  let previewHtml = $state("");
  let previewError = $state("");

  let activeId = $derived(template?.activeVersionId || "");
  let selected = $derived(versions.find((version) => version.id === selectedId) || versions[0]);
  let versionA = $derived(versions.find((version) => version.id === compareA) || versions[0]);
  let versionB = $derived(versions.find((version) => version.id === compareB) || versions[1] || versions[0]);
  let linesA = $derived(String(versionA?.html || "").split("\n"));
  let linesB = $derived(String(versionB?.html || "").split("\n"));
  let maxLines = $derived(Math.max(linesA.length, linesB.length));

  async function api(path: string, options?: RequestInit) {
    const response = await fetch(path, options);
    if (!response.ok) {
      let message = `${response.status} ${response.statusText}`;
      try {
        const payload = await response.json();
        if (payload?.error) message = payload.error;
      } catch {}
      throw new Error(message);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }

  async function refresh(id = templateId) {
    if (!id) return;
    loading = true;
    error = "";
    try {
      const [nextTemplate, nextVersions] = await Promise.all([api(`/api/v1/templates/${encodeURIComponent(id)}`), api(`/api/v1/templates/${encodeURIComponent(id)}/versions`)]);
      template = nextTemplate;
      versions = nextVersions || [];
      selectedId = nextTemplate.activeVersionId || versions[0]?.id || "";
      compareA = versions[0]?.id || "";
      compareB = versions[1]?.id || versions[0]?.id || "";
    } catch (cause: any) {
      error = cause?.message || String(cause);
    } finally {
      loading = false;
    }
  }

  async function mutate(path: string, options?: RequestInit, message = "") {
    busy = true;
    error = "";
    success = "";
    try {
      await api(path, options);
      success = message;
      await refresh();
      await invalidateAll();
    } catch (cause: any) {
      error = cause?.message || String(cause);
    } finally {
      busy = false;
    }
  }

  async function saveVersion(event: SubmitEvent) {
    event.preventDefault();
    await mutate(
      `/api/v1/templates/${encodeURIComponent(templateId)}/versions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: editorHtml,
          changeDescription,
          activate: activateImmediately,
        }),
      },
      t("Template version updated successfully."),
    );
    changeDescription = "";
  }

  $effect(() => {
    const id = templateId;
    if (id && id !== loadedFor) {
      loadedFor = id;
      void refresh(id);
    }
  });

  $effect(() => {
    if (selected?.html) editorHtml = selected.html;
  });

  $effect(() => {
    const id = template?.id;
    const versionId = selectedId;
    const locale = previewLocale || "en";
    if (!id || !versionId) return;
    previewError = "";
    fetch(`/api/v1/templates/${encodeURIComponent(id)}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId, locale }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        previewHtml = await response.text();
      })
      .catch((cause) => {
        previewError = cause?.message || String(cause);
      });
  });
</script>

<div class="border-primary/30 bg-base-100 rounded-box mt-5 border p-4 md:p-6">
  <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h3 class="text-xl font-semibold">{template?.name || t("Template editor")}</h3>
      <p class="text-sm opacity-60">{t("Every save creates a new immutable version.")}</p>
    </div>
    <div class="flex items-center gap-2">
      {#if template}
        <span class="badge badge-primary gap-1"><History size={14} /> {t("Active version")} {template.activeVersionNumber}</span>
      {/if}
      <a class="btn btn-ghost btn-sm" href="/settings?section=templates" aria-label={t("Close")}><X size={17} /></a>
    </div>
  </div>

  {#if loading}<div class="flex justify-center py-12"><span class="loading loading-spinner loading-lg"></span></div>{/if}
  {#if error}<div class="alert alert-error mb-4"><span>{error}</span></div>{/if}
  {#if success}<div class="alert alert-success mb-4"><Check size={18} /><span>{success}</span></div>{/if}

  {#if template && !loading}
    <div class="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
      <section class="space-y-4">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <label class="form-control min-w-52">
            <div class="label"><span class="label-text">{t("Edit from version")}</span></div>
            <select class="select select-bordered" bind:value={selectedId}>
              {#each versions as version (version.id)}
                <option value={version.id}>v{version.versionNumber}{version.id === activeId ? ` · ${t("Active")}` : ""}{version.isArchived ? ` · ${t("Archived")}` : ""}</option>
              {/each}
            </select>
          </label>
          <div class="flex gap-2">
            {#if selected && selected.id !== activeId && !selected.isArchived}
              <button
                class="btn btn-sm"
                type="button"
                disabled={busy}
                onclick={() => mutate(`/api/v1/templates/${template.id}/versions/${selected.id}/activate`, { method: "POST" }, t("Template version updated successfully."))}
                ><Check size={15} /> {t("Activate")}</button
              >
            {/if}
            {#if selected}
              <button
                class="btn btn-sm"
                type="button"
                disabled={busy}
                onclick={() => mutate(`/api/v1/templates/${template.id}/versions/${selected.id}/restore`, { method: "POST" }, t("Template version updated successfully."))}
                ><RotateCcw size={15} /> {t("Restore as new version")}</button
              >
            {/if}
          </div>
        </div>

        <form onsubmit={saveVersion} class="space-y-3">
          <label class="form-control">
            <div class="label"><span class="label-text flex items-center gap-2"><Code2 size={16} /> HTML</span></div>
            <textarea bind:value={editorHtml} class="textarea textarea-bordered h-[560px] w-full font-mono text-xs leading-5" spellcheck="false" required></textarea>
          </label>
          <label class="form-control">
            <div class="label"><span class="label-text">{t("Change description")}</span></div>
            <input bind:value={changeDescription} class="input input-bordered" maxlength="200" placeholder={t("Describe what changed")} />
          </label>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <label class="label cursor-pointer gap-3"
              ><input class="checkbox checkbox-sm" type="checkbox" bind:checked={activateImmediately} /> <span class="label-text">{t("Activate new version immediately")}</span></label
            >
            <button class="btn btn-primary" type="submit" disabled={busy}><Copy size={16} /> {t("Save as new version")}</button>
          </div>
        </form>
      </section>

      <div class="space-y-5">
        <section class="card bg-base-100 border-base-300 border">
          <div class="card-body p-4">
            <h4 class="card-title text-base"><Eye size={17} /> {t("Preview")}</h4>
            {#if previewError}<div class="alert alert-error text-sm">{previewError}</div>{/if}
            <iframe title={t("Template preview")} class="border-base-300 h-[610px] w-full rounded border bg-white" srcdoc={previewHtml} sandbox=""></iframe>
          </div>
        </section>

        <section class="card bg-base-100 border-base-300 border">
          <div class="card-body p-4">
            <h4 class="card-title text-base">{t("Version history")}</h4>
            <div class="space-y-2">
              {#each versions as version (version.id)}
                <div class="border-base-300 rounded border p-3">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div class="font-medium">
                        v{version.versionNumber}
                        {#if version.id === activeId}<span class="badge badge-primary badge-sm">{t("Active")}</span>{/if}
                        {#if version.isBuiltin}<span class="badge badge-ghost badge-sm">{t("Built-in")}</span>{/if}
                        {#if version.isArchived}<span class="badge badge-warning badge-sm">{t("Archived")}</span>{/if}
                      </div>
                      <div class="text-xs opacity-60">{version.changeDescription || t("No description")} · {new Date(version.createdAt).toLocaleString()}</div>
                    </div>
                    {#if version.id !== activeId && !version.isBuiltin}
                      <div class="flex gap-1">
                        {#if !version.isArchived}<button
                            class="btn btn-ghost btn-xs"
                            type="button"
                            disabled={busy}
                            onclick={() => mutate(`/api/v1/templates/${template.id}/versions/${version.id}/archive`, { method: "POST" })}>{t("Archive")}</button
                          >{/if}
                        <button
                          class="btn btn-ghost btn-xs text-error"
                          type="button"
                          disabled={busy}
                          onclick={() => confirm(t("Delete this unused version permanently?")) && mutate(`/api/v1/templates/${template.id}/versions/${version.id}`, { method: "DELETE" })}
                          ><Trash2 size={13} /> {t("Delete")}</button
                        >
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </section>
      </div>
    </div>

    <section class="card bg-base-100 border-base-300 mt-5 border">
      <div class="card-body p-4">
        <h4 class="card-title text-base">{t("Compare versions")}</h4>
        <div class="grid gap-3 sm:grid-cols-2">
          <select class="select select-bordered" bind:value={compareA}
            >{#each versions as version (version.id)}<option value={version.id}>v{version.versionNumber}</option>{/each}</select
          >
          <select class="select select-bordered" bind:value={compareB}
            >{#each versions as version (version.id)}<option value={version.id}>v{version.versionNumber}</option>{/each}</select
          >
        </div>
        <div class="border-base-300 bg-neutral text-neutral-content grid max-h-[520px] grid-cols-2 overflow-auto rounded border">
          <pre class="m-0 min-w-0 border-r border-white/10 p-3 text-xs leading-5">{#each Array(maxLines) as _, index}<span class={linesA[index] !== linesB[index] ? "bg-error/25 block" : "block"}
                >{String(index + 1).padStart(4, " ")}  {linesA[index] || ""}</span
              >{/each}</pre>
          <pre class="m-0 min-w-0 p-3 text-xs leading-5">{#each Array(maxLines) as _, index}<span class={linesA[index] !== linesB[index] ? "bg-success/25 block" : "block"}
                >{String(index + 1).padStart(4, " ")}  {linesB[index] || ""}</span
              >{/each}</pre>
        </div>
      </div>
    </section>
  {/if}
</div>
