# RSD DEVELOPMENT APPROACH

This document defines the mandatory development approach for all Proffyn Rapid Solution Delivery (RSD) projects.

All projects **MUST** follow this sequence of activities, in order:

1. Understand  
2. Summarise  
3. Plan  
4. Execute / Test  
5. Document  

This approach is intentionally document-driven and progress-tracked.  
No development work should begin without the required supporting documents in place.

---

## 1. Understand

Before commencing any development, you must first understand the **high-level project context**, including all required technical, functional, and design parameters.

In addition, for **each individual development task**, you must also understand the **low-level functional and technical details**.

### High-Level Understanding

High-level understanding is achieved by reviewing the project’s foundational documents, which define the overall intent and constraints of the solution. These typically include:

- System architecture documentation
- UX / design documentation
- Product requirements documentation

These documents define **what must be built**, **how it must be structured**, and **what constraints apply**.

### Low-Level Understanding

Low-level understanding is achieved by reviewing **domain-specific documents** that describe individual features or capabilities in detail.

These documents focus on *one feature or functional area at a time* and describe behaviour, rules, edge cases, and constraints at a granular level.

Domain documents follow the naming convention:

```
<FEATURE>_DOMAIN.md
```

Example:

```
GROUP_CREATION_DOMAIN.md
```

No summarisation, planning, or execution may begin until both high-level and low-level understanding has been established.

---

## 2. Summarise

Once understanding has been achieved, you must create **summary documentation** to confirm and record what is to be built.

Summarisation exists at **two levels**: project-level and feature-level.

### 2.1 High-Level Summary (Project Status Tracking)

Create a high-level summary document in markdown format named:

```
PROJECT_STATUS_TRACKER.md
```

This document:

- Breaks the overall project into **key stages or capabilities**
- Uses a **numbered structure**
- Uses **checkboxes `[ ]`** to track progress
- Acts as the **single source of truth for development status**

Example structure:

```
1. Authentication
   - [ ] User registration
   - [ ] Login
   - [ ] Password reset

2. User Profiles
   - [ ] Profile creation
   - [ ] Profile editing
```

If sufficient detail is known, stages **must be decomposed into tasks and sub-tasks**, each with its own checkbox.

This document **must be kept up to date** throughout the project and reflects the current delivery state.

### 2.2 Low-Level Summary (Feature Domain Summary)

For each feature/capability that is being delivered, create a detailed summary document in markdown format named:

```
<FEATURE>_DOMAIN_SUMMARY.md
```

Example:

```
GROUP_CREATION_DOMAIN_SUMMARY.md
```

This document must:

- Describe the required functionality at task level
- Include key behaviour, rules, and constraints
- Be detailed enough to support the creation of a step-by-step implementation plan

---

## 3. Plan

Using the low-level summary document, create a detailed implementation plan in markdown format named:

```
<FEATURE>_IMPLEMENTATION_TASKS.md
```

Example:

```
GROUP_CREATION_IMPLEMENTATION_TASKS.md
```

The implementation plan must:

- Break functionality into smaller, executable tasks
- Use a logical sequence that can be followed step-by-step
- Use a numbering scheme for tasks and sub-tasks
- Use **checkboxes `[ ]`** for each task/sub-task so progress can be recorded

### Required Sections in the Implementation Plan

In addition to the task breakdown, the implementation plan must include:

1. **A detailed test plan** for the feature  
   - unit tests
   - integration checks (where applicable)
   - manual testing flows
   - negative/edge-case tests

2. **A spec verification section**  
   - review the finished code against the specification documents
   - update specification documentation if any details changed during delivery

---

## 4. Execute / Test

At this stage, the required features have been documented and a plan created to deliver the required functionality.

You will then be given instructions to proceed with development.

Execution rules:

- Only execute **one task at a time**
- If a task is complex, execute **one sub-task at a time**
- Write the code and complete any unit tests required for the task/sub-task
- Explain what was done and which tests were run

### Progress Tracking

At the conclusion of each task/sub-task:

- Mark the relevant checkbox in the implementation task document as complete (change `[ ]` to `[x]`)

Continue progressing through the execution plan until the entire capability has been delivered.

---

## 5. Document

Once development for a feature (as scoped by the implementation task document) has been completed, documentation must be updated to reflect what was delivered.

This must include:

- Updating feature documentation if technical/functional details changed
- Updating the relevant implementation tasks document so it accurately reflects completion
- Updating `PROJECT_STATUS_TRACKER.md` to reflect overall delivery progress

Documentation updates are mandatory and form part of the definition of done.
