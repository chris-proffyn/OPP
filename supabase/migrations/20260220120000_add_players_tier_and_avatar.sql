-- P6 Dashboard and Analyzer: tier for feature gating; optional avatar URL.
-- Spec: docs/P6_DASHBOARD_ANALYZER_DOMAIN.md §4.2, §4.3, §11.
-- No RLS change: players read/update own row; tier is read for gating.

-- Tier: free | gold | platinum; default 'free' for existing and new rows.
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free'
  CHECK (tier IN ('free', 'gold', 'platinum'));

COMMENT ON COLUMN public.players.tier IS 'P6: Membership tier for feature gating (Free tier = dashboard + analyzer basic). Default free.';

-- Avatar: optional URL; upload pipeline TBD (P8 or later).
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.players.avatar_url IS 'P6: Optional URL to profile image; upload/storage pipeline TBD.';
