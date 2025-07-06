-- supabase/seed.sql
-- This file is automatically run when you do `supabase db reset`
-- It's perfect for demo data that should only exist in development

-- Create common symptoms array type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE symptom_category AS ENUM (
        'pain',
        'fatigue',
        'cognitive',
        'sleep',
        'mood',
        'digestive',
        'sensitivity',
        'mobility'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add any necessary indexes and constraints
ALTER TABLE IF EXISTS public.profiles
    ADD CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
    ADD CONSTRAINT valid_username CHECK (username ~ '^[a-zA-Z0-9_]+$'),
    ADD CONSTRAINT bio_length CHECK (char_length(bio) <= 500);

-- Create indexes for common queries if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles USING btree (username);
CREATE INDEX IF NOT EXISTS idx_profiles_monster_keywords ON public.profiles USING gin (monster_keywords);

-- Create demo users in auth.users first
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'demo1@fiberfriends.test', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'demo2@fiberfriends.test', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'demo3@fiberfriends.test', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('44444444-4444-4444-4444-444444444444', 'demo4@fiberfriends.test', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Now create their profiles (the trigger might have already created basic ones)
INSERT INTO public.profiles (
  user_id, 
  display_name, 
  username, 
  bio, 
  monster_keywords, 
  symptoms, 
  likes, 
  dislikes
)
VALUES 
  (
    '11111111-1111-1111-1111-111111111111',
    'Sarah M.',
    'sparkle_warrior',
    'Living with fibro one day at a time. Love connecting with others who get it! 💜',
    ARRAY['fatigue', 'pain', 'brain fog'],
    ARRAY['chronic pain', 'fatigue', 'sleep issues'],
    ARRAY['gentle yoga', 'warm baths', 'supportive friends'],
    ARRAY['cold weather', 'being misunderstood', 'overdoing it']
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Alex T.',
    'moon_bear_23',
    'Chronic fatigue warrior. Finding joy in small victories. Always here to listen! 🌙',
    ARRAY['fatigue', 'sensitivity', 'mood'],
    ARRAY['extreme fatigue', 'sensory sensitivity', 'mood changes'],
    ARRAY['naps', 'quiet spaces', 'understanding friends'],
    ARRAY['loud noises', 'bright lights', 'pushy people']
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Jordan K.',
    'rainbow_phoenix',
    'Juggling multiple conditions with humor and hope. Let''s support each other! 🌈',
    ARRAY['pain', 'digestive', 'mobility'],
    ARRAY['joint pain', 'digestive issues', 'mobility challenges'],
    ARRAY['adaptive tools', 'good humor', 'accessibility'],
    ARRAY['stairs without rails', 'food triggers', 'ableism']
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'Morgan L.',
    'gentle_dragon',
    'IBS survivor, foodie at heart. Sharing tips and finding gut-friendly joy! 🐉',
    ARRAY['digestive', 'sensitivity', 'fatigue'],
    ARRAY['IBS', 'food sensitivities', 'anxiety'],
    ARRAY['safe foods', 'meal prep', 'stress relief'],
    ARRAY['surprise ingredients', 'food FOMO', 'unsolicited advice']
  )
ON CONFLICT (user_id) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  username = EXCLUDED.username,
  bio = EXCLUDED.bio,
  monster_keywords = EXCLUDED.monster_keywords,
  symptoms = EXCLUDED.symptoms,
  likes = EXCLUDED.likes,
  dislikes = EXCLUDED.dislikes;

-- Create points table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    points_amount INTEGER NOT NULL,
    source_id UUID,
    source_type TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT positive_points CHECK (points_amount > 0)
);

-- Create index on user_id and created_at for points queries
CREATE INDEX IF NOT EXISTS idx_points_user_created ON public.points(user_id, created_at DESC);

-- Insert some demo points data
INSERT INTO public.points (user_id, action_type, points_amount, metadata)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'daily_check_in', 10, '{"streak": 1}'::jsonb),
    ('11111111-1111-1111-1111-111111111111', 'support_given', 5, '{"type": "encouragement"}'::jsonb),
    ('22222222-2222-2222-2222-222222222222', 'daily_check_in', 10, '{"streak": 3}'::jsonb),
    ('33333333-3333-3333-3333-333333333333', 'challenge_completed', 20, '{"challenge": "water_tracking"}'::jsonb),
    ('44444444-4444-4444-4444-444444444444', 'daily_check_in', 10, '{"streak": 2}'::jsonb)
ON CONFLICT DO NOTHING;

-- Create RLS policies for points
ALTER TABLE public.points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own points"
    ON public.points FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert points"
    ON public.points FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- Comments to help other developers
COMMENT ON TABLE public.points IS 'Stores user points from various activities';
COMMENT ON COLUMN public.points.action_type IS 'The type of action that earned the points';
COMMENT ON COLUMN public.points.metadata IS 'Additional context about how the points were earned';