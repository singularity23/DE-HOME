(function () {
  const data = (window.FUSE_DATA || [])
    .map(r => ({
      transformer: (r.transformer || '').trim() || '—',
      voltage: (r.voltage || '').trim() || '—',
      kva: Number(r.kva) || 0,
      bonFuse: (r.bonFuse || '').trim(),
      sourceFuse: (r.sourceFuse || '').trim(),
      sheet: r.sheet || '',
    }))
    .sort((a, b) => a.kva - b.kva);

  const els = {
    transformer: document.getElementById('transformer'),
    voltage: document.getElementById('voltage'),
    kva: document.getElementById('kva'),
    find: document.getElementById('find'),
    reset: document.getElementById('reset'),
    result: document.getElementById('result'),
    gridBody: document.querySelector('#grid tbody'),
  };

  // Validate all required elements exist
  const requiredEls = ['transformer', 'voltage', 'kva', 'find', 'reset', 'result', 'gridBody'];
  const missingEls = requiredEls.filter(key => !els[key]);
  if (missingEls.length > 0) {
    console.error('Missing DOM elements:', missingEls.join(', '));
    return;
  }

  const unique = list =>
    [...new Set(list.filter(Boolean))].sort((a, b) => {
      const aStr = String(a);
      const bStr = String(b);
      return aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' });
    });

  const setDisabled = (el, disabled) => {
    if (el) el.disabled = disabled;
  };

  const resetSelect = (el, placeholder = '—') => {
    if (el) el.innerHTML = `<option value="">${placeholder}</option>`;
  };

  function populateTx (data) {
    resetSelect(els.transformer);
    const frag = document.createDocumentFragment();
    unique(data.map(r => r.transformer)).forEach(val => {
      const o = document.createElement('option');
      o.value = val;
      o.textContent = val;
      frag.appendChild(o);
    });
    els.transformer.appendChild(frag);
    setDisabled(els.voltage, true);
    resetSelect(els.voltage);
    setDisabled(els.kva, true);
    resetSelect(els.kva);
  }

  function populateVoltages (data) {
    resetSelect(els.voltage);
    const t = els.transformer.value;
    if (!t) {
      setDisabled(els.voltage, true);
      setDisabled(els.kva, true);
      resetSelect(els.kva);
      return;
    }
    const subset = data.filter(r => r.transformer === t);
    const frag = document.createDocumentFragment();
    unique(subset.map(r => r.voltage)).forEach(val => {
      const o = document.createElement('option');
      o.value = val;
      o.textContent = val;
      frag.appendChild(o);
    });
    els.voltage.appendChild(frag);
    setDisabled(els.voltage, false);
    setDisabled(els.kva, true);
    resetSelect(els.kva);
  }

  function populateKVA (data) {
    resetSelect(els.kva);
    const v = els.voltage.value;
    if (!v) {
      setDisabled(els.kva, true);
      return;
    }
    const t = els.transformer.value;
    const subset = data.filter(r => r.voltage === v && (!t || r.transformer === t));
    const frag = document.createDocumentFragment();
    unique(subset.map(r => r.kva)).forEach(val => {
      const o = document.createElement('option');
      o.value = val;
      o.textContent = val;
      frag.appendChild(o);
    });
    els.kva.appendChild(frag);
    setDisabled(els.kva, false);
  }

  function attachCascades (data) {
    els.transformer.addEventListener('change', () => {
      populateVoltages(data);
      renderTable(filterData());
    });
    els.voltage.addEventListener('change', () => {
      populateKVA(data);
      renderTable(filterData());
    });
    els.kva.addEventListener('change', () => renderTable(filterData()));
  }

  function filterData () {
    const t = els.transformer.value;
    const v = els.voltage.value;
    const k = Number(els.kva.value);
    return data.filter(
      row => (!t || row.transformer === t) && (!v || row.voltage === v) && (!Number.isFinite(k) || row.kva === k)
    );
  }

  function renderTable (rows) {
    const frag = document.createDocumentFragment();
    rows.forEach(r => {
      const tr = document.createElement('tr');
      const cells = [r.transformer, r.voltage || '—', r.kva, r.bonFuse || '—', r.sourceFuse || '—'];
      cells.forEach(cell => {
        const td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      frag.appendChild(tr);
    });
    els.gridBody.innerHTML = '';
    els.gridBody.appendChild(frag);
  }

  function showResult (row) {
    els.result.classList.remove('hidden');
    els.result.innerHTML = '';
    if (!row) {
      els.result.textContent = 'No match. Try adjusting filters.';
      return;
    }
    const h2 = document.createElement('h2');
    h2.textContent = 'Match Found';
    els.result.appendChild(h2);
    const ul = document.createElement('ul');
    const fields = [
      ['Transformer', row.transformer],
      ['Operating Voltage', row.voltage],
      ['kVA', row.kva],
      ['BON Fuse', row.bonFuse || '—', 'highlight'],
      ['Source-side Fuse', row.sourceFuse || '—', 'highlight'],
    ];
    fields.forEach(([label, value, className]) => {
      const li = document.createElement('li');
      if (className && value !== '—') {
        li.setAttribute('class', className);
      }
      const strong = document.createElement('strong');
      strong.textContent = label + ': ';
      li.appendChild(strong);
      li.appendChild(document.createTextNode(String(value)));
      ul.appendChild(li);
    });
    els.result.appendChild(ul);
  }

  els.find.addEventListener('click', () => {
    const matches = filterData();
    console.log('Found matches:', matches);
    renderTable(matches);
    if (matches.length) {
      showResult(matches[0], true);
    } else {
      showResult(null);
    }
  });

  els.reset.addEventListener('click', () => {
    els.transformer.value = '';
    els.voltage.value = '';
    els.kva.value = '';
    els.result.classList.add('hidden');
    renderTable(data);
  });

  // Init
  populateTx(data);
  attachCascades(data);
  renderTable(data);
})();
