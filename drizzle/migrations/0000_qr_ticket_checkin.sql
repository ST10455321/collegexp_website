ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS scanned_at timestamptz;

CREATE POLICY reg_update_organiser ON public.event_registrations
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_registrations.event_id AND e.organiser_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_registrations.event_id AND e.organiser_id = auth.uid()));

GRANT UPDATE ON public.event_registrations TO authenticated;