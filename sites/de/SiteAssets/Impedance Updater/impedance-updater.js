(function () {
  'use strict';

  const OH_MIN_KEY = 'Minimum impedance (%)';
  const UG_MIN_KEY = 'Minimum Impedance (%)';

  const dom = {
    sourceInput: document.getElementById('sourceInput'),
    runBtn: document.getElementById('runBtn'),
    sampleBtn: document.getElementById('sampleBtn'),
    clearBtn: document.getElementById('clearBtn'),
    summary: document.getElementById('summary'),
    details: document.getElementById('details'),
    ugOutput: document.getElementById('ugOutput'),
    ohOutput: document.getElementById('ohOutput'),
    copyUgBtn: document.getElementById('copyUgBtn'),
    copyOhBtn: document.getElementById('copyOhBtn'),
    downloadUgBtn: document.getElementById('downloadUgBtn'),
    downloadOhBtn: document.getElementById('downloadOhBtn'),
  };

  const state = {
    ugUpdated: null,
    ohUpdated: null,
  };

  function normalizeCadId (value) {
    return String(value || '')
      .trim()
      .replace(/[^\d-]/g, '');
  }

  function normalizeImpedanceValue (raw) {
    return String(raw || '')
      .trim()
      .replace(/\s*%/g, '')
      .replace(/\s*-\s*/g, ' - ');
  }

  function extractFromLine (line) {
    const normalizedLine = line.replace(/\u00a0/g, ' ').trim();
    if (!normalizedLine) return null;

    const cols = normalizedLine.split('\t').map(s => s.trim()).filter(Boolean);
    const cadSource = cols.length ? cols[0] : normalizedLine;
    const cadIdMatch = cadSource.match(/\d{3,4}-\d{3,4}/);
    if (!cadIdMatch) return null;

    const cadId = normalizeCadId(cadIdMatch[0]);

    let impedanceCell = cols.find(col => /\d/.test(col) && /%/.test(col));
    if (!impedanceCell) {
      const inlineMatch = normalizedLine.match(/(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s*%/);
      impedanceCell = inlineMatch ? inlineMatch[1] : '';
    }

    const minImpedance = normalizeImpedanceValue(impedanceCell);
    if (!minImpedance) return null;

    return { cadId, minImpedance };
  }

  function parseSourceRows (text) {
    const map = new Map();
    const duplicates = [];
    const skipped = [];

    text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .forEach((line, index) => {
        const parsed = extractFromLine(line);
        if (!parsed) {
          skipped.push(`Line ${index + 1}: ${line}`);
          return;
        }

        if (map.has(parsed.cadId)) {
          duplicates.push(parsed.cadId);
        }
        map.set(parsed.cadId, parsed.minImpedance);
      });

    return { map, duplicates, skipped };
  }

  function cloneData (data) {
    return JSON.parse(JSON.stringify(data || []));
  }

  function coerceToExistingType (rawValue, existingValue) {
    const normalized = normalizeImpedanceValue(rawValue);
    const numeric = Number(normalized);
    if (typeof existingValue === 'number' && Number.isFinite(numeric)) {
      return numeric;
    }
    return normalized;
  }

  function applyMinimumImpedanceUpdates (dataset, minKey, updatesMap) {
    const updated = cloneData(dataset);
    let count = 0;
    const touched = [];

    updated.forEach(row => {
      const cadId = normalizeCadId(row['CAD ID']);
      if (!updatesMap.has(cadId)) return;
      const nextValue = updatesMap.get(cadId);
      row[minKey] = coerceToExistingType(nextValue, row[minKey]);
      count += 1;
      touched.push(cadId);
    });

    return { updated, count, touched };
  }

  function toJsFileText (globalName, arrayData) {
    return `window.${globalName} = ${JSON.stringify(arrayData, null, 2)};\n`;
  }

  function copyText (text) {
    return navigator.clipboard.writeText(text);
  }

  function downloadTextFile (filename, content) {
    const blob = new Blob([content], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function runUpdate () {
    const source = dom.sourceInput.value;
    if (!source.trim()) {
      dom.summary.textContent = 'Paste source rows first.';
      dom.details.textContent = '';
      return;
    }

    const { map, duplicates, skipped } = parseSourceRows(source);
    const inputCadIds = [...map.keys()];

    if (!inputCadIds.length) {
      dom.summary.textContent = 'No CAD ID + minimum impedance rows were detected.';
      dom.details.textContent = skipped.join('\n');
      return;
    }

    const ugResult = applyMinimumImpedanceUpdates(window.UG_TX_DATA, UG_MIN_KEY, map);
    const ohResult = applyMinimumImpedanceUpdates(window.OH_TX_DATA, OH_MIN_KEY, map);

    state.ugUpdated = ugResult.updated;
    state.ohUpdated = ohResult.updated;

    const matchedCadIds = new Set([...ugResult.touched, ...ohResult.touched]);
    const unmatched = inputCadIds.filter(cadId => !matchedCadIds.has(cadId));

    const ugText = toJsFileText('UG_TX_DATA', ugResult.updated);
    const ohText = toJsFileText('OH_TX_DATA', ohResult.updated);
    dom.ugOutput.value = ugText;
    dom.ohOutput.value = ohText;

    dom.summary.textContent =
      `Rows parsed: ${inputCadIds.length} | UG updated: ${ugResult.count} | ` +
      `OH updated: ${ohResult.count} | Unmatched CAD IDs: ${unmatched.length}`;

    dom.details.textContent = [
      duplicates.length ? `Duplicate CAD IDs (last one used): ${[...new Set(duplicates)].join(', ')}` : '',
      unmatched.length ? `Unmatched CAD IDs: ${unmatched.join(', ')}` : '',
      skipped.length ? `Skipped lines:\n${skipped.join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  function loadSample () {
    dom.sourceInput.value = [
      '360-3365\t25\t14.4\t120/240\t3.5/1.7\t104\t2.1%\t430\t200',
      '360-3367\t50\t14.4\t120/240\t3.5\t208\t2.2%\t470\t200',
      '360-3368\t75\t14.4\t120/240\t5.2\t313\t3.1%\t600\t240',
      '360-3369\t100\t14.4\t120/240\t6.9\t417\t3.8%\t620\t230',
      '360-3375\t25\t7.2/14.4\t120/240\t3.5/1.7\t104\t2.2%\t430\t200',
      '360-3377\t50\t7.2/14.4\t120/240\t6.9/3.5\t208\t2.1%\t470\t190',
      '360-3378\t75\t7.2/14.4\t120/240\t10.4/5.2\t313\t3.1%\t600\t240',
      '360-3379\t100\t7.2/14.4\t120/240\t13.9/6.9\t417\t4.2%\t620\t230',
      '9600-4521\t167\t7.2/14.4\t120/240\t23.2/11.6\t696\t4.2%\t960\t360',
    ].join('\n');
  }

  function resetAll () {
    dom.sourceInput.value = '';
    dom.ugOutput.value = '';
    dom.ohOutput.value = '';
    dom.summary.textContent = 'No updates run yet.';
    dom.details.textContent = '';
  }

  dom.runBtn.addEventListener('click', runUpdate);
  dom.sampleBtn.addEventListener('click', loadSample);
  dom.clearBtn.addEventListener('click', resetAll);

  dom.copyUgBtn.addEventListener('click', async () => {
    if (!dom.ugOutput.value) return;
    await copyText(dom.ugOutput.value);
    dom.summary.textContent = 'Copied updated UG JS to clipboard.';
  });

  dom.copyOhBtn.addEventListener('click', async () => {
    if (!dom.ohOutput.value) return;
    await copyText(dom.ohOutput.value);
    dom.summary.textContent = 'Copied updated OH JS to clipboard.';
  });

  dom.downloadUgBtn.addEventListener('click', () => {
    if (!dom.ugOutput.value) return;
    downloadTextFile('ug_tx_impedances.js', dom.ugOutput.value);
  });

  dom.downloadOhBtn.addEventListener('click', () => {
    if (!dom.ohOutput.value) return;
    downloadTextFile('oh_tx_impedances.js', dom.ohOutput.value);
  });
})();
