<script lang="ts">
  import { page } from "$app/state";

  interface Props {
    t: (key: string, params?: Record<string, string | number>) => string;
  }
  let { t }: Props = $props();

  function titleize(slug: string) {
    return slug
      .replace(/[-_]+/g, " ")
      .split(" ")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
  }

  const LABEL_MAP: Record<string, string> = {
    dashboard: "Dashboard",
    invoices: "Invoices",
    products: "Products",
    customers: "Customers",
    users: "Users",
    templates: "Templates",
    settings: "Settings",
    new: "New",
    edit: "Edit",
    html: "HTML",
    pdf: "PDF",
  };

  const ENTITY_RESOURCES = new Set(["invoices", "customers", "products", "users"]);

  let segments = $derived(
    page.url.pathname
      .replace(/(^\/+|\/+?$)/g, "")
      .split("/")
      .filter(Boolean),
  );

  function entityLabel(resource: string): string | undefined {
    const data = page.data as Record<string, any>;
    if (resource === "invoices") {
      return String(data.invoice?.invoiceNumber || "").trim() || undefined;
    }
    if (resource === "customers") {
      return String(data.customer?.name || "").trim() || undefined;
    }
    if (resource === "products") {
      return String(data.product?.name || "").trim() || undefined;
    }
    if (resource === "users") {
      return String(data.userToEdit?.username || "").trim() || undefined;
    }
    return undefined;
  }

  function labelForSegment(segment: string, index: number): string {
    const parent = index > 0 ? segments[index - 1] : "";
    if (ENTITY_RESOURCES.has(parent)) {
      return entityLabel(parent) || titleize(segment);
    }
    return t(LABEL_MAP[segment] || titleize(segment));
  }

  let crumbs = $derived(
    segments.map((seg, idx) => {
      const hrefAcc = "/" + segments.slice(0, idx + 1).join("/");
      const isLast = idx === segments.length - 1;
      return {
        label: labelForSegment(seg, idx),
        href: isLast ? undefined : hrefAcc,
      };
    }),
  );
</script>

{#if segments.length >= 2}
  <div class="breadcrumbs mb-4 text-sm">
    <ul>
      {#each crumbs as c (c.href ?? c.label)}
        <li>
          {#if c.href}
            <a href={c.href}>{c.label}</a>
          {:else}
            <span class="font-medium">{c.label}</span>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}
