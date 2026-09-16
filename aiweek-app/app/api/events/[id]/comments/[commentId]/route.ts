import { NextRequest, NextResponse } from "next/server";
import { HttpError, handleRoute } from "@/lib/http";
import { requireServiceClient } from "@/lib/db";
import { getCommentById } from "@/lib/community";
import { handleCommentDelete, handleCommentPatch } from "../../../../comments/[commentId]/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH|DELETE /api/events/[id]/comments/[commentId]
 *
 * Task-contract variant of the comment edit/delete endpoints. Verifies the
 * comment actually belongs to the event in the path (404 otherwise), then
 * delegates to the canonical handlers in /api/comments/[commentId]/route.ts
 * so ownership rules stay in one place.
 */

async function withEventCheck(
  req: NextRequest,
  eventId: string,
  commentId: string,
  fn: (req: NextRequest, commentId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  return handleRoute(async () => {
    const sb = requireServiceClient();
    const row = await getCommentById(sb, commentId);
    if (!row || row.event_id !== eventId) throw new HttpError(404, "Comment not found.");
    return fn(req, commentId);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
): Promise<NextResponse> {
  const { id, commentId } = await params;
  return withEventCheck(req, id, commentId, handleCommentPatch);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
): Promise<NextResponse> {
  const { id, commentId } = await params;
  return withEventCheck(req, id, commentId, handleCommentDelete);
}
