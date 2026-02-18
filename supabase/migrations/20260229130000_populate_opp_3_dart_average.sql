-- Populate level_averages: level bands with description, 3-dart average, and accuracy % columns.
-- Drops and recreates to align with 20260229120000 schema.

DROP TABLE IF EXISTS public.opp_3_dart_average;
DROP TABLE IF EXISTS public.level_averages;

CREATE TABLE public.level_averages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_min int NOT NULL CHECK (level_min >= 0 AND level_min <= 99),
  level_max int NOT NULL CHECK (level_max >= 0 AND level_max <= 99),
  description text NOT NULL,
  three_dart_avg numeric NOT NULL,
  single_acc_pct numeric,
  double_acc_pct numeric,
  treble_acc_pct numeric,
  bull_acc_pct numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT level_averages_level_range CHECK (level_max >= level_min)
);

COMMENT ON TABLE public.level_averages IS 'Reference: level bands (0-9, 10-19, …) with description, expected 3-dart average, and accuracy % by segment. Read-only lookup.';

CREATE INDEX idx_level_averages_level ON public.level_averages(level_min, level_max);

ALTER TABLE public.level_averages ENABLE ROW LEVEL SECURITY;

CREATE POLICY level_averages_select_authenticated ON public.level_averages
  FOR SELECT USING (auth.uid() IS NOT NULL);

INSERT INTO public.level_averages (level_min, level_max, description, three_dart_avg, single_acc_pct, double_acc_pct, treble_acc_pct, bull_acc_pct) VALUES
  (0, 9, 'New / learning board', 25.00, 40, 8, 5, 3),
  (10, 19, 'Beginner', 35.00, 55, 12, 8, 5),
  (20, 29, 'Improver', 45.00, 65, 16, 12, 7),
  (30, 39, 'Casual pub regular', 50.00, 72, 20, 16, 9),
  (40, 49, 'Developing league player', 55.00, 78, 25, 20, 12),
  (50, 59, 'Decent club player', 60.00, 82, 30, 24, 15),
  (60, 69, 'Strong club / weak county', 68.00, 86, 35, 30, 20),
  (70, 79, 'County / strong amateur', 76.00, 90, 40, 36, 25),
  (80, 89, 'Elite amateur / semi-pro', 86.00, 94, 45, 42, 30),
  (90, 99, 'Pro standard', 98.00, 97, 55, 50, 40);
