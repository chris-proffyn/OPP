# OPP Checkout Update — Implementation Checklist

Implementation checklist for the behaviour described in **OPP_CHECKOUT_UPDATE_DOMAIN.md**: displaying checkout type, original/remaining total, and recommended or player-preferred checkout combinations during play.

**Prerequisites:** Base checkout training is implemented per **OPP_CHECKOUT_TRAINING_IMPLEMENTATION_CHECKLIST.md** (§1–§8). Tables `checkout_combinations` and `player_checkout_variations` exist; data APIs `listCheckoutCombinations` and `listPlayerCheckoutVariations` are available in `@opp/data`. Extended by **BACKLOG_IMPLEMENTATION_CHECKLIST** (score grid, target per dart, common UI, etc.).

---

## 1. Data layer (@opp/data)

### 1.1 Lookup by total

- [x] **Option B (dedicated APIs):** Added `getCheckoutCombinationByTotal(client, total)` and `getPlayerCheckoutVariationByTotal(client, total)` in `@opp/data`. GE can call these when remaining changes.
- [x] Implemented in `checkout-combinations.ts` and `player-checkout-variations.ts`; exported from `index.ts`.
- [x] Unit tests: `checkout-combinations.test.ts` (get by total: found / null); `player-checkout-variations.test.ts` (get by total: found / null / UNAUTHORIZED when not signed in).

### 1.2 Types and exports

- [x] `CheckoutCombination` and `PlayerCheckoutVariation` (and payload types) already exported from `@opp/data`.
- [x] `getCheckoutCombinationByTotal` and `getPlayerCheckoutVariationByTotal` exported from `packages/data/src/index.ts`.

---

## 2. Game Engine — loading combinations and variations

### 2.1 When to load

- [x] When the current step is a checkout step (`routine_type === 'C'`): before or when rendering the step, load data needed for route display.
  - **If Option A:** Call `listCheckoutCombinations(supabase)` and `listPlayerCheckoutVariations(supabase)` once when entering the first checkout step (or on session start if session has any C step); store in state (e.g. `checkoutCombinations: CheckoutCombination[]`, `playerVariations: PlayerCheckoutVariation[]`); reuse for subsequent checkout steps and for each “remaining” value.
  - **Option B (implemented):** Call `getCheckoutCombinationByTotal` and `getPlayerCheckoutVariationByTotal` whenever remaining changes (effect depends on visitSelections).
- [x] Handle loading state (e.g. don’t block rendering; show “Loading route…” or omit route until loaded).
- [x] Handle errors (e.g. show nothing for route if fetch fails; log or surface error as appropriate).

### 2.2 Computing remaining

- [x] For the **current attempt/visit**, compute **remaining** as:  
  `remaining = stepTarget - sum(segmentToScore(dart) for each dart already recorded in this visit)`.
- [x] Use the same segment-to-score mapping as existing checkout flow (e.g. `segmentToScore` in `apps/web/src/constants/segments.ts`): S1–S20, D1–D20, T1–T20, 25, Bull, M→0.
- [x] Initial remaining = step target (parsed integer from `step.target`) when no darts have been recorded for the current visit.
- [x] When remaining changes, recompute and refetch combination/variation (effect depends on visitSelections); if using Option B, refetch combination/variation for the new remaining.

---

## 3. Game Engine — display (checkout step)

### 3.1 Routine type

- [x] Display an explicit **checkout** label/badge when `step.routine_type === 'C'` (e.g. “Checkout”, “Checkout step”). Ensure it is clearly distinct from single-dart steps (SS/SD/ST).

### 3.2 Original checkout value

- [x] Display the **original** value the player is checking out from (e.g. “Checkout from: 121” or “Start: 121”). Source: `step.target` parsed as integer (already available in GE for C steps).

### 3.3 Current remaining total

- [x] Display the **current remaining** total (e.g. “Remaining: 121”, then “Remaining: 100”, “Remaining: 60” as darts are added).
- [x] Update remaining in real time as the player records darts in the current visit (before submit). After submit, the next visit starts with remaining = step target again (new attempt).

### 3.4 Recommended checkout combination

- [x] For the **current remaining** total (within 2–170), look up the recommended route from `checkout_combinations` (Option A: from in-memory list; Option B: from get-by-total API).
- [x] If found: display it (e.g. “Recommended: T20, T7, D20” or “Route: dart1, dart2, dart3”, formatting nulls as needed).
- [x] If not found: show “No recommended route” or omit the recommendation (per product/UX).
- [x] When remaining changes (each dart), refresh the displayed recommendation for the new remaining (and for remaining = 0, hide or show “Checkout!”).

### 3.5 Player checkout variation

- [x] For the **current remaining** total and current player, look up `player_checkout_variations` (Option A: from in-memory list; Option B: from get-by-total API).
- [x] If the player has a variation for this total: display it (e.g. “Your route: T19, S12, D25”).
- [x] **Product/UX decision:** When both recommended and player variation exist, show both (e.g. “Recommended: …” and “Your route: …”) or only “Your route” when present. Document the chosen behaviour in this checklist or in OPP_CHECKOUT_UPDATE_DOMAIN.md. **Implemented:** show both when both exist.
- [x] When remaining changes, refresh the displayed “Your route” for the new remaining.

---

## 4. Edge cases

- [x] **Remaining > 170 or < 2:** Do not look up combination/variation; hide or omit route suggestion for that remaining.
- [x] **Remaining = 0:** Attempt success; hide route suggestion or show a success message (e.g. “Checkout!”); no need to show a route.
- [x] **No recommended combination for total:** Show only “Your route” if the player has a variation; otherwise show nothing or “No recommended route”.
- [x] **Player has variation, no recommended combination:** Show only “Your route”.
- [x] **Both recommended and player variation:** Implement the chosen product behaviour (show both vs. “Your route” only).
- [x] **Empty dart1/dart2/dart3:** Format display so null/empty segments are omitted or shown as “—” (e.g. “T20, —, D20” for two-dart checkout).

---

## 5. Testing and documentation

### 5.1 Unit tests (if Option B)

- [x] `getCheckoutCombinationByTotal`: returns row when total exists; returns null when no row for total.
- [x] `getPlayerCheckoutVariationByTotal`: returns player’s variation when present for total; returns null when absent or for other player.

*Implemented in `packages/data/src/checkout-combinations.test.ts` and `player-checkout-variations.test.ts`.*

### 5.2 Manual / integration

- [x] With a checkout step (e.g. target 121): confirm “Checkout” label, “Start: 121”, “Remaining: 121” then decreasing as darts are added; recommended route for 121 and for updated remaining; “Your route” when player has a variation for that total.
- [x] Confirm behaviour for remaining = 0, remaining &gt; 170, and when no combination exists for a total.

**Manual verification steps:** (1) Start a session with a checkout step (e.g. target 121). Confirm "Checkout" badge, "Start: 121", "Remaining: 121"; add darts and confirm remaining decreases and route updates; if the player has a variation for a total, confirm "Your route" appears. (2) For remaining = 0 confirm "Checkout!" and no route; for remaining &gt; 170 or &lt; 2 confirm no route suggestion; for a total with no combination confirm "No recommended route" (or only "Your route" if the player has a variation).

### 5.3 Documentation

- [x] Update **PROJECT_STATUS_TRACKER.md** or release notes when checkout update (route display) is implemented.
- [x] Optionally add a short “Checkout update (route display)” note to **OPP_SCORING_UPDATE.md** or **P8_FEATURES.md** referencing OPP_CHECKOUT_UPDATE_DOMAIN.md and this checklist.

---

## 6. Summary

| Area | Action |
|------|--------|
| **Data layer** | Use existing list APIs with in-memory lookup by total, or add getCheckoutCombinationByTotal and getPlayerCheckoutVariationByTotal. |
| **GE load** | On checkout step (or session with C step), load combinations and player variations (once or per remaining). |
| **GE display** | Show checkout label, original value, remaining (live), recommended combination, player variation (if any); refresh when remaining changes. |
| **Remaining** | Compute from step target minus sum of segment scores for darts in current visit; use same segmentToScore as existing checkout. |
| **Edge cases** | Handle remaining &gt;170, &lt;2, =0; missing combination; variation only; both. |

**Dependencies:** OPP_CHECKOUT_TRAINING_DOMAIN.md (base flow); OPP_CHECKOUT_TRAINING_IMPLEMENTATION_CHECKLIST.md (§1–§8); `checkout_combinations` and `player_checkout_variations` tables and list APIs in `@opp/data`.
