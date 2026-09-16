import { NextRequest, NextResponse } from "next/server";
import { err, handleRoute, readJson } from "@/lib/http";
import { requireServiceClient } from "@/lib/db";
import { commentEditSchema, zodMessage } from "@/lib/validation";
import {
  countReplies,
  deleteOwnComment,
  editOwnComment,
  toPublicComment,
  type CommentRow,
} from "@/lib/community";
import { getSessionUser } from "@/lib/server-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/comments/[commentId] — edit your own comment's body.
 *   body: { body (1–2000 chars) }
 *   -> 200 { comment } ; 401 no session ; 403 not the author ; 404 missing.
 *
 * DELETE /api/comments/[commentId] — soft-delete your own comment
 *   (is_deleted = true; the row stays for moderation history).
 *   -> 200 { comment } ; 401 / 403 / 404 as above.
 *
 * Ownership: the session's user_id must equal the row's user_id.
 * The nested task-contract path
 * (./events/[id]/comments/[commentId]/route.ts) verifies the event match
 * and delegates to the handlers below.
 */

async function serialize(sb: ReturnType<typeof requireServiceClient>, row: CommentRow, userId: string) {
  return toPublicComment(row, userId, await countReplies(sb, row.id));
}

export async function handleCommentPatch(
  req: NextRequest,
  commentId: string
): Promise<NextResponse> {
  return handleRoute(async () => {
    const session = await getSessionUser(req);
    if (!session) return err(401, "A valid session is required.");

    const parsed = commentEditSchema.safeParse(await readJson(req));
    if (!parsed.success) return err(400, zodMessage(parsed.error));

    const sb = requireServiceClient();
    const row = await editOwnComment(sb, commentId, session.userId, parsed.data.body);
    return NextResponse.json({ comment: await serialize(sb, row, session.userId) });
  });
}

export async function handleCommentDelete(
  req: NextRequest,
  commentId: string
): Promise<NextResponse> {
  return handleRoute(async () => {
    const session = await getSessionUser(req);
    if (!session) return err(401, "A valid session is required.");

    const sb = requireServiceClient();
    const row = await deleteOwnComment(sb, commentId, session.userId);
    return NextResponse.json({ comment: await serialize(sb, row, session.userId) });
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
): Promise<NextResponse> {
  const { commentId } = await params;
  return handleCommentPatch(req, commentId);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
): Promise<NextResponse> {
  const { commentId } = await params;
  return handleCommentDelete(req, commentId);
}
