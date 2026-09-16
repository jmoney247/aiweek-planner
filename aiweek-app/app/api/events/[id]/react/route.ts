import { NextRequest, NextResponse } from "next/server";
import { handleReactionDelete, handleReactionPost } from "../reactions/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST|DELETE /api/events/[id]/react
 *
 * Alias required by scripts/verify-acceptance.mjs and the client
 * (lib/api.ts): POST { reaction } -> 200 { stats }, DELETE -> 200 { stats }.
 * Delegates to the canonical implementation in ../reactions/route.ts so
 * both paths share session checks, validation, rate limiting, and upsert
 * semantics.
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return handleReactionPost(req, id);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  return handleReactionDelete(req, id);
}
