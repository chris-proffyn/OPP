# Project Status Tracker Guide

**Document Type:** Governing Pattern & Usage Guide  
**Applies To:** All Proffyn RSD Projects  
**Audience:** Proffyn Delivery Team, Cursor (conceptual reference)  
**Status:** Canonical  

---

## 1. Purpose of This Document

This document defines **how Project Status Trackers work** in Proffyn Rapid Solution Delivery (RSD).

It is:
- A **guide and governing pattern**
- A **reference for structure, intent, and behaviour**
- **Not** a live project tracker

For each project, a **separate, project-specific document** named:

> `PROJECT_STATUS_TRACKER.md`

must be created **using the principles and structure defined here**.

---

## 2. What a Project Status Tracker Is

A project’s `PROJECT_STATUS_TRACKER.md` is the **authoritative runtime control document** for that project.

It combines two responsibilities:

1. **State control**
   - How the project must be treated *right now*
   - What Cursor may and may not do
   - Active constraints and exclusions

2. **Execution tracking**
   - What has been completed
   - What is in progress
   - What is blocked or deferred

It replaces the need for separate “state” and “status” documents.

---

## 3. What This Guide Is Not

This document:

- ❌ Is not edited per project
- ❌ Is not read by Cursor at runtime
- ❌ Does not contain project-specific information
- ❌ Does not track progress

It exists solely to ensure **consistency and discipline** across projects.

---

## 4. Required Behaviour Per Project

For **every new RSD project**:

1. Create a new file named `PROJECT_STATUS_TRACKER.md`
2. Base it on the structure and rules defined in this guide
3. Populate it with:
   - Current project state
   - Initial focus
   - Known constraints
4. Treat it as:
   - The **highest-authority project-specific document**
   - Mandatory reading at the start of every Cursor session
   - Use it to understand the high level plan and current status

---

## 5. Authority Model

Within a project, `PROJECT_STATUS_TRACKER.md`:

- Is subordinate only to `.cursorrules`
- If there is a conflict, the codebase should take precedence, but any discrepencies must be highlighted to the user

---

## 6. Maintenance Rules

- The project tracker is updated by Cursor after each development change
- It is expected to change frequently

---

## 7. Summary

- This document defines **how trackers behave**
- Each project has **one live tracker**
- Cursor obeys the project specific tracker and keeps it accurate and up to date
- Consistency across projects is non-negotiable

This separation is intentional and critical to RSD discipline.

---

