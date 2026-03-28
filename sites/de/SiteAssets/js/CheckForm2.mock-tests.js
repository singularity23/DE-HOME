/* eslint-disable no-console */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

function createMockField (name, opts) {
  var options = opts || {};
  var field = {
    name: name,
    value: options.value !== undefined ? options.value : '',
    display: options.display !== undefined ? options.display : 1,
    type: options.type || 'text',
    numItems: options.numItems || 0,
    checkedStates: [],
    checkThisBox: function (idx, isChecked) {
      this.checkedStates[idx] = isChecked;
    }
  };
  return field;
}

function createMockDoc (fieldMap) {
  return {
    fields: fieldMap,
    getField: function (name) {
      return this.fields[name] || null;
    }
  };
}

function buildFieldMap () {
  var map = {};
  var allNames = [
    // S_CHECK
    '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10', '1.11', '1.12',
    // DIRECT_S
    '2.1', '2.2', '2.3', '2.4', '2.5',
    // CHECK
    '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9', '3.10', '3.11',
    // PEER_R
    '4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8', '4.9', '4.10',
    // FORM + SIG + labels
    'Dropdown.risk', 'Risk', 'Reset2', 'blocker', 'Engineer_EIT',
    'Label - Checker', 'Label - POR', 'Engineer-in-Training', 'POR', 'DebugOutput',
    'Signature - TL', 'Signature - Checker', 'Signature - Peer Reviewer',
    'Date - TL_af_date', 'Date - Checker_af_date', 'Date - Peer Reviewer_af_date',
    'Engineer1', 'Checker1', 'Assigned Type 1 Reviewer Name', 'Peer Reviewer Name',
    'Structural Warning', 'Not Low Risk Warning', 'Risk - Low', 'Risk - Medium',
    'Risk - High', 'High Risk Warning',
    // COMMENT fields
    'Checker and Reviewer CommentsCorrectionsCorrective ActionsRow1',
    'Checker and Reviewer CommentsCorrectionsCorrective ActionsRow2',
    'Checker and Reviewer CommentsCorrectionsCorrective ActionsRow3',
    'Checker and Reviewer CommentsCorrectionsCorrective ActionsRow4',
    'Checker and Reviewer CommentsCorrectionsCorrective ActionsRow5',
    'Engineers Response AcceptRejectAddress commentsRow1',
    'Engineers Response AcceptRejectAddress commentsRow2',
    'Engineers Response AcceptRejectAddress commentsRow3',
    'Engineers Response AcceptRejectAddress commentsRow4',
    'Engineers Response AcceptRejectAddress commentsRow5'
  ];

  var i;
  for (i = 0; i < allNames.length; i++) {
    map[allNames[i]] = createMockField(allNames[i]);
  }

  // Mark checkbox/radio style fields that use checkThisBox.
  var radioNames = [
    '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10', '1.11', '1.12',
    '2.1', '2.2', '2.3', '2.4', '2.5',
    '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9', '3.10', '3.11',
    '4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8', '4.9', '4.10'
  ];
  for (i = 0; i < radioNames.length; i++) {
    map[radioNames[i]].type = 'radiobutton';
    map[radioNames[i]].numItems = 2;
  }

  return map;
}

function loadScriptWithMocks () {
  var scriptPath = path.resolve(__dirname, 'CheckForm2.js');
  var code = fs.readFileSync(scriptPath, 'utf8');
  var fieldMap = buildFieldMap();
  var doc = createMockDoc(fieldMap);

  var sandbox = {
    display: { visible: 0, hidden: 1 },
    app: {
      lastExec: null,
      execMenuItem: function (name) {
        this.lastExec = name;
      }
    },
    saveAsCalls: [],
    path: '/mock/form.pdf',
    saveAs: function (targetPath) {
      this.saveAsCalls.push(targetPath);
    },
    getField: function (name) {
      return doc.getField(name);
    },
    console: console
  };

  vm.runInNewContext(code, sandbox, { filename: 'CheckForm2.js' });
  return { sandbox: sandbox, fields: fieldMap };
}

function runTest (name, fn) {
  try {
    fn();
    console.log('PASS:', name);
  } catch (err) {
    console.error('FAIL:', name);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

runTest('COMMENT_FIELDS generates 10 rows', function () {
  var ctx = loadScriptWithMocks();
  assert.strictEqual(ctx.sandbox.COMMENT_FIELDS.length, 10);
  assert.strictEqual(
    ctx.sandbox.COMMENT_FIELDS[0],
    'Checker and Reviewer CommentsCorrectionsCorrective ActionsRow1'
  );
  assert.strictEqual(
    ctx.sandbox.COMMENT_FIELDS[9],
    'Engineers Response AcceptRejectAddress commentsRow5'
  );
});

runTest('updatePORVisibility toggles direct section and controls', function () {
  var ctx = loadScriptWithMocks();
  ctx.fields['1.12'].value = 'No';

  ctx.sandbox.VisibilityManager.reset();
  ctx.sandbox.updatePORVisibility();
  ctx.sandbox.VisibilityManager.apply();

  assert.strictEqual(ctx.fields['2.1'].display, ctx.sandbox.display.visible);
  assert.strictEqual(ctx.fields['2.5'].display, ctx.sandbox.display.visible);
  assert.strictEqual(ctx.fields.Reset2.display, ctx.sandbox.display.visible);
  assert.strictEqual(ctx.fields.blocker.display, ctx.sandbox.display.hidden);
});

runTest('updateRiskLevelVisibility shows only matching risk badge', function () {
  var ctx = loadScriptWithMocks();
  ctx.fields.Risk.value = 'Medium';

  ctx.sandbox.VisibilityManager.reset();
  ctx.sandbox.updateRiskLevelVisibility();
  ctx.sandbox.VisibilityManager.apply();

  assert.strictEqual(ctx.fields['Risk - Medium'].display, ctx.sandbox.display.visible);
  assert.strictEqual(ctx.fields['Risk - High'].display, ctx.sandbox.display.hidden);
  assert.strictEqual(ctx.fields['Risk - Low'].display, ctx.sandbox.display.hidden);
});

runTest('clearRadioGroup unchecks radio items', function () {
  var ctx = loadScriptWithMocks();
  var field = ctx.fields['3.1'];
  field.checkedStates = [true, true];

  ctx.sandbox.clearRadioGroup(['3.1']);

  assert.strictEqual(field.checkedStates[0], false);
  assert.strictEqual(field.checkedStates[1], false);
});

runTest('onEngineerEITChange switches labels and sets 1.12', function () {
  var ctx = loadScriptWithMocks();
  ctx.fields['1.12'].value = 'Yes';

  ctx.sandbox.onEngineerEITChange({
    target: {
      name: 'Engineer_EIT',
      value: 'Engineer-in-Training:'
    }
  });

  assert.strictEqual(ctx.fields['1.12'].value, 'No');
  assert.strictEqual(ctx.fields['Label - Checker'].display, ctx.sandbox.display.hidden);
  assert.strictEqual(ctx.fields['Label - POR'].display, ctx.sandbox.display.visible);
  assert.strictEqual(ctx.fields['Engineer-in-Training'].display, ctx.sandbox.display.visible);
  assert.strictEqual(ctx.fields.POR.display, ctx.sandbox.display.visible);
});

runTest('clearForm clears comments and hides direct section by default', function () {
  var ctx = loadScriptWithMocks();
  ctx.fields['Checker and Reviewer CommentsCorrectionsCorrective ActionsRow1'].value = 'comment';
  ctx.fields['Engineers Response AcceptRejectAddress commentsRow3'].value = 'response';
  ctx.fields['1.12'].value = 'Yes';
  ctx.fields['2.2'].display = ctx.sandbox.display.visible;

  ctx.sandbox.clearForm();

  assert.strictEqual(ctx.fields['Checker and Reviewer CommentsCorrectionsCorrective ActionsRow1'].value, '');
  assert.strictEqual(ctx.fields['Engineers Response AcceptRejectAddress commentsRow3'].value, '');
  assert.strictEqual(ctx.fields['2.2'].display, ctx.sandbox.display.hidden);
  assert.strictEqual(ctx.fields.Reset2.display, ctx.sandbox.display.hidden);
  assert.strictEqual(ctx.fields.blocker.display, ctx.sandbox.display.visible);
});

if (!process.exitCode) {
  console.log('All mock tests passed.');
}
