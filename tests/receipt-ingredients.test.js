// Run: node --experimental-default-type=module tests/receipt-ingredients.test.js
import catalog from "../recipe.json" with { type: "json" };
import { matchRecipes } from "../supabase/functions/_shared/recipe-matcher.js";
import { extractReceiptIngredients } from "../supabase/functions/_shared/receipt-ingredients.js";

function ocrAssert(condition, message) { if (!condition) throw new Error(message); }
const receipt = "GREAT VALUE CHICKPEAS 400G 1.25\nTAHINI 250G 4.50\nLMN 0.75\nGARL 0.60\nTOTAL 7.10\nVISA 7.10";
const detected = extractReceiptIngredients(receipt, catalog);
const hummus = matchRecipes(catalog, detected).find(recipe => recipe.id === "lemon-hummus");
ocrAssert(hummus && hummus.matchedMain === 4, "Receipt did not connect to hummus ingredients");
ocrAssert(!detected.some(item => /total|visa/i.test(item)), "Payment text became food");
const chicken = extractReceiptIngredients("CHKN BRST 5.99\nBROCC 2.49\nRICE 16 OZ 1.99", catalog);
ocrAssert(matchRecipes(catalog, chicken).some(recipe => recipe.id === "chicken-broccoli-rice" && recipe.matchedMain === 3), "Abbreviations lost");
const distinctFoods = extractReceiptIngredients("ALMD MLK 2.99\nCHKN BRTH 1.99\nEGGPLANT 2.49", catalog);
ocrAssert(distinctFoods.length === 3, "Additional foods not recognized");
ocrAssert(matchRecipes(catalog, distinctFoods).length === 0, "Composite foods matched the wrong recipes");
ocrAssert(extractReceiptIngredients("MOZZ 2.99\nMOZZ 2.99", catalog).length === 1, "Duplicate ingredient");
ocrAssert(extractReceiptIngredients(null, catalog).length === 0, "Invalid OCR input");
for (const recipe of catalog) {
    const lines = recipe.ingredients.map(item => `${item.name.toUpperCase()} 2.99`).join("\n");
    const foods = extractReceiptIngredients(lines, catalog);
    const match = matchRecipes(catalog, foods).find(item => item.id === recipe.id);
    ocrAssert(match && match.additionalIngredients.length === 0, `Catalog/OCR mismatch for ${recipe.id}`);
}
const expandedCatalog = [...catalog, { ingredients: [{ name: "fennel", aliases: ["fennel bulb"] }] }];
ocrAssert(extractReceiptIngredients("FENNEL BULB 2.49", expandedCatalog)[0] === "Fennel bulb", "New catalog ingredient needs hardcoded OCR changes");
console.log("OCR checks passed: receipts, aliases, false matches, duplicates, all catalog ingredients, dynamic vocabulary.");

const extraCodes = extractReceiptIngredients("GRK YOG 3.99\nCHRY TOM 2.99\nPARM CHS 4.99\nSOY SCE 1.99\nPNUT BTR 2.99\nGARL PWD 1.99", catalog);
ocrAssert(extraCodes.length === 6, "Long receipt phrases were not expanded");
ocrAssert(extraCodes.some(item => /peanut butter/i.test(item)), "Peanut butter split into butter");
ocrAssert(extractReceiptIngredients("BLK PPR123 2.99\nTOTAL PARM 3.99", catalog).length === 0, "Product code or total falsely recognized");
ocrAssert(extractReceiptIngredients("BLUEBERRIES 2.99\nQUINOA 3.99\nEDAMAME 2.99", catalog).length === 3, "Expanded food vocabulary missing");

const walmartFoods = extractReceiptIngredients([
    'GV BLKBNS 0078742000001 F 0.88 X',
    'GV CHKNTHGH 0078742000002 F 7.98 N',
    'GV SOYSCE 0078742000003 F 1.58 X',
    'GV CRNSTRCH 0078742000004 F 1.25 X',
    'GVBLKBNS 0078742000005 F 0.88 X',
    'GV PAPER TOWELS 0078742000006 4.99 X',
    'SUBTOTAL 17.57'
].join('\n'), catalog);
ocrAssert(walmartFoods.length === 4, 'Walmart UPCs, prefixes or flags prevented matching');
ocrAssert(matchRecipes(catalog, walmartFoods).some(recipe => recipe.id === 'online-kung-pao'), 'Chinese recipes not linked to Walmart OCR');
const indianFoods = extractReceiptIngredients('GV CHKNTHGH 0078742000002 F 7.98 X\nGRK YOG 2.99\nGARAM MAS 3.99\nTURM 1.99', catalog);
ocrAssert(matchRecipes(catalog, indianFoods).some(recipe => recipe.id === 'online-butter-chicken' && recipe.matchCount >= 4), 'Indian recipe OCR linkage failed');
ocrAssert(extractReceiptIngredients('GV UNKNOWN123 0078742000001 F 2.99 X', catalog).length === 0, 'Unknown Walmart codes were guessed');
