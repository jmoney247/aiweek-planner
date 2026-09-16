import { NextRequest, NextResponse } from "next/server";
import { HttpError, err, handleRoute, readJson } from "@/lib/http";
import { requireServiceClient } from "@/lib/db";
import { reportInputSchema, zodMessage } from "@/lib/validation";
import { getSessionUser } from "@/lib/server-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/reports — file a moderation report (session required).
 *   body: { target_type: "comment" | "user", target_id: UUID, reason?: string }
 *   -> 201 { report: { id, target_type, target_id } }
 *   Reports land in the `reports` table (review_state = 'open'); the table
 *   is service-role-only, so reports are only ever written here.
 */

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handleRoute(async () => {
    const session = await getSessionUser(req);
    if (!session) return err(401, "A valid session is required to file a report.");

    const parsed = reportInputSchema.safeParse(await readJson(req));
    if (!parsed.success) return err(400, zodMessage(parsed.error));
    const { target_type, target_id, reason } = parsed.data;

    const sb = requireServiceClient();
    const { data, error } = await sb
      .from("reports")
      .insert({
        target_type,
        target_id,
        reporter_user_id: session.userId,
        reason: reason ?? null,
      })
      .select("id, target_type, target_id")
      .single();
    if (error || !data) throw new HttpError(500, "Could not file report.");

    return NextResponse.json({ report: data }, { status: 201 });
  });
}
