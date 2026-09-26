import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

let clientPromise;
export function getAuthClient() {
    if (!clientPromise) {
        clientPromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm")
            .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_ANON_KEY))
            .catch(error => { clientPromise = null; throw error; });
    }
    return clientPromise;
}
