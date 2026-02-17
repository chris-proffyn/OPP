# SCORING UPDATE

We need some changes to the current system behaviour

## Routine Types

There are 2 types of routine: Single dart routines - ie. a routine that can be completed in a single throw e.g. S10, or D20, Checkout routines - i.e routines that require more than a single dart to complete e.g. checkout from 41

The different routine types require different scoring calculations and configuration data

### Single dart routines.

This is the current scoring method coded into the app. A target segment is set. The player is allowed a pre-determined number of darts (darts_allowed in level_requirements table) according to their ability level. The player's score is calculated based on the number of successful hits on the target segment compared to the expected hit number (tgt_hits) according to their level

#### Single dart routines - Single, Double, Treble segment

Within the routine_type of S, there are sub-types of Single [S], Double [D] and Treble [T]. These denote whether the target segment is a single, double or treble. This gives us routine_types for single dart routines of SS, SD and ST

So we need to add a column routine_type to to the routine_steps table.
We also need to add a column routine_type to the level_requirements table

#### Single dart scoring

The player will still be allowed the same number of darts at the target segment. The difference will be in the expected number of hits. e.g. A L30 player throwing 9 darts will be expected to hit a single segment 3 times, a double segment twice (e.g. 66% of the single segment expectation) times and a treble segment 1 (e.g. 33% of the single segment expectation) time. This ratio should be made configurable in an admin portal screen

The scoring calculation is unchanged. Number of successful hits versus expected number (can be >100%)


### Checkout routines

This is not currently coded into the platform. In these routines, more than a single dart is requried to complete the routine. e.g. minimum checkout target is 3 (1,D1) requiring 2 a minimum of darts and maximum is 170 (T20,T20,Bull) requiring a minimum of 3 darts

### Checkout dart scoring

The player will be given a checkout target, an expected number of darts to checkout the target, and the maximum number of allowed throws/visits. The players throws are recorded. If they checkout within the tgt number of throws, then their score is calculated.

For a given level, the expectation will be given e.g. checkout in Min+3 2 or more times. this provides a similar scoring system to the single dart scoring

e.g. A level 20 player is expected to checkout a C2 checkout in Min +3, 2/9 times. This means we can still use the level_requirements table as is, we just need a different scoring routine for checkout

The logic should be:

1. What is the routine_type = Checkout Type
2. What is the checkout value = 121
3. How many darts should the player take (lookup player level, and check against the checkout_requirments table) = 6 (min+4)

## Data model changes

### routine_steps
Add a routine_type to the routine_steps table. allowed values are SS, SD, ST, C2, C3

### level_requirements
Add a routine_type to the routine_steps table. allowed values are SS, SD, ST, C2, C3.

This extra columns allows admins to configure the expected tgt_hits value for other routine_types than SS

### Multiple dart routines - scoring

For types C2,C3 the scoring logic must reference the type to determine the minimum number of darts possible when calculating the routine score.

#### Checkout requirements







