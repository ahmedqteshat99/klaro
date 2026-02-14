-- Allow signed-out visitors to read published jobs on the public job board.

DROP POLICY IF EXISTS "Users can view published jobs" ON public.jobs;
DROP POLICY IF EXISTS "Public can view published jobs" ON public.jobs;

CREATE POLICY "Public can view published jobs"
  ON public.jobs FOR SELECT
  USING (is_published = TRUE);
