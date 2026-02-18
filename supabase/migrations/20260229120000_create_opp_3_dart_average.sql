-- Reference table: level_averages (level bands with 3DA and accuracy %).
-- Replaced opp_3_dart_average. RLS read for authenticated users.

DROP TABLE IF EXISTS public.opp_3_dart_average;

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
