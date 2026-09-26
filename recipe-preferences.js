import { normalizeIngredient } from "./supabase/functions/_shared/recipe-matcher.js";

export function cleanIngredients(values) {
    const unique = new Map();
    for (const value of values) {
        const name = value.trim().replace(/\s+/g, " ");
        if (!name) continue;
        if (name.length > 200) throw new Error("Each ingredient must be 200 characters or fewer.");
        const normalized = normalizeIngredient(name);
        if (!normalized) throw new Error("Enter an ingredient name, not just numbers or symbols.");
        unique.set(normalized, name);
    }
    if (unique.size > 100) throw new Error("Please keep the list to 100 ingredients or fewer.");
    return [...unique.values()];
}

export function passesRecipeFilters(recipe, { readiness = "all", diet = "all", allergens = [], exclusions = [], cuisine = "all" } = {}) {
    if (cuisine !== "all" && (recipe.cuisine || "Everyday") !== cuisine) return false;
    const ready = recipe.additionalIngredients.length === 0;
    if (readiness === "ready" && !ready) return false;
    if (readiness === "missing" && ready) return false;
    if (diet !== "all" && !recipe.dietary?.includes(diet)) return false;
    // Unreviewed recipes are excluded when allergen exclusions are active.
    if (allergens.length && (!Array.isArray(recipe.allergens) || allergens.some(item => recipe.allergens.includes(item)))) return false;
    const terms = recipe.ingredients.flatMap(item => [item.name, ...item.aliases]).map(normalizeIngredient);
    return !exclusions.some(value => {
        const excluded = normalizeIngredient(value.trim());
        return excluded && terms.some(term => ` ${term} `.includes(` ${excluded} `));
    });
}

export function loadFavorites(storage, userId) {
    if (!userId) return new Set();
    const value = storage.getItem(`cooklit.favorites.${userId}`);
    if (!value) return new Set();
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.some(id => typeof id !== "string")) throw new Error("Saved favorites could not be read.");
    return new Set(parsed);
}

export function saveFavorites(storage, userId, ids) {
    if (!userId) throw new Error("Sign in to save favorites.");
    storage.setItem(`cooklit.favorites.${userId}`, JSON.stringify([...ids]));
}
