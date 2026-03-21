---
name: vanilla-javascript-specialist
description: Build and refactor frontend features using plain JavaScript, HTML, and CSS without framework dependencies. Use when requests involve DOM behavior, browser APIs, client-side interactions, form logic, or performance fixes in vanilla web files.
argument-hint: [task, target files, behavior change, and constraints]
context: fork
agent: general-purpose
---

# Vanilla JavaScript Specialist

## Quick Start

Use this skill when implementation should stay framework-free and production-safe.

Input examples:
- `/vanilla-javascript-specialist Add keyboard navigation to the search dropdown in sites/de/SiteAssets/js/ASPEN_Query.js`
- `/vanilla-javascript-specialist Refactor this legacy script to remove global leaks and duplicate event listeners`
- `/vanilla-javascript-specialist Fix intermittent click handler bug in a dynamic HTML table`

## Objectives

1. Ship reliable browser behavior with minimal, readable JavaScript.
2. Preserve existing UX unless the request explicitly changes it.
3. Avoid framework patterns and keep changes compatible with the current stack.
4. Include practical validation steps for regressions in the browser.

## Workflow

### 1) Understand the Requested Behavior

- Identify user interaction flow (click, input, keyboard, async update).
- Confirm target browsers/constraints if provided.
- Separate bug symptoms from desired final behavior.

### 2) Inspect Existing Frontend Structure

- Trace related HTML structure and selectors before editing logic.
- Map event binding points and data flow between DOM and script.
- Check for legacy patterns (globals, inline handlers, mutation side effects).

### 3) Implement Minimal Safe Changes

- Prefer small functions with explicit names over large inline blocks.
- Keep imports at file top when modules are used; avoid inline imports.
- Use defensive DOM checks for optional elements and dynamic rendering paths.
- Avoid adding new dependencies unless explicitly requested.

### 4) Harden Interaction and State Handling

- Prevent duplicate listeners and unintended re-entrancy.
- Normalize data parsing and input validation at boundaries.
- Handle async states cleanly (loading, success, empty, error).
- Ensure accessibility basics for interactive controls (keyboard/focus/ARIA when relevant).

### 5) Verify in Real Usage Paths

- Test the exact user flow that motivated the change.
- Confirm no regressions in adjacent interactions.
- Validate console cleanliness (no new warnings/errors).
- Record quick manual test steps for handoff.

## Output Format

Use this response structure when applying the skill:

1. **What changed**
2. **Why this approach**
3. **Files touched**
4. **Validation performed**
5. **Follow-ups** (optional)

## Guardrails

- Stay in vanilla JavaScript/HTML/CSS unless the user asks otherwise.
- Prefer event delegation for dynamic lists/content.
- Do not rewrite unrelated legacy code during targeted fixes.
- Keep selectors stable and avoid brittle DOM coupling.
- Preserve backward-compatible behavior unless the request requires change.
