// Run with: node --experimental-default-type=module tests/recipe-matcher.test.js
import catalog from "../recipe.json" with { type: "json" };
import { matchRecipes, normalizeIngredient, selectRecipes } from "../supabase/functions/_shared/recipe-matcher.js";

const passed = [];
function test(name, fn) { fn(); passed.push(name); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function throws(fn) {
    let failed = false;
    try { fn(); } catch { failed = true; }
    assert(failed, "Expected invalid selection to be rejected");
}

test("catalog records are complete and have unique IDs", () => {
    assert(catalog.length >= 29, "Expected starter collection");
    assert(new Set(catalog.map(recipe => recipe.id)).size === catalog.length, "Duplicate recipe IDs");
    for (const recipe of catalog) {
        for (const key of ["id", "title", "description", "category", "cuisine"]) {
            assert(typeof recipe[key] === "string" && recipe[key].trim(), `Missing ${key}`);
        }
        assert(Number.isInteger(recipe.minutes) && recipe.minutes > 0, "Invalid cooking time");
        assert(Number.isInteger(recipe.servings) && recipe.servings > 0, "Invalid servings");
        assert(Array.isArray(recipe.steps), "Missing steps array");
        if (recipe.source) {
            assert(recipe.source.url.startsWith("https://"), "Missing source URL");
            assert(recipe.source.author && recipe.source.name && recipe.source.checkedOn, "Missing attribution");
            assert(recipe.source.rating > 0 && recipe.source.rating <= 5 && recipe.source.ratingCount > 0, "Invalid rating");
        } else {
            assert(recipe.steps.length && recipe.steps.every(step => typeof step === "string" && step.trim()), "Missing steps");
        }
        assert(recipe.ingredients.some(item => !item.pantry), "No main ingredients");
        assert(new Set(recipe.ingredients.map(item => item.name)).size === recipe.ingredients.length, "Duplicate ingredients");
        for (const item of recipe.ingredients) {
            assert(item.name && item.quantity && typeof item.pantry === "boolean", "Invalid ingredient");
            assert(Array.isArray(item.aliases) && item.aliases.every(alias => typeof alias === "string"), "Invalid aliases");
        }
    }
});

test("receipt descriptors, quantities, plurals and aliases match", () => {
    assert(normalizeIngredient("Organic Eggs 12 CT") === "egg", "Egg receipt normalization");
    const matches = matchRecipes(catalog, ["Organic TOMATOES", "Garlic", "PENNE 16 OZ"]);
    assert(matches[0].id === "tomato-garlic-pasta", "Wrong top recipe");
    assert(matches[0].matchedIngredients.length === 3, "Alias or plural missed");
    assert(matches[0].additionalIngredients.includes("1 tablespoon olive oil"), "Pantry oil must be listed as missing");
    assert(matches[0].additionalIngredients.includes("1/4 teaspoon salt"), "Pantry salt must be listed as missing");
});

test("duplicates never inflate ingredient counts", () => {
    const matches = matchRecipes(catalog, ["egg", "EGGS", "egg"]);
    assert(matches.every(recipe => recipe.matchCount === 1), "Duplicate scan inflated match count");
});

test("different foods and partial words are not matches", () => {
    for (const ingredient of ["almond milk", "sweet potato", "chicken broth", "eggplant", "garlic powder"]) {
        assert(matchRecipes(catalog, [ingredient]).length === 0, `False positive: ${ingredient}`);
    }
    assert(!matchRecipes(catalog, ["black pepper"]).some(recipe => recipe.id === "tofu-vegetable-stir-fry"), "Black pepper matched bell pepper");
});

test("empty, unknown and pantry-only scans yield no matches", () => {
    for (const ingredients of [[], ["dragon fruit"], ["salt", "olive oil"]]) {
        assert(matchRecipes(catalog, ingredients).length === 0, "Irrelevant recipe returned");
    }
});

test("every fully stocked recipe reports no missing ingredients", () => {
    for (const recipe of catalog) {
        const match = matchRecipes(catalog, recipe.ingredients.map(item => item.name)).find(item => item.id === recipe.id);
        assert(match && match.additionalIngredients.length === 0, `False missing ingredients in ${recipe.id}`);
        assert(match.matchCount === recipe.ingredients.length, "Wrong count");
    }
});

test("AI selection only resolves distinct stored candidates", () => {
    const matches = matchRecipes(catalog, ["tomato", "egg", "pasta", "garlic"]);
    const ids = matches.slice(0, 3).map(recipe => recipe.id);
    const selected = selectRecipes(matches, ids);
    assert(selected[0] === matches[0], "Recipe content was not resolved from catalog");
    throws(() => selectRecipes(matches, ["invented-recipe", ...ids.slice(1)]));
    throws(() => selectRecipes(matches, [ids[0], ids[0], ids[1]]));
    throws(() => selectRecipes(matches, ids.slice(0, 1)));
    throws(() => selectRecipes(matches, null));
    assert(selectRecipes(matches.slice(0, 1), ids.slice(0, 1)).length === 1, "Single candidate rejected");
});

test("online recipes keep source and cuisine after matching", () => {
    const matches = matchRecipes(catalog, ["egg", "rice", "chicken thigh", "tomato", "ground beef"]);
    for (const id of ["online-carbonara", "online-fried-rice", "online-tikka-masala", "online-cheeseburger"]) {
        const recipe = matches.find(item => item.id === id);
        assert(recipe && recipe.source.url && recipe.cuisine, `Lost metadata for ${id}`);
    }
    assert(new Set(matches.map(recipe => recipe.cuisine)).size > 3, "Cuisine variety lost");
});

console.log(`Passed ${passed.length} recipe repository tests.`);
