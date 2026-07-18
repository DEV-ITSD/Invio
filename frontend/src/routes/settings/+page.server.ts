import type { PageServerLoad, Actions } from "./$types";
import { backendGet, backendDelete, backendPost } from "$lib/backend";
import { fail, redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ locals }) => {
  const auth = locals.authHeader;

  if (!auth) {
    throw redirect(303, "/login");
  }

  // Define fallback defaults
  let settings = {};
  let templates: { id: string; name: string }[] = [];
  let taxDefinitions = [];
  let productCategories = [];
  let productUnits = [];
  let xmlProfiles = [];
  let error = null;

  const [sRes, tRes, taxRes, pcRes, puRes, xpRes] = await Promise.allSettled([
    backendGet("/api/v1/settings", auth),
    backendGet("/api/v1/templates", auth),
    backendGet("/api/v1/tax-definitions", auth),
    backendGet("/api/v1/product-categories", auth),
    backendGet("/api/v1/product-units", auth),
    backendGet("/api/v1/xml-profiles", auth),
  ]);

  settings = sRes.status === "fulfilled" ? sRes.value || {} : {};
  templates = tRes.status === "fulfilled" ? tRes.value || [] : [];
  taxDefinitions = taxRes.status === "fulfilled" ? taxRes.value || [] : [];
  productCategories = pcRes.status === "fulfilled" ? pcRes.value || [] : [];
  productUnits = puRes.status === "fulfilled" ? puRes.value || [] : [];
  xmlProfiles = xpRes.status === "fulfilled" ? xpRes.value || [] : [];

  // Keep localization settings stable even if /settings fetch has transient issues.
  const localization = locals.localization || {};
  const settingsMap = settings as Record<string, unknown>;
  if (!settingsMap.locale && localization.locale)
    settingsMap.locale = localization.locale;
  if (!settingsMap.dateFormat && localization.dateFormat)
    settingsMap.dateFormat = localization.dateFormat;
  if (!settingsMap.numberFormat && localization.numberFormat)
    settingsMap.numberFormat = localization.numberFormat;
  if (!settingsMap.postalCityFormat && localization.postalCityFormat) {
    settingsMap.postalCityFormat = localization.postalCityFormat;
  }

  if (sRes.status === "rejected") {
    error =
      sRes.reason?.message || String(sRes.reason || "Failed to load settings");
  }

  return {
    settings: settingsMap,
    templates,
    taxDefinitions,
    productCategories,
    productUnits,
    xmlProfiles,
    error,
    hasTemplates: templates.length > 0,
  };
};

export const actions: Actions = {
  deleteTemplate: async ({ request, locals, url }) => {
    const data = await request.formData();
    const id = data.get("deleteTemplateId");
    if (!id) return fail(400, { error: "Missing ID" });
    try {
      await backendDelete(`/api/v1/templates/${id}`, locals.authHeader);
    } catch (err) {
      return fail(500, { error: "Failed to delete" });
    }
  },
  updateTemplate: async ({ request, locals }) => {
    const data = await request.formData();
    const id = data.get("updateTemplateId");
    if (!id) return fail(400, { error: "Missing ID" });
    try {
      await backendPost(
        `/api/v1/templates/${id}/update`,
        locals.authHeader,
        {},
      );
    } catch (err) {
      return fail(500, { error: "Failed to update" });
    }
  },
};
