CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_retro_member(_retro_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.retro_admins ra WHERE ra.retro_id = _retro_id AND ra.user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION private.has_retro_role(_retro_id uuid, _user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.retro_admins ra WHERE ra.retro_id = _retro_id AND ra.user_id = _user_id AND ra.role = _role);
$$;

GRANT EXECUTE ON FUNCTION private.is_retro_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_retro_role(uuid, uuid, text) TO authenticated, service_role;

DROP POLICY "members read retros" ON public.retros;
DROP POLICY "organizers update retros" ON public.retros;
DROP POLICY "organizers delete retros" ON public.retros;
DROP POLICY "members read admins" ON public.retro_admins;
DROP POLICY "organizers manage admins" ON public.retro_admins;
DROP POLICY "organizers manage intake" ON public.organizer_intake_turns;
DROP POLICY "organizers manage question sets" ON public.question_sets;
DROP POLICY "organizers manage participants" ON public.participants;
DROP POLICY "attribution admins read turns" ON public.interview_turns;
DROP POLICY "members read metrics" ON public.retro_metrics;
DROP POLICY "organizers manage metrics" ON public.retro_metrics;
DROP POLICY "members read reports" ON public.reports;
DROP POLICY "members read actions" ON public.action_items;
DROP POLICY "organizers manage actions" ON public.action_items;
DROP POLICY "members read access log" ON public.attribution_access_log;

DROP FUNCTION IF EXISTS public.is_retro_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.has_retro_role(uuid, uuid, text);

CREATE POLICY "members read retros" ON public.retros FOR SELECT TO authenticated
  USING (private.is_retro_member(id, auth.uid()));
CREATE POLICY "organizers update retros" ON public.retros FOR UPDATE TO authenticated
  USING (private.has_retro_role(id, auth.uid(), 'organizer'))
  WITH CHECK (private.has_retro_role(id, auth.uid(), 'organizer'));
CREATE POLICY "organizers delete retros" ON public.retros FOR DELETE TO authenticated
  USING (private.has_retro_role(id, auth.uid(), 'organizer'));

CREATE POLICY "members read admins" ON public.retro_admins FOR SELECT TO authenticated
  USING (private.is_retro_member(retro_id, auth.uid()));
CREATE POLICY "organizers manage admins" ON public.retro_admins FOR ALL TO authenticated
  USING (private.has_retro_role(retro_id, auth.uid(), 'organizer'))
  WITH CHECK (private.has_retro_role(retro_id, auth.uid(), 'organizer'));

CREATE POLICY "organizers manage intake" ON public.organizer_intake_turns FOR ALL TO authenticated
  USING (private.has_retro_role(retro_id, auth.uid(), 'organizer'))
  WITH CHECK (private.has_retro_role(retro_id, auth.uid(), 'organizer'));

CREATE POLICY "organizers manage question sets" ON public.question_sets FOR ALL TO authenticated
  USING (private.has_retro_role(retro_id, auth.uid(), 'organizer'))
  WITH CHECK (private.has_retro_role(retro_id, auth.uid(), 'organizer'));

CREATE POLICY "organizers manage participants" ON public.participants FOR ALL TO authenticated
  USING (private.has_retro_role(retro_id, auth.uid(), 'organizer'))
  WITH CHECK (private.has_retro_role(retro_id, auth.uid(), 'organizer'));

CREATE POLICY "attribution admins read turns" ON public.interview_turns FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.participants p
    WHERE p.id = interview_turns.participant_id
      AND private.has_retro_role(p.retro_id, auth.uid(), 'attribution_admin')
  ));

CREATE POLICY "members read metrics" ON public.retro_metrics FOR SELECT TO authenticated
  USING (private.is_retro_member(retro_id, auth.uid()));
CREATE POLICY "organizers manage metrics" ON public.retro_metrics FOR ALL TO authenticated
  USING (private.has_retro_role(retro_id, auth.uid(), 'organizer'))
  WITH CHECK (private.has_retro_role(retro_id, auth.uid(), 'organizer'));

CREATE POLICY "members read reports" ON public.reports FOR SELECT TO authenticated
  USING (private.is_retro_member(retro_id, auth.uid()));

CREATE POLICY "members read actions" ON public.action_items FOR SELECT TO authenticated
  USING (private.is_retro_member(retro_id, auth.uid()));
CREATE POLICY "organizers manage actions" ON public.action_items FOR ALL TO authenticated
  USING (private.has_retro_role(retro_id, auth.uid(), 'organizer'))
  WITH CHECK (private.has_retro_role(retro_id, auth.uid(), 'organizer'));

CREATE POLICY "members read access log" ON public.attribution_access_log FOR SELECT TO authenticated
  USING (private.is_retro_member(retro_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.add_creator_as_organizer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.retro_admins (retro_id, user_id, role) VALUES (NEW.id, NEW.created_by, 'organizer') ON CONFLICT DO NOTHING;
  INSERT INTO public.retro_admins (retro_id, user_id, role) VALUES (NEW.id, NEW.created_by, 'attribution_admin') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.add_creator_as_organizer() FROM PUBLIC, anon, authenticated;