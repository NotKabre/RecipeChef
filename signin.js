import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const signinForm = document.getElementById("signinForm");
const googleButton = document.getElementById("googleButton");
const createAccount = document.getElementById("createAccount");
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
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        window.location.replace("cooking.html");
    }
}

signinForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!supabase) return;

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    setLoading(signinButton, true, "Signing in...");
    showMessage("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        showAuthError(error);
        setLoading(signinButton, false);
        return;
    }

    window.location.assign("cooking.html");
});

googleButton.addEventListener("click", async () => {
    if (!supabase) return;

    setLoading(googleButton, true, "Opening Google...");
    showMessage("");

    const redirectTo = new URL("signin.html", window.location.href).href;
    const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo }
    });

    if (error) {
        showAuthError(error);
        setLoading(googleButton, false);
    }
});

createAccount.addEventListener("click", async (event) => {
    event.preventDefault();

    if (!supabase) return;

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        showMessage(
            "Enter an email and password first, then click Create one.",
            true
        );
        return;
    }

    setLinkLoading(true);
    showMessage("");

    const emailRedirectTo = new URL("signin.html", window.location.href).href;
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo }
    });

    if (error) {
        showAuthError(error);
        setLinkLoading(false);
        return;
    }

    if (data.session) {
        window.location.assign("cooking.html");
        return;
    }

    showMessage("Account created. Check your email to confirm your address.");
    setLinkLoading(false);
});

function showAuthError(error) {
    const message = error.message.toLowerCase();

    if (message.includes("invalid login credentials")) {
        showMessage("The email or password is incorrect.", true);
    } else if (message.includes("already registered")) {
        showMessage("An account with that email already exists.", true);
    } else if (message.includes("password") || message.includes("email")) {
        showMessage(error.message, true);
    } else {
        showMessage("Something went wrong. Please try again.", true);
    }

    console.error("Supabase auth error:", error.message);
}

function showMessage(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("error", isError);
    statusMessage.hidden = !message;
}

function setButtonsDisabled(disabled) {
    signinButton.disabled = disabled;
    googleButton.disabled = disabled;
    createAccount.setAttribute("aria-disabled", String(disabled));
}

function setLoading(button, isLoading, loadingText = "") {
    if (!button.dataset.label) button.dataset.label = button.textContent.trim();
    button.disabled = isLoading;
    button.textContent = isLoading ? loadingText : button.dataset.label;
}

function setLinkLoading(isLoading) {
    createAccount.setAttribute("aria-disabled", String(isLoading));
    createAccount.textContent = isLoading ? "Creating..." : "Create one";
}
