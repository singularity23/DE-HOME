(function () {
  const data = (window.FUSE_DATA || [])
    .map(r => ({
      transformer: (r.transformer || '').trim() || '—',
      voltage: (r.voltage || '').trim() || '—',
      kva: Number(r.kva) || 0,
      bonFuse: (r.bonFuse || '').trim(),
      sourceFuse: (r.sourceFuse || '').trim(),
    }))
    .sort((a, b) => a.kva - b.kva);

  // Load impedance data
  const ohData = (window.OH_TX_DATA || []).map(r => ({
    transformer: 'OH',
    cadId: (r['CAD ID'] || '').trim(),
    kva: Number(r.kVA) || 0,
    voltage: (r['Primary (kV)'] || '').trim() || '—',
    secondary: (r['Secondary (V)'] || '').trim() || '—',
    minImpedance: r['Minimum impedance (%)'] || 0,
    maxImpedance: r['Maximum impedance (%)'] || 0,
    bushing: (r.Bushing || '').trim(),
    configuration: (r.Configuration || '').trim(),
  }));

  const ugData = (window.UG_TX_DATA || []).map(r => ({
    transformer: (r['Transformer Type'] || '').trim() || '—',
    cadId: (r['CAD ID'] || '').trim(),
    kva: Number(r.kVA) || 0,
    voltage: (r['Primary (kV)'] || '').trim() || '—',
    secondary: (r['Secondary (V)'] || '').trim() || '—',
    minImpedance: r['Minimum Impedance (%)'] || '—',
    feed: (r.Feed || '').trim(),
  }));

  const fuseCadIdData = (window.FUSE_CADID_DATA || []).map(r => ({
    fuse: (r.Fuse || '').trim(),
    cadId: (r['CAD ID'] || '').trim(),
  }));

  const els = {
    transformer: document.getElementById('transformer'),
    voltage: document.getElementById('voltage'),
    kva: document.getElementById('kva'),
    reset: document.getElementById('reset'),
    result: document.getElementById('result'),
    gridBody: document.querySelector('#grid tbody'),
  };

  // Validate all required elements exist
  const requiredEls = ['transformer', 'voltage', 'kva', 'reset', 'result', 'gridBody'];
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

  function getFuseCADId (fuse) {
    const match = fuseCadIdData.find(r => r.fuse === fuse);
    return match ? fuse + ' (' + match.cadId + ')' : fuse;
  }
  // Search impedance data based on transformer type and selections
  function searchImpedanceData (transformerType, voltage, kva) {
    if (transformerType === 'OH') {
      return ohData.filter(row => row.kva === kva && checkVoltageMatch(row.voltage, voltage));
    } else if (transformerType === 'PMT' || transformerType === 'LPT' || transformerType === 'SDT') {
      return ugData.filter(
        row => row.transformer === transformerType && row.kva === kva && checkVoltageMatch(row.voltage, voltage)
      );
    }
    return [];
  }

  function checkVoltageMatch (rowVoltage, selectedVoltage) {
    if (rowVoltage === selectedVoltage || rowVoltage.includes(selectedVoltage)) {
      return true;
    }
    return false;
  }

  // Render impedance table
  function renderImpedanceTable (rows) {
    if (!rows || rows.length === 0) return '';

    const isOH = rows[0].transformer === 'OH';
    let html = '<h3>Transformer Details</h3>';
    html += '<div class="table-wrap"><table class="impedance-table"><thead><tr>';

    if (isOH) {
      html +=
        '<th class="col-1">CAD ID</th><th class="col-1">kVA</th><th class="col-1">Primary (kV)</th><th class="col-1">Secondary (V)</th>';
      html +=
        '<th class="col-1">Min Z (%)</th><th class="col-1">Max Z (%)</th><th class="col-3">Bushing</th><th class="col-1">Config</th></tr></thead><tbody>';
      rows.forEach(r => {
        html += `<tr><td>${r.cadId}</td><td>${r.kva}</td><td>${r.voltage}</td>`;
        html += `<td>${r.secondary}</td><td>${r.minImpedance}</td><td>${r.maxImpedance}</td>`;
        html += `<td>${r.bushing}</td><td>${r.configuration}</td></tr>`;
      });
    } else {
      html +=
        '<th class="col-1-5">CAD ID</th><th class="col-1">Type</th><th class="col-1">kVA</th><th class="col-2">Primary (kV)</th><th class="col-2">Secondary (V)</th>';
      html += '<th class="col-1">Min Z (%)</th><th class="col-1-5">Feed Type</th></tr></thead><tbody>';
      rows.forEach(r => {
        html += `<tr><td>${r.cadId}</td><td>${r.transformer}</td><td>${r.kva}</td>`;
        html += `<td>${r.voltage}</td><td>${r.secondary}</td><td>${r.minImpedance}</td>`;
        html += `<td>${r.feed}</td></tr>`;
      });
    }

    html += '</tbody></table></div>';
    return html;
  }

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
    hideResult();
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
      const u = document.createElement('span');
      u.textContent = ' kV' + (t === 'PMT' || t === 'SDT' ? ' L-L' : ' L-N');
      o.value = val;
      o.appendChild(u);
      o.innerHTML = val + u.outerHTML;
      frag.appendChild(o);
    });
    els.voltage.appendChild(frag);
    setDisabled(els.voltage, false);
    setDisabled(els.kva, true);
    resetSelect(els.kva);
    hideResult();
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
      o.textContent = val + ' kVA';
      frag.appendChild(o);
    });
    els.kva.appendChild(frag);
    setDisabled(els.kva, false);
  }

  function attachCascades (data) {
    els.transformer.addEventListener('change', () => {
      populateVoltages(data);
      hideResult(); //renderTable(filterData());
    });
    els.voltage.addEventListener('change', () => {
      populateKVA(data);
      hideResult(); //renderTable(filterData());
    });
    els.kva.addEventListener('change', () => {
      showResult(); //renderTable(filterData());
    });
  }

  function filterData () {
    const t = els.transformer.value;
    const v = els.voltage.value;
    const k = Number(els.kva.value);
    return data.filter(
      row => (!t || row.transformer === t) && (!v || row.voltage === v) && (!Number.isFinite(k) || row.kva === k)
    );
  }

  /*   function renderTable (rows) {
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
  } */

  function findFuses (row) {
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
      [`Operating kV (${row.transformer === 'PMT' || row.transformer === 'SDT' ? 'L-L' : 'L-N'})`, row.voltage],
      ['kVA', row.kva],
      [`${row.transformer === 'OH' ? 'Current Limiting Fuse' : 'BON Fuse'}`, getFuseCADId(row.bonFuse), 'highlight'],
      ['Source-side Fuse', getFuseCADId(row.sourceFuse), 'highlight'],
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

  const showResult = () => {
    const matches = filterData();
    //renderTable(matches);
    if (matches.length) {
      findFuses(matches[0], true);

      // Search and display impedance data if selections are complete
      const transformerType = els.transformer.value;
      const voltage = els.voltage.value;
      const kva = Number(els.kva.value);

      if (transformerType && voltage && kva) {
        const impedanceMatches = searchImpedanceData(transformerType, voltage, kva);
        if (impedanceMatches.length > 0) {
          els.result.innerHTML += renderImpedanceTable(impedanceMatches);
        }
      }
    } else {
      findFuses(null);
    }
  };

  function hideResult () {
    els.result.classList.add('hidden');
    els.result.innerHTML = '';
  }

  els.reset.addEventListener('click', () => {
    resetSelect(els.transformer);
    resetSelect(els.voltage);
    resetSelect(els.kva);
    setDisabled(els.voltage, true);
    setDisabled(els.kva, true);
    hideResult();
    //renderTable(data);
  });

  // Init
  populateTx(data);
  attachCascades(data);
  //renderTable(data);
})();
