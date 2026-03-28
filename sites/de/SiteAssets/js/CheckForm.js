//-------------------------------------------------------------
//-----------------Do not edit the XML tags--------------------
//-------------------------------------------------------------

//<Document-Level>
//<ACRO_source>ClearFieldsScript</ACRO_source>
//<ACRO_script>
/*********** belongs to: Document-Level:ClearFieldsScript ***********/
var DEBUG = true;
var RESET = false;

var FIELD_MAP = {
  signatureC: 'Signature - Checker',
  dateC: 'Date - Checker_af_date',
  C: 'Checker',
  signatureTL: 'Signature - TL',
  dateTL: 'Date - TL_af_date',
  R: 'Assigned Type 1 Reviewer Name',
  signaturePR: 'Signature - Peer Reviewer',
  datePR: 'Date - Peer Reviewer_af_date',
  PR: 'Peer Reviewer Name',
  structwarning: 'Structural Warning',
  low: 'Risk - Low',
  medium: 'Risk - Medium',
  high: 'Risk - High',
  riskwarning: 'High Risk Warning',
};

// logic indexes
var LOGICS = {
  notHighRisk: 0,
  lowRisk: 1,
  structural: 2,
  riskWarning: 3,
  PoR: 4,
  riskLevel: 5,
  radioSelected: 6,
}


// Keys that participate in visibilityStates
var VISIBILITY_KEYS = Object.keys(FIELD_MAP);

// field for signatures
var SigFields = getOwnValues(FIELD_MAP);

// Field groupings
var PRfields = ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8', '4.9', '4.10'];
var Cfields = ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9', '3.10', '3.11'];
var SCfields = ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10', '1.11', '1.12'];
var DSfields = ['2.1', '2.2', '2.3', '2.4', '2.5'];

// Field references
var FormFields = ['DebugOutput', 'Dropdown.milestone', 'Risk', 'Reset2', 'blocker', 'Label - POR', 'Engineer-in-Training', 'Label - Checker', 'POR', 'Engineer_EIT'];

var fieldNames = [...PRfields, ...Cfields, ...SCfields, ...DSfields, ...FormFields, ...SigFields];

var fields = {};
for (var i = 0; i < fieldNames.length; i++) {
  fields[fieldNames[i]] = this.getField(fieldNames[i]);
}

// Visibility state arrays
var visibilityStates = {};

VISIBILITY_KEYS.forEach(function (key) {
  visibilityStates[key] = [0, 0, 0, 0, 0, 0, 0];
});

// Utility: clear fields
function clearFields (fieldArray) {
  fieldArray.forEach(function (name) {
    fields[name].value = '';
  }, this);
}

// Clear radio buttons
function clearRadioButtons (fieldArray) {
  fieldArray.forEach(function (name) {
    fields[name].value = 'Off';
  }, this);
}

// Utility: set multiple visibility states at index
function setVisibility (keys, index, value) {
  keys.forEach(function (key) {
    visibilityStates[key][index] = value;
  });
}

// High-risk logic
function highRisk () {
  var idx = LOGICS.notHighRisk;
  var val = fields['1.11'].value === 'No' ? 1 : 0;
  setVisibility(['signatureC', 'dateC', 'C', 'signatureTL', 'dateTL', 'R'], idx, val);
  updateFieldVisibility();
}

// 1.9 logic
function notlowrisk () {
  var idx = LOGICS.lowRisk;
  var val = fields['1.9'].value === 'No' ? 1 : 0;
  setVisibility(['signatureC', 'dateC', 'C'], idx, val);
  updateFieldVisibility();
}

// Structural logic
function structural () {
  var idx = LOGICS.structural;
  visibilityStates.structwarning[idx] = fields['1.10'].value === 'No' ? 1 : 0;
  updateFieldVisibility();
}

// Risk warning logic
function riskwarningfcn () {
  var idx = LOGICS.riskWarning;
  var notHighRisk = fields['1.11'].value;
  var risk = fields['Risk'].value;
  if (notHighRisk === "Off" || (notHighRisk === 'No' && risk === 'High') || (notHighRisk === 'Yes' && risk !== 'High')) {
    visibilityStates.riskwarning[idx] = 0;
  } else {
    visibilityStates.riskwarning[idx] = 1;
  }
  updateFieldVisibility();
}

// POR logic
function toggleVisibilityBasedOnPOR () {
  var idx = LOGICS.PoR;
  var POR = fields['1.12'].value;
  var show = POR === 'No';

  setVisibility(['signatureC', 'dateC', 'C'], idx, show ? 1 : 0);
  if (fields['blocker']) fields['blocker'].display = show ? display.hidden : display.visible;
  updateFieldVisibility();
}

// Risk dropdown logic
function Risk () {
  var idx = LOGICS.riskLevel;
  var val = fields['Risk'].value;
  if (val === 'High') {
    setVisibility(['signatureC', 'dateC', 'C', 'signatureTL', 'dateTL', 'R'], idx, 1);
    setVisibility(['low', 'medium'], idx, 0);
    fields['1.9'].value = 'No';
    fields['1.11'].value = 'No';
    visibilityStates.high[idx] = 1;
  } else if (val === 'Medium') {
    setVisibility(['signatureC', 'dateC', 'C'], idx, 1);
    setVisibility(['signatureTL', 'dateTL', 'R', 'low', 'high'], idx, 0);
    visibilityStates.medium[idx] = 1;
    fields['1.9'].value = 'No';
    fields['1.11'].value = 'Yes';
  } else if (val === 'Low') {
    setVisibility(['signatureC', 'dateC', 'C', 'signatureTL', 'dateTL', 'R', 'medium', 'high'], idx, 0);
    visibilityStates.low[idx] = 1;
    fields['1.9'].value = 'Yes';
    fields['1.11'].value = 'Yes';
  } else {
    setVisibility(['signatureC', 'dateC', 'C', 'signatureTL', 'dateTL', 'R', 'low', 'medium', 'high'], idx, 0);
  }
  updateFieldVisibility();
}

// Radio button logic
function radioboxes () {
  var idx = LOGICS.radioSelected;
  var isAnyPR = PRfields.some(function (name) {
    fields[name].value !== false;
  }, this);
  setVisibility(['signaturePR', 'datePR', 'PR'], idx, isAnyPR ? 1 : 0);

  var isAnyC = Cfields.some(function (name) {
    fields[name].value !== false;
  }, this);
  setVisibility(['signatureC', 'dateC', 'C'], idx, isAnyC ? 1 : 0);

  updateFieldVisibility();
}

// Central visibility update
function updateFieldVisibility () {
  if (!RESET) {
    for (var key in FIELD_MAP) {
      var field = fields[FIELD_MAP[key]];
      if (field) {
        field.display = visibilityStates[key].some(function (v) {
          return v > 0;
        })
          ? display.visible
          : display.hidden;
      }
    }
    printDebugInfo();
  }
}

// Reset all visibility states
function resetVisibilityStates () {
  for (var key in visibilityStates) {
    if (visibilityStates.hasOwnProperty(key)) {
      for (var i = 0; i < visibilityStates[key].length; i++) {
        visibilityStates[key][i] = 0;
      }
    }
  }
  updateFieldVisibility();
}

// Clear all form fields and reset visibility
function clearForm () {
  RESET = true;
  clearPRfields();
  clearCfields();
  clearSCfields();
  clearDSfields();
  highRisk();
  notlowrisk();
  structural();
  riskwarningfcn();
  toggleVisibilityBasedOnPOR();
  radioboxes();
  RESET = false;
  resetVisibilityStates();
}

// Clear PR fields
function clearPRfields () {
  clearRadioButtons(PRfields);
  radioboxes();
}

// Clear C fields
function clearCfields () {
  clearRadioButtons(Cfields);
  radioboxes();
}

// Clear DS fields
function clearDSfields () {
  clearRadioButtons(DSfields);
  toggleVisibilityBasedOnPOR();
}

// Clear SC fields
function clearSCfields () {
  clearRadioButtons(SCfields);
  highRisk();
  notlowrisk();
  structural();
  riskwarningfcn();
  toggleVisibilityBasedOnPOR();
}

// Debug info
function printDebugInfo () {
  var debugField = fields['DebugOutput'];
  if (debugField) {
    if (DEBUG) {
      debugField.display = display.visible;
    } else {
      debugField.display = display.hidden;
    }
    var debugText = '\n';
    for (var key in visibilityStates) {
      if (visibilityStates.hasOwnProperty(key)) {
        debugText += key + ': [' + visibilityStates[key].join(', ') + ']\n';
      }
    }
    debugField.value = debugText;
  }
}

function EngineerEITChange (event) {

  var isEIT;
  debugPrint('EngineerEITChange event: ' + event);
  debugPrint('EngineerEITChange event.target: ' + event.target);
  if (!event || !event.target)
    return;
  isEIT = event.target.name === 'Engineer_EIT' ? event.target.value === 'Engineer-in-Training:' : fields['Engineer_EIT'].value === 'Engineer-in-Training:';

  fields['Label - POR'].display = isEIT ? display.visible : display.hidden;
  fields['Engineer-in-Training'].display = isEIT ? display.visible : display.hidden;
  fields['POR'].display = isEIT ? display.visible : display.hidden;
  try {
    fields['1.12'].value = isEIT ? 'No' : 'Off';
  } catch (e) {
    debugPrint('Error setting 1.12 value: ' + e);
  }

  toggleVisibilityBasedOnPOR();
}

function getOwnValues (obj) {
  if (Object.values)
    return Object.values(obj);

  var vals = [];
  var value;
  for (value in obj) {
    if (obj.hasOwnProperty(value))
      vals.push(obj[value]);

  }
  return vals;
}

function debugPrint (msg) {
  if (!DEBUG)
    return;

  try {
    if (typeof console !== 'undefined' && console && typeof console.println === 'function') {
      console.println(String(msg));
      return;
    }
    if (typeof console !== 'undefined' && console && typeof console.log === 'function') {
      console.log(String(msg));
    }
  } catch (e) { // ignore
  }
}

// Document-level JavaScript (runs on file open)
function onOpen () {

}
