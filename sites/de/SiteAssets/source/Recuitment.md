---
name: de-candidate-screening
description: >-
  Screen and evaluate an engineering candidate's resume for a Distribution
  Engineering (Electrical) / power-systems role against a strict fit rubric.
  Use this skill whenever the user wants to assess, screen, rate, triage, or
  evaluate a candidate, resume, CV, or applicant for an electrical,
  distribution, transmission, substation, protection, or power-systems
  engineering position — including phrasings like "is this candidate a fit",
  "screen this resume", "evaluate this CV", "rate this applicant", "how do they
  stack up against the posting", or whenever a resume is provided alongside a
  job posting for such a role. Trigger even if the user never says "skill",
  "rubric", or "screening".
---

# Distribution Engineering Candidate Screening

Use this skill to produce a consistent, evidence-based preliminary screen of a
candidate for a Distribution Engineering (Electrical) role. The goal is a fast,
defensible fit assessment — **not** a hiring decision.

## Inputs

You normally need two things:

1. **The job posting** — the primary reference for what the role requires.
2. **The candidate's resume / CV** — the only source of evidence about the
   candidate.

If the resume is present but **no job posting** has been provided, ask the user
to attach the posting (or paste it) before screening, since the posting is the
benchmark. If the user explicitly wants a general electrical-distribution
screen without a specific posting, proceed using the rubric below as the
benchmark and note that no posting was supplied.

## Core principles (read before every screen)

- Evaluate **strictly** on what the resume explicitly states. Do **not** assume,
  infer, or embellish beyond the written content.
- Tie every observation to specific resume content. If something needed for the
  judgment is not on the resume, write exactly: **"Not specified in resume"**.
- Distinguish **engineering work** (analysis, design, studies, commissioning)
  from **coordination / support / documentation** work. This distinction drives
  the rating.
- Do **not** evaluate personality, culture, or soft traits, and do **not** make
  a hiring decision. Output a fit rating and rationale only.

## Step 1 — Apply the critical screening rules FIRST

These gate the rating. Work through them in order before anything else.

### Rule 1: Electrical qualification (mandatory)

The candidate must have **either**:
- a degree in Electrical Engineering (or clearly equivalent), **or**
- a non-electrical engineering degree **with demonstrated electrical
  engineering experience**.

If **neither** is present → **Overall Fit = Poor fit** (automatic). Stop
elevating; you may still complete the output sections, but the rating is fixed.

### Rule 2: Discipline alignment

Civil, biomedical, mechanical, environmental, etc. degrees are **not**
sufficient on their own. Such candidates must demonstrate clear electrical
engineering work (power systems, electrical design, etc.). Otherwise →
**Poor fit**.

### Rule 3: What counts as electrical engineering experience

Qualifying experience must include **applied technical work**, such as:
- Power systems — distribution, transmission, substations
- Electrical design — MV/LV systems, protection, controls
- Engineering studies — load flow, fault analysis, protection coordination
- Field commissioning, testing, or troubleshooting of electrical systems

The following **alone do NOT qualify** as electrical engineering experience:
- Project coordination or documentation
- General infrastructure work (civil, water, transportation)
- Construction supervision **without** engineering analysis
- Drafting or estimation **without** engineering judgment

### Rule 4: Canadian regulatory alignment (BC context)

- Strong / Intermediate candidates should show **one of**: P.Eng (Canada);
  EIT eligibility (EGBC); or Canadian education or relevant Canadian experience.
- Candidates with **only** an international background: **maximum = Potential
  fit**. If **no licensing pathway is evident** → **Limited fit**.

### Rule 5: Co-op / early-career calibration (EIT)

- Co-op and academic experience are valid evidence.
- They must show applied technical work (analysis, calculations, design).
- If the experience is primarily support / coordinator / observer →
  **maximum = Potential fit**.

### Rule 6: Strong fit gate

Assign **Strong fit** only when the candidate clearly demonstrates **all** of:
- an electrical engineering foundation,
- applied technical work (not just exposure), **and**
- engineering judgment (analysis, design, problem solving).

## Step 2 — Evaluate across these dimensions

After the gating rules, assess (and let these shape the final rating within the
ceiling the rules allow):

- **Relevance** — experience direct OR transferable to electrical distribution
  engineering. "Relevant" must be electrical in nature, not general
  infrastructure.
- **Depth** — work actually performed vs. mere exposure.
- **Ownership / independence** — scope, responsibility, decision-making.
- **Engineering judgment** — real-world problem solving and applied analysis.
- **Level alignment** — EIT, Intermediate, or Senior.

For early-career (EIT) candidates, give weight to applied academic work and
problem solving.

## Step 3 — Fit rating scale (use these labels exactly)

- **Strong fit** — clear electrical background + applied experience + ready to
  contribute.
- **Potential fit** — some relevant experience but gaps in depth, scope, or
  ownership.
- **Limited fit** — partial alignment but significant gaps (domain, studies, or
  experience).
- **Poor fit** — does not meet minimum requirements (no EE degree and no
  electrical capability).

### Calibration shortcuts (expected behavior)

- Non-electrical candidate **without** electrical experience → **Poor fit**.
- Civil / biomedical (etc.) **without** electrical work → **Poor fit**.
- Electrical engineer **with** applied work → **Strong fit**.
- Industrial-only electrical experience → typically **Limited fit**.
- Coordination-only roles → **Poor fit**.

## Step 4 — Output (use this exact structure)

Produce the result in this format, in this order. Keep it concise and
evidence-based.

```
0) Fit Rationale (1 sentence)
   Briefly explain how the candidate's experience aligns (or does not align).

1) Overall Fit
   Strong fit / Potential fit / Limited fit / Poor fit

2) Level Alignment
   EIT / Intermediate / Senior / Overqualified / Not aligned

3) Key Strengths (2–4 bullets)
   Focus only on demonstrated electrical engineering capability.

4) Gaps or Risks (2–3 bullets)
   Missing technical experience, domain gaps, or risks to effectiveness.

5) Signals of Future Potential (1–2 bullets)
   Growth indicators — include only if meaningful.

6) Confidence
   High / Medium / Low (based on clarity of evidence)
```

## Guidelines (apply throughout)

- Be concise and evidence-based; tie all observations to resume content.
- When information is unclear or absent, state **"Not specified in resume"**
  rather than guessing.
- Never embellish beyond the resume; never invent credentials, projects, or
  experience.
- Keep engineering work and coordination/support work clearly separated in your
  reasoning and in the Strengths/Gaps sections.
- Remember the boundary: this is a **preliminary screen**, not a hiring
  recommendation.