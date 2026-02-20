
-- ══════════════════════════════════════════════
-- Tethyr Database Architecture
-- Canva/Photoroom-style workspace model
-- ══════════════════════════════════════════════

-- Custom types
CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.subscription_tier AS ENUM ('free', 'founder', 'team', 'studio');

-- ── Profiles ──
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── Teams (workspaces) ──
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'My Workspace',
  slug TEXT UNIQUE,
  tier subscription_tier NOT NULL DEFAULT 'free',
  max_seats INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- ── Team Members ──
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role user_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- ── Reports ──
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  intents TEXT[] DEFAULT '{}',
  classification JSONB,
  report_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ── Team Invitations ──
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, email)
);
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════
-- Helper function: check team membership
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_admin_or_owner(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  );
$$;

-- ══════════════════════════════════════════════
-- Auto-create profile + personal team on signup
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_team_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  -- Create personal workspace
  INSERT INTO public.teams (name, slug, tier, max_seats)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)) || '''s Workspace',
    NEW.id::TEXT,
    'free',
    1
  )
  RETURNING id INTO new_team_id;

  -- Add user as owner
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (new_team_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ══════════════════════════════════════════════
-- Updated_at trigger
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ══════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════

-- Profiles: users see/edit own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Teams: members can view, admins/owners can update
CREATE POLICY "Members can view their teams" ON public.teams FOR SELECT USING (public.is_team_member(id));
CREATE POLICY "Admins can update team" ON public.teams FOR UPDATE USING (public.is_team_admin_or_owner(id));

-- Team members: members can view team roster, admins manage
CREATE POLICY "Members can view team roster" ON public.team_members FOR SELECT USING (public.is_team_member(team_id));
CREATE POLICY "Admins can add members" ON public.team_members FOR INSERT WITH CHECK (public.is_team_admin_or_owner(team_id));
CREATE POLICY "Admins can remove members" ON public.team_members FOR DELETE USING (public.is_team_admin_or_owner(team_id));
CREATE POLICY "Admins can update roles" ON public.team_members FOR UPDATE USING (public.is_team_admin_or_owner(team_id));

-- Reports: team members can view, any member can create
CREATE POLICY "Team members can view reports" ON public.reports FOR SELECT USING (public.is_team_member(team_id));
CREATE POLICY "Team members can create reports" ON public.reports FOR INSERT WITH CHECK (public.is_team_member(team_id) AND auth.uid() = user_id);
CREATE POLICY "Report owner can update" ON public.reports FOR UPDATE USING (auth.uid() = user_id);

-- Invitations: admins manage, invited user can view by token
CREATE POLICY "Admins can manage invitations" ON public.team_invitations FOR ALL USING (public.is_team_admin_or_owner(team_id));
CREATE POLICY "Invited user can view invitation" ON public.team_invitations FOR SELECT USING (lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())));

-- Indexes
CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_team_members_team ON public.team_members(team_id);
CREATE INDEX idx_reports_team ON public.reports(team_id);
CREATE INDEX idx_reports_user ON public.reports(user_id);
CREATE INDEX idx_invitations_token ON public.team_invitations(token);
CREATE INDEX idx_invitations_email ON public.team_invitations(email);
