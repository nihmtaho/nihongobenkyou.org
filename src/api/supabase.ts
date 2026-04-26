import { createClient } from '@supabase/supabase-js'

// Fallback to localhost so the app boots without env vars in development.
// Auth and sync will fail gracefully — the offline-first architecture serves Dexie data instead.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'http://localhost:54321'
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
  ?? (import.meta.env.VITE_SUPABASE_KEY as string | undefined)
  ?? 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseKey)
