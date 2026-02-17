/**
 * P7 — Record match (end-to-end). Per domain §5, §5.3.
 * Inserts two match rows (one per player), then updates OMR and PR for both.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DataError } from './errors';
import { getPlayerById } from './players';
import { computeMatchRating, getFormatWeight, isOpponentInBand } from './match-rating';
import { OUT_OF_BAND_WEIGHT } from './rating-params';
import { updatePlayerOMR } from './omr';
import { updatePlayerPR } from './pr';
import type { RecordMatchPayload } from './types';
import type { Match } from './types';

const MATCHES_TABLE = 'matches';
const PGRST_NO_ROWS = 'PGRST116';

/** Result of recording a match: both created rows (player's and opponent's). */
export interface RecordMatchResult {
  playerMatch: Match;
  opponentMatch: Match;
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  if (err && typeof err === 'object' && 'details' in err && typeof (err as { details: unknown }).details === 'string') {
    return (err as { details: string }).details;
  }
  return 'A network or server error occurred';
}

function mapError(err: unknown): never {
  if (err instanceof DataError) throw err;
  if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === PGRST_NO_ROWS) {
    throw new DataError('Match not found', 'NOT_FOUND');
  }
  console.error('[@opp/data] Supabase error:', err);
  throw new DataError(getErrorMessage(err), 'NETWORK');
}

/** Player 3DA baseline: P7 placeholder — use null until profile or last-N baseline is available. */
function getPlayer3DABaseline(_playerId: string): number | null {
  return null;
}

/**
 * Record a match between two players. Inserts two rows (player and opponent perspective), then
 * updates OMR and PR for both. RLS: current user must be playerId or opponentId (migration
 * allows inserting both rows when recording). Admin can call recordMatch with any playerId/opponentId; matches_insert_admin allows admin INSERT (same OMR/PR update logic).
 *
 * @param client - Supabase client (authenticated as recording player or admin)
 * @param payload - playerId, opponentId, formatBestOf, legsWon, legsLost, optional 3DA/doubles/competition/playedAt
 * @returns Both created match rows
 */
export async function recordMatch(
  client: SupabaseClient,
  payload: RecordMatchPayload
): Promise<RecordMatchResult> {
  const totalLegs = payload.legsWon + payload.legsLost;
  if (payload.formatBestOf < 5) {
    throw new DataError('Format must be best-of-5 or longer (formatBestOf >= 5)', 'VALIDATION');
  }
  if (payload.playerId === payload.opponentId) {
    throw new DataError('Player and opponent must be different', 'VALIDATION');
  }

  const [player, opponent] = await Promise.all([
    getPlayerById(client, payload.playerId),
    getPlayerById(client, payload.opponentId),
  ]);
  if (!player) throw new DataError('Player not found', 'NOT_FOUND');
  if (!opponent) throw new DataError('Opponent not found', 'NOT_FOUND');

  const playerPR = player.player_rating != null ? Number(player.player_rating) : null;
  const playerOMR = player.match_rating != null ? Number(player.match_rating) : null;
  const opponentPR = opponent.player_rating != null ? Number(opponent.player_rating) : null;
  const opponentOMR = opponent.match_rating != null ? Number(opponent.match_rating) : null;
  const playerStrength = playerPR ?? playerOMR ?? 50;
  const opponentStrength = opponentPR ?? opponentOMR ?? 50;

  const formatWeight = getFormatWeight(payload.formatBestOf);
  const inBand = isOpponentInBand(playerPR ?? playerOMR, opponentPR ?? opponentOMR);
  const weight = inBand ? formatWeight : formatWeight * OUT_OF_BAND_WEIGHT;

  const threeDartAvg = payload.threeDartAvg != null ? Number(payload.threeDartAvg) : null;
  const doublesAttempted = payload.doublesAttempted != null ? Number(payload.doublesAttempted) : null;
  const doublesHit = payload.doublesHit != null ? Number(payload.doublesHit) : null;
  const doublesPct =
    doublesAttempted != null && doublesAttempted > 0 && doublesHit != null
      ? doublesHit / doublesAttempted
      : null;

  const player3DABaseline = getPlayer3DABaseline(payload.playerId);
  const opponent3DABaseline = getPlayer3DABaseline(payload.opponentId);

  const legSharePlayer = payload.legsWon / totalLegs;
  const legShareOpponent = payload.legsLost / totalLegs;

  const mrPlayer = computeMatchRating({
    opponentStrength,
    legShare: legSharePlayer,
    threeDartAvg,
    player3DABaseline,
    doublesPct,
  });
  const mrOpponent = computeMatchRating({
    opponentStrength: playerStrength,
    legShare: legShareOpponent,
    threeDartAvg: threeDartAvg,
    player3DABaseline: opponent3DABaseline,
    doublesPct: doublesPct,
  });

  const inBandOpponent = isOpponentInBand(opponentPR ?? opponentOMR, playerPR ?? playerOMR);
  const weightOpponent = inBandOpponent ? formatWeight : formatWeight * OUT_OF_BAND_WEIGHT;

  const playedAt = payload.playedAt ?? new Date().toISOString();
  const requiredMetricsPresent =
    threeDartAvg != null && doublesAttempted != null && doublesHit != null;
  const eligible = payload.formatBestOf >= 5 && requiredMetricsPresent;

  const ratingDiffPlayer = (playerPR ?? playerOMR ?? 0) - opponentStrength;
  const ratingDiffOpponent = (opponentPR ?? opponentOMR ?? 0) - playerStrength;

  const rowPlayer = {
    player_id: payload.playerId,
    opponent_id: payload.opponentId,
    competition_id: payload.competitionId ?? null,
    calendar_id: payload.calendarId ?? null,
    played_at: playedAt,
    format_best_of: payload.formatBestOf,
    legs_won: payload.legsWon,
    legs_lost: payload.legsLost,
    total_legs: totalLegs,
    three_dart_avg: threeDartAvg,
    player_3da_baseline: player3DABaseline,
    doubles_attempted: doublesAttempted,
    doubles_hit: doublesHit,
    doubles_pct: doublesPct,
    opponent_rating_at_match: opponentStrength,
    rating_difference: ratingDiffPlayer,
    match_rating: mrPlayer,
    weight,
    eligible,
  };
  const rowOpponent = {
    player_id: payload.opponentId,
    opponent_id: payload.playerId,
    competition_id: payload.competitionId ?? null,
    calendar_id: payload.calendarId ?? null,
    played_at: playedAt,
    format_best_of: payload.formatBestOf,
    legs_won: payload.legsLost,
    legs_lost: payload.legsWon,
    total_legs: totalLegs,
    three_dart_avg: threeDartAvg,
    player_3da_baseline: opponent3DABaseline,
    doubles_attempted: doublesAttempted,
    doubles_hit: doublesHit,
    doubles_pct: doublesPct,
    opponent_rating_at_match: playerStrength,
    rating_difference: ratingDiffOpponent,
    match_rating: mrOpponent,
    weight: weightOpponent,
    eligible,
  };

  const { data: inserted, error } = await client.from(MATCHES_TABLE).insert([rowPlayer, rowOpponent]).select();
  if (error) mapError(error);
  const rows = (inserted ?? []) as Match[];
  if (rows.length !== 2) throw new DataError('Failed to insert both match rows', 'NETWORK');

  const playerMatch = rows[0].player_id === payload.playerId ? rows[0] : rows[1];
  const opponentMatch = rows[0].player_id === payload.opponentId ? rows[0] : rows[1];

  await Promise.all([
    updatePlayerOMR(client, payload.playerId),
    updatePlayerOMR(client, payload.opponentId),
  ]);
  await Promise.all([
    updatePlayerPR(client, payload.playerId),
    updatePlayerPR(client, payload.opponentId),
  ]);

  return { playerMatch, opponentMatch };
}
