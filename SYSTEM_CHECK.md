# System check — 2026-09-25

Result: offline checks passed. External links excluded as requested.

Run again on macOS (Python 3 and the built-in JavaScriptCore framework):

```sh
python3 tests/system-check.py
```

This runner evaluates application JavaScript with mocked browser and network
objects. It is not a full browser, image-recognition benchmark, or live API test.

Verified:
- Core app HTML assets, local JavaScript imports, element IDs and JS syntax.
- Recipe catalog structure, cuisine metadata, matching and dietary consistency.
- OCR text normalization, abbreviations, Walmart-format rows and recipe matches.
- Ingredient editing/removal, duplicate handling and local persistence.
- Cuisine, readiness, diet, allergen and ingredient-exclusion filters.
- Favorite persistence, account separation, signout and browsing without a receipt.
- Old AI responses cannot overwrite newer ingredient edits.
- Google sign-in recovers from blocked browser storage.
- AI behavior for signed-out users, network failure, expired sessions, missing
  deployment/key, invalid recipe IDs, successful selection and no matches.
- Successful AI selection preserves the other ingredient matches.

Separately checked: deployment shell syntax and `git diff --check`.

Not verified live:
- Camera permission, photo capture and Tesseract recognition of real images.
- Google OAuth redirects, email delivery and Supabase authentication.
- Supabase CLI bundling and the TypeScript Edge Function runtime.
- OpenAI key validity, model access, billing or real model responses.
- Visual layout and interaction in an actual browser/device.

For the live AI readiness check and deployment steps, see AI_SETUP.md.
