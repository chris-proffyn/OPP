# DARTS SCORE DOMAIN

This document details the capability for players to view reporting data about their individual darts scores

## Darts_scores

Every single player throw is stored in the darts_scores table. This data is used to calculate routine and session scores for the player.

We need a view that gives the player an atomic breakdown of their performance.

## Target vs Actual

Every throw a player takes is aimed at a specific segment (Target), every throw, will hit an absolute segment (Actual).

For each segment, it is possible to calculate a success %.

We need a view that allows players to see this data. consider how players might want to view.

consider whether it makes sense to create summary tables, or calculate summarised information on-the-fly.

## UI

This data should be added to the AnalyzerPage.

## Permissions

This feature is for platinum members only. If a user is not a platinum member, display the title and display a message saying this is a platinum member features.








