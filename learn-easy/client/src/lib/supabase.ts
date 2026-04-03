import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseClientConfigured =
  Boolean(supabaseUrl) && Boolean(supabaseAnonKey);

export const supabaseClient = isSupabaseClientConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!supabaseClient) return null;
  const { data } = await supabaseClient.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function syncSupabaseSessionToApi(): Promise<void> {
  const token = await getSupabaseAccessToken();
  if (!token) {
    localStorage.removeItem("supabase_access_token");
    return;
  }

  localStorage.setItem("supabase_access_token", token);
  await fetch("/api/auth/supabase-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ accessToken: token }),
  });
}

