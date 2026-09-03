DROP VIEW IF EXISTS public.public_profiles;

CREATE TABLE public.public_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  username text,
  full_name text,
  avatar_url text,
  institution text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT ALL ON public.public_profiles TO service_role;

ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_profiles_select_public ON public.public_profiles
  FOR SELECT TO anon, authenticated
  USING (true);

INSERT INTO public.public_profiles (id, username, full_name, avatar_url, institution)
SELECT id, username, full_name, avatar_url, institution FROM public.profiles
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.public_profiles (id, username, full_name, avatar_url, institution, updated_at)
  VALUES (NEW.id, NEW.username, NEW.full_name, NEW.avatar_url, NEW.institution, now())
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    institution = EXCLUDED.institution,
    updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_public_profile() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER profiles_sync_public
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_public_profile();