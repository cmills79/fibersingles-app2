-- Add monster_profile column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS monster_profile JSONB DEFAULT NULL;

-- Add an index for better query performance on monster_profile
CREATE INDEX IF NOT EXISTS idx_profiles_monster_profile 
ON public.profiles USING gin (monster_profile);

-- Update RLS policies to include monster_profile in allowed columns
-- (This ensures the column is accessible through the existing policies)