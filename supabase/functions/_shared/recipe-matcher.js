// Conservative matching: known descriptors and plurals are normalized, but
// different foods (milk/almond milk, potato/sweet potato) stay distinct.
const plurals = {
    tomatoes: "tomato", potatoes: "potato", strawberries: "strawberry",
    eggs: "egg", bananas: "banana", apples: "apple", carrots: "carrot",
    onions: "onion", mushrooms: "mushroom", cucumbers: "cucumber",
    lemons: "lemon", avocados: "avocado", tortillas: "tortilla",
    peppers: "pepper", fillets: "fillet", blueberries: "blueberry",
    raspberries: "raspberry", peaches: "peach", pears: "pear", mangoes: "mango",
    oranges: "orange", grapes: "grape", kiwis: "kiwi", beets: "beet",
    radishes: "radish", almonds: "almond", walnuts: "walnut", cashews: "cashew",
    peanuts: "peanut", limes: "lime", thighs: "thigh", breasts: "breast",
    yoghurt: "yogurt"
};

export function normalizeIngredient(value) {
    return value.toLowerCase()
        .replace(/\b\d+(?:[./]\d+)?\s*(?:oz|lb|lbs|g|kg|ml|l|ct|pack)\b/g, " ")
        .replace(/\b\d+(?:[./]\d+)?\b/g, " ")
        .replace(/[^a-z\s]/g, " ")
        .split(/\s+/)
        .filter(word => word && !["organic", "fresh", "frozen", "canned", "diced", "sliced", "chopped", "large", "medium", "small", "boneless", "skinless", "ripe", "shredded"].includes(word))
        .map(word => plurals[word] || word)
        .join(" ");
}

export function matchRecipes(catalog, ingredients, { includeUnmatched = false } = {}) {
    const available = new Set(ingredients.map(normalizeIngredient));
    return catalog.map(recipe => {
        const matched = recipe.ingredients.filter(item =>
            [item.name, ...item.aliases].some(name => available.has(normalizeIngredient(name)))
        );
        const missing = recipe.ingredients.filter(item => !matched.includes(item));
        const mainIngredients = recipe.ingredients.filter(item => !item.pantry);
        const matchedMain = matched.filter(item => !item.pantry).length;
        return {
            ...recipe,
            matchedIngredients: matched.map(item => item.name),
            additionalIngredients: missing.map(item => `${item.quantity} ${item.name}`),
            matchCount: matched.length,
            ingredientCount: recipe.ingredients.length,
            mainCoverage: matchedMain / mainIngredients.length,
            matchedMain,
            missingMain: mainIngredients.length - matchedMain
        };
    })
        // A match on just salt or oil is not a useful recipe recommendation.
        .filter(recipe => includeUnmatched || recipe.matchedMain > 0)
        .sort((a, b) => b.mainCoverage - a.mainCoverage ||
            a.missingMain - b.missingMain || b.matchCount - a.matchCount ||
            a.minutes - b.minutes || a.id.localeCompare(b.id));
}

// Resolve the AI's choices against trusted catalog records. Never accept recipe
// text, unknown IDs, duplicates, or recipes with no ingredient matches from AI.
export function selectRecipes(candidates, ids, limit = 3) {
    if (!Array.isArray(ids)) throw new Error("Invalid recipe selection");
    const unique = [...new Set(ids)];
    if (unique.length !== Math.min(limit, candidates.length) || unique.length !== ids.length) {
        throw new Error("Invalid recipe selection");
    }
    return unique.map(id => {
        const recipe = candidates.find(candidate => candidate.id === id);
        if (!recipe) throw new Error("Unknown recipe selection");
        return recipe;
    });
}
