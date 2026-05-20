# PRD: CheckForm Beta Pilot & Production Cutover

**Triage label:** `ready-for-agent`  
**Repo:** DE-HOME (BC Hydro Distribution Engineering SharePoint digital workplace)  
**Notion:** https://www.notion.so/3640c1b0055f811ab2e7d1dcba2bfa75

---

## Problem Statement

Distribution Engineering (DE) relies on the **Check & Review Form** (CheckForm) on SharePoint to govern multi-stage engineering work: Self-Check (SC) → Direct Supervision (DS) → Check (CH) → Peer Review (PR), with dynamic visibility driven by risk level, role (Engineer vs EIT), and prior responses.

The production form is a large single-page HTML application. Comment fields use **Quill** rich text; form state is exported as self-contained **HTML snapshots** (plus JSON draft export in production). Signatures are captured via draw or upload.

A refactored **Beta** variant delivers:

- RAF-coalesced progress and comment-height synchronization (less layout thrash)
- Signature modal drawing loop only while the pointer is down
- Upload/drag listeners bound once (fixes production re-bind leak)
- **Comment editor resilience:** Quill when available; `contenteditable` fallback when Quill/CDN fails (critical for `file://` snapshot reopen)
- Cleaner static configuration (`COMMENT_FIELDS`, `COMMENT_PAIRS`, `SIG_PREFIXES`, `RISK_TO_CHECK_LEVEL`)

Beta must ship without disrupting the full DE team, while **snapshots and comment images must round-trip** between production and Beta URLs.

**Pain points today:**

- Large pasted screenshots produce multi‑MB HTML snapshots (email/share/browser limits)
- Beta can diverge from production in script loading (Quill/DOMPurify placement)
- Two ~4k-line monoliths drift if not governed by a explicit pilot policy

---

## Solution

### Phased parallel pilot

| Phase | Audience | Production URL | Beta URL |
|-------|----------|----------------|----------|
| **Solo QA** | Form owner only | Frozen except narrow exceptions | Active development + validation |
| **Cohort** | Small fixed group | Same exceptions | Pilot + prominent Beta banner |
| **Soft cutover** | All DE users | Serves Beta-hardened content | ~30 days redirect/notice → production |

### Policies (from design grill)

- **Cutover model:** Parallel URLs during pilot; soft cutover after cohort (not big-bang without cohort)
- **Snapshots:** Full round-trip prod ↔ Beta (comments, inline images, signatures, control state)
- **Editors:** Quill on SharePoint (same as production); fallback only when Quill unavailable
- **Images:** Compress on **paste only** (not on snapshot load) in **both** forms — max **1400px** longest side, **JPEG 0.82**
- **Development:** Beta-only by default; **production exceptions:** compression + Quill/DOMPurify script parity only
- **Solo exit:** Checklist pass (no mandatory calendar)
- **After solo:** Small cohort on Beta URL
- **Cohort feedback:** Email (address TBD on banner)
- **Beta UX:** Prominent banner on Beta page during pilot
- **Post-cohort:** Soft cutover + ~30 day Beta redirect

---

## User Stories

1. As a **DE engineer (solo QA)**, I want to open the Beta form on SharePoint, so that I can validate the refactor before anyone else is exposed.
2. As a **solo QA engineer**, I want a written pass/fail checklist, so that I know when solo QA is complete without a calendar gate.
3. As a **checker**, I want to paste screenshots into Checker Comments with Ctrl+V, so that I can document issues visually without a separate attachment workflow.
4. As an **engineer responding to comments**, I want pasted images in Engineer Response fields, so that I can show what was changed or why a comment was rejected.
5. As a **reviewer**, I want rich text (bold, lists, links) in reviewer comment fields via Quill, so that feedback matches today’s production experience.
6. As a **user opening a saved snapshot from disk** (`file://`), I want the comment editor to still work when Quill CDN fails, so that I can read and edit comments offline.
7. As a **user on SharePoint**, I want Quill to load reliably, so that I get the standard toolbar and HTML serialization matching production.
8. As a **checker on production**, I want to save a snapshot and send it to a colleague on Beta, so that our handoff does not lose comment HTML or images.
9. As a **cohort user on Beta**, I want to save a snapshot that opens correctly in production, so that the wider team is not blocked on Beta-only artifacts.
10. As a **user pasting a large screenshot**, I want the form to compress it on paste, so that snapshot files stay emailable and browsers stay responsive.
11. As a **user reopening an old snapshot with huge inline images**, I want the form **not** to silently recompress on load, so that round-trip bytes stay stable until I edit and re-save.
12. As a **PE**, I want signature draw and upload to work without duplicate file-picker bindings, so that repeated uploads do not leak listeners or break the pad.
13. As a **user completing all required fields**, I want Print/PDF to remain gated at 100% progress with required-field validation, so that governance rules are unchanged.
14. As a **user selecting Low/Medium/High risk**, I want section visibility (Check, Peer Review) and Q1.8–1.10 notices to behave like production, so that risk-driven workflow is unchanged.
15. As an **EIT**, I want role-based labels and requirements to update when I select EIT vs Engineer, so that EIT-specific rules still apply.
16. As a **user in the cohort pilot**, I want a prominent Beta banner with an email contact, so that I know I am not on production and know where to report issues.
17. As the **form owner**, I want cohort feedback via email, so that issues are captured without standing up a new tool.
18. As a **solo QA engineer**, I want production to receive only compression/script hotfixes during pilot, so that round-trip tests are meaningful while Beta carries structural refactors.
19. As a **cohort member**, I want to complete at least one real check end-to-end on Beta, so that validation reflects field usage not just test scripts.
20. As **two cohort members**, I want to exchange prod↔Beta snapshots once, so that round-trip is proven under real handoff.
21. As a **user after cutover**, I want the production URL to serve the Beta-hardened form, so that I do not need to change my primary bookmark.
22. As a **user with an old Beta bookmark**, I want the Beta URL to redirect or clearly point to production for ~30 days, so that my link is not dead after cutover.
23. As a **user printing the form**, I want print layout (page breaks, hidden sections) to match production expectations, so that PDF exports remain compliance-ready.
24. As a **user saving a snapshot**, I want filename prompting on `file://` and automatic naming on SharePoint, so that save behavior matches existing patterns.
25. As a **maintainer**, I want comment HTML stored in the same hidden fields (`checkerComments`, `engineerResponse`, `reviewerComments`, `engineerResponse_2`), so that snapshot serialization does not require a new schema.
26. As a **maintainer**, I want Quill initialization to be idempotent when reopening snapshots, so that duplicate `.ql-snow` markup does not break restore.
27. As a **user in fallback mode**, I want a one-time toast explaining rich text is unavailable, so that I know to paste screenshots directly in the comment box.
28. As a **user clicking an inline comment image**, I want a preview modal, so that I can inspect screenshots without leaving the form.
29. As a **maintainer**, I want RAF-coalesced progress updates, so that fast radio changes do not thrash layout.
30. As a **maintainer**, I want paired comment cells (checker/engineer) to stay height-aligned, so that the comments section does not look broken while typing.
31. As a **user clearing the form**, I want galleries and editors reset consistently, so that Reset does not leave orphan thumbnails.
32. As the **form owner after cohort success**, I want a defined cohort exit gate, so that cutover is evidence-based.
33. As a **future maintainer**, I want a single production file after cutover, so that we do not maintain two 4k-line monoliths indefinitely.
34. As a **user**, I want SC binary questions (8–11) and risk consistency rules unchanged, so that governance logic is not regressed by the refactor.
35. As a **user with POR workflow**, I want Checker Comments label to switch to POR Comments when applicable, so that role-specific copy remains correct.
36. As a **maintainer implementing compression**, I want the same compression function wired to Quill paste and fallback paste paths, so that behavior does not depend on which editor is active.
37. As a **SharePoint admin**, I want Beta and production to load Quill/DOMPurify from the same CDN URLs as today, so that CSP allowlists do not change unexpectedly.
38. As a **user on Beta during solo QA**, I want no cohort banner requirement until cohort starts, so that solo testing matches production layout (optional footer build id only).

---

## Implementation Decisions

### Deep modules

Build or extract these behind simple interfaces inside the CheckForm class (shared logic duplicated in both HTML files until a future extract-to-`.js` refactor).

#### 1. CommentImageCompressor (test in isolation)

- **Interface:** `compressImageForComment(input: File | Blob | string) → Promise<string>` → JPEG data URL
- **Constants:** `MAX_DIMENSION = 1400`, `JPEG_QUALITY = 0.82`
- **Rules:** scale down preserving aspect ratio; invoke on paste/upload only; never on snapshot load
- **Wiring:** Quill clipboard/paste; fallback `processCommentImageFile`; any comment file input

```javascript
const COMMENT_IMAGE = { maxDimension: 1400, jpegQuality: 0.82 };

async function compressImageForComment(fileOrDataUrl) {
  const bitmap = await loadImage(fileOrDataUrl);
  const scale = Math.min(1, COMMENT_IMAGE.maxDimension / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', COMMENT_IMAGE.jpegQuality);
}
```

#### 2. CommentEditorRouter

- `initCommentEditors()`: if `typeof Quill !== 'undefined'`, `initQuillEditors()`; else fallback + warn toast
- Quill: reset container DOM before `new Quill()`; sync `text-change` → hidden field
- Fallback: `contenteditable` `.comments-inline-editor`; `buildCommentInitialHtml` merges legacy gallery thumbs into inline HTML

#### 3. CommentFieldSync

- `getCommentHtml` / `setCommentHtml` / `syncCommentField` / `syncAllComments` / `restoreComments`
- Hidden inputs remain canonical for snapshot clone path

#### 4. SnapshotSerializer

- Extend existing `saveSnapshot` clone-and-mirror logic
- Round-trip contract: no silent HTML mutation on open during pilot

#### 5. BetaPilotChrome

- Prominent banner: “Beta form — report issues: [email]”
- Post-cutover on Beta URL: redirect/notice to production (~30 days)

#### 6. Scheduling (preserve Beta refactor)

- `scheduleUpdateProgress`, `scheduleSyncCommentsHeights` via `requestAnimationFrame`

### Script loading parity (production exception)

- Match production: Quill 2.0.3 + DOMPurify 3.2.7 at end of body (non-blocking)
- Beta currently may load Quill in `<head>` — align during implementation
- DOMPurify: load for parity; do not apply to comment HTML if it breaks linked question text (existing production note)

### Exit gates

**Solo QA checklist**

- [ ] Production snapshot → Beta (SharePoint): comments, images, signatures intact
- [ ] Beta snapshot → production: same
- [ ] `file://` Beta snapshot: fallback + paste works
- [ ] Large paste: acceptable size after compression
- [ ] Print/PDF vs production on full form
- [ ] No console errors on SharePoint load

**Cohort gate (before cutover)**

- [ ] ≥1 real check end-to-end on Beta
- [ ] Two people exchange prod ↔ Beta snapshot
- [ ] One `file://` reopen
- [ ] No open P1 issues; feedback via email

### Preserve existing Beta improvements

- Static maps: `COMMENT_PAIRS`, `SIG_PREFIXES`, `RISK_TO_CHECK_LEVEL`
- Signature modal RAF only while pointer down
- Single bind for upload/drag in `attachEventListeners`
- Cached `rowsEl` / `cardEl` for progress

---

## Testing Decisions

### What makes a good test

- Assert **observable behavior**: hidden field contains `<img src="data:image/jpeg;base64,...">` under size budget after paste; reopened snapshot preserves `checked` radios and comment HTML; Print/PDF disabled until progress 100%
- Do **not** assert RAF internals, private method names, or Quill instance identity

### Modules to test

| Module | Automated unit tests? | Notes |
|--------|----------------------|-------|
| CommentImageCompressor | **Yes (recommended)** | Canvas + fixture images; pure logic |
| CommentFieldSync | Optional | Thin; cover in manual round-trip |
| CommentEditorRouter | Manual / browser | Depends on Quill CDN + DOM |
| SnapshotSerializer | Manual checklist | Full-document integration |
| BetaPilotChrome | Manual | Visual |

### Prior art

- No existing `*.test.js` / Playwright specs for CheckForm in DE-HOME
- Manual checklist exists in local PR review artifact for Beta vs production diff
- Team kit documents Playwright smoke pattern for future static HTML serving

### Manual matrix (required)

| Case | From | To |
|------|------|-----|
| Round-trip | Production | Beta (SharePoint) |
| Round-trip | Beta | Production |
| Offline | Beta snapshot | `file://` |
| Compression | 4K screenshot paste | Both forms |

---

## Out of Scope

- Splitting CheckForm into bundled modules or a build pipeline for this pilot
- Adobe Sign integration changes
- Recompressing images when opening snapshots (deferred “paste + load” mode)
- Whole-team Beta URL on main nav before cohort gate
- FuseWebApp (separate SiteAssets app)
- Mandatory DOMPurify on comment HTML
- Server-side PDF generation
- Deploying `CheckForm.Beta - Copy.html`
- Environment-split Quill on SharePoint vs `file://` (grill decision: Quill on Beta SharePoint same as production)
- Extracting shared `.js` file before cutover (optional follow-up)

---

## Further Notes

- **Feedback email:** TBD before cohort banner ships
- **Redirect duration:** 30 days default; confirm with SharePoint admin
- **Domain docs:** `CHECKFORM_DOCUMENTATION.md` — update after cutover
- **Grill log:** Parallel pilot → full round-trip → Quill on Beta → compress both (1400/0.82, paste-only) → solo checklist → cohort → soft cutover → banner + email
