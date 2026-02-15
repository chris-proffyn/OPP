# OPP Match Rating Engine Specification

## Version 1.0

------------------------------------------------------------------------

# 1. Purpose

This document defines the complete logic for the OPP Match Rating
system, including:

-   Match Rating (MR) calculation inputs
-   Overall Match Rating (OMR) calculation
-   Volatility control mechanisms
-   Match eligibility rules
-   Required stored metrics
-   Parameter configuration values

The system is designed such that:

-   Higher values are always better
-   Ratings move up and down over time
-   Volatility is controlled via trimmed rolling averages
-   Match performance and opponent strength are incorporated
-   Longer formats carry slightly more weight

------------------------------------------------------------------------

# 2. Definitions

## 2.1 Match Rating (MR)

MR is a per-match performance score on a 0--100 scale. It incorporates:

-   Opponent strength
-   Match result
-   Leg share
-   Player performance vs personal baseline (3DA and doubles)

MR is assumed to already be computed before OMR calculation.

------------------------------------------------------------------------

# 3. Overall Match Rating (OMR)

OMR is the player's official "match-proven skill level".

OMR is calculated as a trimmed weighted rolling average of the most
recent eligible matches.

Higher OMR = stronger competitive match level.

------------------------------------------------------------------------

# 4. Match Eligibility Rules

A match is eligible for OMR calculation if:

1.  Format is best-of-5 or longer.
2.  Opponent rating is within ±1 PR decade band OR match weight is
    reduced (see weighting section).
3.  Required metrics are recorded:
    -   Total legs
    -   Legs won
    -   3DA
    -   Doubles attempted
    -   Doubles hit
4.  Match completed (no abandonment).

------------------------------------------------------------------------

# 5. Match Format Weighting

Longer matches are more reliable and are weighted slightly higher.

  Format       Weight (w)
  ------------ ------------
  Best-of-5    1.00
  Best-of-7    1.10
  Best-of-9    1.20
  Best-of-11   1.30

If opponent rating is outside ±1 decade: w = w × 0.80

------------------------------------------------------------------------

# 6. OMR Calculation Logic

Let S be the most recent up to 10 eligible matches.

## 6.1 Minimum Match Handling

If number of matches (n):

-   n = 1--5 → OMR = weighted average of all matches (no trimming)
-   n ≥ 6 → apply trimmed calculation

## 6.2 Trimmed Calculation (n ≥ 6)

1.  Sort matches by MR (ascending).
2.  Remove:
    -   One highest MR
    -   One lowest MR
3.  Compute weighted mean of remaining matches:

OMR = (Σ (w_i × MR_i)) / (Σ w_i)

This produces the official rating.

------------------------------------------------------------------------

# 7. Required Stored Match Metrics

Each match record must store:

## Match Metadata

-   Match ID
-   Player ID
-   Opponent ID
-   Match date
-   Format (best-of-N)
-   Leg count
-   Weight factor

## Performance Metrics

-   MR (Match Rating)
-   3DA (match)
-   Player 3DA baseline at time of match
-   Doubles hit
-   Doubles attempted
-   Doubles % (derived)
-   Legs won
-   Legs lost
-   Leg difference

## Opponent Metrics

-   Opponent rating at time of match
-   Rating difference

------------------------------------------------------------------------

# 8. Optional Secondary Metrics

## 8.1 Form Indicator

Form = weighted average of last 3 matches (no trimming).

Used for UI trend display only.

## 8.2 Consistency Score

Compute standard deviation of MR over last 10 matches.

Consistency = 100 − (10 × std_dev)

Clamp between 0 and 100.

------------------------------------------------------------------------

# 9. Parameter Configuration

Default recommended values:

Rolling window size: 10 matches Trim threshold: n ≥ 6 Format weights:
1.00--1.30 (see table) Opponent band tolerance: ±1 decade Out-of-band
weight reduction: 0.80 Consistency scaling factor: 10

These values should be configurable in system settings.

------------------------------------------------------------------------

# 10. Behaviour Characteristics

This system:

-   Prevents single freak matches from dominating rating
-   Prevents single poor matches from collapsing rating
-   Responds gradually to sustained improvement
-   Supports variable match formats
-   Remains intuitive and explainable

------------------------------------------------------------------------

# 11. Pseudocode

function calculateOMR(playerId):

    matches = getLastEligibleMatches(playerId, 10)

    if len(matches) <= 5:
        return weightedAverage(matches)

    sort matches by MR

    trimmed = matches[1:-1]

    return weightedAverage(trimmed)

------------------------------------------------------------------------

# End of Specification
