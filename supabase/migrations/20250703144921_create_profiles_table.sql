-- Create custom types for better data validation
CREATE TYPE subscription_tier AS ENUM ('free', 'premium');
CREATE TYPE profile_status AS ENUM ('active', 'inactive', 'suspended');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (char_length(username) BETWEEN 3 AND 30 AND username ~ '^[a-zA-Z0-9_]+$'),
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 50),
  avatar_url TEXT CHECK (avatar_url ~ '^https?://.*'),
  bio TEXT CHECK (char_length(bio) <= 500),
  monster_image_url TEXT CHECK (monster_image_url ~ '^https?://.*'),
  monster_keywords TEXT[] DEFAULT '{}' CHECK (array_length(monster_keywords, 1) <= 5),
  symptoms TEXT[] DEFAULT '{}' CHECK (array_length(symptoms, 1) <= 10),
  likes TEXT[] DEFAULT '{}' CHECK (array_length(likes, 1) <= 20),
  dislikes TEXT[] DEFAULT '{}' CHECK (array_length(dislikes, 1) <= 20),
  subscription_tier subscription_tier DEFAULT 'free',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  monthly_searches_used INTEGER DEFAULT 0 CHECK (monthly_searches_used >= 0),
  status profile_status DEFAULT 'active',
  last_login_at TIMESTAMP WITH TIME ZONE,
  email_notifications_enabled BOOLEAN DEFAULT true,
  push_notifications_enabled BOOLEAN DEFAULT true,
  theme_preference TEXT DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark', 'system')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure subscription expiry is set for premium users
  CONSTRAINT valid_subscription CHECK (
    (subscription_tier = 'free' AND subscription_expires_at IS NULL) OR
    (subscription_tier = 'premium' AND subscription_expires_at > now())
  )
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create indexes for better query performance
CREATE INDEX idx_profiles_username ON public.profiles USING btree (username);
CREATE INDEX idx_profiles_subscription ON public.profiles USING btree (subscription_tier, subscription_expires_at);
CREATE INDEX idx_profiles_status ON public.profiles USING btree (status);
CREATE INDEX idx_profiles_monster_keywords ON public.profiles USING gin (monster_keywords);
CREATE INDEX idx_profiles_symptoms ON public.profiles USING gin (symptoms);

-- Create policies with better security
CREATE POLICY "Users can view active profiles for matching"
ON public.profiles
FOR SELECT
USING (status = 'active');

CREATE POLICY "Users can update their own active profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id AND status != 'suspended')
WITH CHECK (auth.uid() = user_id AND status != 'suspended');

CREATE POLICY "Users can insert their own profile once"
ON public.profiles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();