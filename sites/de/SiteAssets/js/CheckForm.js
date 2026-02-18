//-------------------------------------------------------------
//-----------------Do not edit the XML tags--------------------
//-------------------------------------------------------------

//<Document-Level>
//<ACRO_source>ClearFieldsScript</ACRO_source>
//<ACRO_script>
/*********** belongs to: Document-Level:ClearFieldsScript ***********/

// Field groupings
var PRfields = ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8', '4.9', '4.10'];
var Cfields = ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9', '3.10', '3.11'];
var SCfields = ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10', '1.11', '1.12'];
var DSfields = ['2.1', '2.2', '2.3', '2.4', '2.5'];

// Field references
var FormFields = [
  'Dropdown.risk',
  'Risk',
  'Reset2',
  'blocker',
  'Engineer_EIT',
  'Label - Checker',
  'Label - POR',
  'Engineer-in-Training',
  'POR',
];

var SigFields = [
  'Signature - TL',
  'Signature - Checker',
  'Signature - Peer Reviewer',
  'Date - TL_af_date',
  'Date - Checker_af_date',
  'Date - Peer Reviewer_af_date',
  'Engineer1',
  'Checker1',
  'Assigned Type 1 Reviewer Name',
  'Peer Reviewer Name',
  'Structural Warning',
  'Not Low Risk Warning',
  'Risk - Low',
  'Risk - Medium',
  'Risk - High',
  'High Risk Warning',
];

var fieldNames = [...PRfields, ...Cfields, ...SCfields, ...DSfields, ...FormFields, ...SigFields];

var fields = {};
for (var i = 0; i < fieldNames.length; i++) {
  fields[fieldNames[i]] = this.getField(fieldNames[i]);
}

var FIELD_MAP = {
  signatureC: 'Signature - Checker',
  dateC: 'Date - Checker_af_date',
  C: 'Checker1',
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

// Keys that participate in visibilityStates
var VISIBILITY_KEYS = [
  'signatureC',
  'dateC',
  'C',
  'signatureTL',
  'dateTL',
  'R',
  'signaturePR',
  'datePR',
  'PR',
  'structwarning',
  'low',
  'medium',
  'high',
  'riskwarning',
];

// Visibility state arrays
var visibilityStates = {};

function trackFieldChanges () {
  if (event.target) {
    var changedField = event.target;
    console.println(fields['Engineer_EIT'].value);
    // Check if this is the Engineer_EIT field
    if (changedField.name === 'Engineer_EIT') {
      console.println('Engineer_EIT changed to: ' + changedField.value);

      if (changedField.value === 'Engineer:') {
        fields['Label - Checker'].display = display.visible;
        fields['Label - POR'].display = display.hidden;
        fields['1.12'].value = 'Yes';
        fields['Engineer-in-Training'].display = display.hidden;
        fields['POR'].display = display.hidden;
      } else if (changedField.value === 'Engineer-in-Training:') {
        fields['Label - Checker'].display = display.hidden;
        fields['Label - POR'].display = display.visible;
        fields['1.12'].value = 'No';
        fields['Engineer-in-Training'].display = display.visible;
        fields['POR'].display = display.visible;
      }
      console.println('Engineer-in-Training changed to: ' + fields['Engineer-in-Training'].display);
      console.println('POR changed to: ' + fields['POR'].display);
      console.println('Label - Checker changed to: ' + fields['Label - Checker'].display);
      console.println('Label - POR changed to: ' + fields['Label - POR'].display);
      toggleVisibilityBasedOnPOR();
    }
  }
}

function sameFields () {
  if (event.target) {
    var changedField = event.target;

    // Check if this is the Engineer_EIT field
    if (changedField.name === 'Engineer') {
      fields['Engineer1'].value = changedField.value;
      console.println('Engineer1 changed to: ' + fields['Engineer1'].value);
    } else if (changedField.name === 'Checker') {
      fields['Checker1'].value = changedField.value;
      console.println('Checker1 changed to: ' + fields['Checker1'].value);
    }
  }
}

VISIBILITY_KEYS.forEach(function (key) {
  visibilityStates[key] = [0, 0, 0, 0, 0, 0, 0];
});

// Utility: clear fields
function clearFields (fieldArray) {
  fieldArray.forEach(function (fieldName) {
    var field = this.getField(fieldName);
    if (field) field.value = '';
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
  var idx = 0;
  var val = fields['1.11'].value === 'No' ? 1 : 0;
  setVisibility(['signatureC', 'dateC', 'C', 'signatureTL', 'dateTL', 'R'], idx, val);
  updateFieldVisibility();
}

// 1.9 logic
function notlowrisk () {
  var idx = 1;
  var val = fields['1.9'].value === 'No' && fields['1.10'].value === 'No' ? 1 : 0;
  setVisibility(['signatureC', 'dateC', 'C'], idx, val);
  updateFieldVisibility();
}

// Structural logic
function structural () {
  var idx = 2;
  visibilityStates.structwarning[idx] = fields['1.10'].value === 'No' ? 1 : 0;
  updateFieldVisibility();
}

// Risk warning logic
function riskwarningfcn () {
  var idx = 3;
  var notHighRisk = fields['1.11'].value;
  var risk = fields['Risk'].value;
  if ((notHighRisk === 'No' && risk === 'High') || (notHighRisk === 'Yes' && risk !== 'High')) {
    visibilityStates.riskwarning[idx] = 0;
  } else {
    visibilityStates.riskwarning[idx] = 1;
  }
  updateFieldVisibility();
}

// POR logic
function toggleVisibilityBasedOnPOR () {
  var idx = 4;
  var POR = fields['1.12'].value;
  var show = POR === 'No';
  DSfields.forEach(function (fieldName) {
    var field = this.getField(fieldName);
    if (field) field.display = show ? display.visible : display.hidden;
  }, this);
  setVisibility(['signatureC', 'dateC', 'C'], idx, show ? 1 : 0);
  if (fields['Reset2']) fields['Reset2'].display = show ? display.visible : display.hidden;
  if (fields['blocker']) fields['blocker'].display = show ? display.hidden : display.visible;
  updateFieldVisibility();
}

// Risk dropdown logic
function Risk () {
  var idx = 5;
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
  var idx = 6;
  var isAnyPR = PRfields.some(function (name) {
    var f = this.getField(name);
    return f && f.value !== false;
  }, this);
  setVisibility(['signaturePR', 'datePR', 'PR'], idx, isAnyPR ? 1 : 0);

  var isAnyC = Cfields.some(function (name) {
    var f = this.getField(name);
    return f && f.value !== false;
  }, this);
  setVisibility(['signatureC', 'dateC', 'C'], idx, isAnyC ? 1 : 0);

  updateFieldVisibility();
}

// Central visibility update
function updateFieldVisibility () {
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

// Reset all visibility states
function recalculateVisibilityStates () {
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
  recalculateVisibilityStates();
  clearRadioButtons([PRfields, Cfields, SCfields, DSfields]);
  if (fields['Risk']) fields['Risk'].value = false;

  VISIBILITY_KEYS.forEach(function (key) {
    var field = fields[mapFieldName(key)] || fields[key];
    if (field) field.display = display.hidden;
  });
  if (fields['blocker']) fields['blocker'].display = display.visible;
  hideDS();
  updateFieldVisibility();
  printDebugInfo();
}

// Helper to map short keys to field names
function mapFieldName (key) {
  return FIELD_MAP[key] || key;
}

// Clear radio buttons
function clearRadioButtons (fieldArrays) {
  fieldArrays.forEach(function (fieldArray) {
    fieldArray.forEach(function (name) {
      var radioButton = this.getField(name);
      if (radioButton) radioButton.value = false;
    }, this);
  }, this);
}

// Hide DS fields and block layer
function hideDS () {
  if (layers) {
    for (var i = 0; i < layers.length; i++) {
      if (layers[i].name === 'Block') {
        layers[i].state = 1;
      }
    }
  }
  DSfields.forEach(function (fieldName) {
    var field = this.getField(fieldName);
    if (field) field.display = display.hidden;
  }, this);
  if (fields['Reset2']) fields['Reset2'].display = display.hidden;
}

// Clear PR fields
function clearPRfields () {
  clearFields(PRfields);
  setVisibility(['signaturePR', 'datePR', 'PR'], 5, 0);
  updateFieldVisibility();
}

// Clear C fields
function clearCfields () {
  clearFields(Cfields);
  setVisibility(['signatureC', 'dateC', 'C'], 5, 0);
  updateFieldVisibility();
}

// Clear DS fields
function clearDSfields () {
  clearFields(DSfields);
  updateFieldVisibility();
}

// Clear SC fields
function clearSCfields () {
  clearFields(SCfields);
  setVisibility(['signatureC', 'dateC', 'C'], 3, 0);
  visibilityStates.structwarning[2] = 0;
  setVisibility(['signatureC', 'dateC', 'C', 'signatureTL', 'dateTL', 'R'], 0, 0);
  setVisibility(['signatureC', 'dateC', 'C'], 1, 0);
  hideDS();
  if (fields['blocker']) fields['blocker'].display = display.visible;
  updateFieldVisibility();
}

// Debug info
function printDebugInfo () {
  var debugField = this.getField('DebugOutput');
  if (debugField) {
    var debugText = '';
    for (var key in visibilityStates) {
      if (visibilityStates.hasOwnProperty(key)) {
        debugText += key + ': [' + visibilityStates[key].join(', ') + ']\n';
      }
    }

    for (var f in fieldNames) {
      if (fields[f]) {
        debugText += f + ': ' + fields[f].value + '\n';
      }
    }

    debugText += 'Engineer_EIT: ' + fields['Engineer_EIT'].value + '\n';
    debugText += 'Label - Checker: ' + fields['Label - Checker'].display + '\n';
    debugText += 'Label - POR: ' + fields['Label - POR'].display + '\n';
    debugText += 'Engineer1: ' + fields['Engineer1'].value + '\n';
    debugText += 'Checker1: ' + fields['Checker1'].value + '\n';
    debugText += 'Risk - Low: ' + fields['Risk - Low'].display + '\n';

    debugField.value = debugText;
  }
}

// Document-level JavaScript (runs on file open)
function onOpen () {
  toggleVisibilityBasedOnPOR();
}

function onSave () {
  app.execMenuItem('SaveAs');
}

function onClose () {
  clearForm();
}
