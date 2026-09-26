import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const emailForm = document.getElementById("emailForm");
const codeForm = document.getElementById("codeForm");
const statusMessage = document.getElementById("statusMessage");
const heading = document.getElementById("resetHeading");
const subtitle = document.getElementById("resetSubtitle");
const codeInput = document.getElementById("code");
const resendButton = document.getElementById("resendCode");
const changeEmailButton = document.getElementById("changeEmail");
const buttons = document.querySelectorAll("button");
let recoveryEmail = "";
let busy = false;
let resendAfter = 0;

const configIsMissing = !SUPABASE_URL || !SUPABASE_ANON_KEY
    || SUPABASE_URL.includes("YOUR_PROJECT")
    || SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");

// Keep the recovery session in memory, separate from the site's normal login.
let supabase = configIsMissing ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: "cooklit-password-recovery"
    }
});

if (!supabase) {
    showMessage("Add your Supabase project URL and anon key to supabase-config.js.", true);
    buttons.forEach(button => { button.disabled = true; });
}

emailForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!emailForm.reportValidity()) return;
    const email = document.getElementById("email").value.trim();
    runAction(emailForm.querySelector("button"), "Sending...", async () => {
        await sendCode(email);
        recoveryEmail = email;
        showStep(codeForm, "Check your email.", "Enter the verification code to choose a new password.", codeInput);
        showMessage("If an account exists for that email, a code will arrive shortly. Check your spam folder too.");
    });
});

resendButton.addEventListener("click", () => {
    if (Date.now() < resendAfter) {
        showMessage("Please wait a minute between code requests.", true);
        return;
    }
    runAction(resendButton, "Sending...", async () => {
        await sendCode(recoveryEmail);
        showMessage("If an account exists for that email, another code will arrive shortly. Use the newest code.");
    });
});

changeEmailButton.addEventListener("click", () => {
    if (busy) return;
    recoveryEmail = "";
    codeForm.reset();
    showStep(emailForm, "Forgot password?", "Enter your account email to receive a verification code.", document.getElementById("email"));
    showMessage("");
});

codeForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!recoveryEmail || !codeForm.reportValidity()) return;
    runAction(codeForm.querySelector("button"), "Verifying...", async () => {
        const { data, error } = await supabase.auth.verifyOtp({
            email: recoveryEmail,
            token: codeInput.value.trim(),
            type: "recovery"
        });
        if (error) throw error;
        if (!data.session) throw new Error("Verification failed. Request a new code and try again.");
        sessionStorage.setItem("cooklit.verifiedRecovery", JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at
        }));
        codeForm.reset();
        window.location.assign("change-password.html");
    });
});

async function sendCode(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    resendAfter = Date.now() + 60000;
}

async function runAction(button, label, action) {
    if (!supabase || busy) return;
    busy = true;
    const originalLabel = button.textContent;
    buttons.forEach(item => { item.disabled = true; });
    button.textContent = label;
    showMessage("");
    try {
        await action();
    } catch (error) {
        const message = error?.message || "Something went wrong. Please try again.";
        const isConnectionError = /failed to fetch|fetch failed|networkerror|network request failed|load failed/i.test(message);
        showMessage(isConnectionError
            ? "We couldn't reach the password reset service. Check your internet connection and try again. If this continues, the site's sign-in service may be unavailable."
            : message, true);
        if (isConnectionError) {
            console.error("Cannot reach Supabase. Check the project is active and SUPABASE_URL in supabase-config.js matches the project dashboard.", SUPABASE_URL);
        }
    } finally {
        busy = false;
        buttons.forEach(item => { item.disabled = false; });
        button.textContent = originalLabel;
    }
}

function showStep(form, title, description, focusTarget) {
    [emailForm, codeForm].forEach(item => { item.hidden = item !== form; });
    heading.textContent = title;
    subtitle.textContent = description;
    focusTarget?.focus();
}

function showMessage(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("error", isError);
    statusMessage.hidden = !message;
}
