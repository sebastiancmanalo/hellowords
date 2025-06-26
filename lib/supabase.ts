import { createClient } from "@supabase/supabase-js"

// Use new environment variables for the new project
const supabaseUrl = process.env.NEXT_PUBLIC_NEW_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_NEW_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      entries: {
        Row: {
          id: string
          user_id: string
          encrypted_content: string
          content_hash: string | null
          location: string
          word_count: number
          embedding: number[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          encrypted_content: string
          content_hash?: string | null
          location: string
          word_count: number
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          encrypted_content?: string
          content_hash?: string | null
          location?: string
          word_count?: number
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
