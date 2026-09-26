// Run: node --experimental-default-type=module tests/recipe-preferences.test.js
import catalog from "../recipe.json" with { type: "json" };
import { matchRecipes } from "../supabase/functions/_shared/recipe-matcher.js";
import { cleanIngredients, passesRecipeFilters, loadFavorites, saveFavorites } from "../recipe-preferences.js";

function check(value, message) { if (!value) throw new Error(message); }
function mustThrow(fn) { let caught = false; try { fn(); } catch { caught = true; } check(caught, "Expected rejection"); }
mustThrow(() => cleanIngredients(["123"]));
mustThrow(() => cleanIngredients(["!!!"]));
const corrected = cleanIngredients([" Tomatoes ", "tomato", "", "  garlic  "]);
check(corrected.length === 2, "Ingredient edits not normalized or deduplicated");
mustThrow(() => cleanIngredients(["a".repeat(201)]));
mustThrow(() => cleanIngredients(Array.from({length:101}, (_, i) => `food${String.fromCharCode(65 + Math.floor(i/26))}${String.fromCharCode(65+i%26)}`)));
const pasta = catalog.find(recipe => recipe.id === "tomato-garlic-pasta");
const readyPasta = matchRecipes([pasta], pasta.ingredients.map(item => item.name))[0];
const missingPasta = matchRecipes([pasta], ["tomato"])[0];
check(passesRecipeFilters(readyPasta, {readiness:"ready"}), "Fully stocked recipe excluded");
check(!passesRecipeFilters(missingPasta, {readiness:"ready"}), "Missing staples accepted as ready");
check(!passesRecipeFilters(readyPasta, {readiness:"missing"}), "Ready recipe needs groceries");
check(passesRecipeFilters(readyPasta, {diet:"vegan", cuisine:"Italian"}), "Combined diet/cuisine failed");
check(!passesRecipeFilters(readyPasta, {allergens:["wheat"]}), "Wheat not excluded");
check(!passesRecipeFilters(readyPasta, {exclusions:["GARLIC"]}), "Ingredient exclusion failed");
check(!passesRecipeFilters(readyPasta, {exclusions:["spaghetti"]}), "Alias exclusion failed");
check(passesRecipeFilters(readyPasta, {exclusions:["ham"]}), "Partial word false exclusion");
const carbonara = matchRecipes(catalog, ["egg"]).find(recipe => recipe.id === "online-carbonara");
check(!passesRecipeFilters(carbonara, {diet:"vegetarian"}), "Meat recipe accepted as vegetarian");
check(!passesRecipeFilters(carbonara, {diet:"dairy-free"}), "Dairy recipe accepted as dairy-free");
check(!passesRecipeFilters({...readyPasta, allergens:undefined}, {allergens:["milk"]}), "Unreviewed allergen data accepted");
const all = matchRecipes(catalog, [], {includeUnmatched:true});
check(all.length === catalog.length && all.every(recipe => recipe.matchCount === 0), "Saved recipes unavailable without receipt");
check(matchRecipes(catalog, []).length === 0, "Default matches changed");
for (const recipe of catalog) {
    check(Array.isArray(recipe.dietary) && Array.isArray(recipe.allergens), "Missing dietary review");
    if (recipe.dietary.includes("vegan")) check(recipe.dietary.includes("vegetarian") && recipe.dietary.includes("dairy-free"), "Inconsistent vegan tags");
    if (recipe.dietary.includes("dairy-free")) check(!recipe.allergens.includes("milk"), "Inconsistent milk tag");
}
const saved = new Map();
const storage = {getItem:key=>saved.get(key)||null, setItem:(key,value)=>saved.set(key,value)};
saveFavorites(storage, "alice", new Set([pasta.id]));
check(loadFavorites(storage, "alice").has(pasta.id), "Favorite not persisted");
check(loadFavorites(storage, "bob").size === 0 && loadFavorites(storage, null).size === 0, "Favorites leaked across accounts");
saveFavorites(storage, "alice", new Set());
check(loadFavorites(storage, "alice").size === 0, "Favorite removal failed");
mustThrow(() => saveFavorites(storage, null, new Set([pasta.id])));
mustThrow(() => saveFavorites({setItem:()=>{throw new Error("quota");}}, "alice", new Set()));
console.log("Recipe edit, filter, dietary metadata and account-scoped favorite checks passed.");
