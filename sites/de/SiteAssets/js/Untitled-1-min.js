javascript: (function () {
  const CONFIG = {
      selectors: {
        searchContainerId: 'aspen-search-container',
        inputId: 'searchInput',
        buttonId: 'searchButton',
        warningId: 'warning',
        sqlEditorId: 'sql-editor',
        resultGridId: 'QueryResultGrid',
        containerId: 'tableContainer',
        mainAppClass: 'app-main',
        styleId: 'aspen-search-style',
      },
      patterns: { searchInput: /^\w{3}\s(4|12|25|35)[fF]\d{2,3}\w?$/i },
      styles: {
        wrapper:
          'padding:10px;box-shadow:rgba(23, 43, 77, 0.1) 0px 2px 2px,rgba(23, 43, 77, 0.1) 2px 2px 2px;justify-content:center;z-index:1000;',
        warning: 'color:#fa4616;font-size:0.8rem;margin:auto 5px;',
        inputValid: 'background-color:#dcf1da;',
        inputInvalid: 'background-color:#fedad0;',
        table:
          'border-collapse:collapse;max-width:100%;font-family:monospace;font-size: 13px;border: 1px solid#ddd;border-shadow:rgba(23, 43, 77, 0.1) 0px 2px 2px,rgba(23, 43, 77, 0.1) 2px 2px 2px;',
        tableHeader: 'padding: 8px;border: 1px solid#ddd;text-align:left;background-color: #97979780;font-weight:bold;',
        tableCell: 'padding: 6px;border: 1px solid#ddd;vertical-align:middle;white-space:pre-wrap;',
        container: 'margin: 20px 0;padding: 10px;border: 1px solid#ccc;',
      },
      classes: {
        input: 'text-uppercase app-search app-wj-search wj-control wj-content mr-2 pl-3',
        button: 'btn app-btn app-btn-outline-primary mr-2',
      },
      sql: {
        settingNames: [
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
          '50H',
          '51NP',
          '51NTD',
          '51NC',
          '50NL',
          '50NH',
          '51QP',
          '51QTD',
          '51QC',
          '50Q',
        ],
        excludedArevaSettings: [
          'FUNCTION PARAMETERS/PARAMETER SUBSET 1/DTOC/PULS.PROL.IN>,INTPS1',
          'FUNCTION PARAMETERS/PARAMETER SUBSET 1/DTOC/HOLD-T. TIN>,INTMPS1',
          'FUNCTION PARAMETERS/PARAMETER SUBSET 1/DTOC/TIN>>>> PS1',
          'FUNCTION PARAMETERS/PARAMETER SUBSET 1/IDMT1/EVALUATION IN PS1',
          'FUNCTION PARAMETERS/PARAMETER SUBSET 1/DTOC/EVAL. IN>,>>,>>> PS1',
          'FUNCTION PARAMETERS/PARAMETER SUBSET 1/DTOC/ENABLE PS1',
          'FUNCTION PARAMETERS/PARAMETER SUBSET 1/IDMT1/ENABLE PS1',
        ],
        queryDelay: 6e3,
        dbmsLobLength: 4e3,
      },
      table: {
        widthConfig: { SEL: [12, 12, 12, 15, 24, 25], ELECTRO: [5, 5, 5, 5, 80], AREVA: [10, 10, 60, 15, 5] },
        mergeColumns: { SEL: [0, 1, 5], AREVA: [0, 1] },
        SEL_sortColumnIndex: 4,
        AREVA_sortColumnIndex: 2,
        headerReplacements: { ELEMENT: 'VENDER' },
      },
      messages: {
        queryCompleted: 'Query Completed',
        invalidFormat: 'Please use the correct format(e.g., ABC 12F123)!',
        inputPattern: 'Please follow the pattern: ABC 12F123',
        placeholder: '...ABC 12F123',
      },
      relayTypes: { SEL: 'SEL', ELECTRO: 'ELECTRO', AREVA: 'AREVA', UNKNOWN: 'unknown' },
    },
    createState = () => ({ headerRow: null, tableRows: null, isProcessing: !1, relayType: '' });
  let state = { headerRow: null, tableRows: null, isProcessing: !1, relayType: '' };
  const Patterns = {
      definiteTime: { '50P[234]': /^50P[234]/, '67P[234]': /^67P[234]/ },
      overCurrent: { 50: /^50/, 51: /^51/ },
      special: { '50[PG]5': /^50[PG]5/, SV: /^SV\d?\w+/ },
      phases: { PHS: /P(\.|\s|\.?\s)?PS1$/, GND: /N(\.|\s|\.?\s)?PS1$/, NEG: /NEG(\.|\s|\.?\s)?PS1$/ },
    },
    DOM = {
      createElement (e, t = {}) {
        const n = document.createElement(e);
        for (const [e, r] of Object.entries(t))
          'style' === e && 'string' == typeof r
            ? (n.style.cssText = r)
            : 'textContent' === e
            ? (n.textContent = r)
            : 'className' === e
            ? (n.className = r)
            : 'onclick' === e
            ? (n.onclick = r)
            : 'innerHTML' === e
            ? (n.innerHTML = r)
            : n.setAttribute(e, r);
        return n;
      },
      getElement (e) {
        const t = document.getElementById(e);
        return t;
      },
      injectStyles () {
        if (document.getElementById(CONFIG.selectors.styleId)) return;
        const e = this.createElement('style', { id: CONFIG.selectors.styleId });
        (e.textContent = `input:valid{${CONFIG.styles.inputValid}}input:invalid{${CONFIG.styles.inputInvalid}} `),
          document.head.appendChild(e);
      },
      showWarning (e) {
        const t = this.getElement(CONFIG.selectors.warningId);
        t && (t.textContent = e);
      },
      clearWarning () {
        this.showWarning('');
        const e = document.getElementById(CONFIG.selectors.containerId);
        e && e.remove();
        const t = document.getElementById(CONFIG.selectors.sqlEditorId);
        t && (t.textContent = '');
      },
    },
    AREVA_SettingDecoder = {
      phaseMap: { PHS: 'P(\\.|\\s|\\.?\\s)?PS1$', GND: 'N(\\.|\\s|\\.?\\s)?PS1$', NEG: 'NEG(\\.|\\s|\\.?\\s)?PS1$' },
      phaseReplacements: { PHS: 'PHS ', GND: 'GND ', NEG: 'NEG ' },
      definiteTimeMap: {
        'DTOC/I>': 'PHS Definite Time Pick Up(A)',
        'DTOC/IN>': 'GND Definite Time Pick Up(A)',
        'DTOC/INEG>': 'NEG Definite Time Pick Up(A)',
        'DTOC/TI>': 'PHS Definite Time Delay(s)',
        'DTOC/TIN>': 'GND Definite Time Delay(s)',
        'DTOC/TINEG>': 'NEG Definite Time Delay(s)',
      },
      TimedMap: { IREF: 'Pick Up(A)', CHARACTER: 'Curve', FACTOR: 'Time Dial' },
      overCurrentMap: { IDMT1: 'Timed Overcurrent' },
      CTP: 0,
      decode (e, t) {
        if (!e || 'string' != typeof e) return ['', ''];
        if (!t || 'string' != typeof t) return ['', ''];
        if (e.includes('INOM'))
          return (this.CTP = Number(t.split(' ')[0]) || 0), ['CT Primary(A)'.toUpperCase(), this.CTP];
        try {
          for (const [n, r] of Object.entries(this.definiteTimeMap))
            if (e.includes(n)) {
              const e = Number(t.split(' ')[0]) || 0;
              return [r.toUpperCase(), t.toUpperCase().includes('INOM') ? e * this.CTP : e];
            }
          for (const [n, r] of Object.entries(this.phaseMap))
            if (new RegExp(r).test(e)) {
              const s = this.getSuffixDescription(e, r),
                a = e.includes('IDMT1') ? this.overCurrentMap.IDMT1 : '',
                i = this.getSettingNumber(t);
              let l = this.phaseReplacements[n] + a + s;
              return String(i).endsWith('s') && (l += ' (s)'), [l.toUpperCase(), i.toString().replace('s', '')];
            }
        } catch (e) {}
        return ['', ''];
      },
      getSettingNumber (e) {
        if (e.toUpperCase().includes('INOM')) {
          return (Number(e.split(' ')[0]) || 0) * this.CTP;
        }
        return e;
      },
      getSuffixDescription (e, t) {
        if (e.includes('IREF')) return this.TimedMap.IREF;
        if (e.includes('CHARACTER')) return this.TimedMap.CHARACTER;
        if (e.includes('FACTOR')) return this.TimedMap.FACTOR;
        const n = e.split('/');
        return n[n.length - 1]?.replace(new RegExp(t), '').trim() || '';
      },
    },
    SEL_SettingDecoder = {
      phaseMap: { G: 'GND ', P: 'PHS ', Q: 'NEG ', N: 'GND ' },
      suffixMap: { P: 'Pick Up(A)', C: 'Curve', TD: 'Time Dial', TC: 'Torque Control', L: 'Low Set', H: 'High Set' },
      definiteTimeMap: { '^50P[234]': 'Definite Time Pick Up(A)', '^67P[234]': 'Definite Time Delay(s)' },
      overCurrentMap: { '^50': 'Inst. Overcurrent', '^51': 'Timed Overcurrent ' },
      specialPatternMap: { '^50[PG]5': '(Live Line)', '^SV\\d?\\w+': '_Trip Equation' },
      decode (e) {
        if (!e || 'string' != typeof e) return '';
        try {
          for (const [t, n] of Object.entries(this.definiteTimeMap))
            if (new RegExp(t).test(e)) return this.getBaseDescription(e) + n;
          for (const [t, n] of Object.entries(this.overCurrentMap))
            if (new RegExp(t).test(e)) {
              const t = this.getBaseDescription(e),
                r = this.getSuffixDescription(e);
              return t + n + r + (Patterns.special['50[PG]5'].test(e) ? '(Live Line)' : '');
            }
          if (Patterns.special.SV.test(e)) return '_Trip Equation';
        } catch (e) {}
        return '';
      },
      getBaseDescription (e) {
        const t = e.charAt(2);
        return this.phaseMap[t] || 'PHS ';
      },
      getSuffixDescription (e) {
        const t = e.slice(-2),
          n = e.slice(-1);
        return this.suffixMap[t] || this.suffixMap[n] || '';
      },
    },
    TableRenderer = {
      createTable (e, t) {
        const n = DOM.createElement('table', { style: CONFIG.styles.table });
        return n.appendChild(this.createTableHead(e)), n.appendChild(this.createTableBody(t)), n;
      },
      createTableHead (e) {
        const t = DOM.createElement('thead'),
          n = DOM.createElement('tr'),
          r = e.length;
        for (let t = 0; t < e.length; t++) {
          const s = this.getDisplayHeader(e[t], r),
            a = this.getColumnWidth(state.relayType, r, t),
            i = DOM.createElement('th', { style: `${CONFIG.styles.tableHeader}width: ${a}vw`, textContent: s });
          n.appendChild(i);
        }
        return t.appendChild(n), t;
      },
      getDisplayHeader: (e, t) => (5 === t && 'ELEMENT' === e ? CONFIG.table.headerReplacements.ELEMENT : e),
      createTableBody (e) {
        const t = DOM.createElement('tbody');
        for (const n of e) {
          const e = DOM.createElement('tr'),
            r = Array.isArray(n) ? n : Object.values(n);
          for (const t of r) {
            const n = 'object' == typeof t ? t.value : t,
              r = DOM.createElement('td', { style: CONFIG.styles.tableCell, textContent: n });
            'object' == typeof t && t.rowspan > 1 && (r.rowSpan = t.rowspan), e.appendChild(r);
          }
          t.appendChild(e);
        }
        return t;
      },
      swapColumns (e, t, n) {
        [e[t], e[n]] = [e[n], e[t]];
      },
      mergeConsecutiveCells (e) {
        if (!e.length) return e;
        const t = CONFIG.table.mergeColumns[state.relayType];
        if (!t?.length) return e;
        const n = e[0].length,
          r = Array.from({ length: e.length }, () => Array.from({ length: n }, () => ({ rowspan: 1, skip: !1 })));
        for (const s of t) {
          if (s >= n) continue;
          let t = e[0][s],
            a = 0,
            i = 1;
          for (let n = 1; n <= e.length; n++) {
            const l = n === e.length;
            if (!l && e[n][s] === t) i++;
            else {
              if (i > 1) {
                r[a][s].rowspan = i;
                for (let e = a + 1; e < a + i; e++) r[e][s].skip = !0;
              }
              l || ((t = e[n][s]), (a = n), (i = 1));
            }
          }
        }
        const s = [];
        for (let t = 0; t < e.length; t++) {
          const a = [];
          for (let s = 0; s < n; s++) r[t][s].skip || a.push({ value: e[t][s], rowspan: r[t][s].rowspan, colspan: 1 });
          s.push(a);
        }
        return s;
      },
      getColumnWidth: (e, t, n) => CONFIG.table.widthConfig[e]?.[n] || 100 / t,
      render (e, t, n) {
        const r = DOM.getElement(e);
        if (!r) return;
        const s = this.createTable(t, n);
        (r.innerHTML = ''), r.appendChild(s);
      },
      removeOriginal () {
        const e = DOM.getElement(CONFIG.selectors.resultGridId);
        e && (e.style.display = 'none');
        const t = document.querySelector(`.${CONFIG.selectors.mainAppClass}`);
        t && t.setAttribute('style', 'min-height:auto');
      },
      downloadAsHtml (e, t, n) {
        const r = this.createTable(t, n).outerHTML,
          s = `<!DOCTYPE html> <html> <head> <title>${e}</title> <style>table{border-collapse:collapse;max-width: 100%;font-family: Arial,sans-serif;border:1px solid#ddd;border-shadow:rgba(23, 43, 77, 0.1) 0px 2px 2px,rgba(23, 43, 77, 0.1) 2px 2px 2px;}th,td{padding: 8px;border: 1px solid#ddd;text-align:left;}th{background-color: #97979780;font-weight:bold;font-size: 14px;} </style> </head> <body> <h2>Protection Settings- ${e} - ${new Date().toLocaleDateString()}</h2> ${r} </body> </html>`,
          a = new Blob([s], { type: 'text/html' }),
          i = URL.createObjectURL(a),
          l = DOM.createElement('a', { href: i, download: `${e}.html` });
        document.body.appendChild(l), l.click(), document.body.removeChild(l), URL.revokeObjectURL(i);
      },
    },
    DataProcessor = {
      processResults () {
        try {
          if (!this.hasRequiredGlobals()) return void this.showCompletionAlert();
          this.updateStateFromGlobals(), this.detectRelayType();
          const e = this.extractFeederId();
          this.addDescriptionColumn(),
            this.renderTable(),
            this.setupDownloadButton(e),
            TableRenderer.removeOriginal(),
            this.showCompletionAlert();
        } catch (e) {
          this.showCompletionAlert();
        }
      },
      hasRequiredGlobals: () => !(!window.cvAvailableTableFields?._ncc || !window._C1MVCCtrl5?._ncc),
      updateStateFromGlobals () {
        (state.headerRow = Array.from(window.cvAvailableTableFields._ncc)),
          (state.tableRows = Array.from(window._C1MVCCtrl5._ncc));
      },
      detectRelayType () {
        if (!state.tableRows?.length) return void (state.relayType = CONFIG.relayTypes.UNKNOWN);
        const e = state.tableRows[0],
          t = Array.isArray(e) ? e[1] : Object.values(e)[1],
          n = String(t || '').toUpperCase();
        n.includes(CONFIG.relayTypes.SEL)
          ? (state.relayType = CONFIG.relayTypes.SEL)
          : n.includes(CONFIG.relayTypes.ELECTRO)
          ? (state.relayType = CONFIG.relayTypes.ELECTRO)
          : n.includes(CONFIG.relayTypes.AREVA)
          ? (state.relayType = CONFIG.relayTypes.AREVA)
          : (state.relayType = CONFIG.relayTypes.UNKNOWN);
      },
      addDescriptionColumn () {
        state.relayType === CONFIG.relayTypes.SEL &&
          (state.headerRow.push({ Key: '5', Table: '', Name: 'PN ELEMENT DESC', Alias: null }),
          TableRenderer.swapColumns(state.headerRow, 4, 5)),
          (state.tableRows = state.tableRows.map(e => {
            const t = Array.isArray(e) ? [...e] : Object.values(e);
            if (state.relayType === CONFIG.relayTypes.SEL)
              (t[5] = SEL_SettingDecoder.decode(t[2])), TableRenderer.swapColumns(t, 4, 5);
            else if (state.relayType === CONFIG.relayTypes.AREVA) {
              const [e, n] = AREVA_SettingDecoder.decode(t[2], t[3]);
              (t[2] = e), (t[3] = n);
            }
            return t;
          }));
        const e =
          state.relayType === CONFIG.relayTypes.SEL
            ? CONFIG.table.SEL_sortColumnIndex
            : state.relayType === CONFIG.relayTypes.AREVA
            ? CONFIG.table.AREVA_sortColumnIndex
            : null;
        null !== e &&
          state.tableRows.sort((t, n) => {
            const r = String(t[e] || ''),
              s = String(n[e] || '');
            return r.localeCompare(s);
          });
      },
      extractFeederId () {
        if (!state.tableRows?.length) return 'unknown';
        const e = state.tableRows[0],
          t = Array.isArray(e) ? e[0] : Object.values(e)[0];
        return (
          String(t || '')
            .split(' ')
            .slice(0, 2)
            .join(' ') || 'unknown'
        );
      },
      renderTable () {
        const e = state.headerRow.map(e => e.Name);
        (state.relayType !== CONFIG.relayTypes.SEL && state.relayType !== CONFIG.relayTypes.AREVA) ||
          (state.tableRows = TableRenderer.mergeConsecutiveCells(state.tableRows));
        document.getElementById(CONFIG.selectors.containerId) || TableManager.createContainer();
        TableRenderer.render(CONFIG.selectors.containerId, e, state.tableRows);
      },
      setupDownloadButton (e) {
        const t = document.getElementById(CONFIG.selectors.containerId);
        if (!t) return;
        const n = TableManager.createDownloadButton(e);
        t.insertBefore(DOM.createElement('br'), t.firstChild),
          t.insertBefore(DOM.createElement('br'), t.firstChild),
          t.insertBefore(n, t.firstChild);
      },
      showCompletionAlert () {
        alert(CONFIG.messages.queryCompleted);
      },
    },
    TableManager = {
      createContainer () {
        const e = DOM.createElement('div', { id: CONFIG.selectors.containerId, style: CONFIG.styles.container });
        return document.body.appendChild(e), e;
      },
      createDownloadButton: e =>
        DOM.createElement('button', {
          className: CONFIG.classes.button,
          textContent: 'Download',
          onclick: () => {
            const t = state.headerRow.map(e => e.Name);
            TableRenderer.downloadAsHtml(e, t, state.tableRows);
          },
        }),
    },
    SearchComponent = {
      init () {
        try {
          this.injectExternalDependencies(), this.createSearchBar(), this.attachEventHandlers();
        } catch (e) {}
      },
      injectExternalDependencies () {
        'function' == typeof window.switchEditor && window.switchEditor();
      },
      createSearchBar () {
        const e = DOM.createElement('div', {
            id: CONFIG.selectors.searchContainerId,
            className: 'input-group',
            style: CONFIG.styles.wrapper,
          }),
          t = DOM.createElement('input', {
            type: 'text',
            id: CONFIG.selectors.inputId,
            placeholder: CONFIG.messages.placeholder,
            className: CONFIG.classes.input,
            pattern: CONFIG.patterns.searchInput.source,
            title: CONFIG.messages.inputPattern,
          }),
          n = DOM.createElement('button', {
            type: 'button',
            id: CONFIG.selectors.buttonId,
            className: CONFIG.classes.button,
            textContent: 'Search',
          }),
          r = DOM.createElement('em', { id: CONFIG.selectors.warningId, style: CONFIG.styles.warning });
        e.append(t, n, r), document.body.insertBefore(e, document.body.firstChild), DOM.injectStyles();
      },
      attachEventHandlers () {
        const e = DOM.getElement(CONFIG.selectors.buttonId),
          t = DOM.getElement(CONFIG.selectors.inputId);
        e &&
          t &&
          (e.addEventListener('click', () => this.handleSearch(t)),
          t.addEventListener('keypress', e => {
            'Enter' === e.key && this.handleSearch(t);
          }),
          t.addEventListener('input', () => {
            t.value = t.value.toUpperCase();
          }));
      },
      handleSearch (e) {
        if (state.isProcessing) return;
        DOM.clearWarning();
        const t = e.value.trim().toUpperCase();
        this.validateInput(t) ? this.executeSearch(t) : DOM.showWarning(CONFIG.messages.invalidFormat);
      },
      validateInput: e => CONFIG.patterns.searchInput.test(e),
      executeSearch (e) {
        state.isProcessing = !0;
        try {
          const t = SQL.generate(e);
          this.displaySql(t),
            'function' == typeof window.runQuery && window.runQuery(),
            setTimeout(() => {
              DataProcessor.processResults(), (state.isProcessing = !1);
            }, CONFIG.sql.queryDelay);
        } catch (e) {
          state.isProcessing = !1;
        }
      },
      displaySql (e) {
        const t = DOM.getElement(CONFIG.selectors.sqlEditorId);
        t && (t.textContent = e);
      },
    },
    SQL = {
      minify: e =>
        e?.trim()
          ? e
              .replace(/--.*$/gm, '')
              .replace(/\/\*[\s\S]*?\*\//g, '')
              .replace(/\s+/g, ' ')
              .trim()
          : '',
      generate (e) {
        if (!e) return '';
        const t = CONFIG.sql.settingNames.map(e => `'${e}'`).join(','),
          n = CONFIG.sql.excludedArevaSettings.map(e => `'${e}'`).join(','),
          r = `R.S01 LIKE '${e}%' AND R.RELAYTYPE LIKE 'SEL%'`,
          s = CONFIG.sql.dbmsLobLength;
        return SQL.minify(
          ` SELECT R.S01 AS DEVICE, Q.RELAYTYPE AS RELAY, T.SETTINGNAME AS ELEMENT, CASE WHEN T.SETTINGNAME NOT LIKE '%C' AND T.SETTINGNAME NOT LIKE '%D' AND S.GROUPNAME = '1' AND DBMS_LOB.SUBSTR(S.SETTING, ${s}) <> 'OFF' THEN UPPER(TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, ${s})) * (SELECT TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, ${s})) AS CTR FROM TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q WHERE ${r} AND R.ID = Q.RELAYID AND Q.ID = S.REQUESTID AND T.RELAYTYPE = Q.RELAYTYPE AND T.ROWNUMBER = S.ROWNUMBER AND S.GROUPNAME = '1' AND T.SETTINGNAME = 'CTR' AND UPPER(Q.S02) = 'IN SERVICE')) WHEN T.SETTINGNAME LIKE '67%D' AND S.GROUPNAME = '1' AND DBMS_LOB.SUBSTR(S.SETTING, ${s}) <> 'OFF' THEN UPPER(TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, ${s})) / 60) ELSE DBMS_LOB.SUBSTR(S.SETTING, ${s}) END AS SETTING, Q.M01 AS MEMO FROM TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q WHERE ${r} AND R.ID = Q.RELAYID AND Q.ID = S.REQUESTID AND T.RELAYTYPE = Q.RELAYTYPE AND T.ROWNUMBER = S.ROWNUMBER AND UPPER(Q.S02) = 'IN SERVICE' AND ((S.GROUPNAME = '1' AND T.SETTINGNAME IN (${t})) OR (S.GROUPNAME = 'L1' AND (T.SETTINGNAME LIKE (SELECT S.SETTING AS TR FROM TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q WHERE ${r} AND R.ID = Q.RELAYID AND Q.ID = S.REQUESTID AND T.RELAYTYPE = Q.RELAYTYPE AND T.ROWNUMBER = S.ROWNUMBER AND S.GROUPNAME = 'L1' AND T.SETTINGNAME = 'TR' AND UPPER(Q.S02) = 'IN SERVICE') OR T.SETTINGNAME IN ('51P1TC', '51PTC')))) UNION ALL SELECT R.S01 AS DEVICE, Q.RELAYTYPE AS RELAY, R.S06 AS VENDER, TO_CHAR(R.S04) AS MODEL, Q.M01 AS MEMO FROM TRELAY R, TREQUEST Q WHERE R.S01 LIKE '${e}%' AND UPPER(R.RELAYTYPE) LIKE 'ELECTRO%' AND R.ID = Q.RELAYID AND UPPER(Q.S02) = 'IN SERVICE' UNION ALL SELECT R.S01 AS DEVICE, Q.RELAYTYPE AS RELAY, T.SETTINGNAME AS ELEMENT, TO_CHAR(S.SETTING) AS SETTING, Q.M01 AS MEMO FROM TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q WHERE R.S01 LIKE '${e}%' AND R.RELAYTYPE LIKE 'AREVA%' AND R.ID = Q.RELAYID AND Q.ID = S.REQUESTID AND T.RELAYTYPE = Q.RELAYTYPE AND T.ROWNUMBER = S.ROWNUMBER AND UPPER(Q.S02) = 'IN SERVICE' AND S.GROUPNAME = 'PARAMETERS' AND (T.SETTINGNAME LIKE 'FUNCTION PARAMETERS/PARAMETER SUBSET 1/IDMT1%' OR T.SETTINGNAME LIKE 'FUNCTION PARAMETERS/PARAMETER SUBSET 1/DTOC%' OR T.SETTINGNAME LIKE 'FUNCTION PARAMETERS/GLOBAL/MAIN/INOM C.T. PRIM.%') AND UPPER(DBMS_LOB.SUBSTR(S.SETTING, ${s})) != 'BLOCKED' AND T.SETTINGNAME NOT IN (${n}) `
        );
      },
    };
  (window.AspenQuery = Object.freeze({
    addSearchBar: () => SearchComponent.init(),
    minifySqlManual: SQL.minify,
    decodeSELSettingName: SEL_SettingDecoder.decode.bind(SEL_SettingDecoder),
    decodeAREVASettingName: AREVA_SettingDecoder.decode.bind(AREVA_SettingDecoder),
    processResults: DataProcessor.processResults.bind(DataProcessor),
    getSqlText: SQL.generate,
    TableRenderer: TableRenderer,
    createTableContainer: TableManager.createContainer.bind(TableManager),
    getState: () => ({ ...state }),
    CONFIG: CONFIG,
  })),
    SearchComponent.init();
})();
