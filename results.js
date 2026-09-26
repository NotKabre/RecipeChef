import { findRecipes, loadCatalog } from "./ai-agent.js";
import { getAuthClient } from "./auth-client.js";
import { matchRecipes } from "./supabase/functions/_shared/recipe-matcher.js";
import { cleanIngredients, passesRecipeFilters, loadFavorites, saveFavorites } from "./recipe-preferences.js";

const ingredientList = document.getElementById("ingredientList");
const emptyMessage = document.getElementById("emptyMessage");
const ingredientStatus = document.getElementById("ingredientStatus");
const generateButton = document.getElementById("generateRecipes");
const recipeStatus = document.getElementById("recipeStatus");
const recipeList = document.getElementById("recipeList");
const signInLink = document.getElementById("recipeSignIn");
const cuisineSelect = document.getElementById("cuisineSelect");
const cuisineFilter = document.getElementById("cuisineFilter");
const collectionSelect = document.getElementById("collectionSelect");
const favoriteStatus = document.getElementById("favoriteStatus");
let ingredients = [];
let catalog = [];
let visibleRecipes = [];
let favoriteIds = new Set();
let userId = null;
let requestId = 0;

try {
    const saved = JSON.parse(localStorage.getItem("receiptIngredients") || "[]");
    ingredients = cleanIngredients(Array.isArray(saved) ? saved.filter(item => typeof item === "string") : []);
} catch {
    ingredientStatus.textContent = "Saved ingredients could not be loaded. Add them below.";
}

function element(tag, text, className) {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
}

function renderRecipe(recipe) {
    const card = element("article", "", "recipe");
    const content = document.createElement("div");
    content.append(
        element("p", `${recipe.minutes} min · ${recipe.servings} servings`, "recipeLabel"),
        element("h4", recipe.title, "recipeTitle"),
        element("span", recipe.course || "Main dish", "recipeCourse"),
        element("p", recipe.description),
        element("p", `${recipe.matchedIngredients.length} of ${recipe.ingredients.length} ingredients found`, "recipeMatch"),
        element("p", `You have: ${recipe.matchedIngredients.join(", ")}`)
    );
    content.append(element("p", recipe.additionalIngredients.length ? `Needs ${recipe.additionalIngredients.length} more ingredients` : "Ready to cook · check quantities", "recipeLabel"));
    const favoriteButton = element("button", favoriteIds.has(recipe.id) ? "Remove favorite" : "Save favorite", "favoriteButton");
    favoriteButton.type = "button";
    favoriteButton.setAttribute("aria-pressed", String(favoriteIds.has(recipe.id)));
    favoriteButton.setAttribute("aria-label", `${favoriteIds.has(recipe.id) ? "Remove" : "Save"} ${recipe.title} ${favoriteIds.has(recipe.id) ? "from" : "to"} favorites`);
    favoriteButton.addEventListener("click", () => toggleFavorite(recipe.id));
    content.append(favoriteButton);
    if (recipe.aiRecommended) content.append(element("p", "AI pick", "recipeLabel"));
    if (recipe.timeNote) content.append(element("p", recipe.timeNote));
    if (recipe.source) {
        content.append(element("p", `${recipe.source.rating}/5 · ${recipe.source.ratingCount} reader ratings on ${recipe.source.name} (checked ${recipe.source.checkedOn})`, "recipeSource"));
        const link = element("a", `Full recipe on ${recipe.source.name} ↗`, "recipeSourceLink");
        const url = new URL(recipe.source.url);
        if (url.protocol === "https:") {
            link.href = url.href;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            content.append(link);
        }
    }
    const details = document.createElement("details");
    details.append(element("summary", recipe.source ? "View ingredients to check" : "View ingredients and steps"), element("h4", "Ingredients"));
    const items = document.createElement("ul");
    recipe.ingredients.forEach(item => items.append(element("li", `${item.quantity} ${item.name}`)));
    details.append(items, element("h4", "Extra ingredients needed"),
        element("p", recipe.additionalIngredients.join(", ") || "None"));
    if (recipe.source) details.append(element("p", "Check the original recipe for quantities, preparation, optional toppings and full cooking instructions."));
    if (recipe.steps.length) details.append(element("h4", "Steps"));
    const steps = document.createElement("ol");
    recipe.steps.forEach(step => steps.append(element("li", step)));
    details.append(steps);
    content.append(details);
    card.append(content);
    return card;
}


function addIngredientRow(value = "") {
    const row = element("div", "", "ingredientRow");
    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    input.maxLength = 200;
    input.placeholder = "Ingredient name";
    input.setAttribute("aria-label", "Ingredient name");
    const remove = element("button", "Remove");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${value || "ingredient"}`);
    remove.addEventListener("click", () => {
        const next = row.nextElementSibling || row.previousElementSibling;
        row.remove();
        (next?.querySelector("input") || document.getElementById("addIngredient")).focus();
        ingredientStatus.textContent = "Press Update ingredients to apply your changes.";
    });
    row.append(input, remove);
    ingredientList.append(row);
    return input;
}

function renderIngredients() {
    ingredientList.replaceChildren();
    ingredients.forEach(addIngredientRow);
    emptyMessage.hidden = ingredients.length > 0;
    emptyMessage.textContent = "No ingredients yet. Add items below or scan a receipt.";
    generateButton.disabled = !ingredients.length;
}

document.getElementById("addIngredient").addEventListener("click", () => {
    if (ingredientList.children.length >= 100) {
        ingredientStatus.textContent = "You can add up to 100 ingredients.";
        return;
    }
    addIngredientRow().focus();
});
document.getElementById("ingredientForm").addEventListener("input", () => {
    generateButton.disabled = ![...ingredientList.querySelectorAll("input")].some(input => input.value.trim());
    ingredientStatus.textContent = "Press Update ingredients to apply your changes.";
});
function findFromEditor() {
    try {
        const nextIngredients = cleanIngredients([...ingredientList.querySelectorAll("input")].map(input => input.value));
        ingredients = nextIngredients;
        try {
            localStorage.setItem("receiptIngredients", JSON.stringify(ingredients));
            ingredientStatus.textContent = "Ingredients updated.";
        } catch {
            ingredientStatus.textContent = "Ingredients updated for this visit. Browser storage is unavailable.";
        }
        renderIngredients();
        return showRecipes();
    } catch (error) { ingredientStatus.textContent = error.message; }
}

document.getElementById("ingredientForm").addEventListener("submit", event => {
    event.preventDefault();
    findFromEditor();
});

function collectionRecipes() {
    if (collectionSelect.value !== "favorites") return visibleRecipes;
    return matchRecipes(catalog, ingredients, { includeUnmatched: true }).filter(recipe => favoriteIds.has(recipe.id));
}

function displayRecipes(recipes) {
    visibleRecipes = recipes;
    refreshCollection();
}

function refreshCollection() {
    const recipes = collectionRecipes();
    const previous = cuisineSelect.value;
    const cuisines = [...new Set(recipes.map(recipe => recipe.cuisine || "Everyday"))].sort();
    const all = element("option", `All cuisines (${recipes.length})`);
    all.value = "all";
    cuisineSelect.replaceChildren(all, ...cuisines.map(cuisine => {
        const option = element("option", cuisine);
        option.value = cuisine;
        return option;
    }));
    cuisineSelect.value = cuisines.includes(previous) ? previous : "all";
    cuisineFilter.hidden = !recipes.length;
    renderCuisineGroups();
}

function renderCuisineGroups() {
    const filters = {
        cuisine: cuisineSelect.value,
        readiness: document.getElementById("readinessSelect").value,
        diet: document.getElementById("dietSelect").value,
        allergens: [...document.querySelectorAll("#allergenFilters input:checked")].map(input => input.value),
        exclusions: document.getElementById("excludeIngredients").value.split(",")
    };
    const recipes = collectionRecipes().filter(recipe => passesRecipeFilters(recipe, filters));
    const groups = new Map();
    for (const recipe of recipes) {
        const cuisine = recipe.cuisine || "Everyday";
        if (!groups.has(cuisine)) groups.set(cuisine, []);
        groups.get(cuisine).push(recipe);
    }
    recipeList.replaceChildren(...[...groups].sort(([a], [b]) => a.localeCompare(b)).map(([cuisine, items]) => {
        const section = document.createElement("section");
        section.className = "cuisineGroup";
        section.setAttribute("aria-label", `${cuisine} recipes`);
        section.append(element("h3", `${cuisine} · ${items.length}`, "cuisineHeading"), ...items.map(renderRecipe));
        return section;
    }));
    document.getElementById("filterStatus").textContent = recipes.length
        ? `${recipes.length} recipes shown.`
        : collectionSelect.value === "favorites" && !userId
            ? "Sign in to view your favorites."
            : collectionSelect.value === "favorites" && !favoriteIds.size
                ? "No favorites yet. Save a recipe from Ingredient matches."
                : "No recipes fit this selection. Adjust the filters or your ingredients.";
}

function toggleFavorite(id) {
    if (!userId) {
        favoriteStatus.textContent = "Sign in to save favorites, then return to this page.";
        return;
    }
    const next = new Set(favoriteIds);
    next.has(id) ? next.delete(id) : next.add(id);
    try {
        saveFavorites(localStorage, userId, next);
        favoriteIds = next;
        favoriteStatus.textContent = "Favorites saved in this browser for your account.";
        refreshCollection();
    } catch {
        favoriteStatus.textContent = "Could not save favorites. Allow browser storage and try again.";
    }
}

function syncFavorites(user) {
    userId = user?.id || null;
    favoriteIds = new Set();
    try {
        favoriteIds = loadFavorites(localStorage, userId);
        favoriteStatus.textContent = userId
            ? "Favorites are saved in this browser for your account."
            : "Sign in to save favorites in this browser.";
    } catch { favoriteStatus.textContent = "Saved favorites could not be read in this browser."; }
    refreshCollection();
}

async function initializeFavorites() {
    let timer;
    try {
        const client = await Promise.race([
            getAuthClient(),
            new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), 8000); })
        ]);
        clearTimeout(timer);
        let authVersion = 0;
        client.auth.onAuthStateChange((_event, session) => {
            authVersion++;
            syncFavorites(session?.user);
        });
        const version = authVersion;
        const { data: { session }, error } = await client.auth.getSession();
        if (error) throw error;
        if (version === authVersion) syncFavorites(session?.user);
    } catch {
        favoriteStatus.textContent = "Sign-in is unavailable. You can still edit ingredients and filter recipes.";
    } finally { clearTimeout(timer); }
}

function aiFailureMessage(reason) {
    const messages = {
        "not-configured": "AI setup is incomplete: save OPENAI_API_KEY in Supabase Edge Function Secrets.",
        "not-deployed": "The AI function is not deployed to this Supabase project.",
        "rate-limited": "The AI provider reported a usage or rate limit. Check API billing and limits, then retry.",
        "provider-unavailable": "The AI provider could not complete the request. Check the Supabase function logs and API configuration.",
        "catalog-mismatch": "The AI response does not match this recipe collection. Refresh the page and redeploy generate-recipes with the latest recipe.json.",
        "connection-failed": "Could not connect to AI. Check your connection and retry.",
        "unavailable": "The AI function returned an error. Check its logs in Supabase and retry."
    };
    return messages[reason] || "AI picks are unavailable. Please retry.";
}

async function showRecipes() {
    const currentRequest = ++requestId;
    if (!ingredients.length) {
        displayRecipes([]);
        recipeStatus.textContent = "Add ingredients to find recipes, or browse your favorites.";
        generateButton.disabled = true;
        recipeList.setAttribute("aria-busy", "false");
        return;
    }
    generateButton.disabled = true;
    signInLink.hidden = true;
    recipeStatus.textContent = "Finding recipes…";
    recipeList.setAttribute("aria-busy", "true");
    try {
        const result = await findRecipes([...ingredients], {
            onMatches: ({ recipes }) => {
                if (currentRequest !== requestId) return;
                displayRecipes(recipes);
                recipeStatus.textContent = "Ingredient matches updated. Checking AI selection…";
            }
        });
        if (currentRequest !== requestId) return;
        signInLink.hidden = !result.signInRequired;
        displayRecipes(result.recipes);
        recipeStatus.textContent = result.source === "ai-catalog"
            ? "AI picks are highlighted. Your filters apply to every recipe."
            : result.signInRequired
                ? "Recipes matched by ingredients. Sign in for AI picks."
                : !result.recipes.length
                    ? "No recipes match these ingredients yet. Check the ingredient names or add more items."
                    : `Recipes matched by ingredients. ${aiFailureMessage(result.reason)}`;
        generateButton.textContent = "Find Recipes Again";
    } catch (error) {
        if (currentRequest === requestId) recipeStatus.textContent = error.message || "Could not find recipes. Try again.";
    } finally {
        if (currentRequest === requestId) {
            generateButton.disabled = !ingredients.length;
            recipeList.setAttribute("aria-busy", "false");
        }
    }
}

for (const id of ["cuisineSelect", "readinessSelect", "dietSelect", "allergenFilters"]) {
    document.getElementById(id).addEventListener("change", renderCuisineGroups);
}
document.getElementById("excludeIngredients").addEventListener("input", renderCuisineGroups);
collectionSelect.addEventListener("change", refreshCollection);
generateButton.addEventListener("click", findFromEditor);
window.addEventListener("storage", event => {
    if (userId && (event.key === null || event.key === `cooklit.favorites.${userId}`)) syncFavorites({ id: userId });
});
if (new URLSearchParams(window.location.search).get("view") === "favorites") collectionSelect.value = "favorites";
renderIngredients();
initializeFavorites();
loadCatalog().then(recipes => {
    catalog = recipes;
    refreshCollection();
    showRecipes();
}).catch(() => { recipeStatus.textContent = "Could not load the recipe collection. Refresh to retry."; });
