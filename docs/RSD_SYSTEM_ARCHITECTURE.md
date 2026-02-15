# Proffyn Rapid Solution Delivery (RSD)
## System Architecture

**Document Type:** Foundational Architecture Definition  
**Applies To:** All Proffyn RSD Projects  
**Audience:** Cursor, Proffyn Delivery Team  
**Status:** v0.3 (Expanded Baseline)

---

## 1. Purpose of This Document

This document defines the **standard system architecture** for all Proffyn Rapid Solution Delivery (RSD) projects.

It exists to:
- Establish a single, repeatable architectural baseline
- Remove ambiguity from architectural decision-making
- Constrain Cursor to proven, production-ready patterns
- Enable rapid delivery without long-term architectural debt
- Provide sufficient detail to guide real-world implementation

This document is **generic and reusable**.  
It must not contain product- or client-specific details.

---

## 2. Architectural Principles

### 2.1 Opinionated by Default
RSD deliberately chooses **clarity and constraint over flexibility**.  
Architectural freedom is earned, not assumed.

### 2.2 Modular Monolith (Default)
- A single coherent system
- Internally modularised by domain
- Deployed as a unified solution

Microservices are **explicitly not the default**.

### 2.3 Shared Codebase, Multi-Platform Delivery
- One codebase feeds:
  - Web
  - iOS
  - Android
- Platform divergence is allowed only when unavoidable

### 2.4 Backend-Enforced Authority
- Business rules live in the backend
- Security is enforced server-side
- Client-side checks are UX-only

---

## 3. High-Level Architecture Overview

All RSD solutions follow this baseline architecture:

```
Client Applications (Web / iOS / Android)
            |
            | HTTPS / Realtime
            |
Backend Platform (Supabase)
            |
            | Postgres + Row Level Security (RLS)
            |
       Persistent Storage
```

The architecture is intentionally:
- Non-microservice
- Non-distributed
- Monolithic by default

This is a deliberate design choice aligned to RSD delivery goals.

---

## 4. Frontend Architecture

### 4.1 Componentised Development Model

All RSD frontend solutions adopt a **component-first, reusable architecture**.

Key principles:
- UI is built from small, composable components
- Components are reusable across screens and platforms
- Business logic is separated from presentation logic
- Styling is centralised and theme-aware

Expected structure:
- `components/` – reusable UI components
- `screens/` – page-level compositions
- `hooks/` – shared behavioural logic
- `packages/ui` – shared design-system components
- `packages/data` – data-access layer (no UI concerns)

Duplication is treated as a defect unless explicitly justified.

---

### 4.2 State Management

- Local state is preferred by default
- Shared/global state is introduced sparingly
- Server state is treated as authoritative
- Derived state is favoured over stored state

---

### 4.3 Exception Handling & Error Logging

Frontend applications must implement **rich, explicit error handling**.

Requirements:
- All async operations must handle failure paths
- User-facing errors must be human-readable
- System errors must be logged with context

Error handling strategy:
- Centralised error utilities
- Consistent error shapes
- Explicit distinction between:
  - User errors
  - Network errors
  - Authorisation errors
  - System faults

Silent failures are unacceptable.

---

## 5. Testing & Quality Gates

### 5.1 Testing Philosophy

RSD prioritises **confidence over coverage**.

Tests exist to:
- Prevent regressions
- Validate business-critical logic
- Protect architectural boundaries

---

### 5.2 Jest-Based Testing

All frontend projects must include **Jest-based tests**.

Minimum expectations:
- Unit tests for:
  - Utilities
  - Hooks
  - Data-access functions
- Component tests for:
  - Core UI components
  - Complex interaction flows

Tests must be:
- Deterministic
- Fast
- Environment-agnostic

---

### 5.3 Quality Gates

Quality gates are enforced via CI:
- Tests must pass before merge
- Linting must pass
- Build must succeed

Failing gates block delivery.

---

## 6. Backend Architecture (Supabase)

Supabase is the **default and primary backend** for all RSD projects.

It provides:
- Authentication
- Postgres database
- Row Level Security (RLS)
- File storage
- Realtime (when required)
- Edge Functions (when required)

No alternative backend is introduced unless explicitly approved.

---

### 6.1 Authentication & Email (Resend SMTP)

Authentication uses **Supabase Auth** with email verification enabled.

Email delivery:
- Handled via **Resend SMTP**
- Used for:
  - Account verification
  - Password resets
  - System notifications (where required)

Rules:
- Email verification is enabled by default
- SMTP credentials are environment-specific
- No hard-coded secrets

---

### 6.2 Authorisation & Security

- RLS is mandatory for all user-facing tables
- Access rules must be enforceable at the database layer
- Client-side checks are advisory only

---

## 7. Admin Portal Architecture

Most RSD solutions include a **separate admin portal**.

### 7.1 Purpose

The admin portal exists to:
- Manage users and roles
- Monitor platform usage
- Support moderation and operational tasks

---

### 7.2 Baseline Admin Capabilities (Skeleton)

At minimum, the admin portal should support:

- User management
  - View users
  - Disable / enable accounts
- Content moderation
  - View reported content
  - Remove or flag items
- System visibility
  - High-level usage metrics
  - Error/event logs
- Configuration (where appropriate)
  - Feature flags
  - Environment-specific settings

The admin portal:
- Is role-restricted
- Uses the same backend (Supabase)
- Is often web-only

---

## 8. OpenAI Enablement

RSD solutions may optionally integrate **OpenAI capabilities**.

### 8.1 Usage Patterns

Permitted patterns:
- Assistive features (e.g. content generation, summarisation)
- Search enhancement
- Automation and productivity tooling

---

### 8.2 Architectural Rules

- OpenAI calls must be made server-side
- API keys must never be exposed to clients
- Prompts and responses should be logged (with care)
- Usage must be rate-limited and monitored

AI features are **additive**, not foundational.

---

## 9. CI/CD & Environments

### 9.1 Source Control

- GitHub is the canonical source repository
- All work is committed via branches
- Main branch is always deployable

---

### 9.2 CI/CD Pipeline

CI/CD is typically implemented using **GitHub Actions**.

Expected pipeline stages:
- Install dependencies
- Run tests
- Run linting
- Build application
- Deploy to target environment

---

### 9.3 Environment Strategy

Standard environments:
- Development
- Staging (recommended)
- Production

Rules:
- Separate Supabase projects per environment
- Separate environment variables
- No cross-environment data sharing

---

## 10. Explicit Non-Goals

Unless explicitly stated, RSD architecture does not aim to provide:
- Microservices
- Event-driven architectures
- Custom authentication systems
- Over-engineered infrastructure
- Premature optimisation

---

## 11. Summary

The RSD system architecture is:
- Opinionated
- Modular
- Secure
- Testable
- Repeatable

It is designed to:
- Accelerate delivery
- Reduce risk
- Prevent architectural drift
- Scale with confidence

Deviation is allowed only when **explicit, justified, and documented**.
