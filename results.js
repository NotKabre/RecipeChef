const ingredientList = document.getElementById("ingredientList");
const emptyMessage = document.getElementById("emptyMessage");

const savedIngredients = localStorage.getItem("receiptIngredients");

if (savedIngredients) {

    let ingredients = [];

    try {
        const parsedIngredients = JSON.parse(savedIngredients);
        ingredients = Array.isArray(parsedIngredients) ? parsedIngredients : [];
    } catch (error) {
        console.error("Could not read saved ingredients:", error);
        localStorage.removeItem("receiptIngredients");
    }

    if (ingredients.length > 0) {

        emptyMessage.style.display = "none";

        ingredients.forEach(ingredient => {

            const tag = document.createElement("span");

            tag.textContent = ingredient;

            ingredientList.appendChild(tag);

        });

    } else {

        emptyMessage.textContent =
            "No ingredients were detected.";

    }

} else {

    emptyMessage.textContent =
        "No scanned receipt was found.";

}
