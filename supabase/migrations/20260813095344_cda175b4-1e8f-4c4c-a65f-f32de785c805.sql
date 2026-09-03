-- roles
CREATE TYPE public.app_role AS ENUM ('student','organiser','admin');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  student_number TEXT UNIQUE,
  email TEXT,
  full_name TEXT,
  username TEXT,
  institution TEXT,
  bio TEXT,
  avatar_url TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  institution TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Campus',
  poster_url TEXT,
  event_date DATE NOT NULL,
  start_time TEXT NOT NULL DEFAULT '09:00',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  age_restriction TEXT NOT NULL DEFAULT 'PG',
  xp_reward INTEGER NOT NULL DEFAULT 50,
  capacity INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT ON public.events TO anon;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select_published" ON public.events FOR SELECT USING (is_published = true);
CREATE POLICY "events_select_own" ON public.events FOR SELECT TO authenticated USING (auth.uid() = organiser_id);
CREATE POLICY "events_insert_organiser" ON public.events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = organiser_id AND public.has_role(auth.uid(),'organiser'));
CREATE POLICY "events_update_own" ON public.events FOR UPDATE TO authenticated
  USING (auth.uid() = organiser_id) WITH CHECK (auth.uid() = organiser_id);
CREATE POLICY "events_delete_own" ON public.events FOR DELETE TO authenticated USING (auth.uid() = organiser_id);

CREATE TABLE public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_no TEXT NOT NULL DEFAULT ('#' || lpad((floor(random()*9000)+1000)::text, 4, '0')),
  attended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.event_registrations TO authenticated;
GRANT ALL ON public.event_registrations TO service_role;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reg_select_own" ON public.event_registrations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "reg_select_organiser" ON public.event_registrations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organiser_id = auth.uid()));
CREATE POLICY "reg_insert_own" ON public.event_registrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reg_delete_own" ON public.event_registrations FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'general',
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notif_delete_own" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_insert_own" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- timestamps
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER events_touch BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- new user bootstrap
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
  v_student TEXT;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student');
  IF NEW.email ~* '^ST[0-9]{8}@rcconnect\.edu\.za$' THEN
    v_student := upper(split_part(NEW.email, '@', 1));
  END IF;

  INSERT INTO public.profiles (id, email, student_number, full_name, username, institution)
  VALUES (
    NEW.id,
    NEW.email,
    v_student,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'username', v_student),
    NEW.raw_user_meta_data->>'institution'
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role) ON CONFLICT DO NOTHING;

  INSERT INTO public.notifications (user_id, title, body, kind)
  VALUES (NEW.id,
    CASE WHEN v_role = 'organiser' THEN 'Organiser account created' ELSE 'Welcome to COLLAXP' END,
    CASE WHEN v_role = 'organiser' THEN 'You can now create and manage campus events.'
         ELSE 'Discover campus events, register and start earning XP.' END,
    'welcome');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- XP + notification on registration
CREATE OR REPLACE FUNCTION public.handle_registration() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event public.events;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE id = NEW.event_id;
  UPDATE public.profiles
     SET xp = xp + COALESCE(v_event.xp_reward, 50),
         level = GREATEST(1, floor((xp + COALESCE(v_event.xp_reward,50)) / 250.0)::int + 1)
   WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, title, body, kind, event_id)
  VALUES (NEW.user_id, 'Registered: ' || v_event.title,
          'Ticket ' || NEW.ticket_no || ' · ' || to_char(v_event.event_date,'DD Mon YYYY') || ' · ' || v_event.start_time,
          'registration', NEW.event_id);

  INSERT INTO public.notifications (user_id, title, body, kind, event_id)
  VALUES (v_event.organiser_id, 'New registration', 'A student registered for ' || v_event.title, 'organiser', NEW.event_id);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_registration_created AFTER INSERT ON public.event_registrations
FOR EACH ROW EXECUTE FUNCTION public.handle_registration();