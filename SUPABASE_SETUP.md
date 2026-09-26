# Supabase Auth setup

1. Create a project at [Supabase](https://supabase.com/dashboard).
2. Open **Project Settings > API** and copy the project URL and anon/publishable key into `supabase-config.js`.
3. In **Authentication > URL Configuration**, set the Site URL to the local or deployed URL that serves this folder. Add the same URL ending in `/signin.html` to Redirect URLs.
4. Email/password login works after those values are saved. Supabase requires email confirmation by default; you can change that under **Authentication > Providers > Email**.
5. For Google login, enable Google under **Authentication > Providers > Google**, then add the Google client ID and secret. In Google Cloud, use the callback URL shown by Supabase (normally `https://YOUR_PROJECT.supabase.co/auth/v1/callback`) as an authorized redirect URI.

Serve the project over HTTP instead of opening the HTML with a `file://` URL. For example, from the `Practice 1` folder run:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/signin.html` and add that exact URL to the Supabase redirect allow list.

## Password reset with an email code

If the page reports a connection error (previously "Failed to fetch"), check that
the project is active in the Supabase dashboard and copy its exact Project URL
and matching publishable key into `supabase-config.js`. A project hostname that
does not resolve cannot receive password reset requests; changing the email
template will not fix that connection problem.

The sign-in page links to `forgot-password.html`. Users request a recovery code,
verify it, then open `change-password.html` to save a new password. The verified
recovery credentials are kept in sessionStorage for this tab so navigation and
refresh work until the session expires. They are cleared after a successful reset.
Passwords are saved through Supabase Auth and are never stored in browser storage.

Before using this flow, open **Authentication > Email Templates > Reset Password**
in your Supabase dashboard. Replace the email body with the contents of
[`email-templates/reset-password.html`](email-templates/reset-password.html) and save.
The `{{ .Token }}` variable inserts Supabase's verification code. The default reset
link alone will not work with this code-entry page.

See [Supabase's email template documentation](https://supabase.com/docs/guides/auth/auth-email-templates).
Email delivery must also be configured for your intended users; use custom SMTP
if your project's built-in sender restricts recipients.

To check the complete flow with a test account:
1. Open Sign In > Forgot password, enter the account email, and request a code.
2. Try an incorrect code and confirm the password fields stay hidden.
3. Enter the emailed code and confirm the separate Change Password page opens.
4. Try mismatched passwords, then save matching passwords that satisfy the project's password policy.
5. Sign in with the new password and confirm the old password no longer works.
6. Check resend-code and expired-code behavior.
