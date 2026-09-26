import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const form = document.getElementById("passwordForm");
const button = form.querySelector("button");
const message = document.getElementById("statusMessage");
const recoveryKey = "cooklit.verifiedRecovery";
let ready = false;
let busy = false;
let supabase;

function showMessage(text, error = false) {
    message.textContent = text;
    message.classList.toggle("error", error);
    message.hidden = !text;
}

function requireVerification() {
    ready = false;
    form.hidden = true;
    sessionStorage.removeItem(recoveryKey);
    document.getElementById("restartRecovery").hidden = false;
    showMessage("Please verify a new email code before changing your password.", true);
}

try {
    const session = JSON.parse(sessionStorage.getItem(recoveryKey) || "null");
    if (!session?.access_token || !session?.refresh_token
        || !session.expires_at || session.expires_at * 1000 <= Date.now()) {
        requireVerification();
    } else {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
                storageKey: "cooklit-password-recovery"
            }
        });
        const { error } = await supabase.auth.setSession(session);
        if (error) throw error;
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!data.user) throw new Error("Session is no longer valid.");
        ready = true;
        form.hidden = false;
        document.getElementById("password").focus();
    }
} catch (error) {
    requireVerification();
}

form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!ready || busy || !form.reportValidity()) return;
    const password = document.getElementById("password").value;
    if (password !== document.getElementById("confirmPassword").value) {
        showMessage("The passwords don't match. Please try again.", true);
        document.getElementById("confirmPassword").focus();
        return;
    }
    busy = true;
    button.disabled = true;
    button.textContent = "Saving...";
    showMessage("");
    try {
        // Supabase saves the password on the account for future sign-ins.
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        ready = false;
        form.reset();
        form.hidden = true;
        sessionStorage.removeItem(recoveryKey);
        document.getElementById("resetHeading").textContent = "Password changed.";
        document.getElementById("resetSubtitle").textContent = "Your new password is saved. Use it the next time you sign in.";
        document.querySelector("a[href='signin.html']").focus();
        supabase = null;
    } catch (error) {
        if (error?.status === 401 || error?.status === 403) {
            requireVerification();
        } else {
            const text = error?.message || "Could not save your password. Please try again.";
            showMessage(/failed to fetch|fetch failed|networkerror|load failed/i.test(text)
                ? "We couldn't reach the password reset service. Check your connection and try again."
                : text, true);
        }
    } finally {
        busy = false;
        button.disabled = false;
        button.textContent = "Change Password";
    }
});
