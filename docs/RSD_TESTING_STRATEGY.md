# Proffyn Rapid Solution Delivery (RSD)
## Testing Strategy

**Document Type:** Foundational Testing & Quality Strategy  
**Applies To:** All Proffyn RSD Projects  
**Audience:** Cursor, Proffyn Delivery Team  
**Status:** v1.0 (Baseline)

---

## 0. Document Control

This document is a **foundational RSD artefact**.  
It defines how quality is ensured across all Proffyn Rapid Solution Delivery projects.

- Generic and reusable across all projects
- Non-product-specific
- Mandatory reference for all development and CI/CD work
- Complements architecture, UX, and development approach documents

---

## 1. Purpose of This Document

This document defines the **standard testing strategy** for all RSD projects.

It exists to:
- Ensure a consistent level of product quality
- Prevent regressions during rapid delivery
- Provide clear guidance on what must be tested (and what need not be)
- Establish enforceable quality gates for Cursor-driven development

Testing in RSD prioritises **confidence, correctness, and safety** over raw test coverage.

---

## 2. Testing Principles

All testing under RSD adheres to the following principles:

### 2.1 Confidence Over Coverage
- Tests exist to protect critical behaviour
- 100% coverage is not a goal
- Untested trivial code is acceptable; untested critical code is not

---

### 2.2 Fast Feedback
- Tests must be fast to run
- Developers should get feedback early (locally and in CI)
- Slow or flaky tests are considered defects

---

### 2.3 Test the Contract, Not the Implementation
- Tests should verify behaviour and outcomes
- Internal implementation details should not be tightly coupled to tests
- Refactoring should not require extensive test rewrites

---

### 2.4 Automation First
- Automated tests are the default
- Manual testing is supplementary, not primary
- Repeatable tests are preferred over ad-hoc validation

---

## 3. Testing Pyramid (RSD View)

RSD adopts a pragmatic testing pyramid:

- **Unit tests** (largest share)
- **Component / integration tests**
- **End-to-end (E2E) tests** (small, focused set)

The goal is balance, not dogma.

---

## 4. Unit Testing

### 4.1 Scope

Unit tests should cover:
- Pure functions
- Utility helpers
- Business rules
- Data-access logic (mocked backend)
- Hooks and shared logic

Unit tests should not:
- Render full screens
- Depend on network calls
- Require real databases

---

### 4.2 Tooling

- **Jest** is the default unit testing framework
- Tests must be deterministic and isolated
- Mocks and stubs must be explicit

---

### 4.3 Expectations

- Core business logic must have unit coverage
- Edge cases must be tested where risk exists
- Tests should be readable and intention-revealing

---

## 5. Component & Integration Testing

### 5.1 Scope

Component and integration tests validate:
- UI components in isolation
- Component behaviour under different states
- Integration between UI and data-access layers
- Error and loading states

These tests sit between unit and E2E tests.

---

### 5.2 Tooling

- Jest with appropriate rendering/testing utilities
- Mocked backend responses
- No reliance on real Supabase projects

---

### 5.3 Expectations

- Complex components must have integration coverage
- Critical user flows should be exercised at this level
- Visual perfection is not the goal; behaviour is

---

## 6. End-to-End (E2E) Testing

### 6.1 Scope

E2E tests are limited and targeted.

They should validate:
- Authentication flows
- One or two critical user journeys
- High-risk integrations

E2E tests should not:
- Attempt full feature coverage
- Duplicate unit or integration tests

---

### 6.2 Expectations

- Small number of high-value tests
- Stable, repeatable execution
- Failures must be actionable

---

## 7. Backend & Data Testing (Supabase)

### 7.1 RLS & Security Testing

Row Level Security (RLS) is critical and must be tested.

Expectations:
- Verify allowed access paths
- Verify denied access paths
- Test role-based and ownership-based rules

RLS tests may be:
- Automated (preferred where feasible)
- Scripted and repeatable

---

### 7.2 Data Integrity

- Schema constraints must be verified
- Required fields and relationships must be enforced
- Soft-delete and audit behaviour must be validated (if used)

---

## 8. Error Handling & Failure Testing

Testing must include failure scenarios:

- Network failures
- Permission errors
- Invalid input
- Empty or unexpected responses

Error tests should verify:
- Graceful handling
- Meaningful user feedback
- Absence of crashes or silent failures

---

## 9. Manual Testing

Manual testing still has a role.

### 9.1 When Manual Testing Is Required

- New feature acceptance
- UX validation
- Cross-device or cross-browser checks
- Exploratory testing

Manual testing complements automated tests but must not replace them.

---

## 10. CI/CD Quality Gates

### 10.1 Mandatory Gates

The following are mandatory before merge or deployment:

- All automated tests pass
- Linting passes
- Build completes successfully

Failing gates block delivery.

---

### 10.2 CI Expectations

- Tests run automatically in CI (e.g. GitHub Actions)
- CI must reflect production-like conditions
- Flaky tests must be fixed or removed

---

## 11. Cursor Behaviour & Responsibilities

When executing tasks, Cursor must:

- Add or update tests when modifying behaviour
- Run relevant tests before marking work complete
- Never remove tests without justification
- Treat failing tests as blockers, not warnings

Cursor must not:
- Disable tests to “get things working”
- Ignore failing quality gates

---

## 12. Test Documentation & Traceability

- Test intent should be clear from test names
- Complex scenarios may be documented inline
- Critical flows should be traceable to requirements or risks

---

## 13. Non-Goals

This testing strategy does **not** aim to provide:

- Exhaustive coverage
- Heavy manual test plans
- Over-engineered test frameworks
- Slow, brittle test suites

---

## 14. Summary

The RSD testing strategy is:

- Pragmatic
- Risk-driven
- Automation-first
- Enforced via CI

It exists to ensure that rapid delivery does not compromise quality or trust.

Deviation is allowed only when **explicit, justified, and documented**.
