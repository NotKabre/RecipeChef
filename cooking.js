import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const userGreeting = document.getElementById("userGreeting");
const authButton = document.getElementById("authButton");
const signOutButton = document.getElementById("signOutButton");

const configIsMissing =
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    SUPABASE_URL.includes("YOUR_PROJECT") ||
    SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");

const supabase = configIsMissing
    ? null
    : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function setSignedInState(user) {
    if (!authButton || !signOutButton) return;

    const name = user.user_metadata?.display_name?.trim()
        || user.user_metadata?.full_name?.trim()
        || "there";
    userGreeting.textContent = `Hello, ${name}`;
    userGreeting.hidden = false;
    authButton.hidden = true;
    signOutButton.hidden = false;
    signOutButton.disabled = false;
    signOutButton.title = "Sign out";
}

function setSignedOutState() {
    if (!authButton || !signOutButton) return;

    userGreeting.textContent = "";
    userGreeting.hidden = true;
    authButton.hidden = false;
    authButton.disabled = false;
    authButton.title = "Sign in";
    signOutButton.hidden = true;
    signOutButton.disabled = true;
}

async function syncAuthButton() {
    if (!authButton || !signOutButton) return;

    if (!supabase) {
        setSignedOutState();
        return;
    }

    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
            setSignedInState(session.user);
            return;
        }
    } catch (error) {
        console.error("Could not load the current session:", error);
    }

    setSignedOutState();
}

if (authButton) {
    authButton.addEventListener("click", () => {
        window.location.href = "signin.html";
    });
}

if (signOutButton) {
    signOutButton.addEventListener("click", async () => {
        if (!supabase) return;

        signOutButton.disabled = true;

        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            setSignedOutState();

        } catch (error) {
            console.error("Could not sign out:", error);
            signOutButton.disabled = false;
            alert("Could not sign out. Check your connection and try again.");
        }
    });
}

syncAuthButton().catch(error => {
    console.error("Unexpected authentication error:", error);
    setSignedOutState();
});

if (supabase) {
    supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) setSignedInState(session.user);
        else setSignedOutState();
    });
}
