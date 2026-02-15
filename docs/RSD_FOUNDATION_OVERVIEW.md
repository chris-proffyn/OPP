# Proffyn Rapid Solution Delivery (RSD)

## Foundation Overview

**Document Type:** Foundational Governance  
**Applies To:** All Proffyn RSD Projects  
**Audience:** Cursor, Proffyn Delivery Team  
**Status:** Draft v0.2  

---

## 1. Purpose of This Document

This document defines the **canonical foundation** for all **Proffyn Rapid Solution Delivery (RSD)** projects.

It exists to:
- Standardise how digital products are designed, built, tested, and delivered
- Encode Proffyn’s delivery philosophy into enforceable documentation
- Ensure Cursor operates within strict, repeatable constraints
- Enable rapid project spin-up without sacrificing quality or architectural integrity

This document is **project-agnostic** and **must not contain client-specific or product-specific details**.

---

## 2. Core RSD Principles

All RSD projects adhere to the following non-negotiable principles:

### 2.1 Opinionated by Design
RSD does not attempt to support all possible approaches.  
It encodes a **single, proven delivery model** optimised for speed, clarity, and maintainability.

### 2.2 One Codebase, Multiple Platforms
All solutions assume:
- A **shared codebase** feeding:
  - Web
  - iOS
  - Android
- Platform-specific divergence only where technically unavoidable

### 2.3 Reuse Over Reinvention
Before introducing anything new:
- Reuse existing patterns
- Extend established abstractions
- Prefer configuration over customisation

### 2.4 Cursor as Executor, Not Architect
Cursor is treated as a **high-speed implementation engine**, not a decision maker.  
All architectural, UX, and product decisions must be driven by documentation.

---

## 3. Standard RSD Technology Assumptions

Unless explicitly overridden in a project-specific document, all RSD projects assume:

### 3.1 Frontend
- Single shared codebase
- Web + Mobile delivery
- Component-driven architecture
- Mobile-first design approach

### 3.2 Hosting & Deployment
- Web applications deployed via **Netlify**
- CI/CD automated via repository integration
- Environment separation (dev / staging / production)

### 3.3 Backend & Infrastructure
- **Supabase** as the primary backend:
  - Authentication
  - Database (Postgres)
  - Storage
  - Row Level Security (RLS)
- No direct database access from UI layers
- All access governed by RLS and data-layer APIs

### 3.4 Design & UX
- Shared design system
- Limited, controlled theming
- Accessibility by default
- Reusable components over bespoke UI

These assumptions **must not be redefined** in individual projects unless there is a strong, explicit reason.

---

## 4. Canonical RSD Document Set

Every RSD project **must include** the following documents.

---

### 4.1 Foundational (Generic, Reusable)

These documents are **identical or near-identical across all projects**:

1. **RSD_FOUNDATION_OVERVIEW.md**  
   - Defines the RSD delivery system and rules  
   - This document

2. **RSD_SYSTEM_ARCHITECTURE.md**  
   - High-level architecture
   - Platform assumptions
   - Data flow and security model

3. **RSD_UX_DESIGN_FRAMEWORK.md**  
   - Design principles
   - Component model
   - Accessibility standards
   - Interaction patterns

4. **RSD_DEVELOPMENT_APPROACH.md**  
   - Coding standards
   - Repository structure
   - Cursor execution rules
   - Quality gates
   - Reference model for status tracking

5. **RSD_TESTING_STRATEGY.md**  
   - Testing philosophy
   - Required test types
   - Acceptance and regression expectations

6. **.cursorrules**  
   - Enforcement mechanism
   - Mandatory references
   - Behavioural constraints for Cursor

These documents **must remain generic** and reusable.

---

### 4.2 Project-Specific (Per Client / Product)

These documents **must be customised per project**:

1. **PRODUCT_REQUIREMENTS.md**
   - Product vision
   - Scope
   - Functional and non-functional requirements
   - Business rules and constraints

2. **PROJECT_STATUS_TRACKER.md**
   - Authoritative source of *current project state*
   - Tracks:
     - Current focus
     - Active constraints
     - Development pauses or resumptions
     - What is in progress, completed, blocked, or deferred
   - Combines **state control** and **execution tracking**
   - Must be reviewed at the start of every new Cursor session

3. **DELIVERY_TASK_MAP.md** (optional but recommended)
   - Defines delivery phases and capabilities
   - Logical sequencing and dependencies
   - Entry and exit criteria per phase
   - Structural plan only (no status or progress tracking)

---

## 5. Document Precedence Rules

When documents conflict, **precedence is strictly enforced**:

1. `.cursorrules`
2. `PROJECT_STATUS_TRACKER.md`
3. `PRODUCT_REQUIREMENTS.md`
4. `DELIVERY_TASK_MAP.md`
5. `RSD_SYSTEM_ARCHITECTURE.md`
6. `RSD_UX_DESIGN_FRAMEWORK.md`
7. `RSD_DEVELOPMENT_APPROACH.md`
8. `RSD_TESTING_STRATEGY.md`

Key rule:
- **Current state overrides planned work**
- **Plans override historical status**
- **Status never overrides architecture or product intent**

---

## 6. Markdown-Only Rule

All RSD documentation:
- **Must be written in Markdown**
- **Must be downloadable**
- **Must live inside the project repository**
- **Must not rely on external tooling or formats**

This ensures:
- Portability
- Version control
- Cursor compatibility
- Long-term maintainability

---

## 7. Template Project Usage

The RSD template project:
- Contains all foundational documents
- Includes placeholder project-specific documents
- Is duplicated at the start of every new engagement

At project start:
1. Copy the template project
2. Populate project-specific documents only
3. Do not modify foundational documents unless improving RSD itself

---

## 8. Intentional Constraints

RSD intentionally **does not** attempt to:
- Support every tech stack
- Optimise prematurely
- Encourage speculative features
- Allow uncontrolled architectural divergence

Constraints are a feature, not a limitation.

---

## 9. Living System

RSD is a **living system**:
- Improvements are made centrally
- Changes propagate to future projects
- Existing projects are not retroactively destabilised

Updates to foundational documents must be:
- Intentional
- Backwards-aware
- Clearly versioned

---

## 10. Summary

Proffyn RSD is not a toolkit.  
It is a **delivery operating system**.

This foundation ensures:
- Faster starts
- Better decisions
- Consistent quality
- Predictable outcomes

Every project benefits from the same hard-won experience — without re-learning the same lessons.

---

