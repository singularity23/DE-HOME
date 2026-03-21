const CONFIG = Object.freeze({
  status: Object.freeze({
    IN_SERVICE: 'IN SERVICE',
    ISSUED: 'ISSUED',
    // Legacy support
    get settingStatus () {
      return {
        inService: this.IN_SERVICE,
        issued: this.ISSUED,
      };
    },
  }),
});

console.log(CONFIG.status.settingStatus.inService);
console.log(CONFIG.status.settingStatus.issued);

const _formatSqlList = array => {
  array
    .filter(item => item != null)
    .map(item => `'${String(item).replace(/'/g, /\"''\"/g)}'`)
    .join(', ');
  console.log(array);
};

const settingNames = [
  '51P1P',
  '51P1TD',
  '51P1C',
  '50P1P',
  '50P2P',
  '50P3P',
  '50P4P',
  '50P5P',
  '67P2D',
  '67P3D',
  '67P4D',
  '51G1P',
  '51G1TD',
  '51G1C',
  '50G1P',
  '50G5P',
  '51PP',
  '51PTD',
  '51PC',
  '51GP',
  '51GTD',
  '51GC',
  '51P',
  '51TD',
  '51C',
  '50L',
  '50LT',
  '50H',
  '51NP',
  '51NTD',
  '51NC',
  '50NL',
  '50NLT',
  '50NH',
  '51QP',
  '51QTD',
  '51QC',
  '79OI1',
];

_formatSqlList(settingNames);

const values = ["O'Reilly", 'Smith', null];
const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
console.log(placeholders);
