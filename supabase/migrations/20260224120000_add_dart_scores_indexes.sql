-- P8 §3: dart_scores indexing and index-strategy documentation.
-- P4 already created: idx_dart_scores_training_id, idx_dart_scores_player_id, idx_dart_scores_training_routine.
-- This migration adds the composite index for time-bounded queries by player.
--
-- Index strategy (query patterns supported):
--   (1) By training_id: analyzer "View darts" (getDartScoresForSessionRun), GE lookups. Index: idx_dart_scores_training_id (P4).
--   (2) By player_id: RLS (player_id = current_user_player_id()), "my darts" lists. Index: idx_dart_scores_player_id (P4).
--   (3) By player_id + created_at: time-bounded queries (e.g. last N months for analytics, archiving scan). Index: below.
-- RLS policies on dart_scores use player_id; these indexes support the resulting plans.
--
-- Archiving/partitioning decision (P8): Index only. No dart_scores_archive table or partitioning in P8.
-- Archiving can be added when row count or query SLAs justify it (e.g. move rows older than 12 months to dart_scores_archive).
-- See docs/P8_POLISH_SCALE_IMPLEMENTATION_TASKS.md §3.3 and docs/P8_POLISH_SCALE_DOMAIN.md §7.

CREATE INDEX idx_dart_scores_player_id_created_at ON public.dart_scores(player_id, created_at);
