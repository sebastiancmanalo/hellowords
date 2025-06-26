-- Enable the pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create entries table with encrypted content
CREATE TABLE IF NOT EXISTS entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  encrypted_content TEXT NOT NULL, -- Encrypted content
  content_hash TEXT, -- Hash for duplicate detection (optional)
  location TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  embedding vector(1536), -- Embedding of original content (generated client-side)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Users can only see their own entries
CREATE POLICY "Users can view own entries" ON entries
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own entries
CREATE POLICY "Users can insert own entries" ON entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own entries
CREATE POLICY "Users can update own entries" ON entries
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own entries
CREATE POLICY "Users can delete own entries" ON entries
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS entries_embedding_idx ON entries 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for user queries
CREATE INDEX IF NOT EXISTS entries_user_id_idx ON entries(user_id);
CREATE INDEX IF NOT EXISTS entries_created_at_idx ON entries(created_at DESC);

-- Function for similarity search (works with encrypted content)
CREATE OR REPLACE FUNCTION match_entries(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_user_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  encrypted_content text,
  location text,
  word_count int,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    entries.id,
    entries.encrypted_content,
    entries.location,
    entries.word_count,
    entries.created_at,
    1 - (entries.embedding <=> query_embedding) AS similarity
  FROM entries
  WHERE 
    (filter_user_id IS NULL OR entries.user_id = filter_user_id)
    AND entries.embedding IS NOT NULL
    AND 1 - (entries.embedding <=> query_embedding) > match_threshold
  ORDER BY entries.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
