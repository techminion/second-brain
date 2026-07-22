# Supabase Auth Configuration (AUTH-01)

> Canonical record of every non-default Supabase Auth setting, per environment. Auth
> configuration lives in the Supabase dashboard (it is not expressible as SQL migrations),
> so this file is the reviewable source of truth the dashboard must match.
> Decision record: [ADR-19](../docs/DECISIONS.md#adr-19--email-confirmation-disabled-for-mvp-signup-password-minimum-8-templates-staged-until-ci-07).
> Spec: [FR-AUTH-1..5](../docs/02_PRD.md#42-authentication--account),
> [09_SECURITY §3](../docs/09_SECURITY.md#3-authentication),
> [03_ARCHITECTURE §6.1](../docs/03_ARCHITECTURE.md#61-authentication).

## Settings

Dashboard paths are relative to the project's **Authentication** section.

| Setting                      | Dashboard location          | Dev (`zkzyfwclvquiargnwgtw`)  | Production (`hqzakxpbxqzxismmgnyn`)             | Why                                                                                                                                                                                                                                           |
| ---------------------------- | --------------------------- | ----------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email provider               | Sign In / Providers → Email | Enabled (default)             | Enabled                                         | FR-AUTH-1                                                                                                                                                                                                                                     |
| Confirm email                | Sign In / Providers → Email | **Off**                       | Off — revisit at launch (ADR-19)                | FR-AUTH-1 acceptance requires a session at signup; Supabase returns none while confirmation is pending                                                                                                                                        |
| Minimum password length      | Sign In / Providers → Email | **8**                         | 8                                               | ADR-19: raised from default 6; length over composition rules                                                                                                                                                                                  |
| Required password characters | Sign In / Providers → Email | None (default)                | None                                            | ADR-19: composition rules add friction, not entropy                                                                                                                                                                                           |
| Site URL                     | URL Configuration           | `http://localhost:3000`       | `https://brain.khaire.dev`                      | Base for email links                                                                                                                                                                                                                          |
| Redirect URLs                | URL Configuration           | `http://localhost:3000/**`    | `https://brain.khaire.dev/**`                   | Allow-list for AUTH-06's `/auth/recovery/callback` and AUTH-07's `/auth/oauth/callback` redirects                                                                                                                                             |
| JWT expiry                   | Sessions                    | 3600 s (default)              | 3600 s                                          | [09_SECURITY §3](../docs/09_SECURITY.md#3-authentication): short-lived access token, refresh-token rotation                                                                                                                                   |
| SMTP                         | Emails → SMTP Settings      | Supabase default (unchanged)  | **Custom SMTP enabled** (`brain@khaire.dev`)    | Default SMTP delivers only to project team addresses, at heavy rate limits; unusable for real users                                                                                                                                           |
| Email templates              | Emails → Templates          | Supabase defaults (unchanged) | [Confirmation and recovery](templates/) applied | Free-tier projects created after 2026-06-03 cannot customize templates on default SMTP ([changelog 46599](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier)); customization unlocks with custom SMTP |
| OAuth providers              | Sign In / Providers         | **Google enabled**            | **Google enabled**                              | FR-AUTH-2                                                                                                                                                                                                                                     |

## Google OAuth flow (AUTH-07)

- Each Google Cloud Web OAuth client redirects to its environment's hosted Supabase
  callback:
  - Dev: `https://zkzyfwclvquiargnwgtw.supabase.co/auth/v1/callback`.
  - Production: `https://hqzakxpbxqzxismmgnyn.supabase.co/auth/v1/callback`.
- Login and signup submit the fixed Google provider to a server action. The action derives
  the request origin with the same fail-closed validation as password recovery and sets
  `redirectTo` to the fixed `/auth/oauth/callback` route; neither value comes from input.
- Supabase uses PKCE. Its verifier is stored only in an ADR-20-hardened HttpOnly,
  SameSite=Lax cookie, then the callback exchanges the returned code into the same
  cookie-backed session before redirecting to `/`.
- Missing, rejected, or misconfigured OAuth credentials return to the fixed
  `/login?error=oauth` state without exposing provider details.

## Password recovery flow (AUTH-06)

- `/forgot-password` calls `resetPasswordForEmail` server-side with the fixed
  `/auth/recovery/callback` redirect; browser JavaScript never receives auth tokens or
  the PKCE verifier (ADR-20).
- The callback supports both Supabase recovery formats: the default dev template returns
  a PKCE `code`, while the staged production template sends `TokenHash` with
  `type=recovery`. Both establish the recovery session in hardened HttpOnly cookies and
  continue to the authenticated `/reset-password` page.
- `/reset-password` verifies the cookie-backed claims before calling `updateUser`; an
  invalid or expired link returns to `/forgot-password` with generic recovery guidance.

## Dev-environment caveats

- **Auth emails only reach project team members' addresses** while on the default SMTP.
  Test the password-reset flow (AUTH-06) with a team email; anything else fails with
  "Email address not authorized".
- Hosted email validation rejects reserved domains (e.g. `@example.com`) at `signUp`.
  Integration tests avoid this by creating users through the service-role admin API
  ([tests/integration/supabase-test-harness.ts](../tests/integration/supabase-test-harness.ts)),
  which also bypasses the confirmation setting — so the harness works regardless of it.

## Verification

Config changes here are live-verified with a disposable signup probe (anon client
`signUp` with a plus-tagged team address, then service-role `deleteUser`):

1. `signUp` with a 7-char password → rejected ("at least 8 characters").
2. `signUp` with a valid password → response contains a **non-null session** and the
   user object (confirmation off).
3. Delete the probe user via the admin API.

Last verified: 2026-07-18 (AUTH-01).

AUTH-07 was live-verified on 2026-07-22:

1. The login action reached `accounts.google.com` with a client ID and the exact hosted
   Supabase callback URI above.
2. Supabase Auth logs recorded provider `google` on `/authorize` and a successful 302
   handoff to the external provider.
3. The PKCE verifier cookie was present with HttpOnly + SameSite=Lax and was absent from
   `document.cookie`.
4. Google account selection/consent was not automated; callback success and hardened
   session-cookie propagation are covered by focused route tests.

CI-07 production configuration was live-verified on 2026-07-22:

1. `https://brain.khaire.dev` is a verified Vercel project domain and serves the
   production application over HTTPS.
2. The hosted Auth configuration uses `https://brain.khaire.dev` as its Site URL and
   `https://brain.khaire.dev/**` as its sole production redirect allow-list entry.
3. Google is enabled with both credential fields populated; the hosted `/authorize`
   endpoint redirects to Google with the exact production Supabase callback above.
4. Custom SMTP is enabled and both hosted email templates are byte-for-byte identical
   to the committed files. Provider-side delivery to a real inbox was not automated.
