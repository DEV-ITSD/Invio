<script lang="ts">
  import { getContext } from "svelte";
  import { ArrowLeft, Check, Code2, Copy, Eye, History, RotateCcw, Trash2 } from "lucide-svelte";

  let { data, form } = $props();
  let t = getContext("i18n") as (key: string) => string;
  let versions = $derived(data.versions || []);
  let activeId = $derived(data.template?.activeVersionId || "");
  let selectedId = $state("");
  let compareA = $state("");
  let compareB = $state("");
  let editorHtml = $state("");
  let previewHtml = $state("");
  let previewError = $state("");

  let selected = $derived(versions.find((v: any) => v.id === selectedId) || versions[0]);
  let versionA = $derived(versions.find((v: any) => v.id === compareA) || versions[0]);
  let versionB = $derived(versions.find((v: any) => v.id === compareB) || versions[1] || versions[0]);
  let linesA = $derived(String(versionA?.html || "").split("\n"));
  let linesB = $derived(String(versionB?.html || "").split("\n"));
  let maxLines = $derived(Math.max(linesA.length, linesB.length));

  $effect(() => {
    if (!selectedId && versions.length) selectedId = activeId || versions[0].id;
    if (!compareA && versions.length) compareA = versions[0].id;
    if (!compareB && versions.length) compareB = versions[1]?.id || versions[0].id;
  });

  $effect(() => {
    if (selected?.html) editorHtml = selected.html;
  });

  $effect(() => {
    const versionId = selectedId;
    if (!versionId || !data.template?.id) return;
    previewError = "";
    fetch(`/api/v1/templates/${data.template.id}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        previewHtml = await response.text();
      })
      .catch((error) => {
        previewError = error?.message || String(error);
      });
  });
</script>

<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
  <div>
    <a href="/templates" class="btn btn-ghost btn-sm mb-2 -ml-2"><ArrowLeft size={16} /> {t("Templates")}</a>
    <h1 class="text-2xl font-semibold">{data.template?.name || t("Template editor")}</h1>
    <p class="text-sm opacity-60">{t("Every save creates a new immutable version.")}</p>
  </div>
  {#if data.template}
    <div class="badge badge-primary badge-lg gap-1"><History size={14} /> {t("Active version")} {data.template.activeVersionNumber}</div>
  {/if}
</div>

{#if data.error || form?.error}
  <div class="alert alert-error mb-4"><span>{data.error || form?.error}</span></div>
{/if}
{#if form?.success}
  <div class="alert alert-success mb-4"><Check size={18} /><span>{t("Template version updated successfully.")}</span></div>
{/if}

{#if data.template}
  <div class="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
    <section class="card bg-base-100 border-base-300 border">
      <div class="card-body p-4 md:p-6">
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
              <form method="POST" action="?/activate">
                <input type="hidden" name="versionId" value={selected.id} />
                <button class="btn btn-sm" type="submit"><Check size={15} /> {t("Activate")}</button>
              </form>
            {/if}
            {#if selected}
              <form method="POST" action="?/restore">
                <input type="hidden" name="versionId" value={selected.id} />
                <button class="btn btn-sm" type="submit"><RotateCcw size={15} /> {t("Restore as new version")}</button>
              </form>
            {/if}
          </div>
        </div>

        <form method="POST" action="?/saveVersion" class="mt-4 space-y-3">
          <label class="form-control">
            <div class="label"><span class="label-text flex items-center gap-2"><Code2 size={16} /> HTML</span></div>
            <textarea name="html" bind:value={editorHtml} class="textarea textarea-bordered h-[560px] w-full font-mono text-xs leading-5" spellcheck="false" required></textarea>
          </label>
          <label class="form-control">
            <div class="label"><span class="label-text">{t("Change description")}</span></div>
            <input name="changeDescription" class="input input-bordered" maxlength="200" placeholder={t("Describe what changed")} />
          </label>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <label class="label cursor-pointer gap-3"
              ><input class="checkbox checkbox-sm" type="checkbox" name="activate" checked /> <span class="label-text">{t("Activate new version immediately")}</span></label
            >
            <button class="btn btn-primary" type="submit"><Copy size={16} /> {t("Save as new version")}</button>
          </div>
        </form>
      </div>
    </section>

    <div class="space-y-5">
      <section class="card bg-base-100 border-base-300 border">
        <div class="card-body p-4">
          <h2 class="card-title text-base"><Eye size={17} /> {t("Preview")}</h2>
          {#if previewError}<div class="alert alert-error text-sm">{previewError}</div>{/if}
          <iframe title={t("Template preview")} class="border-base-300 h-[610px] w-full rounded border bg-white" srcdoc={previewHtml} sandbox=""></iframe>
        </div>
      </section>

      <section class="card bg-base-100 border-base-300 border">
        <div class="card-body p-4">
          <h2 class="card-title text-base">{t("Version history")}</h2>
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
                      {#if !version.isArchived}
                        <form method="POST" action="?/archive">
                          <input type="hidden" name="versionId" value={version.id} /><button class="btn btn-ghost btn-xs" type="submit">{t("Archive")}</button>
                        </form>
                      {/if}
                      <form method="POST" action="?/deleteVersion" onsubmit={(event) => !confirm(t("Delete this unused version permanently?")) && event.preventDefault()}>
                        <input type="hidden" name="versionId" value={version.id} />
                        <button class="btn btn-ghost btn-xs text-error" type="submit"><Trash2 size={13} /> {t("Delete")}</button>
                      </form>
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
    <div class="card-body p-4 md:p-6">
      <h2 class="card-title text-base">{t("Compare versions")}</h2>
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
