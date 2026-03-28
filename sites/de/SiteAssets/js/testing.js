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
var visibilityStates = {};

VISIBILITY_KEYS = Object.keys(FIELD_MAP);
var sig = getOwnValues(FIELD_MAP);
console.log(VISIBILITY_KEYS);
VISIBILITY_KEYS.forEach(function (key) {
  visibilityStates[key] = [0, 0, 0, 0, 0, 0, 0];
});

console.log(visibilityStates);
console.log(sig);

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