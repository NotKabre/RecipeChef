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
