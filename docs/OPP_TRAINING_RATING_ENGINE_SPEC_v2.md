# OPP Training Rating Engine Specification

## Version 2.0

------------------------------------------------------------------------

# 1. Purpose

This document defines the full rating system for OPP,
including:

-   Baseline Rating (BR)
-   Initial Training Assessment (ITA)
-   Training Rating (TR)
-   Training scoring logic
-   Level progression and regression rules
-   Lookup tables and sliding scales
-   Required data structures

The Training Rating system:

-   Operates on a 1--99 scale
-   Higher values indicate greater training-proven skill
-   Updates dynamically based on training performance
-   Drives adaptive difficulty in training routines

------------------------------------------------------------------------

# 2. Training Rating (TR)

TR represents a player's current training-proven skill level.

Range: 1--99
1 = Total beginner
99 = Elite professional

TR determines training targets and performance expectations.

------------------------------------------------------------------------

# 3. Baseline Rating (BR)

Players start with a Baseline Rating (BR).

Two supported models:

## Option A -- Default Entry

All players start at Level 0.

## Option B -- Initial Training Assessment (ITA)

Players complete an ITA to determine BR.

BR may be:

-   50% of ITA score (to allow headroom for progress), or
-   Equal to ITA score (recommended for clarity).

BR becomes the initial Current Rating (CR).

------------------------------------------------------------------------

# 4. Initial Training Assessment (ITA)

## 4.1 Structure

The ITA consists of three combined routines:

1.  Singles
2.  Doubles
3.  Checkout

All routines are completed in one session.

------------------------------------------------------------------------

## 4.2 Singles Routine

Segments: e.g. 20, 16, 12, 19, 1
9 darts thrown per segment

Score per segment = hits / 9 × 100
Singles Score = average of segment scores

Example round (1 Visit = 9 darts thrown):
Visit Segment Hits   %
1      20     2/9  = 22%
2      16     3/9  = 33%
3      12     1/9  = 11%
4      19     3/9  = 33%
6      1      4/9  = 44%

Average = 26.4%

Singles Rating = Direct mapping
Example: 26.4% → L26.4

------------------------------------------------------------------------

## 4.3 Doubles Routine

Segments: 20, 10, 16, 8, 4

Measure: average darts required to hit the double.

Sliding scale conversion:

  Darts to Hit   Rating
  -------------- --------
  1 dart         100
  2 darts        90
  3 darts        70
  4 darts        50
  5 darts        30
  >5 darts       0

Linear interpolation applies between integer values.

Example: 5.7 darts → interpolates to rating ≈ 9

------------------------------------------------------------------------

## 4.4 Checkout Routine

Checkouts: 56, 39, 29, 23, 15

Measure: number of darts required above minimum checkout.

Sliding scale conversion:

  Checkout Performance   Rating
  ---------------------- --------
  Minimum darts          100
  Min +1                 80
  Min +2                 60
  Min +3                 40
  Min +4 or more         20
  Min +10 or more        0

Example: Average = Min +2
Rating = 80 (per defined mapping example)

------------------------------------------------------------------------

## 4.5 ITA Calculation

ITA Score =

(3 × Singles Rating
+ 2 × Doubles Rating
+ 1 × Checkout Rating) / 6

Example:

Singles = 26.4
Doubles = 9
Checkout = 80

ITA = (3×26.4 + 2×9 + 1×80) / 6
ITA = 29.53

Rounded down → L29

------------------------------------------------------------------------

# 5. Current Rating (CR)

CR = Player's live Training Rating.

CR is updated after each session using progression logic.

CR is clamped between 1 and 99.

------------------------------------------------------------------------

# 6. Training Scoring Mechanism

All routines follow identical scoring structure.

## 6.1 Dart-Level Recording

For every dart:

-   Dart number
-   Target segment
-   Actual segment hit
-   Hit/miss flag
-   Timestamp (optional)

------------------------------------------------------------------------

## 6.2 Round Score

Round Score (%) = (Actual Hits / Target Hits) × 100

Scores may exceed 100%.

------------------------------------------------------------------------

## 6.3 Session Score

Session Score (%) = Average of Round Scores.

Session Score drives level progression.

------------------------------------------------------------------------

# 7. Level Requirements

Level requirements are defined per decade.

  Level Range   Target %   Hits Required (per 9 darts)
  ------------- ---------- -----------------------------
  0--9          0%         0/9
  10--19        11%        1/9
  20--29        22%        2/9
  30--39        33%        3/9
  40--49        44%        4/9
  50--59        55%        5/9
  60--69        66%        6/9
  70--79        77%        7/9
  80--89        88%        8/9
  90--99        99%        9/9

This mapping must be stored in the database and be configurable.

------------------------------------------------------------------------

# 8. Progression Logic

After each session:

  Session Score %   Level Change
  ----------------- --------------
  < 50%            -1
  50--99%           0
  100--199%         +1
  200--299%         +2
  ≥ 300%            +3

CR = CR + Level Change
Clamp between 1 and 99.

Players require approximately 4 sessions to move one decade.

------------------------------------------------------------------------

# 9. Required Data Structures

See OPP_PLATFORM.md for further details about the required data model

------------------------------------------------------------------------

# 10. System Characteristics

The Training Rating system:

-   Quantifies technical accuracy
-   Separates Singles, Doubles, and Checkout skill
-   Uses weighted ITA baseline
-   Encourages overperformance
-   Penalises underperformance
-   Drives adaptive difficulty
-   Remains transparent and configurable

------------------------------------------------------------------------

# End of Specification
