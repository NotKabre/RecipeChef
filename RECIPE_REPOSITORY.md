# Recipe repository

`recipe.json` is the recipe catalog stored in this project. It contains 29
recipes across breakfast, lunch, dinner, pasta, salads, soup, snacks, and sides.
Add recipes here; there is no separate database or GitHub repository to manage.

Each recipe has a unique `id`, `title`, `description`, `category`, `cuisine`, positive integer
`minutes` and `servings`, an `ingredients` array, and a `steps` array of strings.
For example, an ingredient record looks like:

```json
{
  "name": "tomato",
  "quantity": "3 medium",
  "aliases": ["roma tomato", "cherry tomato"],
  "pantry": false
}
```

Use aliases only for ingredients that can actually fill the same role. Names
are matched after normalizing case, common receipt descriptors, package sizes,
and known plurals. Unknown brand names or abbreviations may need explicit
aliases. Matching is intentionally conservative: almond milk is not milk,
chicken broth is not chicken, and sweet potato is not potato.

Set `pantry` to true for staples such as oil and salt. These are still listed as
missing when absent from the receipt, but they cannot be the only reason a
recipe is recommended. Have at least one non-pantry ingredient in every recipe.
Quantities are recipe requirements, not inferred purchase amounts.

## How selection works

1. The browser loads this catalog after a scan and immediately shows ingredient matches.
   For signed-in users, the server also matches the scanned ingredient names.
2. It ranks recipes by main-ingredient coverage, fewer missing main ingredients,
   total matches, and cooking time. Recipes with no main-ingredient match are omitted.
3. It sends the best 12 candidates to OpenAI, which selects up to three recipe IDs.
4. The server resolves those IDs to the original catalog records. The model cannot
   supply new recipe text, unknown IDs, or duplicate selections.
5. The results page shows stored quantities and steps, matched ingredients, and
   everything still needed. If no recipes match, it displays an empty state.

If OpenAI is unconfigured, unavailable, or returns invalid selections, the server
returns the top ingredient matches and the page labels that fallback. Local matching also works without the server or sign-in. AI selection requires
a deployed server function and a signed-in user.

Redeploy the function after editing the catalog: it is bundled through a JSON
import, so the server never depends on an arbitrary external recipe URL.
See [AI_SETUP.md](AI_SETUP.md) for deployment.

## Tests

With a recent Node.js version that supports JSON import attributes:

```sh
node --experimental-default-type=module tests/recipe-matcher.test.js
```

The tests cover catalog integrity, ranking, receipt aliases, missing staples,
false matches, duplicate scans, empty results, and invalid AI selections.

## Online recipes and cuisines

Nine entries link to highly rated RecipeTin Eats recipes, with source URLs,
author credit, reader rating counts and the date checked. These are linked
recipe records: ingredient facts are stored for matching; full instructions
remain on the publisher's page. Their `steps` arrays are empty. Optional toppings
and accompaniments are described on the source page. `timeNote` records extra
marinating or advance-preparation requirements. Ratings are dated snapshots,
not live popularity rankings.

Every recipe has a cuisine label. Generic recipes use Everyday; adaptations use
an “inspired” label. Results show all matching recipes grouped by cuisine and
provide a cuisine filter. AI selects up to three highlighted picks, while the
rest of the ingredient matches remain visible.

## Receipt OCR integration

The camera now loads `recipe.json` and uses the shared
`receipt-ingredients.js` extractor. Adding an ingredient name or alias to the
catalog automatically adds it to the OCR vocabulary. Receipt abbreviations,
prices, package sizes and selected brand prefixes are cleaned before matching.
The earlier food-word detection remains as a fallback for foods outside the
catalog. Matching is conservative; unknown brands or badly misread words can
still require another photo or a new alias.

Run the receipt integration checks with:

```sh
node --experimental-default-type=module tests/receipt-ingredients.test.js
```

The newest additions are Caprese Salad and French Toast (linked source recipes),
plus Cooklit's Lemon Hummus, Tomato Bruschetta, Sesame Cucumber Noodles and Black
Bean Rice Bowls. Redeploy the server function to include the expanded catalog
in AI selections; browser matching uses the updated catalog immediately.

Each recipe also has a `course`: `Appetizer`, `Main dish`, or `Dessert`.
The results page displays this as a badge below the recipe title, within its
cuisine group. Sweet breakfast recipes are grouped as desserts in this
three-course scheme; the original meal `category` remains available separately.

Receipt support also includes extra produce, plant milks, grains, legumes,
proteins and pantry items that may not have a matching recipe yet. Keep these
in `additionalIngredients` in `receipt-ingredients.js`. Multiword abbreviations
such as `PNUT BTR`, `ALMD MLK`, `PARM CHS` and `CHKN THGH` are expanded before
single-word codes. Recognition does not imply ingredient substitution: almond
milk, dairy milk, chicken broth and chicken remain distinct.

## Ingredient editing, filters, and favorites

The results page supports adding, correcting and removing ingredients. Submit
**Update ingredients** to save the edited list and refresh matching. Empty lists
clear ingredient matches. Duplicate normalized names are merged. A request
version prevents older AI responses from replacing results after a newer edit.

**Ready to cook** means every listed ingredient name matches, including pantry
staples; it does not verify purchased amounts or optional source-page toppings.
**Needs groceries** shows the complementary set. Readiness, cuisine, diet and
ingredient exclusions work together, including in the favorites view.

Recipes have curated `dietary` tags (`vegetarian`, `vegan`, `dairy-free`) and an
`allergens` list. Review these whenever ingredients or aliases change. Unknown
dietary metadata does not pass a diet filter; unknown allergen metadata does not
pass active allergen exclusions. These tags describe listed ingredients, not
cross-contact, every brand, cheese rennet, or optional additions. The page tells
users to check labels and original recipes. Ingredient exclusions also check
aliases using whole words; the allergy checkboxes handle the reviewed allergen
categories.

Signed-in favorites use `cooklit.favorites.<user id>` in localStorage. They are
saved only in that browser and origin, not synced between devices. Signing out
clears the displayed favorites, without deleting the account's saved list. A
storage failure displays an error instead of claiming a recipe was saved. The
landing page links to **My favorites**, which works without scanning again.
A shared lazy auth client is used by results-page favorites and AI selection.

Run the additional behavioral checks with:

```sh
node --experimental-default-type=module tests/recipe-preferences.test.js
```

## Walmart-style receipts and Chinese / Indian additions

The catalog now contains 33 recipes, including linked Kung Pao Chicken, Chicken
Chow Mein, Butter Chicken and Dal, with cuisine, course, dietary and allergen
metadata. Their ingredient names automatically extend the OCR vocabulary.

Receipt cleanup supports separated Great Value/GV and Marketside prefixes,
8–14 digit product-number fields, and trailing price/letter flags. Known joined
codes such as `GVBLKBNS` are supported; unknown joined codes are not guessed.
The abbreviation list is a curated grocery-shorthand list, not an official or
exhaustive Walmart dictionary. Store/product descriptions vary. Use the existing
ingredient editor for unrecognized items; add tested aliases as examples arise.
Synthetic Walmart-format fixtures test the layout handling, not every real
Walmart receipt. Redeploy the function after updating the catalog.
