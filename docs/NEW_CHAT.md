# Proffyn Rapid Solution Delivery (RSD)
## NEW_CHAT – Cursor Re‑Orientation Guide

**Document Type:** Session Re‑Orientation & Context Reset  
**Applies To:** All Proffyn RSD Projects  
**Audience:** Cursor  
**Status:** v1.0 (Baseline)

---

## 1. Purpose of This Document

This document exists to help **Cursor quickly and safely re‑familiarise itself with an RSD project** at the start of a new chat or session.

It is designed to:
- Restore project context after chat resets
- Reduce incorrect assumptions
- Reinforce RSD operating rules
- Ensure continuity across sessions

This document is **not** a project plan and **not** a requirements document.

---

## 2. How Cursor Should Use This Document

At the start of every new chat, Cursor must:

1. Read this document in full
2. Re‑establish project context using the steps below
3. Confirm understanding before executing tasks

Cursor must treat this document as a **session bootstrap**.

---

## 3. Step 1: Identify the Project Context

Cursor must determine:

- What product or platform this repository represents
- Whether this is:
  - a new RSD project
  - an in‑flight project
  - a maintenance / extension phase

Cursor should **not assume** project goals, users, or scope.

If unclear, Cursor must ask.

---

## 4. Step 2: Read Mandatory Governance Documents

Before planning or coding, Cursor must re‑read the following files (if present):

1. `.cursorrules`
2. `PROJECT_STATUS_TRACKER.md`
3. `PRODUCT_REQUIREMENTS.md` (project‑specific)
4. `RSD_FOUNDATION_OVERVIEW.md`
5. `RSD_SYSTEM_ARCHITECTURE.md`
6. `RSD_UX_DESIGN_FRAMEWORK.md`
7. `RSD_DATA_MODELLING_GUIDE.md`
8. `RSD_TESTING_STRATEGY.md`
9. `RSD_ADMIN_PORTAL_GUIDE.md`
10. `RSD_DEVELOPMENT_APPROACH.md`

If any required document is missing, Cursor must **stop and report this**.

---

## 5. Step 3: Re‑Establish Architectural Assumptions

Unless explicitly overridden, Cursor must assume:

- Modular monolith architecture
- Shared codebase for web and mobile
- Supabase for authentication, database, RLS, and storage
- Netlify for web hosting
- GitHub for source control and CI/CD
- Jest‑based testing
- Component‑first UI development
- Mobile‑first UX decisions

Cursor must not propose architectural deviations without justification.

---

## 6. Step 4: Determine Current Project State

Using `PROJECT_STATUS_TRACKER.md`, Cursor must identify:

- Current phase (e.g. discovery, build, stabilisation)
- In‑progress tasks
- Blockers or risks
- Recently completed work

Cursor should summarise this state **before taking action**.

---

## 7. Step 5: Clarify the Immediate Objective

Before executing work, Cursor should explicitly confirm:

- What the user is asking for in this session
- Whether this is:
  - planning
  - implementation
  - refactoring
  - documentation
  - review
- What "done" looks like

If the request is ambiguous, Cursor must ask clarifying questions.

---

## 8. Execution Rules Reminder

During the session, Cursor must:

- Work in small, atomic steps
- Avoid speculative changes
- Respect testing and quality gates
- Propose changes before executing large updates
- Flag risks or rule violations early

Cursor must not:
- Bypass RLS
- Disable tests
- Introduce new tech stacks
- Make large refactors without approval

---

## 9. When Cursor Must Stop

Cursor must pause and ask for guidance if:

- Requirements are unclear
- A rule conflict is detected
- A change affects data models or security
- The request implies architectural deviation
- The scope appears to be expanding unintentionally

Cursor should present **1–3 concrete options** when stopping.

---

## 10. Session Start Checklist (Quick Reference)

At the start of a new chat, Cursor should be able to answer:

- What is this project?
- What phase is it in?
- What rules govern me?
- What is the next concrete task?
- What constraints must I not violate?

If any answer is unclear, Cursor must ask.

---

## 11. Summary

This document exists to ensure that **every new Cursor session starts grounded, aligned, and safe**.

It prevents:
- Context drift
- Re‑litigation of decisions
- Accidental rule violations
- Inconsistent delivery behaviour

Cursor should treat this document as the **entry point to all RSD work**.
