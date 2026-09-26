import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const signinForm = document.getElementById("signinForm");
const displayNameInput = document.getElementById("displayName");
const googleButton = document.getElementById("googleButton");
const statusMessage = document.getElementById("statusMessage");
const signinButton = signinForm.querySelector("button[type='submit']");

const configIsMissing =
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    SUPABASE_URL.includes("YOUR_PROJECT") ||
    SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");

if (configIsMissing) {
    showMessage(
        "Add your Supabase project URL and anon key to supabase-config.js.",
        true
    );
    setButtonsDisabled(true);
}

const supabase = configIsMissing
    ? null
    : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// OAuth returns to this page. If Supabase restored a session, continue to the app.
if (supabase) {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session) {
            const pendingName = sessionStorage.getItem("cooklit.pendingDisplayName");
            if (pendingName) {
                const { error: profileError } = await supabase.auth.updateUser({
                    data: { display_name: pendingName }
                });
                if (profileError) throw profileError;
                sessionStorage.removeItem("cooklit.pendingDisplayName");
            }
            window.location.replace("cooking.html");
        }
    } catch (error) {
        showAuthError(error);
    }
}

signinForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!supabase) return;

    const displayName = displayNameInput.value.trim();
    if (!displayName) {
        showMessage("Enter the name you want us to call you.", true);
        displayNameInput.focus();
        return;
    }

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    setLoading(signinButton, true, "Signing in...");
    showMessage("");

    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const { error: profileError } = await supabase.auth.updateUser({
            data: { display_name: displayName }
        });
        if (profileError) throw profileError;

        window.location.assign("cooking.html");
    } catch (error) {
        showAuthError(error);
        setLoading(signinButton, false);
    }
});

googleButton.addEventListener("click", async () => {
    if (!supabase) return;

    const displayName = displayNameInput.value.trim();
    if (!displayName) {
        showMessage("Enter the name you want us to call you.", true);
        displayNameInput.focus();
        return;
    }
    setLoading(googleButton, true, "Opening Google...");
    showMessage("");

    try {
        sessionStorage.setItem("cooklit.pendingDisplayName", displayName);
        const redirectTo = new URL("signin.html", window.location.href).href;
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo }
        });
        if (error) throw error;
    } catch (error) {
        try { sessionStorage.removeItem("cooklit.pendingDisplayName"); } catch { /* Storage may be blocked. */ }
        showAuthError(error);
        setLoading(googleButton, false);
    }
});

function showAuthError(error) {
    const errorMessage = error?.message || "Unknown authentication error";
    const message = errorMessage.toLowerCase();

    if (error?.name === "SecurityError" || error?.name === "QuotaExceededError") {
        showMessage("Allow browser storage for this site, then try signing in again.", true);
    } else if (message.includes("invalid login credentials")) {
        showMessage("The email or password is incorrect.", true);
    } else if (message.includes("already registered")) {
        showMessage("An account with that email already exists.", true);
    } else if (message.includes("password") || message.includes("email")) {
        showMessage(errorMessage, true);
    } else {
        showMessage("Something went wrong. Please try again.", true);
    }

    console.error("Supabase auth error:", errorMessage);
}

function showMessage(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("error", isError);
    statusMessage.hidden = !message;
}

function setButtonsDisabled(disabled) {
    signinButton.disabled = disabled;
    googleButton.disabled = disabled;
}

function setLoading(button, isLoading, loadingText = "") {
    const label = button.querySelector("[data-button-label]") || button;
    if (!button.dataset.label) button.dataset.label = label.textContent.trim();
    button.disabled = isLoading;
    button.setAttribute("aria-busy", String(isLoading));
    label.textContent = isLoading ? loadingText : button.dataset.label;
}
