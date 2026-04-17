-- ========================================================
-- Supabase SQL Schema for Wordcloud Survey Tool
-- Copy and paste this into the Supabase SQL Editor
-- ========================================================

-- 1. Surveys Table
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Words Table
CREATE TABLE words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(survey_id, word) -- Ensures no duplicate rows for the same word in a survey
);

-- 3. Row Level Security (RLS) Settings

-- Surveys Security
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Surveys are viewable by everyone" 
ON surveys FOR SELECT USING (true);

-- Only authenticated admins can create and delete surveys
CREATE POLICY "Admins can create surveys" 
ON surveys FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update own surveys"
ON surveys FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete own surveys" 
ON surveys FOR DELETE USING (auth.uid() = user_id);


-- Words Security
ALTER TABLE words ENABLE ROW LEVEL SECURITY;

-- Anyone can see words
CREATE POLICY "Words are viewable by everyone" 
ON words FOR SELECT USING (true);

-- Anyone can insert a new word (Anonymous interactions)
CREATE POLICY "Anyone can insert words" 
ON words FOR INSERT WITH CHECK (true);

-- Anyone can update a word (e.g. to increment the count)
CREATE POLICY "Anyone can update words" 
ON words FOR UPDATE USING (true);

-- Only admins can delete words (Moderation)
CREATE POLICY "Admins can delete words" 
ON words FOR DELETE USING (auth.role() = 'authenticated');
