# Password-only admin
The admin page now uses a shared server-side password. The previous email login is no longer used by the app.

## Activate
1. In Vercel, open aiweek-planner → Settings → Environment Variables.
2. Add ADMIN_PASSWORD with Joshua's chosen password. Select Production (and Preview if you want to test there). Do not use a NEXT_PUBLIC_ prefix or commit the value to Git.
3. The existing SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL must also be configured server-side.
4. Publish these code changes and redeploy after saving the variable.
5. Open https://knowthehype.com/admin, enter the password, and select Open dashboard.

No admin SQL migration, email confirmation, or auth redirect setup is required for this flow. The previous 0004 migration can remain if already applied; this implementation does not call its RPC or change its permissions.

## Security
- Every analytics request must carry a valid, signed admin cookie before any database query runs.
- The cookie is HttpOnly, Secure in production, SameSite=Strict, limited to /api/admin, and expires after eight hours.
- The signing key is derived from the existing server-only service key and admin password. Changing either invalidates old sessions.
- Login passwords are compared using scrypt and constant-time comparison. Passwords and tokens are not logged or sent in URLs.
- Login/logout require same-origin requests. Login request bodies are limited to 1 KB.
- Five attempts per IP per 15 minutes are allowed per server instance. This in-memory backstop is not a globally shared limit on serverless hosting; add a Vercel Firewall rate limit on POST /api/admin/session for durable edge enforcement.
- This is a shared-password model: anyone with the password can access dashboard totals. It does not verify a personal identity.
- Database tables remain under their existing grants/RLS. Only the authorized server route uses the service-role key. Public visitor profiles do not grant admin access.
- Logout clears the browser cookie; a copied cookie remains valid until expiry or password rotation.
- The dashboard shows event/community aggregate totals, not page-view tracking or a raw database export.

Run node scripts/test-admin-password.cjs and npm run build before publishing.
