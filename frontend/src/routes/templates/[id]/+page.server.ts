import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.authHeader) throw redirect(303, "/login");
  throw redirect(
    303,
    `/settings?section=templates&template=${encodeURIComponent(params.id)}`,
  );
};
