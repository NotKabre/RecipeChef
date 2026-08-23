const camera = document.getElementById("camera");
const captureBtn = document.getElementById("captureBtn");
const retakeBtn = document.getElementById("retakeBtn");
const useBtn = document.getElementById("useBtn");
const canvas = document.getElementById("canvas");

const scanningScreen = document.getElementById("scanningScreen");
const receiptImage = document.getElementById("receiptImage");
const scanningText = document.querySelector("#scanningScreen p");

let cameraStream = null;


// START CAMERA
async function startCamera() {
    try {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Camera access is not supported in this browser or context.");
        }

        stopCamera();

        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "environment"
            },
            audio: false
        });

        camera.srcObject = cameraStream;
        await camera.play();

    } catch (error) {
        console.error("Camera error:", error.name, error.message);

        if (error.name === "NotAllowedError") {
            alert(
                "Camera permission was blocked. Allow camera access in your browser settings, then refresh."
            );
        }

        else if (error.name === "NotFoundError") {
            alert("No camera was found on this device.");
        }

        else if (error.name === "NotReadableError") {
            alert(
                "Your camera may already be in use by another app or browser tab."
            );
        }

        else {
            alert("Camera error: " + error.message);
        }
    }
}


// CAPTURE RECEIPT
captureBtn.addEventListener("click", () => {

    if (camera.videoWidth === 0 || camera.videoHeight === 0) {
        alert("The camera is still loading. Try again in a moment.");
        return;
    }

    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;

    const context = canvas.getContext("2d");

    context.drawImage(
        camera,
        0,
        0,
        canvas.width,
        canvas.height
    );

    camera.style.display = "none";
    canvas.style.display = "block";

    captureBtn.style.display = "none";
    retakeBtn.style.display = "inline-block";
    useBtn.style.display = "inline-block";
});


// RETAKE RECEIPT
retakeBtn.addEventListener("click", () => {

    canvas.style.display = "none";
    camera.style.display = "block";

    retakeBtn.style.display = "none";
    useBtn.style.display = "none";
    captureBtn.style.display = "inline-block";
});


// USE RECEIPT
useBtn.addEventListener("click", async () => {

    const image = canvas.toDataURL("image/png");

    receiptImage.src = image;

    scanningScreen.classList.add("active");

    if (scanningText) {
        scanningText.textContent = "Preparing OCR...";
    }

    stopCamera();

    try {

        const result = await Tesseract.recognize(
            image,
            "eng",
            {
                logger: progress => {

                    console.log(progress);

                    if (
                        progress.status === "recognizing text" &&
                        typeof progress.progress === "number"
                    ) {

                        const percent = Math.round(
                            progress.progress * 100
                        );

                        if (scanningText) {
                            scanningText.textContent =
                                `Reading receipt: ${percent}%`;
                        }
                    }
                }
            }
        );

        const receiptText = result.data.text;

        console.log("Full OCR text:");
        console.log(receiptText);

        const ingredients = cleanReceiptText(receiptText);

        console.log("Filtered ingredients:");
        console.log(ingredients);

        if (ingredients.length === 0) {

            scanningScreen.classList.remove("active");

            alert(
                "The receipt was read, but no recognized food items were found. Try a clearer photo."
            );

            await restartCamera();

            return;
        }

        localStorage.setItem(
            "receiptIngredients",
            JSON.stringify(ingredients)
        );

        localStorage.setItem(
            "receiptText",
            receiptText
        );

        window.location.href = "results.html";

    } catch (error) {

        console.error("Receipt processing error:", error);

        scanningScreen.classList.remove("active");

        alert(
            "Receipt processing error:\n\n" +
            (error.message || error.name || "Unknown error")
        );

        await restartCamera();
    }
});


// CLEAN OCR TEXT
function cleanReceiptText(text) {

    const ignoreWords = [
        "TOTAL",
        "SUBTOTAL",
        "TAX",
        "CHANGE",
        "CASH",
        "VISA",
        "MASTERCARD",
        "DEBIT",
        "CREDIT",
        "THANK",
        "WELCOME",
        "STORE",
        "BALANCE",
        "AMOUNT",
        "DATE",
        "TIME",
        "RECEIPT",
        "SALE",
        "PAYMENT",
        "CARD",
        "AUTH",
        "APPROVED",
        "CASHIER",
        "REGISTER",
        "TRANSACTION",
        "SAVINGS",
        "DISCOUNT",
        "MEMBER",
        "PHONE",
        "ADDRESS",
        "LOYALTY",
        "SPECIAL",
        "SPECTAL",
        "NET",
        "PRICE",
        "EACH",
        "ITEM",
        "ITEMS"
    ];

    const foodWords = [

        // Vegetables
        "ZUCCHINI",
        "ZUCHINNT",
        "ZUCHINNI",
        "POTATO",
        "POTATOES",
        "BROCCOLI",
        "SPROUT",
        "SPROUTS",
        "LETTUCE",
        "TOMATO",
        "TOMATOES",
        "CARROT",
        "CARROTS",
        "ONION",
        "ONIONS",
        "GARLIC",
        "PEPPER",
        "PEPPERS",
        "CUCUMBER",
        "CUCUMBERS",
        "SPINACH",
        "CABBAGE",
        "CELERY",
        "MUSHROOM",
        "MUSHROOMS",
        "CORN",
        "PEAS",
        "BEANS",
        "ASPARAGUS",
        "CAULIFLOWER",
        "AVOCADO",
        "AVOCADOS",

        // Fruits
        "BANANA",
        "BANANAS",
        "APPLE",
        "APPLES",
        "ORANGE",
        "ORANGES",
        "GRAPE",
        "GRAPES",
        "STRAWBERRY",
        "STRAWBERRIES",
        "BLUEBERRY",
        "BLUEBERRIES",
        "RASPBERRY",
        "RASPBERRIES",
        "MANGO",
        "MANGOES",
        "PINEAPPLE",
        "WATERMELON",
        "LEMON",
        "LEMONS",
        "LIME",
        "LIMES",
        "PEACH",
        "PEACHES",
        "PEAR",
        "PEARS",

        // Protein
        "CHICKEN",
        "BEEF",
        "STEAK",
        "PORK",
        "TURKEY",
        "BACON",
        "SAUSAGE",
        "HAM",
        "SALMON",
        "TUNA",
        "SHRIMP",
        "FISH",
        "EGG",
        "EGGS",
        "TOFU",

        // Dairy
        "MILK",
        "CHEESE",
        "BUTTER",
        "YOGURT",
        "CREAM",
        "MOZZARELLA",
        "CHEDDAR",

        // Bread / grains
        "BREAD",
        "RICE",
        "PASTA",
        "NOODLES",
        "TORTILLA",
        "TORTILLAS",
        "OATS",
        "CEREAL",
        "FLOUR",
        "BAGEL",
        "BAGELS",

        // Pantry
        "OIL",
        "SAUCE",
        "SOUP",
        "BROTH",
        "STOCK",
        "SUGAR",
        "SALT",
        "HONEY",
        "PEANUT",
        "ALMOND",
        "NUTS"
    ];

    if (typeof text !== "string") {
        return [];
    }

    const cleanedLines = text
        .split("\n")

        .map(line =>
            line.trim().toUpperCase()
        )

        .filter(line =>
            line.length > 2
        )

        .filter(line => {
            return !ignoreWords.some(word =>
                line.includes(word)
            );
        })

        .filter(line => {
            return foodWords.some(food =>
                line.includes(food)
            );
        })

        .map(line => {
            return line
                .replace(/\$?\d+\.\d{2}/g, "")
                .replace(/^\d+\s*[xX*]?\s*/, "")
                .replace(/[\\|_*#@]/g, "")
                .replace(/\s+/g, " ")
                .trim();
        })

        .filter(line =>
            line.length > 2
        )

        .map(line =>
            formatIngredientName(line)
        )

        .filter(line =>
            line.length > 0
        );

    return [...new Set(cleanedLines)];
}


// FORMAT INGREDIENT
function formatIngredientName(name) {

    let correctedName = name

        .replace(/ZUCHINNT/g, "ZUCCHINI")

        .replace(/ZUCHINNI/g, "ZUCCHINI")

        .replace(/SPECTAL/g, "")

        .replace(/SPECIAL/g, "")

        .replace(/SHON/g, "")

        .trim();

    return correctedName

        .toLowerCase()

        .split(" ")

        .filter(word =>
            word.length > 0
        )

        .map(word => {
            return word.charAt(0).toUpperCase() +
                word.slice(1);
        })

        .join(" ");
}


// STOP CAMERA
function stopCamera() {

    if (!cameraStream) {
        return;
    }

    cameraStream.getTracks().forEach(track => {
        track.stop();
    });

    cameraStream = null;
}


// RESTART CAMERA
async function restartCamera() {

    canvas.style.display = "none";
    camera.style.display = "block";

    retakeBtn.style.display = "none";
    useBtn.style.display = "none";
    captureBtn.style.display = "inline-block";

    if (scanningText) {
        scanningText.textContent = "Preparing OCR...";
    }

    await startCamera();
}


startCamera();

window.addEventListener("pagehide", stopCamera);
