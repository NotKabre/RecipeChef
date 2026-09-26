import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

import { matchRecipes, selectRecipes } from "./supabase/functions/_shared/recipe-matcher.js";

import { getAuthClient } from "./auth-client.js";

let client;
let catalogPromise;

export async function loadCatalog() {
    if (!catalogPromise) {
        catalogPromise = fetch(new URL("./recipe.json", import.meta.url), { cache: "no-cache" })
            .then(response => {
                if (!response.ok) throw new Error("Could not load the recipe collection. Please try again.");
                return response.json();
            })
            .catch(error => { catalogPromise = null; throw error; });
    }
    return catalogPromise;
}

function withTimeout(promise, milliseconds) {
    let timer;
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error("AI connection timed out")), milliseconds);
        })
    ]).finally(() => clearTimeout(timer));
}

// Only the authenticated server function talks to OpenAI. Never put a secret here.
export async function findRecipes(ingredients, { onMatches = () => {} } = {}) {
    if (!Array.isArray(ingredients) || !ingredients.length || ingredients.length > 100 ||
        ingredients.some(item => typeof item !== "string" || !item.trim() || item.length > 200)) {
        throw new Error("Please scan a receipt with 1–100 food items and try again.");
    }
    const catalog = await loadCatalog();
    const candidates = matchRecipes(catalog, ingredients);
    const localResult = { recipes: candidates, source: "ingredient-match" };
    onMatches(localResult);
    if (!candidates.length) return localResult;

    // Show local matches immediately. AI can refine the selection when signed in,
    // but an unavailable CDN, session, or server must not hide usable recipes.
    try {
        if (!client) {
            client = await withTimeout(getAuthClient(), 8000);
        }
        const { data: { session }, error } = await withTimeout(client.auth.getSession(), 8000);
        if (error || !session) return { ...localResult, signInRequired: true };
        const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-recipes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ ingredients }),
            signal: AbortSignal.timeout(65000)
        });
        if (response.status === 401) return { ...localResult, signInRequired: true };
        if (!response.ok) return { ...localResult, reason: response.status === 404 ? "not-deployed" : "unavailable" };
        const data = await response.json();
        if (data.source !== "ai-catalog" || !Array.isArray(data.recipes)) {
            return { ...localResult, reason: ["not-configured", "rate-limited", "provider-unavailable"].includes(data.reason) ? data.reason : "unavailable" };
        }
        // Always display this site's catalog content, even if a deployed server
        // has an older catalog or returns unexpected recipe text.
        let recipes;
        try {
            recipes = selectRecipes(candidates, data.recipes.map(recipe => recipe.id));
        } catch {
            return { ...localResult, reason: "catalog-mismatch" };
        }
        const selectedIds = new Set(recipes.map(recipe => recipe.id));
        return {
            recipes: [
                ...recipes.map(recipe => ({ ...recipe, aiRecommended: true })),
                ...candidates.filter(recipe => !selectedIds.has(recipe.id))
            ],
            source: "ai-catalog"
        };
    } catch {
        return { ...localResult, reason: "connection-failed" };
    }
}
