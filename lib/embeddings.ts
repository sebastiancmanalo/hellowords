import { openai } from "@ai-sdk/openai"
import { embed } from "ai"
import { EncryptionService } from "./encryption"

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: text,
    })
    return embedding
  } catch (error) {
    console.error("Error generating embedding:", error)
    return []
  }
}

export async function searchSimilarEntries(query: string, userId: string, userKey: string, threshold = 0.7, limit = 5) {
  const { supabase } = await import("./supabase")

  // Generate embedding for the search query (unencrypted)
  const queryEmbedding = await generateEmbedding(query)

  const { data, error } = await supabase.rpc("match_entries", {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit,
    filter_user_id: userId,
  })

  if (error) {
    console.error("Error searching entries:", error)
    return []
  }

  // Decrypt the content for display
  const decryptedResults = await Promise.all(
    (data || []).map(async (entry) => {
      try {
        const decryptedContent = await EncryptionService.decrypt(entry.encrypted_content, userKey)
        return {
          ...entry,
          content: decryptedContent,
        }
      } catch (error) {
        console.error("Failed to decrypt search result:", error)
        return {
          ...entry,
          content: "[Decryption failed]",
        }
      }
    }),
  )

  return decryptedResults
}
