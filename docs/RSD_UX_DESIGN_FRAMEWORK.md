# Proffyn Rapid Solution Delivery (RSD)
## UX Design Framework

**Document Type:** Foundational UX / UI Framework  
**Applies To:** All Proffyn RSD Projects  
**Audience:** Cursor, Proffyn Delivery Team  
**Status:** v1.0 (Baseline)

---

## 0. Document Control

This document is a **foundational RSD artefact**. It defines the non-negotiable UX and UI rules that apply to all projects delivered under Proffyn Rapid Solution Delivery.

- This document is **generic and reusable**
- It must not contain product- or client-specific detail
- It must be read before any UX or UI work begins

---

## 1. Purpose of This Document

This document defines the **standard UX and UI framework** for all Proffyn RSD projects.

It exists to:
- Ensure consistent, high-quality user experiences
- Enable rapid delivery without UX degradation
- Enforce component reuse and design discipline
- Provide Cursor with clear UX guardrails

This framework prioritises **clarity, accessibility, and reuse** over novelty.

---

## 2. Core UX Goals & Principles

### 2.1 UX Goals

All RSD solutions aim to:
- Minimise friction for primary user actions
- Reduce cognitive load
- Support short, frequent usage sessions
- Make core actions discoverable within 1–2 taps
- Maintain predictable behaviour across the product

---

### 2.2 Design Principles

The following principles are non-negotiable:

- **Mobile-first, portrait-first**  
  Mobile portrait layouts drive all design decisions.

- **Simplicity over density**  
  Fewer elements, clearly prioritised.

- **Progressive disclosure**  
  Advanced options are hidden until needed.

- **Component-first thinking**  
  Reuse before creating anything new.

- **Accessible by default**  
  Accessibility is not optional or a later phase.

- **Controlled branding**  
  Grey-label constraints are embraced, not fought.

---

## 3. Primary Usage Assumptions

Unless explicitly stated otherwise:

- Mobile (portrait) is the primary platform
- Web is secondary and often administrative or consumption-focused
- Primary actions must be reachable without scrolling on mobile
- Interfaces must be usable with one hand

---

## 4. Information Architecture

### 4.1 Navigation Models

Projects may choose one primary navigation model, but must be consistent:

- Bottom navigation (mobile)
- Top or side navigation (web)
- Modal-based task flows for focused actions

Rules:
- Navigation labels must be explicit
- Icons must never be the sole indicator
- Navigation placement must not change arbitrarily

---

### 4.2 Standard Screen Taxonomy

Most RSD products will include variations of:

- Authentication / onboarding
- Home or dashboard
- Lists and feeds
- Detail views
- Create / edit flows
- Profile and settings
- Admin-only areas (role restricted)

---

## 5. Design System & Tokens

### 5.1 Design Tokens

All UI must be built using a shared token model:

- **Colour:** primary, secondary, background, surface, text, border
- **Typography:** font family, scale, weights
- **Spacing:** consistent scale (e.g. 4 / 8 / 16 / 24)
- **Radius:** consistent corner rounding
- **Elevation:** restrained use of shadows
- **Motion:** consistent durations and easing

Hard-coded values are discouraged.

---

### 5.2 Component Governance

- All screens must be composed from standard components
- New components require justification
- Components must expose clear, minimal APIs
- Variants and states must be explicit

Duplication is treated as a defect.

---

## 6. Grey-Label & Branding Constraints

### 6.1 Customisable Elements

By default, only the following may be customised:
- Primary colour
- Secondary colour
- Logo
- Product name
- Optional welcome message

---

### 6.2 Fixed System Elements

The following are fixed:
- Neutral colour palette
- Semantic colours (success, warning, error, info)
- Spacing and typography scales
- Core component layouts

---

### 6.3 Theming Rules

- Colour contrast must meet accessibility standards
- Branding must not reduce usability
- No additional visual customisation without explicit approval

---

## 7. Reusable Component Library

### 7.1 Layout Components
- App Shell
- Top App Bar
- Bottom Navigation
- Page Header
- Section Container

---

### 7.2 Content Components
- Card
- Avatar
- Badge / Tag
- List Item
- Divider

---

### 7.3 Action Components
- Primary Button
- Secondary Button
- Icon Button
- Floating Action Button (where appropriate)

---

### 7.4 Feedback Components
- Toast / Snackbar
- Modal / Dialog
- Loading indicators
- Empty states

---

## 8. Interaction Patterns & UX Rules

### 8.1 Forms & Validation
- Mandatory fields clearly marked
- Inline validation with plain language errors
- Submit disabled until valid where appropriate
- Step-based flows for longer forms

---

### 8.2 Create / Edit Flows
- Single-column layouts on mobile
- Clear save / cancel actions
- Confirmation for destructive actions

---

### 8.3 Lists, Feeds & Detail Views
- Card-based patterns preferred
- Clear primary action per screen
- Sticky primary CTA where appropriate

---

### 8.4 Search & Filtering
- Dedicated search entry
- Filters via drawer or modal
- Active filters clearly visible
- Filters persist for the session

---

## 9. Accessibility & Inclusive Design

### 9.1 Baseline Standards
- WCAG 2.1 AA target
- Minimum 44px tap targets
- Keyboard navigation on web
- Screen reader compatibility

---

### 9.2 Content Guidelines
- Plain language
- Avoid jargon
- Helpful, human-readable error messages

---

## 10. Error Handling UX

- Errors must explain what happened
- Errors must explain what the user can do next
- Inline errors preferred to global alerts
- Non-blocking alerts where possible

Silent failures are unacceptable.

---

## 11. Responsive & Cross-Platform Behaviour

- Mobile-first scaling rules
- Web enhancements allowed (hover, shortcuts)
- No unexplained feature divergence between platforms

---

## 12. UX Governance & Change Control

- No bespoke UI without justification
- Component-first enforcement
- Lightweight UX review before major changes
- New patterns must be documented and reusable

---

## 13. UX Success Metrics (Generic)

Projects may track:
- Time to first key action
- Onboarding completion rate
- Form drop-off rates
- Error frequency
- Short-term retention (7 / 30 days)

---

## 14. Summary

This UX Design Framework ensures that all RSD products are:

- Usable
- Accessible
- Consistent
- Scalable
- Fast to deliver

It exists to protect user experience while enabling speed.

Deviation is allowed only when **explicit, justified, and documented**.
