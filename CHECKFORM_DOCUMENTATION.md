# CheckForm Documentation

## 1. Overview

**CheckForm** is a comprehensive, role-based digital form system for BC Hydro Distribution Engineering (DE) check and review workflows. It manages a multi-stage engineering approval process where work moves through self-check → direct supervision → independent check → peer review stages, with dynamic visibility rules based on risk level, role, and prior responses.

**Why it exists:**
- Enforces consistent engineering governance and risk assessment across DE projects
- Automates workflow transitions (e.g., "High-Risk" work triggers mandatory independent review)
- Provides digital signatures, audit trail via snapshots, and PDF export for compliance
- Accommodates both Professional Engineers (PE) and Engineers-in-Training (EIT) with different requirements
- Replaces paper forms with responsive, validated digital form for SharePoint

**Key capabilities:**
- 4-section multi-stage workflow (Self-Check → Direct Supervision → Check → Peer Review)
- Dynamic section visibility based on risk, role, and question responses
- Role-based labeling and requirement changes (EIT vs PE)
- Signature capture (draw or upload)
- Rich text comments with inline image paste support (via Quill)
- Form state snapshot export (HTML + JSON)
- Print-to-PDF with validation enforcement
- Progress bar auto-calculation
- Consistency validation (e.g., enforcing SC questions 8/10 match selected risk level)

---

## 2. Quick Start

### 3 steps to use CheckForm:

**Step 1: Initialize the form**
```javascript
// Form auto-initializes on DOMContentLoaded via:
window.addEventListener('DOMContentLoaded', () => new CheckForm());
// The form will:
// - Cache all required DOM elements
// - Build radio button rows for each section (SC, DS, CH, PR)
// - Attach event listeners
// - Initialize signature pads and Quill editors
```

**Step 2: User fills form sections based on workflow**
```
1. Select role (Engineer or EIT)
2. Complete Self-Check section (SC): 11 questions
3. If SC-11 is "No" (not self-checking): Direct Supervision (DS) section appears
4. Select risk level (Low/Medium/High): Check section visibility auto-updates
5. Fill Check (CH) section if triggered by risk/role
6. Fill Peer Review (PR) section if Check questions unanswered
```

**Step 3: Export or print**
```javascript
// Save snapshot with form state + signatures
saveSnapshot()  // Downloads HTML + JSON with all data + images

// Print to PDF (validates all required fields first)
printFormAsPdf(event)  // Checks 100% progress, shows toast if incomplete
```

---

## 3. API Reference

### Constructor & Lifecycle

#### `constructor()`
**Purpose:** Initializes the CheckForm instance, caches DOM elements, and sets up event handlers.

**Returns:** `CheckForm` instance

**Example:**
```javascript
const form = new CheckForm();  // Auto-called on DOMContentLoaded
```

---

### Section Building & Rendering

#### `buildAllRows()`
**Purpose:** Generates all question rows (radio button groups) for sections SC, DS, CH, PR.

**Parameters:** None

**Returns:** void

**Details:** 
- Called during init if form is not restored from previous session
- Uses `buildRows()` internally for each section
- Binary questions (yes/no only, no N/A) in SC and CH use `pill-group--yes-no` class

**Example:**
```javascript
// Called automatically in init()
// Creates 11 SC rows, 5 DS rows, 10 CH rows, 9 PR rows
// Each row: [checkbox] [question text] [Yes] [No] [N/A]
```

#### `buildRows(container, prefix, items, binarySet)`
**Purpose:** Build radio button rows for a single section.

**Parameters:**
- `container` *(HTMLElement)*: DOM container for rows (e.g., `#sc-rows`)
- `prefix` *(string)*: Section ID prefix (`'sc'`, `'ds'`, `'ch'`, `'pr'`)
- `items` *(Array\<string>)*: Question text array (may contain safe HTML links)
- `binarySet` *(Set\<number>)* [optional]: Question numbers that should be yes/no only

**Returns:** void

**Example:**
```javascript
buildRows(
  document.getElementById('sc-rows'),
  'sc',
  CheckForm.SC_ITEMS,
  CheckForm.BINARY_QUESTIONS.sc  // Set([8, 9, 10, 11])
);
// Generates 11 rows: sc1, sc2, ..., sc11
```

---

### Signature Management

#### `initSignaturePads()`
**Purpose:** Initialize modal canvas and signature pad state.

**Parameters:** None

**Returns:** void

**Details:**
- Sets up `signatureModal` and `signatureModalCanvas` references
- Initializes `activeSignaturePrefix` to track which signature is being edited
- Calls `setupModalCanvasDrawing()` to enable freehand drawing

**Example:**
```javascript
// Called in init()
// Enables drawing on modal canvas with lazy brush, speed-based line width
```

#### `openSignatureModal(prefix)`
**Purpose:** Open modal for drawing/editing a signature.

**Parameters:**
- `prefix` *(string)*: Signature owner ID (`'sc'`, `'ch'`, `'pr'`, `'fT1'`)

**Returns:** void

**Details:**
- Shows modal overlay
- Loads existing signature data (if any) into canvas
- Resizes canvas to viewport
- Sets focus for keyboard escape

**Example:**
```javascript
// User clicks "Draw Signature" button under SC section
openSignatureModal('sc');
// Modal opens, user draws with pen/touch
// Canvas uses responsive drawing with lazy brush algorithm
```

#### `closeSignatureModal(save)`
**Purpose:** Close signature modal, optionally saving drawn signature.

**Parameters:**
- `save` *(boolean)*: If `true`, persist canvas to `${prefix}_sig_data` input

**Returns:** void

**Details:**
- If `save=true`: Export canvas as data URL to hidden input, update preview
- If `save=false`: Discard changes
- Closes modal overlay

**Example:**
```javascript
// User clicks "Save" button in modal
closeSignatureModal(true);
// Signature saved to #sc_sig_data hidden input
// Preview image updates, modal closes

// User clicks "Cancel"
closeSignatureModal(false);
// Changes discarded, modal closes
```

#### `setSignaturePreview(prefix, dataUrl)`
**Purpose:** Update signature preview image from data URL.

**Parameters:**
- `prefix` *(string)*: Signature owner ID
- `dataUrl` *(string)*: PNG data URL from canvas or file upload

**Returns:** void

**Details:**
- Updates `.sig-inline-preview img[src]`
- Toggles `.has-signature` class to show/hide preview
- Switches tab to "draw" tab to display preview

**Example:**
```javascript
const canvas = document.getElementById('scSigCanvas');
const dataUrl = canvas.toDataURL();
setSignaturePreview('sc', dataUrl);
// Preview appears in SC section, user can click "Edit" to redraw
```

#### `clearModalSignature()`
**Purpose:** Erase all drawn content from modal canvas.

**Parameters:** None

**Returns:** void

**Example:**
```javascript
// User clicks "Clear" button in signature modal
clearModalSignature();
// Canvas wiped clean, user can redraw
```

#### `setupModalCanvasDrawing(canvas)`
**Purpose:** Configure canvas with responsive drawing engine (lazy brush, speed-sensitive line width).

**Parameters:**
- `canvas` *(HTMLCanvasElement)*: Modal canvas element

**Returns:** void

**Details:**
- Registers pointer events (down, move, up, cancel, double-click)
- Implements exponential smoothing for brush position and line width
- Line width responds to drawing speed (slower = thicker)
- Double-click clears canvas
- RAF loop @ 60Hz target for smooth strokes

**Example:**
```javascript
// Called in initSignaturePads()
// Enables natural, responsive drawing with lag compensation
```

#### `handleSignatureUpload(e, prefix)`
**Purpose:** Process uploaded signature image file.

**Parameters:**
- `e` *(Event)*: File input change event
- `prefix` *(string)*: Signature owner ID

**Returns:** void

**Details:**
- Reads file as data URL
- Stores in `${prefix}_sig_data` hidden input
- Updates preview via `setSignaturePreview()`

**Example:**
```javascript
// User clicks "Upload" button and selects image
handleSignatureUpload(event, 'sc');
// Image loaded as data URL and displayed as SC signature
```

---

### Role & Visibility Management

#### `updateRoleLabels(resetSc11)`
**Purpose:** Update all labels and placeholders to reflect selected role (Engineer vs EIT), affecting required fields and section titles.

**Parameters:**
- `resetSc11` *(boolean)* [optional, default `true`]: If true, reset SC question 11 based on role

**Returns:** void

**Details:**
- **EIT mode**: Labels change to "Engineer-in-Training", SC-11 forced to "No", Direct Supervision section always shown, professional of record must approve
- **PE mode**: Labels remain "Engineer", SC-11 defaults to unchecked, Direct Supervision only shown if SC-11 = No
- Updates labels: Engineer field, SC name field, Checker field, response labels
- Calls `syncDirectSupervision()` and `syncSectionVisibility()` internally

**Example:**
```javascript
// User selects "Engineer-in-Training" radio button
updateRoleLabels(true);
// All "Engineer" labels → "Engineer-in-Training"
// SC-11 checkbox forced to "No"
// Direct Supervision (DS) section auto-shows
// Professional of Record (POR) replaces "Checker"
```

#### `syncSectionVisibility()`
**Purpose:** Show/hide sections (DS, CH, PR, Comments, Final) based on risk level, role, and question responses.

**Parameters:** None

**Returns:** void

**Details:**
- **DS (Direct Supervision)**: Shown if SC-11 = "No" or role is EIT
- **CH (Check)**: Shown if risk="Check"/"Peer Review"/"Type 1 Review" OR SC-11="No" OR EIT role
- **PR (Peer Review)**: Shown if Check section has "No" answer OR risk="Type 1 Review" OR risk="High"
- **Comments**: Shown if any of DS/CH/PR visible
- **Final**: Shown if PR visible and answered

**Example:**
```javascript
// User selects risk="High"
setRiskLevel('high');
syncSectionVisibility();
// Check section → visible (required for high-risk)
// Peer Review section → visible (independent review required)
// Comments section → visible (for feedback)
```

#### `syncDirectSupervision()`
**Purpose:** Show/hide Direct Supervision section based on SC-11 response.

**Parameters:** None

**Returns:** void

**Details:**
- If SC-11 = "No": DS section hidden, section closes
- If SC-11 ≠ "No": DS section shown, section auto-opens

**Example:**
```javascript
// SC-11 answer changes
syncDirectSupervision();
// If "Yes": DS section hides
// If "No": DS section shows + auto-opens for input
```

#### `syncCheckWarning()`
**Purpose:** Show notice if Check section has any "No" answers (requires peer review).

**Parameters:** None

**Returns:** void

**Example:**
```javascript
// User selects "No" for any CH question
syncCheckWarning();
// Notice appears: "One or more 'No' answers require peer review"
```

#### `syncCheckerNames()`
**Purpose:** Auto-sync checker/professional-of-record name between Work Info and Check section.

**Parameters:** None

**Returns:** void

**Details:**
- If user types name in Work Info field and Check section is visible → pre-fill Check name field
- If user types name in Check name field → pre-fill Work Info field
- Bidirectional sync (prevents infinite loops via `this.syncingNames` flag)

**Example:**
```javascript
// User types "Jane Doe" in "Checker" field
// handleGlobalInput() triggers syncCheckerNames()
// Check section's "Name (Checker)" field auto-fills with "Jane Doe"
```

---

### Risk & Consistency Validation

#### `setRiskLevel(level)`
**Purpose:** Set active risk level and cascade visibility/validation updates.

**Parameters:**
- `level` *(string)*: `'low'` | `'medium'` | `'high'`

**Returns:** void

**Details:**
- Highlights risk button with `.active` class
- Sets `minCheckLevel` input value (maps to required reviewer type)
- Triggers `showRiskConsistencyNotices()` to validate SC-8/10 consistency
- Updates progress bar

**Example:**
```javascript
// User clicks "High" risk button
setRiskLevel('high');
// Risk button highlighted
// minCheckLevel → "Type 1 Independent Review Required"
// SC section notices: red errors if SC-8/10 don't match high-risk pattern
```

#### `showRiskConsistencyNotices()`
**Purpose:** Validate SC questions 8, 9, 10, 11 against risk level and role, showing corrective notices.

**Parameters:** None

**Returns:** void

**Details:**
- **SC-8**: Must match risk level (low→yes, medium→no, high→no)
- **SC-9**: If "Yes" → warning to complete structural review form; error if risk=low
- **SC-10**: Must match risk level; if "Yes" → warning about Type 1 reviewer appointment
- **SC-11**: If role=EIT and "Yes" → error (EIT requires supervision); if "No" → warning that POR must complete DS/CH sections
- Uses `RISK_MAP` static config

**Example:**
```javascript
// Risk = Low, but SC-8 = "No"
showRiskConsistencyNotices();
// SC-8 notice: Red error "Correction required: Expected 'Yes'"
// SC-10 notice: Red error "Correction required: Expected 'No'"
```

#### `getActiveRiskLevel()`
**Purpose:** Get currently selected risk level.

**Parameters:** None

**Returns:** `string | null` — `'low'` | `'medium'` | `'high'` | `null`

**Example:**
```javascript
const level = getActiveRiskLevel();
if (level === 'high') {
  // Enforce peer review
}
```

---

### Rich Text Comments (Quill Integration)

#### `initQuillEditors()`
**Purpose:** Initialize Quill rich text editors for comment fields.

**Parameters:** None

**Returns:** void

**Details:**
- Creates Quill editor for: `checkerComments`, `engineerResponse`, `reviewerComments`, `engineerResponse_2`
- Toolbar: bold, italic, underline, ordered list, headers, links, clean
- Syncs Quill content to hidden inputs on text-change

**Example:**
```javascript
// Called in init()
// User can paste images into comments field (clipboard events)
```

#### `restoreQuillEditors()`
**Purpose:** Load previous content from hidden inputs into Quill editors.

**Parameters:** None

**Returns:** void

**Details:**
- Called on init() if form was previously saved
- Restores HTML from hidden input to `.ql-editor` container

**Example:**
```javascript
// Page reloaded after previous edit session
restoreQuillEditors();
// Comments content restored from #checkerComments hidden input
```

#### `syncAllQuillEditors()`
**Purpose:** Flush all Quill editor content to hidden inputs (before saving/export).

**Parameters:** None

**Returns:** void

**Example:**
```javascript
// Before saveSnapshot()
syncAllQuillEditors();
// All Quill `.ql-editor` HTML → hidden input values
```

---

### Progress & Validation

#### `updateProgress()`
**Purpose:** Calculate and display form completion percentage based on answered questions.

**Parameters:** None

**Returns:** void

**Details:**
- Counts radio buttons checked in visible sections
- Updates progress bar and completion badges for each section
- Hides PR section from count until at least one PR question answered
- Marks section complete (✓ checkmark) when all questions answered

**Example:**
```javascript
// User selects SC-1 = "Yes"
updateProgress();
// Progress: 1/11 in SC section
// Section 1 badge: "1 / 11"
// Overall progress: 8.3%
```

#### `allRequiredFieldsValid()`
**Purpose:** Validate all required fields have been filled (red underline check).

**Parameters:** None

**Returns:** `boolean` — `true` if all required fields valid, `false` if any missing

**Details:**
- Iterates through all `.required-field-underline` elements
- Checks if border-bottom-width = 0 (validation success)
- Highlights invalid field labels in red (#d32f2f)
- Scrolls to first invalid field and focuses it
- Returns false if validation fails (prevents form export/print)

**Example:**
```javascript
if (!allRequiredFieldsValid()) {
  console.log('Form has missing required fields');
  // First invalid field focused and scrolled into view
}
```

---

### Form State Management

#### `clearSection(sectionId)`
**Purpose:** Reset all inputs in a section to empty state.

**Parameters:**
- `sectionId` *(string)*: Section ID (e.g., `'s1'`, `'s2'`, `'s3'`, etc.)

**Returns:** void

**Details:**
- Clears radio buttons (unchecks all)
- Clears text/number/date inputs
- Clears selects (reset to index 0)
- Clears textareas and Quill editors
- Removes signature data and canvases
- Triggers related sync methods (e.g., if clearing S1, updates progress + risk notices)
- Shows toast confirmation

**Example:**
```javascript
// User clicks "Clear Self-Check" button
clearSection('s1');
// All SC questions unchecked
// Risk buttons cleared
// SC signature cleared
// Progress bar updates
// Toast: "Section cleared"
```

#### `resetForm()`
**Purpose:** Clear entire form with confirmation dialog.

**Parameters:** None

**Returns:** void

**Details:**
- Confirms with user before clearing
- Clears all inputs across all sections
- Resets role to "Engineer"
- Clears all signatures
- Removes all canvases
- Calls `updateRoleLabels()`, `syncAllSectionVisibility()`, etc.

**Example:**
```javascript
// User clicks "Reset Entire Form"
resetForm();
// Confirmation: "Reset entire form? All data will be lost."
// If confirmed: clears everything, returns to blank state
```

---

### Form Export & Print

#### `saveSnapshot()`
**Purpose:** Export form state as downloadable HTML file + JSON with all data, signatures, comments.

**Parameters:** None

**Returns:** void

**Details:**
- Syncs all Quill editors to hidden inputs
- Clones DOM and syncs all form values to clone
- Generates timestamped HTML filename based on work title
- Downloads as `${workTitle}_snapshot_${date}.html`
- Also saves parallel JSON file
- Shows success toast

**Example:**
```javascript
// User clicks "Save Snapshot"
saveSnapshot();
// Downloads: DE_CheckForm_snapshot_5-1-2026.html
// Re-opening file in browser restores form state
```

#### `saveJasonFile()`
**Purpose:** Export form data as JSON object.

**Parameters:** None

**Returns:** void

**Details:**
- Collects all form field data via FormData API
- Serializes to JSON string
- Downloads as `DE_CheckForm.json`

**Example:**
```javascript
// Called from saveSnapshot()
saveJasonFile();
// Downloads: DE_CheckForm.json containing all field values
```

#### `printFormAsPdf(e)`
**Purpose:** Validate form and trigger print dialog for PDF export.

**Parameters:**
- `e` *(Event)*: Click event from print button

**Returns:** void

**Details:**
- Prevents default button behavior
- Validates all required fields via `allRequiredFieldsValid()`
- Checks progress bar = 100%
- If valid: `window.print()` opens browser print dialog
- If invalid: Shows error toast with guidance

**Example:**
```javascript
// User clicks "Save as PDF"
printFormAsPdf(event);
// Validation check: all required fields filled?
// Validation check: 100% progress?
// If yes: print dialog opens
// If no: Toast error: "Fill all required fields and complete to 100%"
```

---

### Event Handling

#### `attachEventListeners()`
**Purpose:** Register global click, change, input, and keydown handlers.

**Parameters:** None

**Returns:** void

**Details:**
- Delegates all clicks, changes, input, keydown events
- Uses cached bound handlers to prevent memory leaks
- Sets up MutationObserver to detect radio changes and update progress

**Example:**
```javascript
// Called in init()
// All user interactions routed through handleGlobal* methods
```

#### `handleGlobalClick(e)`
**Purpose:** Centralized click handler routing to specific actions.

**Parameters:**
- `e` *(MouseEvent)*: Click event

**Returns:** void

**Details:**
- Routes to: signature tab clicks, draw/upload button clicks, modal actions, section toggles, risk buttons, clear buttons, reset buttons, etc.

**Example:**
```javascript
// User clicks "Draw Signature" button
handleGlobalClick(event);
// Delegates to openSignatureModal('sc')
```

#### `handleGlobalChange(e)`
**Purpose:** Handle radio, select, textarea changes.

**Parameters:**
- `e` *(Event)*: Change event

**Returns:** void

**Details:**
- Radio changes: Update progress, sync visibility, update role labels if needed, show risk notices
- Input/select changes: Validate on-the-fly, remove red error styling if valid
- Risk button clicks: Update section visibility
- minCheckLevel change: Sync direct supervision, section visibility

**Example:**
```javascript
// User selects SC-1 = "Yes"
handleGlobalChange(event);
// updateProgress() called
// showRiskConsistencyNotices() called
// syncSectionVisibility() called
```

#### `handleGlobalInput(e)`
**Purpose:** Handle text input for name syncing and textarea auto-resize.

**Parameters:**
- `e` *(InputEvent)*: Input event

**Returns:** void

**Details:**
- Syncs engineer ↔ sc_name fields bidirectionally
- Syncs checker ↔ ch_name fields bidirectionally (if Check visible)
- Auto-resizes textareas as user types
- Syncs Quill editor heights

**Example:**
```javascript
// User types "John Smith" in "Engineer" field
handleGlobalInput(event);
// SC section "Engineer" name field auto-fills with "John Smith"
```

#### `handleGlobalKeydown(e)`
**Purpose:** Handle keyboard shortcuts.

**Parameters:**
- `e` *(KeyboardEvent)*: Keydown event

**Returns:** void

**Details:**
- Escape key: Close signature modal
- Enter/Space on section header: Toggle section expand/collapse
- Enter in Quill editor: Sync comment heights

**Example:**
```javascript
// User presses Escape while signature modal open
handleGlobalKeydown(event);
// closeSignatureModal(false) called, modal closes
```

---

### Utilities

#### `getRadioValue(name)`
**Purpose:** Get value of checked radio button by name.

**Parameters:**
- `name` *(string)*: Radio button group name (e.g., `'sc_role'`)

**Returns:** `string | null` — Radio value or null if none checked

**Example:**
```javascript
const role = getRadioValue('sc_role');  // "Engineer" or "Engineer-in-Training"
const isEit = role === 'Engineer-in-Training';
```

#### `toggleSection(head)`
**Purpose:** Toggle section expand/collapse.

**Parameters:**
- `head` *(HTMLElement)*: Section header element

**Returns:** void

**Example:**
```javascript
// User clicks section header
toggleSection(headerElement);
// Section toggles open/closed
// Updates aria-expanded attribute
```

#### `autosizeTextarea(el)`
**Purpose:** Auto-resize textarea to fit content height.

**Parameters:**
- `el` *(HTMLTextAreaElement)*: Textarea element

**Returns:** void

**Example:**
```javascript
// User types in comments textarea
autosizeTextarea(commentsField);
// Textarea height expands to show all text (no scrollbar)
```

#### `syncCommentsHeights()`
**Purpose:** Synchronize heights of paired comment fields (checker + engineer response, reviewer + engineer response 2).

**Parameters:** None

**Returns:** void

**Details:**
- Forces paired fields to match max height for visual balance
- Ignores hidden fields
- Called on Quill paste, input, keydown

**Example:**
```javascript
// User pastes image into checkerComments
syncCommentsHeights();
// engineerResponse textarea auto-resizes to match checkerComments height
```

#### `toast(msg, type)`
**Purpose:** Show temporary toast notification.

**Parameters:**
- `msg` *(string)*: Message HTML
- `type` *(string)* [optional]: `'info'` | `'success'` | `'error'` | `'warn'`

**Returns:** void

**Details:**
- Displays toast in global notice area
- Auto-hides after 5 seconds
- Multiple toasts: later one replaces earlier

**Example:**
```javascript
toast('Form saved', 'success');
// Green success toast appears, disappears after 5 seconds
```

#### `hideGlobalNotice()`
**Purpose:** Hide the global toast notification immediately.

**Parameters:** None

**Returns:** void

---

### Static Configuration

#### `CheckForm.SC_ITEMS` (Array\<string>)
Self-Check questions (11 items). Questions 8-11 are binary (yes/no only).

#### `CheckForm.DS_ITEMS` (Array\<string>)
Direct Supervision questions (5 items). All have yes/no/N/A options.

#### `CheckForm.CH_ITEMS` (Array\<string>)
Check questions (10 items). Question 1 is binary (yes/no only).

#### `CheckForm.PR_ITEMS` (Array\<string>)
Peer Review questions (9 items). All have yes/no/N/A options.

#### `CheckForm.RISK_MAP` (Object)
Maps risk level → expected SC-8/SC-10 values for consistency validation.
```javascript
{
  low: { sc8: 'yes', sc10: 'no' },
  medium: { sc8: 'no', sc10: 'no' },
  high: { sc8: 'no', sc10: 'yes' }
}
```

#### `CheckForm.BINARY_QUESTIONS` (Object)
Marks which questions should be yes/no only (no N/A option).
```javascript
{
  sc: new Set([8, 9, 10, 11]),
  ch: new Set([1])
}
```

---

## 4. Common Patterns

### Pattern 1: Conditional Section Visibility Based on Role

**Use case:** Show Professional of Record field instead of Checker when role is EIT.

```javascript
// Triggered when user selects role:
updateRoleLabels(true);  // resetSc11 = true

// Inside method:
const isEit = getRadioValue('sc_role') === 'Engineer-in-Training';
if (isEit) {
  elements.scNameLabel.textContent = 'Engineer-in-Training';
  elements.wiLabel.textContent = 'Professional of Record';
  elements.wiInput.placeholder = 'POR name...';
} else {
  elements.scNameLabel.textContent = 'Engineer';
  elements.wiLabel.textContent = 'Checker';
  elements.wiInput.placeholder = 'Checker name...';
}
```

**Key insight:** Labels and section visibility change dynamically based on role, enforcing governance rules (EIT must have PE supervision).

---

### Pattern 2: Risk-Driven Validation with Automatic Section Cascading

**Use case:** High-risk work automatically triggers peer review section, with consistency checks on SC-8/10.

```javascript
// User clicks "High" risk button:
setRiskLevel('high');
// Behind the scenes:
// 1. Risk button highlighted
// 2. minCheckLevel → "Type 1 Independent Review Required"
// 3. showRiskConsistencyNotices() validates SC-8/10 match high-risk pattern:
//    - SC-8 must be "No" (high-risk is NOT "low risk")
//    - SC-10 must be "Yes" (high-risk IS defined as "high-risk")
// 4. syncSectionVisibility() cascades:
//    - Check section → visible (required for high-risk)
//    - Peer Review section → visible (Type 1 review required)
//    - Comments section → visible (for feedback loop)

// If SC-8 is answered incorrectly:
renderNoticeStack('sc', 8, [{
  message: `<b>Correction required:</b> Not consistent with Risk Level 
            (<b>HIGH</b>). Expected <b>"No"</b>.`,
  type: 'error'
}]);
// User sees red error inline with SC-8 question
```

**Key insight:** Risk level drives both visibility rules AND validation rules, enforcing consistent engineering governance.

---

### Pattern 3: Signature Capture with Lazy Brush Algorithm

**Use case:** Users draw or upload signatures with responsive, smooth rendering.

```javascript
// User clicks "Draw Signature" button:
openSignatureModal('sc');
// Modal opens with canvas configured via setupModalCanvasDrawing()

// setupModalCanvasDrawing() implements:
// - Lazy brush: pointer trails behind brush by ~7px
// - Exponential smoothing: brush position smooths over ~38ms
// - Speed-sensitive width: slow strokes = thick (12px), fast strokes = thin (5px)
// - 60Hz RAF loop for frame rate stability
// - Quadratic curve rendering for smooth paths

// When user finishes drawing:
closeSignatureModal(true);
// Canvas exported to data URL:
const dataUrl = signatureModalCanvas.toDataURL();
// Stored in hidden input: #sc_sig_data
// Preview image updates with setSignaturePreview('sc', dataUrl)

// Alternatively, user clicks "Upload":
handleSignatureUpload(event, 'sc');
// File read as data URL, same result
```

**Key insight:** Drawing algorithm balances responsiveness with smoothness via lazy brush + exponential smoothing, preventing jittery pen strokes.

---

## 5. Gotchas

### 1. **Don't manually set radio button `value` attributes**

❌ **Danger:**
```javascript
// WRONG: clearSection() will break if you do this
document.getElementById('sc1_yes').value = 'approved';  // DON'T DO THIS
// clearSection('s1') later will clear .checked but value='approved' corrupts state
```

✅ **Safe:**
```javascript
// Radio values are semantic: 'yes', 'no', 'na'
// clearSection() explicitly skips radio value clearing
sec.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
// Values preserved, only checked state cleared
```

### 2. **Quill editors require explicit sync before export**

❌ **Danger:**
```javascript
// If you export without syncing Quill:
saveSnapshot();
// Hidden inputs may have old comment text, Quill `.ql-editor` HTML lost
```

✅ **Safe:**
```javascript
// Always sync before export:
saveSnapshot() {
  this.syncAllQuillEditors();  // <-- Critical!
  // Now hidden inputs have current Quill HTML
}
```

### 3. **Modal canvas requires explicit resize on viewport change**

❌ **Danger:**
```javascript
// If user resizes browser while modal open:
// Canvas CSS size changes but internal resolution doesn't
// Drawing appears distorted/clipped
```

✅ **Safe:**
```javascript
// resizeModalCanvas() called on openSignatureModal():
resizeModalCanvas() {
  const cssW = canvas.offsetWidth;  // Get CSS width
  const cssH = canvas.offsetHeight;
  canvas.width = cssW;  // Set internal resolution
  canvas.height = cssH;
}
```

### 4. **Section visibility not automatically triggered by question changes**

❌ **Danger:**
```javascript
// User changes SC-11 answer, but you don't call sync:
document.getElementById('sc11_no').checked = true;
// DS section doesn't auto-show (still hidden from previous state)
```

✅ **Safe:**
```javascript
// Always trigger cascading updates:
document.getElementById('sc11_no').checked = true;
this.syncDirectSupervision();  // Shows DS section
this.syncSectionVisibility();  // Cascades to PR/Comments
this.updateProgress();
```

### 5. **Signature preview clears if data URL expires or canvas is cleared**

❌ **Danger:**
```javascript
// If user clears modal signature mid-edit:
clearModalSignature();
// But doesn't save (closeSignatureModal(false))
// Then closes modal
// Old preview still shows stale image
```

✅ **Safe:**
```javascript
// Previews only persist after closeSignatureModal(true) save
// Unsaved edits discarded when modal closes without save
closeSignatureModal(false);  // Discard changes
// Preview remains unchanged (old state preserved)
```

### 6. **Required field validation depends on CSS border-bottom-width**

❌ **Danger:**
```javascript
// If CSS is broken or border-bottom not set:
const isValid = parseFloat(getComputedStyle(el).borderBottomWidth) === 0;
// May incorrectly report all fields as invalid
```

✅ **Safe:**
```javascript
// Required fields MUST have CSS rule:
.required-field-underline {
  border-bottom: 2px solid var(--color-tertiary);  // Default: invalid (red)
}
// Valid fields have border-bottom-width: 0
input:valid + .required-field-underline {
  border-bottom-width: 0;  // Valid (no underline)
}
```

### 7. **Name syncing can infinite-loop if not debounced**

❌ **Danger:**
```javascript
// Without the syncingNames flag:
// User types "John" in #engineer
// handleGlobalInput() sets #sc_name = "John"
// That triggers input event
// Which sets #engineer = "John"
// Which triggers input event...
```

✅ **Safe:**
```javascript
// syncCheckerNames() uses flag:
syncCheckerNames () {
  if (this.syncingNames) return;  // <-- Guard
  this.syncingNames = true;
  // ... sync logic
  this.syncingNames = false;
}
```

### 8. **Progress calculation must account for hidden sections**

❌ **Danger:**
```javascript
// If you count all rows equally:
total = SC_ITEMS.length + DS_ITEMS.length + CH_ITEMS.length + PR_ITEMS.length;
// Progress = 100% even if only SC filled (DS/CH/PR hidden and empty)
```

✅ **Safe:**
```javascript
// updateProgress() only counts visible sections:
let total = 0, answered = 0;
this.sectionConfig.forEach(s => {
  const hidden = s.cardId && document.getElementById(s.cardId)?.classList.contains('hidden');
  if (hidden) return;  // <-- Skip hidden sections
  total += s.count;
  answered += counts.get(s.rowsId) ?? 0;
});
const pct = total ? Math.round((answered / total) * 100) : 0;
```

---

## 6. Related Modules & Integration Points

### SharePoint Integration
- **Parent:** [head.html](sites/de/head.html), [body.html](sites/de/body.html) — Master pages load CheckForm.html
- **Asset path:** `/sites/de/SiteAssets/html/CheckForm.html`
- **URL format:** Respects SharePoint relative paths (`?download=1` suffixes handled by master pages)

### Signature Utilities
- **Independent modules:** Drawing algorithm, file upload handler, canvas resize logic can be extracted as standalone Signature Pad class
- **Integration:** Currently embedded in CheckForm; could be refactored to separate `SignaturePad` class for reuse

### Print Styling
- **CSS:**  `@media print` rules in `<style>` block handle page breaks, signature rendering, hiding action buttons
- **Integration:** `printFormAsPdf()` triggers browser print dialog; CSS handles layout

### Rich Text Editor (Quill)
- **External library:** `quill@2.0.3` from CDN
- **Integration:** `initQuillEditors()` configures toolbar (bold, italic, lists, links, headers)
- **Data flow:** Quill HTML → hidden input → form export

### Form Data Export
- **JSON export:** FormData API + JSON.stringify → `DE_CheckForm.json`
- **HTML snapshot:** DOM clone + element sync → timestamped HTML file
- **PDF export:** Browser `window.print()` + CSS print styles

### Accessibility Features
- **ARIA labels:** `aria-controls`, `aria-expanded`, `aria-selected`, `aria-live`
- **Skip links:** `.skip-link` for keyboard navigation
- **Keyboard support:** Enter/Space to toggle sections, Escape to close modals
- **Color contrast:** Design system CSS variables ensure WCAG AA compliance

### Validation & Error Handling
- **Form validation:** `.required-field-underline` CSS borders indicate valid/invalid state
- **Custom notices:** `renderNoticeStack()` displays risk consistency errors inline
- **User feedback:** Toast system with 5-second auto-dismiss

---

## Appendix: Form Workflow Diagram

```
Start
  ↓
[Select Role: Engineer or EIT?]
  ↓
[Fill Self-Check (SC): 11 questions + risk level]
  ↓
[SC-11 = "No"?] ──→ NO → [Skip Direct Supervision]
  ↓ YES
[Fill Direct Supervision (DS): 5 questions]
  ↓
[Risk Level determines Check requirement]
  ├─ Low Risk → [Skip Check section]
  ├─ Medium Risk → [Fill Check (CH): 10 questions]
  └─ High Risk → [Fill Check (CH): 10 questions]
  ↓
[Any "No" answers in CH or High Risk?]
  ├─ NO → [Skip Peer Review]
  └─ YES → [Fill Peer Review (PR): 9 questions]
  ↓
[Fill Comments section (if any of DS/CH/PR visible)]
  ↓
[Fill Final section (if PR visible and answered)]
  ↓
[100% progress?]
  ├─ NO → [Show progress bar, guide user]
  └─ YES → [Enable PDF export]
  ↓
[Save Snapshot or Export PDF]
  ↓
End
```

