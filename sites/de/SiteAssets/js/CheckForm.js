// -------------------------------------------------------------
// -----------------Do not edit the XML tags--------------------
// -------------------------------------------------------------
//<Document-Level>
//<ACRO_source>ClearFieldsScript</ACRO_source>
//<ACRO_script>
/*********** belongs to: Document-Level:ClearFieldsScript ***********/

// --- 1. Global Variables ---
var DEBUG = false;
var RESET = false;
var CASCADE_INDEX = 0;
var VISIBILITY_KEYS = [];
var fields = {};
var visibilityStates = {};
var isInitialized = false;
var isInitializing = false;
var fieldNames = [];
var doc = this;

// FIX: original fallback iterated `obj.length` which is undefined on plain objects,
//      so `0 < undefined` is false and the loop never ran, silently returning [].
//      Replaced with a standard `for...in` + hasOwnProperty guard.
function objectKeys (obj) {
  if (typeof Object.keys === 'function') return Object.keys(obj);
  var keys = [];
  for (var p in obj) {
    if (obj.hasOwnProperty(p)) keys.push(p);
  }
  return keys;
}

// --- 2. Configuration ---
var FIELD_MAP = {
  Cblocker: 'Checker_Blocker',
  DSblocker: 'DS_Blocker',
  PRblocker: 'PR_Blocker',
  TLblocker: 'TL_Blocker',
  low: 'Risk - Low',
  medium: 'Risk - Medium',
  high: 'Risk - High',
  riskwarning: 'High Risk Warning',
  structwarning: 'Structural Warning'
};

// BITMASK FLAGS (powers of 2 for bitwise operations)
var VISIBILITY_FLAGS = {
  HIGH_RISK: 1,   // bit 0
  LOW_RISK: 2,   // bit 1
  STRUCTURAL: 4,   // bit 2
  RISK_WARNING: 8,   // bit 3
  POR: 16,   // bit 4
  RISK_LEVEL: 32,   // bit 5
  RADIO_SELECTED: 64   // bit 6
};

// Map logic names to bitmask flags
var LOGICS = {
  highRisk: VISIBILITY_FLAGS.HIGH_RISK,
  lowRisk: VISIBILITY_FLAGS.LOW_RISK,
  structural: VISIBILITY_FLAGS.STRUCTURAL,
  riskWarning: VISIBILITY_FLAGS.RISK_WARNING,
  PoR: VISIBILITY_FLAGS.POR,
  riskLevel: VISIBILITY_FLAGS.RISK_LEVEL,
  radioSelected: VISIBILITY_FLAGS.RADIO_SELECTED
};

var MappingFields = getOwnValues(FIELD_MAP);
var Signatures = ['Signature - Engineer', 'Signature - Checker', 'Signature - TL', 'Signature - Peer Reviewer'];
var RequiredFields = ['Engineer_EIT', 'Work Title', 'Check Date', 'Revision', 'Risk', 'Dropdown.milestone'];
var EngineerRequiredFields = ['Date - Engineer_af_date', 'Engineer'];
var CheckerRequiredFields = ['Date - Checker_af_date', 'Checker'];
var TLRequiredFields = ['Date - TL_af_date', 'Assigned Type 1 Reviewer Name'];
var PRRequiredFields = ['Date - Peer Reviewer_af_date', 'Peer Reviewer Name'];

// Field Groupings
var PRfields = ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8', '4.9'];
var Cfields = ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9', '3.10'];
var SCfields = ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10', '1.11'];
var DSfields = ['2.1', '2.2', '2.3', '2.4', '2.5'];
var FormFields = [
  'Dropdown.milestone', 'Risk', 'Label - POR', 'Engineer-in-Training',
  'Label - Checker', 'POR', 'Engineer_EIT', 'Work Title', 'Revision',
  'Engineer', 'Checker', 'Check Date', 'DebugOutput'
];
var BlockerFields = ['Checker_Blocker', 'PR_Blocker', 'TL_Blocker', 'DS_Blocker'];
var RiskLevelFields = ['Risk - Low', 'Risk - Medium', 'Risk - High'];

var CRComments = (function () {
  var f = [];
  for (var i = 1; i < 6; i++) {
    f.push('Checker and Reviewer CommentsCorrectionsCorrective ActionsRow' + i);
  }
  return f;
})();

var EComments = (function () {
  var f = [];
  for (var i = 1; i < 6; i++) {
    f.push('Engineers Response AcceptRejectAddress commentsRow' + i);
  }
  return f;
})();

// --- 3. Initialization ---
function initFields () {
  if (isInitialized || isInitializing) return;
  isInitializing = true;

  try {
    fieldNames = ['DebugOutput'].concat(
      PRfields, Cfields, SCfields, DSfields,
      FormFields, MappingFields, CRComments, EComments,
      BlockerFields, RiskLevelFields
    );

    visibilityStates = {};
    VISIBILITY_KEYS = objectKeys(FIELD_MAP);
    for (var k = 0; k < VISIBILITY_KEYS.length; k++) {
      visibilityStates[VISIBILITY_KEYS[k]] = 0;
    }

    // FIX: removed duplicate `var i` — use separate loop variable names
    fields = {};
    for (var n = 0; n < fieldNames.length; n++) {
      var fName = fieldNames[n];
      var f = doc.getField(fName);
      if (f) {
        fields[fName] = f;
        debugPrint('@initFields - field: ' + fName + ' = ' + f.value);
      } else {
        debugPrint('Warning: Field not found - ' + fName);
      }
    }

    isInitialized = true;
    debugPrint('@initFields - initialized: ' + isInitialized);
  } catch (e) {
    debugPrint('Error initializing fields: ' + e);
  } finally {
    isInitializing = false;
  }
}

// --- 4. Field Access Helpers ---
function getF (name) {
  if (!isInitialized) initFields();
  return fields[name] || doc.getField(name);
}

function safeSetValue (fieldName, value) {
  var f = getF(fieldName);
  if (!f) return false;
  if (f.readonly) {
    debugPrint('Cannot set read-only field: ' + fieldName);
    return false;
  }
  try {
    debugPrint('safeSetValue: ' + fieldName + ' = ' + value);
    f.value = value;
    return true;
  } catch (e) {
    debugPrint("Failed to set " + fieldName + " = '" + value + "': " + e);
    return false;
  }
}

// Blocker fields use inverted display semantics: visible flag → field hidden
// (the blocker hides/reveals dependents; when the blocker is "active" it is hidden)
function setDisplay (fieldName, isVisible) {
  var f = getF(fieldName);
  if (!f) return;
  try {
    if (BlockerFields.indexOf(fieldName) !== -1) {
      f.display = isVisible ? display.hidden : display.visible;
    } else {
      f.display = isVisible ? display.visible : display.hidden;
    }
    debugPrint('@setDisplay - set ' + fieldName + ' = ' + f.display);
  } catch (e) {
    debugPrint('Error setting display for ' + fieldName + ': ' + e.message);
  }
}

function clearFields (fieldArray) {
  try {
    for (var i = 0; i < fieldArray.length; i++) {
      var f = getF(fieldArray[i]);
      if (!f) continue;
      switch (f.type) {
        case 'text':
          f.value = '';
          break;
        case 'combobox':
          f.value = f.getItemAt(0, false);
          break;
        case 'radiobutton':
          f.value = 'Off';
          break;
        default:
          break;
      }
    }
    debugPrint('@clearFields - cleared ' + fieldArray.join(', '));
  } catch (e) {
    debugPrint('Error clearing fields: ' + e.message);
  }
}

// --- 5. Visibility / Bitmask ---
function setVisibilityFlag (keys, flag, shouldShow) {
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (visibilityStates[key] !== undefined) {
      if (shouldShow) {
        visibilityStates[key] |= flag;
      } else {
        visibilityStates[key] &= ~flag;
      }
    }
  }
  debugPrint('@setVisibilityFlag');
}

function isVisible (key) {
  return visibilityStates[key] > 0;
}

function updateFieldVisibility () {
  if (RESET) return;
  debugPrint('@updateFieldVisibility - CASCADE_INDEX = ' + CASCADE_INDEX);
  if (CASCADE_INDEX > 1) return;

  for (var i = 0; i < VISIBILITY_KEYS.length; i++) {
    var key = VISIBILITY_KEYS[i];
    var name = FIELD_MAP[key];
    setDisplay(name, isVisible(key));
  }
  updateCheckerField();
  updateSignatures();
  debugPrint('@updateFieldVisibility');
  printDebugInfo();
}

function updateCheckerField () {
  var checkerField = getF('Checker');
  if (!checkerField) return;
  try {
    checkerField.required = isVisible('Cblocker');
    debugPrint('@updateCheckerField');
  } catch (e) {
    debugPrint('Error updating Checker field required status: ' + e.message);
  }
}

function updateSignatures () {
  var checkerSig = getF('Signature - Checker');
  var prSig = getF('Signature - Peer Reviewer');
  var tlSig = getF('Signature - TL');
  if (!checkerSig || !prSig || !tlSig) return;
  try {
    checkerSig.display = isVisible('Cblocker') ? display.visible : display.hidden;
    prSig.display = isVisible('PRblocker') ? display.visible : display.hidden;
    tlSig.display = isVisible('TLblocker') ? display.visible : display.hidden;
    debugPrint('@updateSignatures');
  } catch (e) {
    debugPrint('Error updating signature visibility: ' + e.message);
  }
}

function resetVisibilityStates () {
  for (var i = 0; i < VISIBILITY_KEYS.length; i++) {
    var key = VISIBILITY_KEYS[i];
    if (visibilityStates.hasOwnProperty(key)) {
      visibilityStates[key] = 0;
    }
  }
  debugPrint('@resetVisibilityStates');
  updateFieldVisibility();
}

// --- 6. Form Control ---
function onEITChange () {
  if (!isInitialized) initFields();
  try {
    var eitField = getF('Engineer_EIT');
    if (!eitField) { debugPrint('onEITChange: Engineer_EIT field not found'); return; }

    var isEIT = (eitField.value === 'Engineer-in-Training:');
    debugPrint('onEITChange: ' + eitField.value);

    setDisplay('Engineer-in-Training', isEIT);

    var f1_11 = getF('1.11');
    if (!f1_11 || f1_11.value === 'Yes') return;

    if (safeSetValue('1.11', isEIT ? 'No' : 'Off')) {
      debugPrint('@onEITChange - Set 1.11 to: ' + getF('1.11').value);
    }
    toggleVisibilityBasedOnPOR();
  } catch (err) {
    debugPrint('Error@onEITChange: ' + err.message);
  }
}

// --- 7. Form Logic ---

// FIX: original called riskwarningfcn() before setVisibilityFlag, so the warning
//      read stale state. Flag update now runs first. Also use true/false, not 1/0.
function highRisk () {
  if (!isInitialized) initFields();
  var f1_10 = getF('1.10');
  if (!f1_10) return;
  var show = (f1_10.value === 'Yes');
  debugPrint('@highRisk - 1.10 = ' + f1_10.value);
  setVisibilityFlag(['Cblocker', 'TLblocker'], LOGICS.highRisk, show);
  riskwarningfcn();
}

function lowRisk () {
  if (!isInitialized) initFields();
  var f1_8 = getF('1.8');
  if (!f1_8) return;
  var show = (f1_8.value === 'No');
  debugPrint('@lowRisk - 1.8 = ' + f1_8.value);
  setVisibilityFlag(['Cblocker'], LOGICS.lowRisk, show);
  riskwarningfcn();
}

function structural () {
  if (!isInitialized) initFields();
  var f1_9 = getF('1.9');
  if (!f1_9) return;
  debugPrint('@structural - 1.9 = ' + f1_9.value);
  setVisibilityFlag(['structwarning'], LOGICS.structural, f1_9.value === 'Yes');
  updateFieldVisibility();
}

function riskwarningfcn () {
  if (!isInitialized) initFields();
  var f1_10 = getF('1.10');
  var f1_9 = getF('1.9');
  var f1_8 = getF('1.8');
  var fRisk = getF('Risk');
  if (!f1_10 || !f1_8 || !f1_9 || !fRisk) return;

  var v1_10 = f1_10.value;
  var v1_8 = f1_8.value;
  var non_standard = f1_9.value;
  var risk = fRisk.value;
  var show = false;
  debugPrint('@riskwarningfcn - 1.10 = ' + v1_10 + ', 1.8 = ' + v1_8 + ', Risk = ' + risk);

  switch (risk) {
    case 'High':
      show = (v1_10 === 'No' || v1_8 === 'Yes');
      break;
    case 'Medium':
      show = (v1_10 === 'Yes' || v1_8 === 'Yes');
      break;
    case 'Low':
      show = (v1_8 === 'No' || v1_10 === 'Yes' || non_standard === 'Yes');
      break;
    default:
      show = false;
      break;
  }

  setVisibilityFlag(['riskwarning'], LOGICS.riskWarning, show);
  updateFieldVisibility();
}

// FIX: removed redundant direct setDisplay calls for risk-level labels — those
//      fields are already in FIELD_MAP so updateFieldVisibility handles them.
//      Also replaced 1/0 with true/false.
function toggleVisibilityBasedOnPOR () {
  if (!isInitialized) initFields();
  var porField = getF('1.11');
  if (!porField) return;

  var show = (porField.value === 'No');
  debugPrint('@toggleVisibilityBasedOnPOR - 1.11 = ' + porField.value);
  setVisibilityFlag(['Cblocker', 'DSblocker'], LOGICS.PoR, show);
  setDisplay('Label - POR', show);
  setDisplay('POR', show);
  updateFieldVisibility();
}

function Risk () {
  if (!isInitialized) initFields();
  var fRisk = getF('Risk');
  if (!fRisk) return;

  var val = fRisk.value;
  var flag = LOGICS.riskLevel;

  // Clear all risk-level flags first
  setVisibilityFlag(['Cblocker', 'TLblocker', 'low', 'medium', 'high'], flag, false);

  switch (val) {
    case 'High':
      setVisibilityFlag(['Cblocker', 'TLblocker', 'high'], flag, true);
      break;
    case 'Medium':
      setVisibilityFlag(['Cblocker', 'medium'], flag, true);
      break;
    case 'Low':
      setVisibilityFlag(['low'], flag, true);
      break;
    default:
      break;
  }

  debugPrint('@Risk - Risk Level = ' + val);
  updateFieldVisibility();
}

function PRradioboxes () {
  if (!isInitialized) initFields();
  var isAnyPR = false;
  for (var i = 0; i < PRfields.length; i++) {
    var f = getF(PRfields[i]);
    if (f && f.value !== 'Off') { isAnyPR = true; break; }
  }
  setVisibilityFlag(['PRblocker'], LOGICS.radioSelected, isAnyPR);
  debugPrint('@PRradioboxes - Peer Review appeared: ' + (isAnyPR ? 'Yes' : 'No'));
  updateFieldVisibility();
}

function Cradioboxes () {
  if (!isInitialized) initFields();
  var isAnyC = false;
  for (var i = 0; i < Cfields.length; i++) {
    var f = getF(Cfields[i]);
    if (f && f.value !== 'Off') { isAnyC = true; break; }
  }
  setVisibilityFlag(['Cblocker'], LOGICS.radioSelected, isAnyC);
  debugPrint('@Cradioboxes - Checker appeared: ' + (isAnyC ? 'Yes' : 'No'));
  updateFieldVisibility();
}

// --- 8. Reset / Clear ---

// FIX: removed checkEngineer/Checker/PR/TLRequired from clearForm cascade —
//      those functions write readonly state and have no place in a clear operation.
function clearForm () {
  cascadingFuncs([resetVisibilityStates, clearPRfields, clearCfields, clearDSfields, clearSCfields, clearFormFields]);
  debugPrint('@clearForm');
}

function clearPRfields () {
  clearFields(PRfields);
  debugPrint('@clearPRfields');
  PRradioboxes();
}

function clearCfields () {
  clearFields(Cfields);
  debugPrint('@clearCfields');
  Cradioboxes();
}

function clearDSfields () {
  clearFields(DSfields);
  debugPrint('@clearDSfields');
}

function clearSCfields () {
  clearFields(SCfields);
  cascadingFuncs([highRisk, lowRisk, structural, riskwarningfcn, toggleVisibilityBasedOnPOR]);
  debugPrint('@clearSCfields');
}

function clearFormFields () {
  clearFields(FormFields);
  debugPrint('@clearFormFields');
}

// --- 9. Debug ---
function printDebugInfo () {
  if (!isInitialized) initFields();

  var debugField = getF('DebugOutput');
  if (!debugField) return;
  debugField.display = DEBUG ? display.visible : display.hidden;

  var numFlags = objectKeys(LOGICS).length;
  var debugText = '=== VISIBILITY STATES (BITMASK) ===\n';
  debugText += padRight('Field', 13) + ' | ' + padRight('Value', 8) + ' | Binary\n';
  debugText += '------------------------------------\n';

  for (var i = 0; i < VISIBILITY_KEYS.length; i++) {
    var key = VISIBILITY_KEYS[i];
    if (!visibilityStates.hasOwnProperty(key)) continue;
    var val = visibilityStates[key];
    var binary = padBinary(val, numFlags);
    var chars = binary.split('').reverse();
    var activeBits = [];
    for (var b = 0; b < chars.length; b++) {
      if (chars[b] === '1') activeBits.push(b);
    }
    debugText += padRight(key, 13) + ' | ' + padRight(activeBits.join(','), 8) + ' | ' + binary + '\n';
    debugPrint('@printDebugInfo - visibilityStates[' + key + '] = ' + val);
  }
  debugField.value = debugText;
  debugPrint(debugText);
}

function debugPrint (msg) {
  if (!DEBUG) return;
  try {
    if (typeof console !== 'undefined' && typeof console.println === 'function') {
      console.println('[DEBUG] ' + String(msg));
    }
  } catch (e) { /* ignore */ }
}

// --- 10. Utilities ---
function cascadingFuncs (funcArray) {
  debugPrint('=== CASCADE STARTED ===');
  RESET = true;
  CASCADE_INDEX += 1;
  for (var i = 0; i < funcArray.length; i++) {
    if (typeof funcArray[i] === 'function') funcArray[i]();
  }
  RESET = false;
  updateFieldVisibility();
  CASCADE_INDEX -= 1;
  debugPrint('=== CASCADE COMPLETE ===');
}

function padBinary (num, len) {
  var b = num.toString(2);
  while (b.length < len) b = '0' + b;
  return b;
}

function padLeft (str, length) {
  str = String(str);
  while (str.length < length) str = ' ' + str;
  return str;
}

function padRight (str, length) {
  str = String(str);
  while (str.length < length) str += ' ';
  return str;
}

function getOwnValues (obj) {
  var vals = [];
  var keys = objectKeys(obj);
  for (var i = 0; i < keys.length; i++) {
    if (obj.hasOwnProperty(keys[i])) vals.push(obj[keys[i]]);
  }
  return vals;
}

// --- 11. Signature Helpers ---
function isFieldSigned (fieldName) {
  var f = getF(fieldName);
  if (!f) return false;
  var signed = (f.value !== '');
  debugPrint('@isFieldSigned - ' + fieldName + ' signed: ' + signed);
  return signed;
}

function isSignatureVisible (fieldName) {
  var f = getF(fieldName);
  if (!f) return false;
  var vis = (f.display === display.visible);
  debugPrint('@isSignatureVisible - ' + fieldName + ' visible: ' + vis);
  return vis;
}

// FIX: parameter name shadowed the module-level `fields` cache. Renamed to `fieldList`.
function lockFields (fieldList) {
  for (var i = 0; i < fieldList.length; i++) {
    var f = getF(fieldList[i]);
    if (f && f.type !== 'signature') f.readonly = true;
  }
  debugPrint('@lockFields for ' + fieldList.join(', ') + ' - Fields locked');
}

// --- 12. Required Field Checks ---
function checkRequiredFields (requiredFields) {
  for (var i = 0; i < requiredFields.length; i++) {
    var f = getF(requiredFields[i]);
    if (!f) continue;
    if (f.type === 'combobox' && String(f.value) === String(f.getItemAt(0, false))) {
      debugPrint('@checkRequiredFields - ' + f.name + ' is still the combobox default');
      return false;
    }
    if (f.display === display.visible && (f.value === '' || f.value === 'Off')) {
      debugPrint('@checkRequiredFields - ' + f.name + ' is empty or Off');
      return false;
    }
  }
  debugPrint('@checkRequiredFields - All required fields filled: ' + requiredFields);
  return true;
}

// FIX: original always ended with `readonly = false` regardless of pass/fail,
//      making the pessimistic lock (`readonly = true` at the start) meaningless.
//      Now: lock the signature first, unlock only when all checks pass.
function checkEngineerRequired () {
  if (!isInitialized) initFields();
  var sig = getF('Signature - Engineer');
  if (!sig) return false;
  sig.readonly = true;
  var ok = checkRequiredFields(RequiredFields) && checkRequiredFields(EngineerRequiredFields);
  if (ok) { sig.readonly = false; doc.calculateNow(); }
  debugPrint(ok ? 'Unlock Engineer Signature' : 'Lock Engineer Signature');
  return ok;
}

function checkCheckerRequired () {
  if (!isInitialized) initFields();
  var sig = getF('Signature - Checker');
  if (!sig) return false;
  sig.readonly = true;
  var ok = checkRequiredFields(RequiredFields) && checkRequiredFields(CheckerRequiredFields);
  if (ok) { sig.readonly = false; doc.calculateNow(); }
  debugPrint(ok ? 'Unlock Checker Signature' : 'Lock Checker Signature');
  return ok;
}

function checkPRRequired () {
  if (!isInitialized) initFields();
  var sig = getF('Signature - Peer Reviewer');
  if (!sig) return false;
  sig.readonly = true;
  var ok = checkRequiredFields(RequiredFields) && checkRequiredFields(PRRequiredFields);
  if (ok) { sig.readonly = false; doc.calculateNow(); }
  debugPrint(ok ? 'Unlock PR Signature' : 'Lock PR Signature');
  return ok;
}

function checkTLRequired () {
  if (!isInitialized) initFields();
  var sig = getF('Signature - TL');
  if (!sig) return false;
  sig.readonly = true;
  var ok = checkRequiredFields(RequiredFields) && checkRequiredFields(TLRequiredFields);
  if (ok) { sig.readonly = false; doc.calculateNow(); }
  debugPrint(ok ? 'Unlock TL Signature' : 'Lock TL Signature');
  return ok;
}

// --- 13. Signature Change & Locking ---

// FIX: since both `signed` and `visible` are built by filtering the same ordered
//      Signatures array, the O(n²) arraysEqual membership check is unnecessary.
//      Equal counts guarantees the same subset.
function onSignatureChange () {
  var signedCount = 0;
  var visibleCount = 0;
  for (var i = 0; i < Signatures.length; i++) {
    if (isFieldSigned(Signatures[i])) signedCount++;
    if (isSignatureVisible(Signatures[i])) visibleCount++;
  }
  debugPrint('@onSignatureChange - Signed: ' + signedCount + ', Visible: ' + visibleCount);

  if (signedCount === visibleCount) {
    debugPrint('@onSignatureChange - All signatures signed');
    return true;
  }

  debugPrint('@onSignatureChange - Some signatures unsigned');
  SelfCheckSignature();
  CheckSignature();
  PRSignature();
  TLSignature();
  return false;
}

function SelfCheckSignature () {
  if (isFieldSigned('Signature - Engineer')) {
    lockEngineerFields();
    debugPrint('@SelfCheckSignature - signed');
  }
}

function CheckSignature () {
  if (isFieldSigned('Signature - Checker')) {
    lockCheckerFields();
    debugPrint('@CheckSignature - signed');
  }
}

function PRSignature () {
  if (isFieldSigned('Signature - Peer Reviewer')) {
    lockPRFields();
    debugPrint('@PRSignature - signed');
  }
}

function TLSignature () {
  if (isFieldSigned('Signature - TL')) {
    lockTLFields();
    debugPrint('@TLSignature - signed');
  }
}

function lockTLFields () {
  var tl_fields = DSfields.concat(['Date - TL_af_date', 'Assigned Type 1 Reviewer Name']);
  lockFields(tl_fields);
  debugPrint('@lockTLFields - TL fields locked');
}

function lockEngineerFields () {
  var eng_fields = [].concat(RequiredFields, EngineerRequiredFields, SCfields, EComments);
  lockFields(eng_fields);
  debugPrint('@lockEngineerFields - Engineer fields locked');
}

function lockCheckerFields () {
  var checker_fields = Cfields.concat(CRComments, DSfields, CheckerRequiredFields);
  lockFields(checker_fields);
  debugPrint('@lockCheckerFields - Checker fields locked');
}

function lockPRFields () {
  var pr_fields = PRfields.concat(CRComments, PRRequiredFields);
  lockFields(pr_fields);
  debugPrint('@lockPRFields - PR fields locked');
}

function lockAllFields () {
  if (!onSignatureChange()) return;
  lockFields(fieldNames);
  debugPrint('@lockAllFields - All fields locked');
}

// --- 14. Document Events ---
function onOpen () {
  if (!isInitialized) initFields();
  cascadingFuncs([checkEngineerRequired, checkCheckerRequired, checkPRRequired, checkTLRequired]);
  debugPrint('@onOpen');
}

// Run initialization immediately when script loads
initFields();