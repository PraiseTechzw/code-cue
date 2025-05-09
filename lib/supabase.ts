import AsyncStorage from "@react-native-async-storage/async-storage"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string  || "https://fzvhlzlpuezjhajexblc.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6dmhsemxwdWV6amhhamV4YmxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MDMzODIsImV4cCI6MjA2MjI3OTM4Mn0.aMdjwk_JU4KYhFQBCMXqPhIKmjBO17MJzMLqQVURUoU'

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
