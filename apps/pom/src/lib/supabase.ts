import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && anon)

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, anon!)
  : null

/** Panggil hanya jika supabaseConfigured (AppShell). */
export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error("Belum terhubung ke server")
  return supabase
}
