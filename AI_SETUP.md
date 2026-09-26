# Recipe matching setup

After a receipt scan, the results page automatically calls `ai-agent.js`, which
loads `recipe.json` and immediately displays ingredient matches in the browser.
This works without signing in, an OpenAI key, or a deployed server function.
Serve the project over HTTP so the browser can load the catalog and modules.

For signed-in users, the agent also requests AI selection from the
`generate-recipes` Supabase Edge Function. It resolves the returned recipe IDs
against the local catalog. Receipt images and full receipt text are not sent to
OpenAI. Follow these steps to enable that optional AI selection:

1. Deploy the function from this project using the Supabase CLI so its imported
   catalog and matching module are included:

   ```sh
   supabase login
   supabase functions deploy generate-recipes --project-ref beyztutorxvopftaiflk --no-verify-jwt
   ```

   The function validates every bearer token with Supabase Auth `getUser` before
   matching recipes. `--no-verify-jwt` disables the platform's legacy check,
   while the function's own authentication remains required.
2. For AI selection, add `OPENAI_API_KEY` under your Supabase project's
   **Edge Functions > Secrets**. Keep the key out of browser files and git.
   The OpenAI project needs available API credit. Optionally set `OPENAI_MODEL`
   to another model supporting Responses structured outputs; the default is
   `gpt-4.1-mini`.
3. Serve the site over HTTP, sign in, scan a receipt, and recipes appear automatically.
   Use **Find Recipes Again** to retry selection.
   If you sign in from the results page, return to it using browser history;
   the scanned ingredients remain saved.

If sign-in or the AI service is unavailable, local ingredient matches stay
visible. The page identifies whether AI selected the recipes or they were
ranked by ingredient coverage.
No matches produces an empty state; no receipt disables the button.

Check that cards show stored quantities, extra ingredients and cooking steps.
Test an offline connection, a signed-out session, an unmatched ingredient, and
normal matches. Redeploy after changing `recipe.json` or the matching module.
Before broad public use, configure usage limits to bound AI selection costs.

See [RECIPE_REPOSITORY.md](RECIPE_REPOSITORY.md) for the catalog format and tests.
References: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
and [Supabase user verification](https://supabase.com/docs/reference/javascript/auth-getuser).

## Activation checklist

Deployment configuration is now in `supabase/config.toml`. The handler still
requires a verified signed-in user before it reads ingredients or calls OpenAI.

1. Open your existing Supabase project's **Edge Functions > Secrets**.
2. Save your real key as `OPENAI_API_KEY`. `supabase/functions/.env.example`
   lists the variable names only; it is not where you enter production secrets.
3. Install the Supabase CLI if needed, then run `supabase login` once.
4. From this project, run `sh scripts/deploy-ai.sh`.
5. Publish the updated website files, sign in, scan or enter ingredients, and
   confirm that the results page displays **AI picks are highlighted**.

The deployment script only deploys this function. It does not change your
Supabase database or authentication settings. Running the script requires your
Supabase account to have access to the project in `supabase-config.js`.

Never put a real key anywhere inside a publicly served website folder. Git's
ignore rules prevent accidental commits, but do not prevent static servers from
serving a file. Use the Supabase dashboard for production secrets.

### Test the connection without an AI charge

While signed in on the website, run this in the browser's developer console:

```js
const { getAuthClient } = await import('./auth-client.js');
const client = await getAuthClient();
const { data, error } = await client.functions.invoke('generate-recipes', {
  body: { action: 'status' }
});
console.log(error ? 'Connection failed' : data);
```

A successful response contains `configured: true` and `catalogSize: 29` (or the
current catalog count). This confirms the function is reachable, authentication
works and a key is present. It does not validate the key, provider billing or
model access. A real **AI pick** is the final live integration check.

For failures, the function returns a fallback reason such as `not-configured`,
`rate-limited` or `provider-unavailable`. Inspect the network response and
Supabase function logs; only the provider's HTTP status is logged. Ingredient
matches remain available while AI is offline. The function has not been deployed
or live-tested as part of this local preparation.

Configuration references: [Supabase function configuration](https://supabase.com/docs/guides/functions/function-configuration)
and [server secrets](https://supabase.com/docs/guides/functions/secrets).
