# OPP platform

Here are the key elements of the OPP platform

## Players

A player is a registered user on the platform. We will store basic personal information about each player, which will be maintainted in a players table:

table name: players
table description: Contains basic details of all the registered players:

id - table row ID
displayName - Player nickname
email - contact email
gender - gender m/f/d
ageRange - Decades from 20-29,30-39,40-49,...
BaselineRating [BR] - see BR definition
trainingRating [TR] - See TR definition
matchRating [MR] - See MR definition
dateJoined - Date joined platform

Example would be:
P0000001
Barry26
bartholemew.jones@bigbank.com
M
45-54
23
34
35
01-02-2026


## Cohorts

A cohort is a collection of players of similar ability who will train as a group for a finite period of time, all training to a common training pattern and schedule

Cohorts will be finite entities that are created, joined, and then closed down

Players will have join multiple cohorts, but only one at a time

table name: cohorts
table description: Contains details of the different training cohorts (groups of players):

id - table row ID
cohortId - UUID for cohort
name - Name of cohort
level - Decade range (e.g. 20 = 20-29)
startDate - Start date of cohort
endDate - End date of cohort
scheduleId - UUID for training schedule being followed


Example row:
C0000001
BanjaxFruitcake-Mar2026 (Two random words joined together || date)
20
02-03-2026
11-04-2026
S00000001



## Cohort Members

Cohort members are those players who have been assigned to train together.

table name: cohort_members
table description: Assigns players into a particular cohort:

id - table row ID
CohortId - Cohort UUID
playerId - Player UUID

C0000001
P0000001

C0000001
P0000002 etc...



## Training Schedules

A cohort will all follow a common set of routines, grouped together to form a schedule. The schedule will comprise multiple sessions. The schedule tells us how many days the schedule runs for, how many sessions will take place each day, which sessions will take place. It doesn't tell us the datetime of the session, nor what the session invovles.

table_name: schedules
table_description: Describes which sessions are in which schedules

id - UUID
name       - Descriptive name for Schedule
DayNo      - Training Day Number (1 - first day of training .. N - final day of training)
sessionNo  - Which session during the day (may be multiple at advanced levels)
sessionId  - Session UUID

Examples names might be:
Beginner Weekly (1 30 minute session per week)
Beginner Daily (1 30 minute session per day)
Intermediate Daily (1 60 minute session per day)
Advanced Daily (3 45 minutes sessions per day)

Example rows:

S0000001
Beginner Weekly
1
1
SE000001

S0000001
Beginner Weekly
2
1
SE000001


## Training Sessions

A session is a collection of routines, Sessions are grouped together to form a schedule. A session will comprise multiple routines, to be performed in a specific order.

table name: sessions
table description: Describes which routines are in each session:

id - Session UUID
sessionName - Name for session
routineNo - routine running order - session will comprise multiple routines
routineId - routine UUID

Examples rows:

SE000001
Beginner Daily
1
R0000001

SE000001
Beginner Daily
2
R0000002

SE000001
Beginner Daily
3
R0000003


## Training Routines:

A routine is a collection of individual tasks, e.g. Hit 10 big segments. Routines are combined together to form a session. A routine will be comprised of multiple tasks. A task is a single throw for the player and will involve throwing at a specific single target (e.g. S20, T20, Bullseye) - A task is the smallest unit in OPP

table name: routines
table description: Provides the details for each training routine:

routineId - UUID for routine
routineName - Name for routine
routineDesc - Description
routineNo - Which step in the routine
target - Target to aim for

Example rows:

R0000001
Singles
Aim at specific big segment
1
1

R0000001
Singles
Aim at specific big segment
2
3

R0000001
Singles
Aim at specific big segment
3
20

R0000001
Singles
Aim at specific big segment
4
16

R0000001
Singles
Aim at specific big segment
5
10




## Schedule Calendar

A planned calender of practice will be created for each cohort. On any given day, players will be required one or more training sessions. We need to know when the session is occuring, who is involved and what they are doing for that session

table name: calendar
table description: calendar to store all planned cohort sessions

id - UUID
datetime   - datetime 
cohortId   - Cohort UUID - Gives us who is involved and what schedule is being followed
scheduleId - Schedule UUID - Could be derived from cohort, but makes data reading easier for admin
dayNo      - Which day of the schedule are we at (e.g. Day 29)
sessionNo  - Which session are we at (e.g. 2 - Day 29, 2nd session of the day)
sessionId  - Which session is to be followed


## Player calendar

A player specific calendar that contains all the training sessions for that player

id - UUID
playerId   - Player UUID
calendarId - Calendar UUID
status     - Status (planned, completed)


## Player Session Scores

Table containing player session scores. See OPP_RATING_ENGINE_SPEC_V2.md for details about session scoring

trainingId - UUID for that training event
playerId   - Player UUID
calendarId - Event UUID - gives us all the information about what the session involves
sessionScore - % score for that player



## Player routine scores

Table containing player routine scores. See OPP_RATING_ENGINE_SPEC_V2.md for details about routine scoring

Id - UUID for the table
playerId
trainingId
routineId
routineScore - % score for that routine



## Player Scores recording

All players scores will be recorded. At the dart (visit), round and session levels. See OPP_TRAINING_RATING_ENGINE_SPEC_V2.md for details about scoring

### dart_scores (this will be a big table)

Every throw will be recorded in this table (We might create a summary table in the future). Each throw will record the expected result, the actual result, the associate routine, session

table name: dart_scores
table description: A low level record of every dart thrown, which session it's from, who threw it, what was the outcome

playerId   - who is playing
trainingId - which event is taking place.
routineId  - which routine are they following
routineNo  - which part of the routine they are following
dartNo     - Which dart they are throwing (1..9 probably)
target     - What are the aiming for
actual     - What did they hit
result     - Hit or Miss H/M


Example rows:

P0000001
E0000001
R0000001
1
1
S20
S1
M

P0000001
E0000001
R0000001
1
2
S20
S20
H

P0000001
E0000001
R0000001
1
3
S20
S20
H

P0000001
E0000001
R0000001
1
4
S20
T5
M


## Level Requirements

Provides the target performance levels for each routine. Any level can be applied to any routine. Success/Failure is determined based against the expected performance level. See OPP_TRAINING_RATING_ENGINE_SPEC_V2.md

levelId  - UUID for Level
minLevel - Entry level e.g. 20 (Levels 20-29), 30 (Levels 30-39), etc... 
tgtHits  - Requried number of hits e.g. 2
dartsAllowed - Number of darts to be thrown, Usually this will be 9 (3 visits)

Example rows:

L00000001
0
1
9

L00000003
30
3
9


# OPP Admin Portal

The OPP admin portal is where all the platform components are configured:

Player profiles - View
Calendars - CRUD
Schedule details - CRUD
Session details - CRUD
Routine details - CRUD
Level Requirements details - CRUD
Cohorts - CRUD
Cohort members - CRUD
Competition - CRUD

The admin portal will also show player performance data:

Cohort data
Cohort session specific data
Competition data




# OPP Game Engine

This document details the key elements and behaviour of the OPP game engine. The game engine controls the various training sessions that players are required to complete. See OPP_TRAINING_RATING_ENGINE_SPEC_V2.md,  See OPP_MATCH_RATING_ENGINE_SPEC_V2.md

## Game orchestrator [GO]

The GO provides all the orchestration functionality for OPP. It does the following:

Manages player notifications  - DAY 2 - Singles practice due on 2026-03-01 2000
Manages player sessions - Guides player through the training session
Records player performance - Records every player throw. Calculates and stores routine and session scores
Updates player ratings - based on performance, GO will update the players TR, MR and PR


## GE processes

Accessed via Player Dashboard, Notifications screen, or Menu item

GE Landing Page will show available sessions
Available sessions will be the next scheduled session + any missed sessions (Design decision. Do we want missed sessions to expire after a period, e.g. 1 day)
Player will select the desired session to complete

GE will display Game screen.

Game screen shows the details for that session:

Player Name
Current Ratings (PR, TR, MR)
Cohort
Schedule
Day No
Session No
Session Name
Progress (x/y routines complete)
Current session score

### Session start

To commence the session, player will click or Say "Go!"

GE will also display the current routine details

Routine name - e.g. SINGLES
Step No - e.g. 1
Target Segment - e.g. Single 20
Last Visit - e.g. S20, S5, T1
Visit No - e.g. 3
Expected Score - e.g. 2/9
Current score - 3/6

At the start of the session, the routine scoring value will be empty.

OPP will display and describe (using voice controls) the routine objectives and player expected performance levels

The GE will guide the player through the routines that make up the session. Each throw will be saved. At the end of each routine, the routine score will be saved and GE will progress to the next routine. When all routines for that session have been completed. GE will end the session and the overall scores (Session and individual routine) will be displayed.

The GE will close and return the player back to the dashboard


## Session and Routine scores

We need to track players' performance for each session and routine instance

We need a Session managment process, that orchestrates the session, works out which routines are requried, then guides the player through each routine, recording scores at the dart, routine and session level.



## OPP Match Engine [ME]

An extension of GO, ME will orchestrate competition events for OPP



## Training Rating [TR]

see document OPP_TRAINING_RATING_ENGINE_SPEC_V2.md


## Match Rating [MR]

See the document OPP_MATCH_RATING_ENGINE_SPEC.md


## Player Rating [PR]

PR is a metric used across OPP to quantify a players current skill level

PR combines a player's TR and MR together to get a hybrid rating.






## Score input mechanism

Game mechanics will be as follows:

Required Player Tasks: Visual prompting by OPP + Voice announcement by OPP
Task outcome input: Via Voice input by user or manually via UI


# Player Dashboard

This screen will provide the player with the following information:

Name/Nickname
Image/Avatar
Current Cohort details
Cohort name, 
Start/End date
Current cohort ranking (toggle-able via feature flag - could be demoralising if low)
Date of next training session
Date of next Competition

Current PR, MR and TR (with trend arrows)
Link to performance analyzer

Links to Cohort WhatsApp chat - Future Feature
[Links to Facebook] - Future feature

# Cohort Chat

Cohort communication will be possible, but done outside of OPP platform
We will interface to WhatsApp, where a cohort specfic chat will be created.


# Performance Analyzer

Depending on the player membership level, this provides detailed analysis of a player's training and match performances

Free Tier
Current TR (Note: PR and MR are premium features)
Basic session history (limited to session and routine scores. Individual darts scores are premium features)
Basic session trends (e.g. Singles performance - last 30 days. Note: All time trends are a premium feature)

Gold Tier
As platinum without AI

Platinum Tier
Current PR, TR, MR
Session history - full record of all sessions, routines and darts thrown
Session trends (e.g. Singles performance - last 30 days, 90 days, all-time)
Match History - full record of all matches
AI analysis - AI engine powered analysis providing insight into focus areas, etc...



