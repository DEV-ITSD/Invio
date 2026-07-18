import { fail, redirect } from "@sveltejs/kit";
import { backendDelete, backendGet, backendPost } from "$lib/backend";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.authHeader) throw redirect(303, "/login");
  try {
    const [template, versions] = await Promise.all([
      backendGet(`/api/v1/templates/${params.id}`, locals.authHeader),
      backendGet(`/api/v1/templates/${params.id}/versions`, locals.authHeader),
    ]);
    return { template, versions };
  } catch (error: any) {
    return {
      template: null,
      versions: [],
      error: error?.message || String(error),
    };
  }
};

function value(form: FormData, key: string): string {
  return String(form.get(key) || "");
}

export const actions: Actions = {
  saveVersion: async ({ request, params, locals }) => {
    if (!locals.authHeader) throw redirect(303, "/login");
    const form = await request.formData();
    try {
      await backendPost(
        `/api/v1/templates/${params.id}/versions`,
        locals.authHeader,
        {
          html: value(form, "html"),
          changeDescription: value(form, "changeDescription"),
          activate: form.get("activate") === "on",
        },
      );
      return { success: "version-saved" };
    } catch (error: any) {
      return fail(400, { error: error?.message || String(error) });
    }
  },
  activate: async ({ request, params, locals }) => {
    if (!locals.authHeader) throw redirect(303, "/login");
    const form = await request.formData();
    try {
      await backendPost(
        `/api/v1/templates/${params.id}/versions/${value(form, "versionId")}/activate`,
        locals.authHeader,
      );
      return { success: "version-activated" };
    } catch (error: any) {
      return fail(400, { error: error?.message || String(error) });
    }
  },
  restore: async ({ request, params, locals }) => {
    if (!locals.authHeader) throw redirect(303, "/login");
    const form = await request.formData();
    try {
      await backendPost(
        `/api/v1/templates/${params.id}/versions/${value(form, "versionId")}/restore`,
        locals.authHeader,
      );
      return { success: "version-restored" };
    } catch (error: any) {
      return fail(400, { error: error?.message || String(error) });
    }
  },
  archive: async ({ request, params, locals }) => {
    if (!locals.authHeader) throw redirect(303, "/login");
    const form = await request.formData();
    try {
      await backendPost(
        `/api/v1/templates/${params.id}/versions/${value(form, "versionId")}/archive`,
        locals.authHeader,
      );
      return { success: "version-archived" };
    } catch (error: any) {
      return fail(400, { error: error?.message || String(error) });
    }
  },
  deleteVersion: async ({ request, params, locals }) => {
    if (!locals.authHeader) throw redirect(303, "/login");
    const form = await request.formData();
    try {
      await backendDelete(
        `/api/v1/templates/${params.id}/versions/${value(form, "versionId")}`,
        locals.authHeader,
      );
      return { success: "version-deleted" };
    } catch (error: any) {
      return fail(409, { error: error?.message || String(error) });
    }
  },
};
