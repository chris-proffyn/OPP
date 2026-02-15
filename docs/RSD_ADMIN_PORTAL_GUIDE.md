# Proffyn Rapid Solution Delivery (RSD)
## Admin Portal Guide

**Document Type:** Foundational Admin Portal Architecture & UX Guide  
**Applies To:** All Proffyn RSD Projects  
**Audience:** Cursor, Proffyn Delivery Team  
**Status:** v1.0 (Baseline)

---

## 0. Document Control

This document is a **foundational RSD artefact**.

It defines the **standard approach to admin portals** across all Proffyn Rapid Solution Delivery projects.

- Generic and reusable
- Non-product-specific
- Mandatory reference when designing or extending any admin capability
- Complements System Architecture, UX Design Framework, and Data Modelling Guide

---

## 1. Purpose of This Document

The purpose of this document is to define **how admin portals are designed, scoped, and governed** in RSD projects.

It exists to:
- Ensure admin functionality is safe, controlled, and deliberate
- Prevent accidental exposure of sensitive capabilities
- Avoid “internal tool sprawl”
- Give Cursor clear guardrails when implementing admin features

Admin portals are **operational tools**, not end-user products.

---

## 2. Core Admin Principles

### 2.1 Safety First
Admin portals are inherently high-risk surfaces.

- Assume misuse is possible
- Minimise destructive actions
- Require explicit confirmation for irreversible operations

---

### 2.2 Least Privilege
- Admin access is role-based
- Users see only what they are authorised to see
- Capabilities are unlocked progressively, not all at once

---

### 2.3 Separation from User Experience
- Admin portals are logically and visually separate from end-user UI
- Design prioritises clarity and correctness over brand expression
- Web-first delivery is assumed

---

### 2.4 Visibility Over Automation
- Admins should understand what the system is doing
- Automated actions must remain explainable and reversible where possible

---

## 3. Architectural Assumptions

Unless explicitly overridden:

- Admin portals use the **same backend (Supabase)** as the main product
- Admin UI is typically **web-only**
- Admin features are protected by:
  - Authentication
  - Role-based access
  - Row Level Security (RLS)

No separate admin backend is introduced by default.

---

## 4. Authentication & Authorisation

### 4.1 Authentication
- Admin users authenticate via standard Supabase Auth
- No shared or “backdoor” admin accounts
- MFA is recommended where available

---

### 4.2 Authorisation Model

Admin access is controlled by:
- Roles (e.g. platform admin, moderator, support)
- Explicit RLS policies
- Screen- or capability-level checks in the UI

Authorisation must be enforced **in the database**, not only in the frontend.

---

## 5. Baseline Admin Capabilities (Skeleton)

The following capability set represents the **minimum viable admin portal**.

---

### 5.1 User Management

Common capabilities:
- View users
- Search and filter users
- View user profiles and metadata
- Enable / disable user accounts

Rules:
- No silent user deletion
- Destructive actions require confirmation
- Changes must be auditable

---

### 5.2 Content Moderation

Where user-generated content exists:
- View reported content
- Review moderation flags
- Remove, hide, or reinstate content
- Record moderation reason

Moderation actions must:
- Be logged
- Be reversible where possible

---

### 5.3 System Visibility

Admins should have visibility into:
- High-level usage metrics
- Recent system events
- Error summaries (not raw logs)

The goal is **situational awareness**, not deep analytics.

---

### 5.4 Configuration & Feature Control

Where appropriate:
- Feature flags
- Environment-specific toggles
- Limited runtime configuration

Rules:
- Configuration changes must be explicit
- Avoid “magic switches” without context

---

## 6. UX & Interaction Design

Admin UX prioritises:
- Readability
- Predictability
- Explicit labelling

---

### 6.1 Layout & Navigation
- Simple, hierarchical navigation
- Clear separation between sections
- No hidden critical actions

---

### 6.2 Destructive Actions
- Clearly labelled
- Require confirmation
- Explain consequences before execution

---

### 6.3 Forms & Validation
- Inline validation
- Plain language errors
- Defaults chosen for safety

---

## 7. Auditability & Logging

Admin actions must be auditable.

At minimum:
- Who performed the action
- What was changed
- When the action occurred

Audit data should be immutable and queryable.

---

## 8. Testing & Quality Expectations

Admin features are subject to the same quality bar as user features.

Testing expectations:
- Unit tests for admin-specific logic
- Integration tests for high-risk actions
- Manual validation for destructive workflows

Breaking admin functionality is considered **high severity**.

---

## 9. What Admin Portals Are Not

Admin portals should **not**:
- Mirror full user-facing functionality
- Become internal dashboards for everything
- Expose raw database access
- Encourage direct data manipulation

---

## 10. Extensibility & Evolution

Admin portals should:
- Start minimal
- Grow deliberately
- Avoid speculative features

Each new admin capability must justify:
- Why it belongs in admin
- Who needs it
- What risk it introduces

---

## 11. Summary

The RSD Admin Portal approach ensures that administrative capabilities are:

- Safe
- Minimal
- Auditable
- Clearly separated from user experiences

Admin portals exist to **support the system**, not to become products themselves.

Deviation from this guide is allowed only when **explicit, justified, and documented**.
