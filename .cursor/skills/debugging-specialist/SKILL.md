---
name: debugging-specialist
description: Analyze stack traces, logs, and related code to identify likely root causes and propose practical fixes. Use when errors, crashes, failing tests, exceptions, or production incidents need diagnosis.
argument-hint: [error message, stack trace, logs, or failing command]
context: fork
agent: general-purpose
---

# Debugging Specialist

## Quick Start

Use this skill when a failure needs diagnosis, not just code changes.

Input examples:
- `/debugging-specialist TypeError: Cannot read properties of undefined at renderCard (ui.js:194:17)`
- `/debugging-specialist pytest fails in test_user_permissions with PermissionDenied`
- `/debugging-specialist Logs show intermittent 500s after deploy`

## Objectives

1. Pinpoint the most likely root cause (or top 2-3 ranked hypotheses if uncertain).
2. Back conclusions with concrete evidence from stack traces, logs, and code paths.
3. Suggest minimal, high-confidence fixes.
4. Provide a verification plan to confirm the fix and prevent regressions.

## Workflow

### 1) Normalize the Failure Signal

- Extract the exact error type, message, and first actionable frame.
- Separate primary failure from cascading noise.
- Identify reproducibility level: always, intermittent, environment-specific.

### 2) Build a Failure Timeline

- Start from trigger event (request, job, user action, test step).
- Map call flow until the throw/fail point.
- Note data/state assumptions at each boundary (input, config, DB/API response).

### 3) Correlate Evidence

- Use stack frames to jump to source locations.
- Cross-check logs around the failure timestamp for preceding anomalies.
- Compare expected vs actual state at the failing line.
- Verify whether recent code changes plausibly explain the failure.

### 4) Root-Cause Analysis

Prioritize concrete categories:
- Null/undefined or shape mismatch
- Bad assumptions about ordering/timing/race conditions
- Incorrect config/env/feature flags
- Contract drift across module/API boundaries
- Data integrity and migration side effects
- Error handling masking original exceptions

Do not stop at symptom-level explanations. Explain why the bad state became possible.

### 5) Fix Proposal

For each proposed fix, include:
- **Change**: exact behavior to modify
- **Why it works**: causal link to root cause
- **Blast radius**: what could be affected
- **Risk**: low/medium/high with one-line rationale

Prefer smallest safe change first, then optional hardening improvements.

### 6) Verification Plan

Include:
- Direct reproduction check (before/after expected behavior)
- Targeted test cases (unit/integration/e2e as applicable)
- Monitoring/log checks for recurrence signals
- Guardrails to prevent similar regressions

## Output Format

Use this structure in responses:

1. **Most likely root cause**
2. **Evidence**
3. **Recommended fix**
4. **Validation steps**
5. **Fallback hypotheses** (only if confidence is below high)

## Debugging Guardrails

- Do not claim certainty without evidence.
- Call out missing data explicitly (logs, env, commit range, repro steps).
- Prefer reading relevant code paths over broad speculative changes.
- If multiple hypotheses remain, rank them by likelihood and test cost.
- Keep recommendations actionable and testable.
