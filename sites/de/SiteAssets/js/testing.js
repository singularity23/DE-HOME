function objectKeys (obj) {
  if (typeof Object.keys === 'function') {
    return Object.keys(obj);
  }
  if (typeof Object.getOwnPropertyNames !== 'function') {
    return [];
  }
  var names = Object.getOwnPropertyNames(obj);
  var keys = [];
  var i;
  for (i = 0; i < names.length; i++) {
    var n = names[i];
    if (Object.prototype.propertyIsEnumerable.call(obj, n)) {
      keys.push(n);
    }
  }
  return keys;
}

var FIELD_MAP = {
  Cblocker: 'Checker_Blocker',
  DSblocker: 'DS_Blocker',
  PRblocker: 'PR_Blocker',
  TLblocker: 'TL_Blocker',
  low: 'Risk - Low',
  medium: 'Risk - Medium',
  high: 'Risk - High',
  riskwarning: 'High Risk Warning',
  structwarning: 'Structural Warning',
};

console.log(objectKeys(FIELD_MAP));