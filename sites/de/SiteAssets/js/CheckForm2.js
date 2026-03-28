// -------------------------------------------------------------
// -----------------Do not edit the XML tags--------------------
// -------------------------------------------------------------

// <Document-Level>
// <ACRO_source>ClearFieldsScript</ACRO_source>
// <ACRO_script>
/*********** belongs to: Document-Level:ClearFieldsScript ***********/

// ===============================================================
// Document-Level: ClearFieldsScript - ES5-compatible version
// ===============================================================
var doc = this;
debugPrint('doc: ' + doc);
var FIELD_GROUPS = {
  S_CHECK: [
    '1.1',
    '1.2',
    '1.3',
    '1.4',
    '1.5',
    '1.6',
    '1.7',
    '1.8',
    '1.9',
    '1.10',
    '1.11',
    '1.12'
  ],
  DIRECT_S: [
    '2.1',
    '2.2',
    '2.3',
    '2.4',
    '2.5'
  ],
  CHECK: [
    '3.1',
    '3.2',
    '3.3',
    '3.4',
    '3.5',
    '3.6',
    '3.7',
    '3.8',
    '3.9',
    '3.10',
    '3.11'
  ],
  PEER_R: [
    '4.1',
    '4.2',
    '4.3',
    '4.4',
    '4.5',
    '4.6',
    '4.7',
    '4.8',
    '4.9',
    '4.10'
  ]
};

var FORM_FIELDS = ['Risk', 'DebugOutput', 'Reset2', 'blocker'];

var SELECTOR = {
  labelPOR: 'Label - POR',
  EIT: 'Engineer-in-Training',
  labelChkr: 'Label - Checker',
  POR: 'POR'
};

var COMMENT_FIELDS = (function () {
  var fields = [];
  var i;
  for (i = 1; i < 6; i++) {
    fields.push('Checker and Reviewer CommentsCorrectionsCorrective ActionsRow' + i);
    fields.push('Engineers Response AcceptRejectAddress commentsRow' + i);
  }
  return fields;
})();

var VIS_MAP = {
  "chkrSig": 'Signature - Checker',
  "chkrDate": 'Date - Checker_af_date',
  "chkrName": 'Checker1',
  "tmldSig": 'Signature - TL',
  "tmldDate": 'Date - TL_af_date',
  "t1rvrName": 'Assigned Type 1 Reviewer Name',
  "prvrSig": 'Signature - Peer Reviewer',
  "prvrDate": 'Date - Peer Reviewer_af_date',
  "prvrName": 'Peer Reviewer Name',
  "strcWrn": 'Structural Warning',
  "rskLow": 'Risk - Low',
  "rskMdm": 'Risk - Medium',
  "rskHgh": 'Risk - High',
  "rskHgnWrn": 'High Risk Warning'
};

var IDX = {
  HIGH_RISK: 0,
  NOT_LOW_RISK: 1,
  STRUCTURAL: 2,
  RISK_WARNING: 3,
  POR_REQUIRED: 4,
  RISK_LEVEL: 5,
  RADIO_SELECTED: 6
};

var BINARY_MATCH = {
  false: 0,
  true: 1
};

// Toggle this in Acrobat while debugging.
var DEBUG = true;

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

function logFieldInfo (fieldName) {
  var f = FieldCache.get(fieldName) || (doc && typeof doc.getField === 'function' ? doc.getField(fieldName) : null);
  if (!f) {
    debugPrint('Field not found: ' + fieldName);
    return;
  }
  debugPrint('=== Field: ' + fieldName + ' ===');
  debugPrint('  Value: ' + f.value);
  debugPrint('  Type: ' + f.type);
  debugPrint('  Display: ' + f.display);
  debugPrint('  Read-only: ' + f.readonly);
  debugPrint('  Required: ' + f.required);
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

function getOwnKeys (obj) {
  if (Object.keys)
    return Object.keys(obj);

  var keys = [];
  var key;
  for (key in obj) {
    if (obj.hasOwnProperty(key))
      keys.push(key);
  }
  return keys;
};

var allFieldNames = [].concat(FIELD_GROUPS.S_CHECK, FIELD_GROUPS.DIRECT_S, FIELD_GROUPS.CHECK, FIELD_GROUPS.PEER_R, FORM_FIELDS, COMMENT_FIELDS, getOwnValues(VIS_MAP), getOwnValues(SELECTOR));

var FieldCache = {
  fields: {},

  init: function (fieldNames) {
    var i;
    var name;
    for (i = 0; i < fieldNames.length; i++) {
      name = fieldNames[i];
      this.fields[name] = doc.getField(name);
    }
  },

  get: function (name) {
    if (!this.fields[name]) {
      this.fields[name] = doc.getField(name);
    }
    debugPrint('get: ' + name + ' = ' + this.fields[name].value);
    return this.fields[name];
  },

  getValue: function (name) {
    var f = this.get(name);
    debugPrint('getValue: ' + name + ' = ' + f.value);
    return f ? f.value : null;
  },

  setValue: function (name, value) {
    var f = this.get(name);
    if (f) f.value = value;
  }
};


var VisibilityManager = {
  states: {},

  init: function (arr) {
    var i;
    for (i = 0; i < arr.length; i++) {
      debugPrint('init: ' + arr[i]);
      this.states[arr[i]] = [0, 0, 0, 0, 0, 0, 0];
    }
  },

  setFlag: function (keys, index, value) {
    if (typeof value === 'string') {
      value = BINARY_MATCH[value];
      debugPrint('value is a string, converting to binary: ' + value);
    }
    debugPrint('setting flag: ' + keys + ' to ' + value + ' for index: ' + index);

    var key;
    for (var i = 0; i < keys.length; i++) {
      key = keys[i];
      if (this.states.hasOwnProperty(key)) {
        this.states[key][index] = value;
      }
    }
  },

  isVisible: function (key) {
    var arr = this.states[key];
    debugPrint('isVisible: ' + key + ' = ' + arr.join(', '));
    var i;
    for (i = 0; i < arr.length; i++) {
      if (arr[i])
        return 1;

    }
    return 0;
  },

  reset: function () {
    var key;
    for (key in this.states) {
      if (this.states.hasOwnProperty(key)) {
        this.states[key] = [
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ];
      }
    }
  },

  apply: function () {
    var key;
    var fieldName;
    for (key in VIS_MAP) {
      if (VIS_MAP.hasOwnProperty(key)) {
        fieldName = VIS_MAP[key];
        safeDisplay(fieldName, this.isVisible(key));
      }
    }
    this.printDebugInfo();
  },

  printDebugInfo: function () {
    var lines = [];
    for (var key in VisibilityManager.states) {
      lines.push(key + ': [' + VisibilityManager.states[key].join(', ') + ']');
    }
    debugPrint(lines.join('\n'));
  }
};

function clearFields (fieldNames) {
  var i;
  for (i = 0; i < fieldNames.length; i++) {
    debugPrint('clearing field: ' + fieldNames[i]);
    var f = this.getField(fieldNames[i]);
    if (f) f.value = '';
  }
}

function clearSelections (fieldNames) {
  var i;
  var field;
  for (i = 0; i < fieldNames.length; i++) {
    field = FieldCache.get(fieldNames[i]);
    if (field) {
      field.value = false;
      if (typeof field.checkThisBox === 'function' && field.numItems) {
        for (var idx = 0; idx < field.numItems; idx++) {
          field.checkThisBox(idx, false);
        }
      }
    }
  }
}

function safeDisplay (fieldName, isVisible) {
  var field = FieldCache.get(fieldName);
  if (field) {
    field.display = isVisible ? display.visible : display.hidden;
  }
}

function updateHighRisk () {
  debugPrint(FieldCache.getValue('1.11'));
  var show = FieldCache.getValue('1.11') === 'No' ? 1 : 0;
  debugPrint('1.11show: ' + show);
  VisibilityManager.setFlag([
    "chkrSig",
    "chkrDate",
    "chkrName",
    "tmldSig",
    "tmldDate",
    "t1rvrName"
  ], IDX.HIGH_RISK, show);
}

function updateNotLowRisk () {
  var show = FieldCache.getValue('1.9') === 'No' || FieldCache.getValue('1.10') === 'No' ? 1 : 0;
  VisibilityManager.setFlag([
    "chkrSig", "chkrDate", "chkrName"
  ], IDX.NOT_LOW_RISK, show);
}

function updateStructural () {
  var show = FieldCache.getValue('1.10') === 'No' ? 1 : 0;
  VisibilityManager.setFlag([
    "chkrSig", "chkrDate", "chkrName"
  ], IDX.STRUCTURAL, show);
}

function updateRiskWarning () {
  var isHighRiskWork = FieldCache.getValue('1.11') === 'No';
  var isHighRiskLevel = FieldCache.getValue('Risk') === 'High';
  var hasInconsistency = isHighRiskWork !== isHighRiskLevel ? 1 : 0;

  VisibilityManager.setFlag([
    "chkrSig",
    "chkrDate",
    "chkrName",
    "tmldSig",
    "tmldDate",
    "t1rvrName",
    "rskHgh"
  ], IDX.RISK_WARNING, hasInconsistency);
}

function updateSupervision () {
  var show = FieldCache.getValue('1.12') === 'No' ? 1 : 0;
  var i;

  for (i = 0; i < FIELD_GROUPS.DIRECT_S.length; i++) {
    safeDisplay(FIELD_GROUPS.DIRECT_S[i], show);
  }

  VisibilityManager.setFlag([
    "chkrSig", "chkrDate", "chkrName"
  ], IDX.POR_REQUIRED, show);

  safeDisplay('Reset2', show);
  safeDisplay('blocker', !show);
}

function updateRiskLevel () {
  var risk = FieldCache.getValue('Risk');
  var notHighRisk = FieldCache.getValue('1.11');
  var lowRisk = FieldCache.getValue('1.9');
  debugPrint('----Risk: ' + risk);
  debugPrint('notHighRisk: ' + notHighRisk);
  debugPrint('lowRisk: ' + lowRisk);
  if (risk === 'High') {
    if (notHighRisk !== 'No') {
      FieldCache.setValue('1.11', 'No');
    }
    if (lowRisk !== 'No') {
      FieldCache.setValue('1.9', 'No');
    }
    updateHighRisk();
    updateNotLowRisk();
  }

  if (risk === 'Medium') {
    if (notHighRisk !== 'Yes') {
      FieldCache.setValue('1.11', 'Yes');
    }
    if (lowRisk !== 'No') {
      FieldCache.setValue('1.9', 'No');
    }
    updateNotLowRisk();
  }

  if (risk === 'Low') {
    if (lowRisk !== 'Yes') {
      FieldCache.setValue('1.9', 'Yes');
    }
  }

  VisibilityManager.setFlag([
    "chkrSig",
    "chkrDate",
    "chkrName",
    "tmldSig",
    "tmldDate",
    "t1rvrName",
    "rskHgh"
  ], IDX.RISK_LEVEL, BINARY_MATCH[risk === 'High']);

  VisibilityManager.setFlag([
    "chkrSig", "chkrDate", "chkrName", "rskMdm"
  ], IDX.RISK_LEVEL, BINARY_MATCH[risk === 'Medium']);

  VisibilityManager.setFlag(["rskLow"], IDX.RISK_LEVEL, BINARY_MATCH[risk === 'Low']);

  VisibilityManager.apply();
}

function hasAnySelected (fieldNames) {
  var i;
  var field;
  for (i = 0; i < fieldNames.length; i++) {
    field = FieldCache.getValue(fieldNames[i]);
    if (field.value && field.value !== 'Off' && field.value !== false) {
      return 1;
    }
  }
  return 0;
}

function updateSelections () {
  var hasPeerReview = hasAnySelected(FIELD_GROUPS.PEER_R);
  VisibilityManager.setFlag([
    "prvrSig", "prvrDate", "prvrName"
  ], IDX.RADIO_SELECTED, hasPeerReview);

  var hasCheck = hasAnySelected(FIELD_GROUPS.CHECK);
  VisibilityManager.setFlag([
    "chkrSig", "chkrDate", "chkrName"
  ], IDX.RADIO_SELECTED, hasCheck);
}

function onEngineerEITChange (event) {
  var isEIT;
  if (!event || !event.target || event.target.name !== 'Engineer_EIT')
    return;


  isEIT = event.target.value === 'Engineer-in-Training:';

  safeDisplay(SELECTOR.labelChkr, !isEIT);
  safeDisplay(SELECTOR.labelPOR, isEIT);
  safeDisplay(SELECTOR.EIT, isEIT);
  safeDisplay(SELECTOR.POR, isEIT);

  if (isEIT)
    FieldCache.setValue('1.12', 'No');


  updateSupervision();
  VisibilityManager.apply();
}

function onNameFieldChange (event) {
  var nameMap = {
    Engineer: 'Engineer1',
    Checker: 'Checker1'
  };
  var targetField;
  if (!event || !event.target)
    return;


  targetField = nameMap[event.target.name];
  if (targetField) {
    FieldCache.setValue(targetField, event.target.value);
  }
}

function clearForm () {
  var i;
  VisibilityManager.reset();

  clearFields(COMMENT_FIELDS);
  clearSelections(FIELD_GROUPS.S_CHECK);
  clearSelections(FIELD_GROUPS.PEER_R);
  clearSelections(FIELD_GROUPS.CHECK);
  clearSelections(FIELD_GROUPS.DIRECT_S);

  for (i = 0; i < FIELD_GROUPS.DIRECT_S.length; i++) {
    safeDisplay(FIELD_GROUPS.DIRECT_S[i], false);
  }
  safeDisplay('Reset2', false);
  safeDisplay('blocker', true);

  updateHighRisk();
  updateRiskWarning();
  updateNotLowRisk();
  updateStructural();
  updateSupervision();
  updateRiskLevel();
  updateSelections();

  VisibilityManager.apply();
}

function onOpen () {
  updateSupervision();
  updateRiskLevel();
  updateSelections();
  VisibilityManager.apply();
}

function onSave () {
  try {
    if (typeof app !== 'undefined' && app && app.execMenuItem) {
      app.execMenuItem('Save');
    } else if (this && this.saveAs) {
      this.saveAs(this.path);
    }
  } catch (e) { // Keep silent for Acrobat environments without console.
  }
}

function onClose () { }

FieldCache.init(allFieldNames);
debugPrint(FieldCache.fields);
VisibilityManager.init(Object.keys(VIS_MAP));
debugPrint('VisibilityManager: ' + VisibilityManager.states.length);
VisibilityManager.printDebugInfo();
