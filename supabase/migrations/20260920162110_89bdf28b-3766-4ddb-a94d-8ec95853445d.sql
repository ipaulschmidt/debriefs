CREATE TABLE public.retros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'event',
  event_date date,
  interview_deadline date,
  status text NOT NULL DEFAULT 'draft',
  intake_summary jsonb,
  previous_retro_id uuid REFERENCES public.retros(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.retro_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retro_id uuid NOT NULL REFERENCES public.retros(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('organizer','attribution_admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (retro_id, user_id, role)
);

CREATE OR REPLACE FUNCTION public.is_retro_member(_retro_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.retro_admins ra WHERE ra.retro_id = _retro_id AND ra.user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.has_retro_role(_retro_id uuid, _user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.retro_admins ra WHERE ra.retro_id = _retro_id AND ra.user_id = _user_id AND ra.role = _role);
$$;

CREATE OR REPLACE FUNCTION public.add_creator_as_organizer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.retro_admins (retro_id, user_id, role) VALUES (NEW.id, NEW.created_by, 'organizer')
    ON CONFLICT DO NOTHING;
  INSERT INTO public.retro_admins (retro_id, user_id, role) VALUES (NEW.id, NEW.created_by, 'attribution_admin')
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER retros_add_creator AFTER INSERT ON public.retros
  FOR EACH ROW EXECUTE FUNCTION public.add_creator_as_organizer();

CREATE TABLE public.organizer_intake_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retro_id uuid NOT NULL REFERENCES public.retros(id) ON DELETE CASCADE,
  sequence int NOT NULL,
  question_text text NOT NULL,
  answer_text text,
  answer_mode text NOT NULL DEFAULT 'text',
  audio_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.question_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retro_id uuid NOT NULL REFERENCES public.retros(id) ON DELETE CASCADE,
  generated_probes jsonb NOT NULL DEFAULT '[]'::jsonb,
  organizer_edited_probes jsonb,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retro_id uuid NOT NULL REFERENCES public.retros(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role_at_event text,
  invite_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  status text NOT NULL DEFAULT 'not_started',
  completeness_score numeric,
  low_completeness_flag boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.interview_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  sequence int NOT NULL,
  spine_area int,
  question_text text NOT NULL,
  answer_text text,
  answer_mode text NOT NULL DEFAULT 'text',
  audio_url text,
  answer_quality text,
  was_probe boolean NOT NULL DEFAULT false,
  probe_type text,
  marked_sensitive boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.retro_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retro_id uuid NOT NULL REFERENCES public.retros(id) ON DELETE CASCADE,
  label text NOT NULL,
  value text,
  prior_year_value text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retro_id uuid NOT NULL REFERENCES public.retros(id) ON DELETE CASCADE,
  synthesis_json jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  version int NOT NULL DEFAULT 1
);

CREATE TABLE public.action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retro_id uuid NOT NULL REFERENCES public.retros(id) ON DELETE CASCADE,
  description text NOT NULL,
  owner_name text,
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','dropped')),
  carried_from_retro_id uuid REFERENCES public.retros(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.attribution_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retro_id uuid NOT NULL REFERENCES public.retros(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id text,
  reason_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.retros TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retro_admins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizer_intake_turns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_sets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participants TO authenticated;
GRANT SELECT ON public.interview_turns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retro_metrics TO authenticated;
GRANT SELECT ON public.reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_items TO authenticated;
GRANT SELECT ON public.attribution_access_log TO authenticated;
GRANT ALL ON public.retros, public.retro_admins, public.organizer_intake_turns, public.question_sets, public.participants, public.interview_turns, public.retro_metrics, public.reports, public.action_items, public.attribution_access_log TO service_role;

ALTER TABLE public.retros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retro_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_intake_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retro_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribution_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read retros" ON public.retros FOR SELECT TO authenticated
  USING (public.is_retro_member(id, auth.uid()));
CREATE POLICY "create own retros" ON public.retros FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "organizers update retros" ON public.retros FOR UPDATE TO authenticated
  USING (public.has_retro_role(id, auth.uid(), 'organizer'))
  WITH CHECK (public.has_retro_role(id, auth.uid(), 'organizer'));
CREATE POLICY "organizers delete retros" ON public.retros FOR DELETE TO authenticated
  USING (public.has_retro_role(id, auth.uid(), 'organizer'));

CREATE POLICY "members read admins" ON public.retro_admins FOR SELECT TO authenticated
  USING (public.is_retro_member(retro_id, auth.uid()));
CREATE POLICY "organizers manage admins" ON public.retro_admins FOR ALL TO authenticated
  USING (public.has_retro_role(retro_id, auth.uid(), 'organizer'))
  WITH CHECK (public.has_retro_role(retro_id, auth.uid(), 'organizer'));

CREATE POLICY "organizers manage intake" ON public.organizer_intake_turns FOR ALL TO authenticated
  USING (public.has_retro_role(retro_id, auth.uid(), 'organizer'))
  WITH CHECK (public.has_retro_role(retro_id, auth.uid(), 'organizer'));

CREATE POLICY "organizers manage question sets" ON public.question_sets FOR ALL TO authenticated
  USING (public.has_retro_role(retro_id, auth.uid(), 'organizer'))
  WITH CHECK (public.has_retro_role(retro_id, auth.uid(), 'organizer'));

CREATE POLICY "organizers manage participants" ON public.participants FOR ALL TO authenticated
  USING (public.has_retro_role(retro_id, auth.uid(), 'organizer'))
  WITH CHECK (public.has_retro_role(retro_id, auth.uid(), 'organizer'));

CREATE POLICY "attribution admins read turns" ON public.interview_turns FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.participants p
    WHERE p.id = interview_turns.participant_id
      AND public.has_retro_role(p.retro_id, auth.uid(), 'attribution_admin')
  ));

CREATE POLICY "members read metrics" ON public.retro_metrics FOR SELECT TO authenticated
  USING (public.is_retro_member(retro_id, auth.uid()));
CREATE POLICY "organizers manage metrics" ON public.retro_metrics FOR ALL TO authenticated
  USING (public.has_retro_role(retro_id, auth.uid(), 'organizer'))
  WITH CHECK (public.has_retro_role(retro_id, auth.uid(), 'organizer'));

CREATE POLICY "members read reports" ON public.reports FOR SELECT TO authenticated
  USING (public.is_retro_member(retro_id, auth.uid()));

CREATE POLICY "members read actions" ON public.action_items FOR SELECT TO authenticated
  USING (public.is_retro_member(retro_id, auth.uid()));
CREATE POLICY "organizers manage actions" ON public.action_items FOR ALL TO authenticated
  USING (public.has_retro_role(retro_id, auth.uid(), 'organizer'))
  WITH CHECK (public.has_retro_role(retro_id, auth.uid(), 'organizer'));

CREATE POLICY "members read access log" ON public.attribution_access_log FOR SELECT TO authenticated
  USING (public.is_retro_member(retro_id, auth.uid()));

CREATE INDEX idx_participants_retro ON public.participants(retro_id);
CREATE INDEX idx_turns_participant ON public.interview_turns(participant_id);
CREATE INDEX idx_intake_retro ON public.organizer_intake_turns(retro_id);