import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const signupForm = document.getElementById("signupForm");
const usernameInput = document.getElementById("username");
const statusMessage = document.getElementById("statusMessage");
const signupButton = signupForm.querySelector("button[type='submit']");

const configIsMissing =
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    SUPABASE_URL.includes("YOUR_PROJECT") ||
    SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");

const supabase = configIsMissing
    ? null
    : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (!supabase) {
    showMessage("Add your Supabase project URL and anon key to supabase-config.js.", true);
    signupButton.disabled = true;
}

signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabase || signupButton.disabled) return;

    const username = usernameInput.value.trim();
    if (!username) {
        showMessage("Enter a username we can call you.", true);
        usernameInput.focus();
        return;
    }

    signupButton.disabled = true;
    signupButton.textContent = "Creating...";
    showMessage("");

    try {
        const { data, error } = await supabase.auth.signUp({
            email: document.getElementById("email").value.trim(),
            password: document.getElementById("password").value,
            options: {
                emailRedirectTo: new URL("signin.html", window.location.href).href,
                data: { username, display_name: username }
            }
        });
        if (error) throw error;

        if (data.session) {
            window.location.assign("cooking.html");
            return;
        }

        signupForm.reset();
        showMessage("Check your email for a confirmation link to finish creating your account. Then sign in.");
    } catch (error) {
        showMessage(error?.message || "Could not create your account. Please try again.", true);
    } finally {
        signupButton.disabled = false;
        signupButton.textContent = "Create Account";
    }
});

function showMessage(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("error", isError);
    statusMessage.hidden = !message;
}
