-- ==============================================================================
-- Supabase Row Level Security (RLS) Configuration Script
-- 
-- Exactly for your 5 tables:
-- 1. assessments
-- 2. cells
-- 3. meetings
-- 4. roster
-- 5. settings
-- ==============================================================================

-- 1. Enable RLS on all 5 tables
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to allow clean re-runs
DROP POLICY IF EXISTS "Allow all operations on assessments" ON public.assessments;
DROP POLICY IF EXISTS "Allow all operations on cells" ON public.cells;
DROP POLICY IF EXISTS "Allow all operations on meetings" ON public.meetings;
DROP POLICY IF EXISTS "Allow all operations on roster" ON public.roster;
DROP POLICY IF EXISTS "Allow all operations on settings" ON public.settings;

-- 3. Create full-access policies for anon and authenticated clients
CREATE POLICY "Allow all operations on assessments" 
  ON public.assessments 
  FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow all operations on cells" 
  ON public.cells 
  FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow all operations on meetings" 
  ON public.meetings 
  FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow all operations on roster" 
  ON public.roster 
  FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow all operations on settings" 
  ON public.settings 
  FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);
