import { z } from "zod";

/**
 * Zod schemas for every API request body in the community API.
 * Display-name sanitizing (HTML/control-char stripping) lives in
 * lib/server-session.ts and runs after these structural checks.
 */

export const displayNameInputSchema = z.object({
  display_name: z.string(),
});

const commentBody = z
  .string()
  .trim()
  .min(1, "Comment body must not be empty.")
  .max(2000, "Comment body must be at most 2000 characters.");

export const commentInputSchema = z.object({
  body: commentBody,
  // The client sends parent_id: null for top-level comments.
  parent_id: z.string().uuid("parent_id must be a UUID.").nullish(),
});

export const commentEditSchema = z.object({
  body: commentBody,
});

export const reactionInputSchema = z.object({
  reaction: z.enum(["like", "dislike"]),
});

export const reportInputSchema = z.object({
  target_type: z.enum(["comment", "user"]),
  target_id: z.string().uuid("target_id must be a UUID."),
  reason: z.string().trim().max(500, "Reason must be at most 500 characters.").optional(),
});

/** Flatten a ZodError into a single human-readable message. */
export function zodMessage(error: z.ZodError): string {
  const parts = error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  return parts.join("; ") || "Invalid request body.";
}
