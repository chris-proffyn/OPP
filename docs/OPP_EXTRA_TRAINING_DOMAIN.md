# EXTRA PLAYER TRAINING

This documents the capability to allows players to perform training sessions in addition to the schedule ones inside their cohort/schedule


## Replay session

If a player has already completed a session, this feature will allow them to replay the session. This can be useful when the player feels they underperformed during the session and would like to repeat the practice

### Updated session score

If a player elects to repeat a session, their new result will be combined with the previous one, i.e. the new session score will be a combination of the previous and the new one. If they elect to further repeat the session, then the session score will be an average of their session scores.

Review the data model. it will need to be updated to allow multiple sessions to be executed against the same cohort/schedule

### Session attempts.

OPP should display the number of times, a player has executed a session. This information should be displayed wherever session information is displayed.

## Free Training

Feature available for platinum members only. Platinum level members can choose to execute a particular training routine. Accessible via the PlayLandingPage. Platinum members will see a button "Free Training". Clicking this button will route to a page that allows the player to select an existing training routine. 

Create a version of the AdminRoutinePage that displays the existing routines. add the option to view the routine steps. add the option to play the routine.

### Free training score recording.

A player's performance in a free training routine, will not count towards any schedule or session. It will still be recorded in the darts_scores table. 

You will need to create additional metadata to allow free training data to be stored the darts table.

Apart from a report that directly queries the darts_scores table, this free training data does not need to be reportable.












