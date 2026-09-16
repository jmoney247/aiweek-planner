/**
 * Anonymous session state (client-side hint only).
 * The real session lives in the httpOnly `aiweek_session` cookie; this just
 * records which display name / user id the browser created, so the UI can
 * skip re-asking and mark the user's own comments.
 */
import type { SessionUser } from "@/lib/api";

const KEY = "aiweek_user";

export function getStoredUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionUser;
    return parsed && parsed.id && parsed.display_name ? parsed : null;
  } catch {
    return null;
  }
}

export function storeUser(user: SessionUser): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable — session cookie still works */
  }
}

export function clearStoredUser(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
