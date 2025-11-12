// ...existing code...
(() => {
  'use strict';

  const SELECTORS = {
    searchContainerId: 'aspen-search-container',
    inputId: 'searchInput',
    buttonId: 'searchButton',
    warningId: 'warning',
    sqlEditorId: 'sql-editor',
    sqlEditorSectionId: 'sql-editor-section',
    resultGridId: 'QueryResultGrid',
  };

  const PATTERN = /^\w{3}\s(4|12|25|35)F\d{2,3}\w?$/i;

  const addSearchBar = () => {
    try {
      if (typeof switchEditor === 'function') switchEditor();

      // Create wrapper
      const wrapper = document.createElement('div');
      wrapper.id = SELECTORS.searchContainerId;
      wrapper.className = 'input-group';
      wrapper.style.cssText = 'padding:10px;box-shadow:0 2px 5px rgba(0,0,0,0.2);justify-content:center;z-index:1000;';

      // Input
      const input = document.createElement('input');
      input.type = 'text';
      input.id = SELECTORS.inputId;
      input.placeholder = 'e.g. CSQ 12F411';
      input.className = 'app-search app-wj-search wj-control wj-content mr-2 pl-3';
      input.setAttribute('pattern', '^\\w{3}\\s(4|12|25|35)(F)\\d{2,3}\\w?$');
      input.title = 'please follow the pattern';
      wrapper.appendChild(input);

      // Button
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = SELECTORS.buttonId;
      btn.className = 'btn app-btn app-btn-outline-primary mr-2';
      btn.textContent = 'Search';
      wrapper.appendChild(btn);

      // Warning/feedback element
      const warning = document.createElement('em');
      warning.id = SELECTORS.warningId;
      warning.style.cssText = 'color:#fa4616;font-size:0.8rem;margin:auto 5px;';
      wrapper.appendChild(warning);

      // Small style to show input validity colors (inject once)
      const styleId = 'aspen-search-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = 'input:valid{background-color:#dcf1da;} input:invalid{background-color:#fedad0;}';
        document.head.appendChild(style);
      }

      document.body.insertBefore(wrapper, document.body.firstChild);

      attachHandlers();
    } catch (err) {
      console.error('addSearchBar error:', err);
    }
  };

  const minifySqlManual = sql => {
    if (!sql) return '';
    try {
      // remove single-line and block comments then collapse whitespace
      return sql
        .replace(/--.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (err) {
      console.error('minifySqlManual error:', err);
      return sql;
    }
  };

  const decodeSettingName = code => {
    // original S() mapping and logic preserved, renamed and cleaned
    if (!code) return '';
    try {
      const phaseMap = { G: 'GND ', P: 'PHS ', Q: 'NEG ', N: 'GND ' };
      const thirdChar = code.charAt(2);
      let result = phaseMap[thirdChar] || 'PHS ';

      if (/^50P[234]/.test(code)) {
        return 'Definite Time Pick Up (A)';
      }
      if (/^67P[234]/.test(code)) {
        return 'Definite Time Delay (s)';
      }

      if (/^50/.test(code)) result += 'Inst. Overcurrent ';
      else if (/^51/.test(code)) result += 'Timed Overcurrent ';

      const suffixMap = {
        P: 'Pick Up (A)',
        C: 'Curve',
        TD: 'Time Dial',
        TC: 'Torque Control',
        L: 'Low Set',
        H: 'High Set',
      };

      const last = code.slice(-1);
      const last2 = code.slice(-2);

      if (suffixMap[last2]) result += suffixMap[last2];
      else if (suffixMap[last]) result += suffixMap[last];

      if (/^50[PG]5/.test(code)) result += ' (Live Line)';
      if (/^SV\d?\w+/.test(code)) result = '_Trip Equation';

      return result;
    } catch (err) {
      console.error('decodeSettingName error:', err);
      return '';
    }
  };

  const processResults = () => {
    try {
      console.log('Start processing results');
      if (!window._C1MVCCtrl5 || !_C1MVCCtrl5._ncc) {
        document.body.style.fontFamily = 'monospace';
        alert('Query Completed');
        return;
      }

      const rows = Array.from(_C1MVCCtrl5._ncc);
      const count = rows.length;
      if (count > 10) {
        for (let i = 0; i < count; i++) {
          // preserve original behavior: set decoded description into index [4]
          try {
            rows[i][4] = decodeSettingName(rows[i][2]);
          } catch (innerErr) {
            console.warn('row decode error', i, innerErr);
          }
        }
      } else {
        document.body.style.fontFamily = 'monospace';
      }
      alert('Query Completed');
    } catch (err) {
      console.error('processResults error:', err);
      alert('Query Completed');
    }
  };

  const getSqlText = inputCode => {
    if (!inputCode) return '';
    const E = inputCode;
    // SQL template preserved. Keep minification for display or execution.
    return `SELECT
  R.S01 AS DEVICE,
  Q.RELAYTYPE AS RELAY,
  T.SETTINGNAME AS ELEMENT,
  CASE
    WHEN T.SETTINGNAME NOT LIKE '%C'
    AND T.SETTINGNAME NOT LIKE '%D'
    AND S.GROUPNAME = '1'
    AND DBMS_LOB.SUBSTR (S.SETTING, 4000) <> 'OFF' THEN UPPER(
      TO_NUMBER (DBMS_LOB.SUBSTR (S.SETTING, 4000)) * (
        SELECT
          TO_NUMBER (DBMS_LOB.SUBSTR (S.SETTING, 4000)) AS CTR
        FROM
          TSETTING1 S,
          TSETTYPE1 T,
          TRELAY R,
          TREQUEST Q
        WHERE
          R.S01 LIKE '${E}%'
          AND R.RELAYTYPE LIKE 'SEL%'
          AND R.ID = Q.RELAYID
          AND Q.ID = S.REQUESTID
          AND T.RELAYTYPE = Q.RELAYTYPE
          AND T.ROWNUMBER = S.ROWNUMBER
          AND S.GROUPNAME = '1'
          AND T.SETTINGNAME = 'CTR'
          AND UPPER(Q.S02) = 'IN SERVICE'
      )
    )
    WHEN T.SETTINGNAME LIKE '67%D'
    AND S.GROUPNAME = '1'
    AND DBMS_LOB.SUBSTR (S.SETTING, 4000) <> 'OFF' THEN UPPER(
      TO_NUMBER (DBMS_LOB.SUBSTR (S.SETTING, 4000)) / 60
    )
    ELSE DBMS_LOB.SUBSTR (S.SETTING, 4000)
  END AS SETTING,
  Q.M01 AS MEMO
FROM
  TSETTING1 S,
  TSETTYPE1 T,
  TRELAY R,
  TREQUEST Q
WHERE
  R.S01 LIKE '${E}%'
  AND R.RELAYTYPE LIKE 'SEL%'
  AND R.ID = Q.RELAYID
  AND Q.ID = S.REQUESTID
  AND T.RELAYTYPE = Q.RELAYTYPE
  AND T.ROWNUMBER = S.ROWNUMBER
  AND UPPER(Q.S02) = 'IN SERVICE'
  AND (
    (
      S.GROUPNAME = '1'
      AND T.SETTINGNAME IN (
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
        '50Q'
      )
    )
    OR (
      S.GROUPNAME = 'L1'
      AND (
        (
          T.SETTINGNAME LIKE (
            SELECT
              S.SETTING AS TR
            FROM
              TSETTING1 S,
              TSETTYPE1 T,
              TRELAY R,
              TREQUEST Q
            WHERE
              R.S01 LIKE '${E}%'
              AND R.RELAYTYPE LIKE 'SEL%'
              AND R.ID = Q.RELAYID
              AND Q.ID = S.REQUESTID
              AND T.RELAYTYPE = Q.RELAYTYPE
              AND T.ROWNUMBER = S.ROWNUMBER
              AND S.GROUPNAME = 'L1'
              AND T.SETTINGNAME = 'TR'
              AND UPPER(Q.S02) = 'IN SERVICE'
          )
        )
        OR T.SETTINGNAME IN ('51P1TC', '51PTC')
      )
    )
  )
UNION ALL
SELECT
  R.S01 AS DEVICE,
  R.S04 AS RELAY,
  R.S06 AS VENDER,
  Q.RELAYTYPE,
  Q.M01 AS MEMO
FROM
  TRELAY R,
  TREQUEST Q
WHERE
  R.S01 LIKE '${E}%'
  AND UPPER(R.RELAYTYPE) LIKE 'ELECTRO%'
  AND R.ID = Q.RELAYID
  AND UPPER(Q.S02) = 'IN SERVICE'`;
  };

  const attachHandlers = () => {
    const button = document.getElementById(SELECTORS.buttonId);
    if (!button) return;

    button.addEventListener('click', () => {
      const warningEl = document.getElementById(SELECTORS.warningId);
      const inputEl = document.getElementById(SELECTORS.inputId);
      if (!inputEl) return;

      if (warningEl) warningEl.textContent = '';

      const rawValue = inputEl.value.trim();
      if (!PATTERN.test(rawValue)) {
        if (warningEl) warningEl.textContent = 'Please use the correct format!';
        console.warn('Invalid format:', rawValue);
        const sqlEditor = document.getElementById(SELECTORS.sqlEditorId);
        if (sqlEditor) sqlEditor.innerText = '';
        const grid = document.getElementById(SELECTORS.resultGridId);
        if (grid) grid.style.display = 'none';
        return;
      }

      try {
        const sql = minifySqlManual(getSqlText(rawValue));
        const sqlEditor = document.getElementById(SELECTORS.sqlEditorId);
        if (sqlEditor) sqlEditor.innerText = sql;

        // runQuery may be defined elsewhere in the original environment
        if (typeof runQuery === 'function') {
          runQuery();
        }

        // Keep the original delay + processing behavior
        setTimeout(() => {
          processResults();
        }, 6000);
      } catch (err) {
        console.error('Search handler error:', err);
      }
    });
  };

  // expose for debugging if needed (optional)
  window.AspenQuery = {
    addSearchBar,
    minifySqlManual,
    decodeSettingName,
    processResults,
    getSqlText,
  };

  // initialize immediately
  addSearchBar();
})();
