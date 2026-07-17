import { redirect, fail } from "@sveltejs/kit";
import { backendPost } from "$lib/backend";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }

  const hasPerm =
    locals.user.isAdmin ||
    locals.user.permissions?.some(
      (p: any) => p.resource === "customers" && p.action === "create",
    );
  if (!hasPerm) {
    throw redirect(303, "/customers");
  }

  return {};
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!locals.user) {
      throw redirect(303, "/login");
    }

    const form = await request.formData();
    const name = String(form.get("name") || "");
    const contactName = String(form.get("contactName") || "");
    const email = String(form.get("email") || "");
    const phone = String(form.get("phone") || "");
    const address = String(form.get("address") || "");
    const city = String(form.get("city") || "");
    const postalCode = String(form.get("postalCode") || "");
    const taxId = String(form.get("taxId") || "");
    const countryCode = String(form.get("countryCode") || "");
    const customerAbbreviation = String(form.get("customerAbbreviation") || "")
      .trim()
      .toUpperCase();

    if (!name) {
      return fail(400, { error: "Name is required" });
    }
    if (customerAbbreviation && !/^[A-Z0-9]{1,3}$/.test(customerAbbreviation)) {
      return fail(400, {
        error: "Customer abbreviation must contain 1 to 3 letters or numbers",
      });
    }

    let created: any;
    try {
      created = await backendPost("/api/v1/customers", locals.authHeader, {
        name,
        contactName: contactName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        city: city || undefined,
        postalCode: postalCode || undefined,
        taxId: taxId || undefined,
        countryCode: countryCode || undefined,
        customerAbbreviation: customerAbbreviation || undefined,
      });
    } catch (e: any) {
      if (e && typeof e === "object" && "status" in e && "location" in e)
        throw e;
      return fail(400, { error: e.message || String(e) });
    }

    if (created && created.id) {
      throw redirect(303, `/customers/${created.id}`);
    }
    return fail(500, { error: "Failed to read created customer ID" });
  },
};
