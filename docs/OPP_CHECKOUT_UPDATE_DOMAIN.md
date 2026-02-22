# Checkout Update — Game Process for Checkout-Type Routines

## Purpose

This document defines the **updated game process** for **checkout-type (C) routine steps** in OPP. It extends the behaviour described in **OPP_CHECKOUT_TRAINING_DOMAIN.md** by specifying how the Game Engine (GE) should present checkout steps to the player: routine type, original and remaining total, and **recommended** or **player-preferred** checkout combinations.

It applies when a player is attempting a checkout from a given total (e.g. **121**, 81, 41) as the step target.


## Scope

- **In scope:** Display and lookup behaviour during play for a checkout step (routine_type = C).
- **Out of scope:** Changes to the expectation formula, step/routine/session scoring, or data model for player_step_runs/dart_scores (those remain per OPP_CHECKOUT_TRAINING_DOMAIN.md).


## Key Concepts

### Checkout step

A **routine step** with `routine_type = 'C'` and a **target** that is an integer between 2 and 170 (e.g. 121, 81, 41). The target is the **original checkout value** the player must finish from.

### Remaining total

During an attempt, **remaining** is the current score left to checkout. It starts at the step target and decreases as each dart is applied (using segment score: S20→20, D20→40, T20→60, 25, Bull→50, M→0). A checkout attempt is a **success** only when remaining reaches 0 and the **final dart** is a **double** (D1–D20) or **bullseye** (Bull). If the player brings remaining to 0 with a single or treble (e.g. need 18, hit S18), that is a **bust** (0 points). If remaining becomes 1 (e.g. need 18, hit S17) or goes negative (went over), that is also a **bust**.

### Recommended checkout combination

A **checkout_combination** row keyed by **total** (2–170) with optional **dart1**, **dart2**, **dart3** (segment codes, e.g. T20, T7, D20). Admin-maintained; represents the recommended route for that total.

### Player checkout variation

A **player_checkout_variation** row for the current player, keyed by **total**, with optional **dart1**, **dart2**, **dart3**. The player may define a preferred route for specific totals (e.g. 121) in their profile. If present for the current remaining total, it overrides or supplements the recommended combination for display.


## Required Behaviour During Play

When the current routine step is a **checkout type** step (e.g. target 121):

1. **Display that this is a checkout type**
   - The GE must clearly indicate that the current step is a **checkout** (e.g. label “Checkout”, or “Checkout step”), not a single-dart aim (SS/SD/ST).

2. **Display the original checkout value**
   - Show the **step target** as the **original** value the player is checking out from (e.g. “Start: 121” or “Checkout from: 121”).

3. **Display the current remaining total**
   - Show the **remaining** score after each dart (or at the start of the visit). Remaining starts at the step target and is reduced by each dart’s segment value. Display updates as the player records darts (e.g. “Remaining: 121” → “Remaining: 100” → “Remaining: 60” after T20, T20, D20).

4. **Display the recommended checkout combination**
   - For the **current remaining total**, look up the **checkout_combination** with `total = remaining` (from `checkout_combinations`).  
   - If found, display the recommended route (e.g. “Recommended: T20, T7, D20” or “Route: dart1, dart2, dart3”).  
   - If no row exists for that total, the GE may show “No recommended route” or omit the recommendation.

5. **Check and display player checkout variation**
   - For the **current remaining total**, check whether the **current player** has a **player_checkout_variation** with `total = remaining` (from `player_checkout_variations`).  
   - If the player has a variation for this total, display it (e.g. “Your route: T19, S12, D25”) in addition to or instead of the recommended combination, per product/UX choice (e.g. “Your route” takes precedence when present).


## Data Sources

| Source | Content | Use in GE |
|--------|---------|-----------|
| **routine_steps** | `routine_type`, `target` | Identify checkout step; original value = step.target. |
| **checkout_combinations** | `total`, `dart1`, `dart2`, `dart3` | Lookup by **remaining** total to show recommended route. |
| **player_checkout_variations** | `player_id`, `total`, `dart1`, `dart2`, `dart3` | Lookup by **remaining** total and current player to show player’s preferred route. |

- **Lookup by total:** The GE may load all combinations (and the player’s variations) once per session or step, then look up by `total === remaining` in memory; or call/use APIs that return a single row by total if available.
- **Remaining:** Computed from the step target minus the sum of segment scores for darts already thrown in the current attempt (or visit, depending on attempt model).


## UI Summary (Checkout Step)

For a checkout step (e.g. from 121), the GE should show:

- **Routine type:** Checkout (explicit label/badge).
- **Original value:** e.g. “Checkout from: 121”.
- **Current remaining:** e.g. “Remaining: 121” (updating as darts are recorded).
- **Recommended combination:** From `checkout_combinations` for current remaining (e.g. “Recommended: T20, T7, D20”).
- **Player variation (if any):** From `player_checkout_variations` for current remaining and current player (e.g. “Your route: …”).

When remaining changes (after each dart), the recommended combination and player variation **lookup should use the new remaining total** (e.g. after first dart, show route for the new remaining, not still for 121).


## Edge Cases

- **Remaining > 170 or < 2:** No combination or variation exists for such totals; hide or omit route suggestion.
- **Remaining = 0 (valid):** Attempt complete (checkout success) only if the dart that brought it to 0 was double or bull; no route needed.
- **Bust:** Remaining &lt; 0 (went over), remaining = 1 (no double from 1), or remaining = 0 on a single/treble (invalid finish). Show bust message; attempt scores 0.
- **No recommended combination for total:** Show only “Your route” if the player has a variation; otherwise show nothing or “No recommended route”.
- **Player has variation, no recommended combination:** Show only “Your route”.
- **Both recommended and player variation:** Product decision whether to show both (e.g. “Recommended: …” and “Your route: …”) or only the player’s route when present.


## Dependencies

- **OPP_CHECKOUT_TRAINING_DOMAIN.md** — Base checkout flow, attempt/visit model, scoring, expectation formula.
- **OPP_CHECKOUT_TRAINING_IMPLEMENTATION_CHECKLIST.md** — Implementation checklist for base checkout training.
- Existing tables: **checkout_combinations** (admin-editable), **player_checkout_variations** (player CRUD in profile); existing data APIs: `listCheckoutCombinations`, `listPlayerCheckoutVariations` (lookup by total can be in-memory filter or a dedicated get-by-total API if added).


## Implementation Notes

- **Segment-to-score** for remaining: Use the same mapping as in the current GE (e.g. S1–S20, D1–D20, T1–T20, 25, Bull, M) so remaining is consistent with dart_scores and success detection.
- **When to load combinations/variations:** On entering a checkout step (or on session start if the session contains any C step), load `listCheckoutCombinations` and `listPlayerCheckoutVariations`; then for each “current remaining” value, find the matching total in those lists.
- Optional: Add `getCheckoutCombinationByTotal(client, total)` and `getPlayerCheckoutVariationByTotal(client, total)` in `@opp/data` for a single-total lookup if preferred over listing and filtering.
