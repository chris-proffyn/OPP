# COHORT MANAGEMENT

This document details the expected behaviour around the creation and management of cohorts, allocation of players, etc.

## Cohort

A cohort is a collection of players that have been grouped together to follow a common training schedule

## Cohort Status

New concept. Cohorts can be at different status - indicating their level of maturity. The following status are available: DRAFT, PROPOSED, CONFIRMED, LIVE, OVERDUE, COMPLETE

The current data model will need extending to accomodate cohort_status

### Draft cohort

When a cohort is first created, but not yet populated with players, it will have a status of draft. Draft cohorts can be fully edited.

### Proposed cohort

When the cohort first gets players assigned to it, this moves the cohort onto a status of proposed. When OPP automatically assigns players to a cohort, the cohort will have a status of proposed. Proposed cohorts can still be edited

### Confirmed cohort

When the admin is happy with the player assignment, they will approve the cohort, moving it to a status of confirmed. This will prevent any further modifications being made to the cohort details (e.g. Start date, schedule, etc...)

### Live Cohorts

Once the start date arrives, the cohort will move to a status of LIVE. It will remain at a status of live until all players have completed all the training sessions.

### Overdue cohorts

If the planned Cohort end date (start date + Duration) passes without all the training sessions completing, the cohort will move to a status of overdue. This requires the admin to take action



## Cohort Size

A cohort can theoretically be of any size. Considerations when choosing to populate a cohort:

 - Total number of players requring a cohort
 - Spread of skills among players - i.e. the range of player abilities should be relatively small within a cohort (ideally with 10-15)
 - When Competition mode is enabled, competitions will be arranged within the cohort, so a total cohort population that lends itself to some kind of competition format is best - Future Feature See OPP_COMPETITIONS_DOMAIN.md
 
 ## Cohort Management
 
 Currently we have the AdminCohortPage. This shows the active cohorts. From here admins can see the number of members, the start/end date. the average rating level (info only), competition setting. The admin can also carry out other duties here.
 
 We need to extend this page as follows:
 
 ### Players awaiting cohort assignment
 
 We should see a list of players who do not yet have a cohort assigned to them.
 
 This list should show the players current player rating to assist in finding them an appropriate cohort to train in.
 
 ### Bulk Assignment
 
 It should be possible to populate cohorts in bulk. In this mode, the admin will choose the following:
 
 - Cohort naming convention
 - number of players per cohort
 - Required full cohort: Y/N (allows for partially filled cohorts)
 - Start Date
 - Duration
 - Match Level: Y/N (determines whether or not players will be grouped together according to skill level)
 - Level proximity: (Numeric) - How close players should be in skill
 
 The admin will then click "Assign players". Based on the input parameters, OPP will assign the players to cohorts and then present them to the admin for approval. Here the admin has the option to accept, or fine tune the cohort members.
 
 
 
 ### Cohort fine tuning
 
 Cohorts in either draft or proposed statuses can be edited by admins. This includes removing players from the cohort - revert them back to unassigned. Admins can also direct move players from one cohort to another cohort (at an editable status of draft or proposed)- create functionality to allow this.
 
 









