import { normalizeIngredient } from "./recipe-matcher.js";

const ingredientAbbreviations = {
    // Common grocery shorthand; not an official exhaustive Walmart dictionary.
    "BLKBNS": "BLACK BEANS",
    "PNTOBNS": "PINTO BEANS",
    "KIDNYBNS": "KIDNEY BEANS",
    "GRNBNS": "GREEN BEANS",
    "SWTCRN": "CORN",
    "MIXVEG": "MIXED VEGETABLES",
    "FRZN VEG": "MIXED VEGETABLES",
    "CHKNBRST": "CHICKEN BREAST",
    "CHKNTHGH": "CHICKEN THIGH",
    "BNLS SKNLS": "BONELESS SKINLESS",
    "BNLS": "BONELESS",
    "SKNLS": "SKINLESS",
    "GRNDBEEF": "GROUND BEEF",
    "GRNDTRKY": "GROUND TURKEY",
    "WHLMLK": "WHOLE MILK",
    "SKIM MLK": "SKIM MILK",
    "SHRD CHED": "CHEDDAR",
    "SHRD MOZZ": "MOZZARELLA",
    "SHRD": "SHREDDED",
    "SCRM": "SOUR CREAM",
    "GRKYOG": "GREEK YOGURT",
    "LONG GRN RICE": "LONG GRAIN RICE",
    "LNG GRN RCE": "LONG GRAIN RICE",
    "BASMATI RCE": "BASMATI RICE",
    "PNUTBTR": "PEANUT BUTTER",
    "TOMPSTE": "TOMATO PASTE",
    "TOMSAUCE": "TOMATO SAUCE",
    "CRNSTRCH": "CORNSTARCH",
    "CORN STCH": "CORNSTARCH",
    "SOYSCE": "SOY SAUCE",
    "VEGOIL": "VEGETABLE OIL",
    "CANOLA OIL": "CANOLA OIL",
    "GRND GNGR": "GROUND GINGER",
    "FRSH GNGR": "GINGER",
    "SESAME OIL": "SESAME OIL",
    "CHOW MEIN NDLS": "CHOW MEIN NOODLES",
    "YEL SPLT PEAS": "YELLOW SPLIT PEAS",
    // Additional grocery receipt codes (longest phrases match first).
    "CHRY TOM": "CHERRY TOMATO",
    "GRP TOM": "GRAPE TOMATOES",
    "RED ONN": "RED ONION",
    "YEL ONN": "YELLOW ONION",
    "GRN BELL PPR": "GREEN BELL PEPPER",
    "RED BELL PPR": "RED BELL PEPPER",
    "SWT POT": "SWEET POTATO",
    "GRN BNS": "GREEN BEANS",
    "BLK BNS": "BLACK BEANS",
    "KID BNS": "KIDNEY BEANS",
    "CHCKPEAS": "CHICKPEAS",
    "GRBNZO": "GARBANZO BEANS",
    "R LENTILS": "RED LENTILS",
    "CHKN THGH": "CHICKEN THIGH",
    "CHKN THIGHS": "CHICKEN THIGHS",
    "GRND PORK": "GROUND PORK",
    "GRND CHKN": "GROUND CHICKEN",
    "CND TUNA": "CANNED TUNA",
    "FRM TOFU": "FIRM TOFU",
    "XFRM TOFU": "EXTRA FIRM TOFU",
    "PARM": "PARMESAN",
    "PARM CHS": "PARMESAN",
    "FETA CHS": "FETA CHEESE",
    "GRK YOG": "GREEK YOGURT",
    "GRK YGRT": "GREEK YOGURT",
    "WHL MLK": "WHOLE MILK",
    "ALMD MLK": "ALMOND MILK",
    "OAT MLK": "OAT MILK",
    "COCO MLK": "COCONUT MILK",
    "CRM CHS": "CREAM CHEESE",
    "SPAG": "SPAGHETTI",
    "BASM RICE": "BASMATI RICE",
    "JASM RICE": "JASMINE RICE",
    "BRN RICE": "BROWN RICE",
    "RLD OATS": "ROLLED OATS",
    "FLR TORT": "FLOUR TORTILLA",
    "BRGR BUNS": "BURGER BUNS",
    "SOY SCE": "SOY SAUCE",
    "OYST SCE": "OYSTER SAUCE",
    "SES OIL": "SESAME OIL",
    "RICE VING": "RICE VINEGAR",
    "BLK PPR": "BLACK PEPPER",
    "WHT PPR": "WHITE PEPPER",
    "GRND CUMIN": "GROUND CUMIN",
    "GARL PWD": "GARLIC POWDER",
    "ONN PWD": "ONION POWDER",
    "CINN": "CINNAMON",
    "VAN EXT": "VANILLA EXTRACT",
    "PNUT BTR": "PEANUT BUTTER",
    "TOM PST": "TOMATO PASTE",
    "TOM PASS": "TOMATO PASSATA",
    "BSL": "BASIL",
    "CILANT": "CILANTRO",
    "GARAM MAS": "GARAM MASALA",
    "TURM": "TURMERIC",
    "LMN JCE": "LEMON JUICE",
    "LIME JCE": "LIME JUICE",
    "ORNG JCE": "ORANGE JUICE",
    // Vegetables
    "ZUCC": "ZUCCHINI",
    "ZUCCH": "ZUCCHINI",
    "POT": "POTATO",
    "POTS": "POTATOES",
    "SW POT": "SWEET POTATO",
    "BROCC": "BROCCOLI",
    "BROC": "BROCCOLI",
    "CAUL": "CAULIFLOWER",
    "CAULIF": "CAULIFLOWER",
    "LETT": "LETTUCE",
    "ROM LETT": "ROMAINE LETTUCE",
    "TOM": "TOMATO",
    "TOMS": "TOMATOES",
    "CRRT": "CARROT",
    "ONN": "ONION",
    "GRN ONN": "GREEN ONION",
    "GARL": "GARLIC",
    "BELL PPR": "BELL PEPPER",
    "PPR": "PEPPER",
    "CUC": "CUCUMBER",
    "CUCUM": "CUCUMBER",
    "SPIN": "SPINACH",
    "CABB": "CABBAGE",
    "CEL": "CELERY",
    "MUSH": "MUSHROOM",
    "MSHRM": "MUSHROOM",
    "ASPAR": "ASPARAGUS",
    "AVO": "AVOCADO",
    "AVOC": "AVOCADO",
    "BRSL SPRT": "BRUSSELS SPROUTS",
    // Fruit
    "BAN": "BANANA",
    "BANA": "BANANA",
    "STRAWB": "STRAWBERRY",
    "STRWBRY": "STRAWBERRY",
    "BLUEB": "BLUEBERRY",
    "BLUBRY": "BLUEBERRY",
    "RASPB": "RASPBERRY",
    "RASPBRY": "RASPBERRY",
    "PINEAPL": "PINEAPPLE",
    "WTRMLN": "WATERMELON",
    "LMN": "LEMON",
    // Meat and seafood
    "CHKN": "CHICKEN",
    "CHCKN": "CHICKEN",
    "CHK": "CHICKEN",
    "CHKN BRST": "CHICKEN BREAST",
    "GRND BF": "GROUND BEEF",
    "GRND BEEF": "GROUND BEEF",
    "GRND TRKY": "GROUND TURKEY",
    "BF": "BEEF",
    "PRK": "PORK",
    "TRKY": "TURKEY",
    "BCN": "BACON",
    "SAUS": "SAUSAGE",
    "SLMN": "SALMON",
    "SHRMP": "SHRIMP",
    // Dairy and grains
    "MLK": "MILK",
    "CHS": "CHEESE",
    "CHSE": "CHEESE",
    "CHED": "CHEDDAR",
    "MOZZ": "MOZZARELLA",
    "BTR": "BUTTER",
    "YOG": "YOGURT",
    "YGRT": "YOGURT",
    "CRM": "CREAM",
    "SR CRM": "SOUR CREAM",
    "HVY CRM": "HEAVY CREAM",
    "BRD": "BREAD",
    "WW BRD": "WHOLE WHEAT BREAD",
    "TORT": "TORTILLA",
    "TORTS": "TORTILLAS",
    "NDLS": "NOODLES",
    "FLR": "FLOUR",
    // Pantry
    "EVOO": "EXTRA VIRGIN OLIVE OIL",
    "OLV OIL": "OLIVE OIL",
    "VEG OIL": "VEGETABLE OIL",
    "TOM SCE": "TOMATO SAUCE",
    "CHKN BRTH": "CHICKEN BROTH",
    "BRTH": "BROTH",
    "SCE": "SAUCE",
    "PNUT": "PEANUT",
    "ALMD": "ALMOND"
};

// Foods can still be detected even when no current recipe uses them.
const additionalIngredients = [
    "almond milk",
    "oat milk",
    "coconut milk",
    "chicken broth",
    "vegetable broth",
    "beef broth",
    "sweet potato",
    "eggplant",
    "kale",
    "cabbage",
    "celery",
    "asparagus",
    "cauliflower",
    "brussels sprouts",
    "beet",
    "radish",
    "pumpkin",
    "butternut squash",
    "mango",
    "blueberry",
    "raspberry",
    "pineapple",
    "watermelon",
    "peach",
    "pear",
    "orange",
    "grape",
    "kiwi",
    "ground turkey",
    "ground pork",
    "ground chicken",
    "shrimp",
    "pork",
    "sausage",
    "cream cheese",
    "ricotta",
    "brown rice",
    "quinoa",
    "couscous",
    "flour",
    "kidney beans",
    "pinto beans",
    "edamame",
    "peanut butter",
    "tomato paste",
    "tomato sauce",
    "garlic powder",
    "onion powder",
    "cilantro",
    "rosemary",
    "mint",
    "turmeric",
    "maple syrup",
    "almond",
    "walnut",
    "cashew",
    "peanut",
    "yellow onion"
];

export function expandIngredientAbbreviations(line) {
    // Match longer phrases first; never replace part of a word or product code.
    const terms = Object.keys(ingredientAbbreviations)
        .sort((a, b) => b.length - a.length)
        .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            .replace(/ /g, "\\s+"));
    const pattern = new RegExp(`(^|[^A-Z0-9])(${terms.join("|")})(?=[^A-Z0-9]|$)`, "g");
    return line.replace(pattern, (_match, prefix, abbreviation) =>
        prefix + ingredientAbbreviations[abbreviation.replace(/\s+/g, " ")]
    );
}


// Use recipe names and aliases as the OCR vocabulary, so new catalog entries
// automatically become detectable. Do not use substring/fuzzy food matches.
export function extractReceiptIngredients(text, catalog) {
    if (typeof text !== "string") return [];
    const vocabulary = new Map();
    for (const recipe of catalog) {
        for (const ingredient of recipe.ingredients) {
            for (const term of [ingredient.name, ...ingredient.aliases]) {
                const key = normalizeIngredient(term);
                if (!vocabulary.has(key)) vocabulary.set(key, term);
            }
        }
    }
    for (const name of additionalIngredients) {
        const key = normalizeIngredient(name);
        if (!vocabulary.has(key)) vocabulary.set(key, name);
    }
    const found = new Set();
    for (let line of text.split(/\r?\n/)) {
        if (/\b(TOTAL|SUBTOTAL|TAX|CHANGE|PAYMENT|SAVINGS|DISCOUNT|COUPON|VISA|MASTERCARD|THANK|BALANCE)\b/i.test(line)) continue;
        line = line.toUpperCase()
            // Walmart-style item rows can end with UPC, food flag, price and tax flag.
            .replace(/(?:[$£€]\s*)?\d+[.,]\d{2}\s*[A-Z]{0,2}\s*$/, "")
            .replace(/\s+\d{8,14}(?:\s+[A-Z])?\s*$/, "")
            .replace(/^\s*\d{8,14}\s+/, "")
            .replace(/^\s*(?:GREAT VALUE|GV|MARKETSIDE|FRESHNESS GUARANTEED|FRESHNESS GUAR|FG)\s+/, "");
        // Only split joined GV prefixes when the remaining code is known.
        const compact = line.trim();
        if (compact.startsWith("GV") && ingredientAbbreviations[compact.slice(2)]) line = compact.slice(2);
        line = expandIngredientAbbreviations(line)
            .replace(/ZUCHINN[IT]/g, "ZUCCHINI")
            .replace(/(?:[$£€]\s*)?\d+[.,]\d{2}\s*[A-Z]?\s*$/, "")
            .replace(/^\s*\d+\s*[X*]\s*/, "")
            .replace(/^\s*\d{4,}\s+/, "")
            .replace(/\b(KIRKLAND SIGNATURE|GREAT VALUE|TRADER JOE'?S)\b/g, "");
        const match = vocabulary.get(normalizeIngredient(line));
        if (match) found.add(match.charAt(0).toUpperCase() + match.slice(1));
    }
    return [...found];
}
