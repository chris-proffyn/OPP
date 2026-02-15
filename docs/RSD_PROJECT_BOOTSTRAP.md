# Proffyn Rapid Solution Delivery (RSD)
## Project Bootstrap Guide

**Document Type:** Foundational Project Initialisation Guide  
**Applies To:** All Proffyn RSD Projects  
**Audience:** Cursor, Proffyn Delivery Team  
**Status:** v1.0 (Baseline)

---

## 1. Purpose of This Document

This document defines **how a new Proffyn RSD project is initialised**.

It exists to:
- Ensure every RSD project starts from the same, known structure
- Prevent folder and architectural drift
- Remove ambiguity for Cursor at project start
- Create a repeatable, low-friction project setup process

This document is **procedural, not conceptual**.

---

## 2. When This Document Applies

This document must be followed:

- When a new RSD project folder is created
- When an existing RSD project is first opened in Cursor
- Before any feature development begins

If this document has not been followed, Cursor must stop and ask.

---

## 3. Canonical RSD Project Folder Structure

Every RSD project must conform to the following **canonical top-level structure**.

Cursor must **not invent alternative top-level folders**.

```
/
├─ docs/
│  ├─ RSD_FOUNDATION_OVERVIEW.md
│  ├─ RSD_SYSTEM_ARCHITECTURE.md
│  ├─ RSD_UX_DESIGN_FRAMEWORK.md
│  ├─ RSD_DATA_MODELLING_GUIDE.md
│  ├─ RSD_TESTING_STRATEGY.md
│  ├─ RSD_ADMIN_PORTAL_GUIDE.md
│  ├─ RSD_DEVELOPMENT_APPROACH.md
│  ├─ PROJECT_STATUS_TRACKER.md
│  ├─ NEW_CHAT.md
│
├─ apps/
│  ├─ web/
│  ├─ mobile/
│
├─ packages/
│  ├─ ui/
│  ├─ data/
│  ├─ utils/
│
├─ supabase/
│  ├─ migrations/
│  ├─ seed/
│
├─ .cursorrules
├─ README.md
```

---

## 4. Folder Responsibilities

### 4.1 `/docs`
Contains **all governance and documentation**.

Rules:
- No application code
- No experiments
- Documents here define authority and constraints

---

### 4.2 `/apps`
Contains deployable applications.

- `/apps/web` – web application (Netlify target)
- `/apps/mobile` – mobile application (iOS / Android)

Rules:
- No shared logic here
- Apps compose functionality from `/packages`

---

### 4.3 `/packages`
Contains shared, reusable code.

- `/ui` – shared UI components and design system
- `/data` – data-access layer, API clients, Supabase wrappers
- `/utils` – pure utilities and helpers

Rules:
- No product-specific logic unless justified
- Reuse is mandatory

---

### 4.4 `/supabase`
Contains backend artefacts.

- `/migrations` – schema migrations (authoritative)
- `/seed` – seed data and scripts (non-production)

Rules:
- No manual schema changes outside migrations
- No secrets committed

---

## 5. What Is Created Immediately vs Lazily

### 5.1 Created Immediately
On project initialisation, Cursor must ensure the following exist:

- `/docs` and all foundational documents
- `/apps/web`
- `/apps/mobile`
- `/packages/ui`
- `/packages/data`
- `/packages/utils`
- `/supabase/migrations`
- `/supabase/seed`
- `.cursorrules`
- `README.md`

---

### 5.2 Created Lazily
The following should be created **only when needed**:

- Feature-specific folders
- Domain-specific sub-packages
- Additional apps (e.g. admin app)

Cursor must not pre-emptively scaffold unused structures.

---

## 6. Bootstrap Execution Steps (Cursor)

When opening a new RSD project, Cursor must:

1. Read `.cursorrules`
2. Read `NEW_CHAT.md`
3. Read this document in full
4. Verify the folder structure
5. Create missing baseline folders/files
6. Confirm completion before proceeding

Cursor should summarise:
- What was created
- What already existed
- Any discrepancies found

---

## 7. Constraints & Non-Negotiables

- Cursor must not invent new top-level folders
- Cursor must not restructure without instruction
- Cursor must not place code in `/docs`
- Cursor must not bypass `/packages` for shared logic

Violations require explicit approval.

---

## 8. Relationship to Other RSD Documents

- `.cursorrules` – enforcement and authority
- `NEW_CHAT.md` – session re-orientation
- This document – one-time project initialisation
- Foundational docs – ongoing delivery guidance

Each document has a distinct responsibility.

---

## 9. Summary

This Project Bootstrap Guide ensures that every RSD project:

- Starts consistently
- Scales predictably
- Avoids structural drift
- Supports fast, safe delivery

Cursor must treat this document as the **first execution step** in any new RSD project.
