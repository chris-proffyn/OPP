# OPP ROUTINE DOMAIN

The page describes the behaviour for the routine page.

Currently gameplay is managed via the PlaySessionPage. PlaySessionPage displays information pertaining the session and the current routine and routine step


## ROUTINES

Extend the PlayScreenPage to display the following:

### Player information
- Player Nickname
- Training Rating

### Session
- current session name
- current session score
- current routine (e.g. 1 of 3)
- current routine name

All lower level information - e.g. further routine information and routine step information should be moved to a new screen RoutineStepPage

## ROUTINE STEPS

We need to make the gameplay more immersive and with a better UI. When the player is mid session - they will be focussed on completing one routine step at a time

### routineStepPage high level information

This page should display the following in a compact format:
- Routine Name
- Game instructions

### routineStepPage detailed information
- Score input mode (Voice/Manual)
- Target segment
- Current routine step scores - This should be broken down by Visit e.g. Here is the required display for a 3 visit routine step:

Visit 1: S20, S1, T5
Visit 2: M, S1, T5
Visit 3: T20, T5, M

Routine steps will always include a multiple of visits. Create the above detail in the most space efficient way - e.g. grid.

### Visit correction

Add a correct visit button. Clicking this should remove the player's last visit from the system.

### Score Input

It needs to be as easy as possible for players to input their score manually. The main portion of the routine step page should display the score input grid. Note: This must be sized to display efficient on a mobile device in portrait mode - Resolution: 1170x2532 pixels or similar.










