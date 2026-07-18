import { redirect, fail } from "@sveltejs/kit";
import { backendGet, backendPut } from "$lib/backend";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals, params }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }

  const hasPerm =
    locals.user.isAdmin ||
    locals.user.permissions?.some(
      (p: any) => p.resource === "customers" && p.action === "update",
    );
  if (!hasPerm) {
    throw redirect(303, `/customers/${params.id}`);
  }

  try {
    const customer = await backendGet(
      `/api/v1/customers/${params.id}`,
      locals.authHeader,
    );
    return { customer };
  } catch (err: any) {
    return {
      error: err.message,
    };
  }
};

export const actions: Actions = {
  default: async ({ request, locals, params }) => {
    if (!locals.user) {
      throw redirect(303, "/login");
    }

    const form = await request.formData();
    const payload = {
      name: String(form.get("name") || ""),
      contactName: String(form.get("contactName") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      address: String(form.get("address") || ""),
      city: String(form.get("city") || ""),
      postalCode: String(form.get("postalCode") || ""),
      taxId: String(form.get("taxId") || ""),
      countryCode: String(form.get("countryCode") || ""),
      customerAbbreviation: String(form.get("customerAbbreviation") || "")
        .trim()
        .toUpperCase(),
      pdfName: String(form.get("pdfName") || "")
        .trim()
        .replace(/ +/g, " "),
    };

    if (!payload.name) return fail(400, { error: "Name is required" });
    if (
      payload.customerAbbreviation &&
      !/^[A-Z0-9]{1,3}$/.test(payload.customerAbbreviation)
    ) {
      return fail(400, {
        error: "Customer abbreviation must contain 1 to 3 letters or numbers",
      });
    }
    if (
      payload.pdfName &&
      (payload.pdfName.length > 80 ||
        !/^[\p{L}\p{N}]+(?:[ -][\p{L}\p{N}]+)*$/u.test(payload.pdfName))
    ) {
      return fail(400, {
        error:
          "PDF name may only contain letters, numbers, spaces, and hyphens",
      });
    }

    try {
      await backendPut(
        `/api/v1/customers/${params.id}`,
        locals.authHeader,
        payload,
      );
    } catch (e: any) {
      if (e && typeof e === "object" && "status" in e && "location" in e)
        throw e;
      return fail(400, { error: e.message || String(e) });
    }
    throw redirect(303, `/customers/${params.id}`);
  },
};
