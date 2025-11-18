(() => {
  'use strict';

  // Enhanced Configuration with better organization
  const CONFIG = {
    selectors: {
      searchContainerId: 'aspen-search-container',
      inputId: 'searchInput',
      buttonId: 'searchButton',
      warningId: 'warning',
      sqlEditorId: 'sql-editor',
      resultGridId: 'QueryResultGrid',
      tableContainer: 'tableContainer',
      main: 'app-main',
    },
    patterns: {
      searchInput: /^\w{3}\s(4|12|25|35)[fF]\d{2,3}\w?$/i,
    },
    styles: {
      wrapper: 'padding:10px;box-shadow:0 2px 5px rgba(0,0,0,0.2);justify-content:center;z-index:1000;',
      warning: 'color:#fa4616;font-size:0.8rem;margin:auto 5px;',
      inputValid: 'background-color:#dcf1da;',
      inputInvalid: 'background-color:#fedad0;',
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
    },
    table: {
      widthConfig: {
        6: [12, 12, 12, 15, 24, 25],
        5: [10, 10, 10, 10, 60],
      },
      rowThreshold: 10,
    },
  };

  // Immutable state management
  const state = Object.freeze({
    headerRow: null,
    tableRows: null,
    isProcessing: false,
  });

  let currentState = { ...state };

  // Enhanced DOM Utilities with better error handling
  const DOM = {
    createElement (tag, options = {}) {
      const element = document.createElement(tag);

      Object.entries(options).forEach(([key, value]) => {
        if (key === 'style' && typeof value === 'string') {
          element.style.cssText = value;
        } else if (key === 'textContent') {
          element.textContent = value;
        } else if (key === 'className') {
          element.className = value;
        } else if (key === 'onclick') {
          element.onclick = value;
        } else {
          element.setAttribute(key, value);
        }
      });

      return element;
    },

    getElement (id) {
      const element = document.getElementById(id);
      if (!element) {
        console.warn(`Element with id '${id}' not found`);
      }
      return element;
    },

    injectStyles () {
      const styleId = 'aspen-search-style';
      if (!document.getElementById(styleId)) {
        const style = this.createElement('style', { id: styleId });
        style.textContent = `
          input:valid { ${CONFIG.styles.inputValid} }
          input:invalid { ${CONFIG.styles.inputInvalid} }
        `;
        document.head.appendChild(style);
      }
    },

    showWarning (message) {
      const warningEl = this.getElement(CONFIG.selectors.warningId);
      if (warningEl) {
        warningEl.textContent = message;
      }
    },

    clearWarning () {
      this.showWarning('');
    },
  };

  // Optimized SQL Utilities
  const SQL = {
    minify (sql) {
      if (!sql?.trim()) return '';

      return sql
        .replace(/--.*$/gm, '') // Remove single line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .replace(/\s+/g, ' ') // Collapse whitespace
        .trim();
    },

    generate (inputCode) {
      if (!inputCode) return '';

      const settingsList = CONFIG.sql.settingNames.map(name => `'${name}'`).join(',');
      const baseCondition = `R.S01 LIKE '${inputCode}%' AND R.RELAYTYPE LIKE 'SEL%'`;

      return SQL.minify(`
        SELECT
          R.S01 AS DEVICE,
          Q.RELAYTYPE AS RELAY,
          T.SETTINGNAME AS ELEMENT,
          CASE
            WHEN T.SETTINGNAME NOT LIKE '%C'
            AND T.SETTINGNAME NOT LIKE '%D'
            AND S.GROUPNAME = '1'
            AND DBMS_LOB.SUBSTR(S.SETTING, 4000) <> 'OFF' THEN UPPER(
              TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, 4000)) * (
                SELECT TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, 4000)) AS CTR
                FROM TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q
                WHERE ${baseCondition}
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
            AND DBMS_LOB.SUBSTR(S.SETTING, 4000) <> 'OFF' THEN UPPER(
              TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, 4000)) / 60
            )
            ELSE DBMS_LOB.SUBSTR(S.SETTING, 4000)
          END AS SETTING,
          Q.M01 AS MEMO
        FROM TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q
        WHERE ${baseCondition}
          AND R.ID = Q.RELAYID
          AND Q.ID = S.REQUESTID
          AND T.RELAYTYPE = Q.RELAYTYPE
          AND T.ROWNUMBER = S.ROWNUMBER
          AND UPPER(Q.S02) = 'IN SERVICE'
          AND (
            (S.GROUPNAME = '1' AND T.SETTINGNAME IN (${settingsList}))
            OR (
              S.GROUPNAME = 'L1' AND (
                T.SETTINGNAME LIKE (
                  SELECT S.SETTING AS TR
                  FROM TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q
                  WHERE ${baseCondition}
                    AND R.ID = Q.RELAYID
                    AND Q.ID = S.REQUESTID
                    AND T.RELAYTYPE = Q.RELAYTYPE
                    AND T.ROWNUMBER = S.ROWNUMBER
                    AND S.GROUPNAME = 'L1'
                    AND T.SETTINGNAME = 'TR'
                    AND UPPER(Q.S02) = 'IN SERVICE'
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
        FROM TRELAY R, TREQUEST Q
        WHERE R.S01 LIKE '${inputCode}%'
          AND UPPER(R.RELAYTYPE) LIKE 'ELECTRO%'
          AND R.ID = Q.RELAYID
          AND UPPER(Q.S02) = 'IN SERVICE'
      `);
    },
  };

  // Enhanced Setting Name Decoder with better pattern matching
  const SettingDecoder = {
    phaseMap: {
      G: 'GND ',
      P: 'PHS ',
      Q: 'NEG ',
      N: 'GND ',
    },

    suffixMap: {
      P: 'Pick Up (A)',
      C: 'Curve',
      TD: 'Time Dial',
      TC: 'Torque Control',
      L: 'Low Set',
      H: 'High Set',
    },

    definiteTime: {
      '^50P[234]': 'Definite Time Pick Up (A)',
      '^67P[234]': 'Definite Time Delay (s)',
    },

    overCurrent: {
      '^50': 'Inst. Overcurrent ',
      '^51': 'Timed Overcurrent ',
    },

    specialPattern: {
      '^50[PG]5': '(Live Line)',
      '^SV\\d?\\w+': '_Trip Equation',
    },

    decode (code) {
      if (!code) return '';

      try {
        // Check for special patterns first
        const sPattern = Object.entries(this.specialPattern);
        for (const [pattern, replacement] of Object.entries(this.definiteTime)) {
          if (new RegExp(pattern).test(code)) {
            return this.getBaseDescription(code) + replacement;
          }
        }

        for (const [pattern, replacement] of Object.entries(this.overCurrent)) {
          if (new RegExp(pattern).test(code)) {
            if (new RegExp(sPattern[0][0]).test(code)) {
              return this.getBaseDescription(code) + replacement + this.getSuffixDescription(code) + sPattern[0][1];
            } else {
              return this.getBaseDescription(code) + replacement + this.getSuffixDescription(code);
            }
          }
        }

        if (new RegExp(sPattern[1][0]).test(code)) {
          return sPattern[1][1];
        }
      } catch (err) {
        console.error('Setting name decode error:', err);
        return '';
      }
    },

    getBaseDescription (code) {
      const thirdChar = code.charAt(2);
      const phase = this.phaseMap[thirdChar] || 'PHS ';

      return phase;
    },

    getSuffixDescription (code) {
      const last2 = code.slice(-2);
      const last1 = code.slice(-1);

      return this.suffixMap[last2] || this.suffixMap[last1] || '';
    },
  };

  // Optimized Table Renderer
  const TableRenderer = {
    createTable (headers, data) {
      const table = DOM.createElement('table', {
        border: '1',
        style: 'border-collapse: collapse; width: 100%; font-family: monospace; font-size: 13px;',
      });

      table.appendChild(this.createTableHead(headers));
      table.appendChild(this.createTableBody(data));

      return table;
    },

    createTableHead (headers) {
      const thead = DOM.createElement('thead');
      const tr = DOM.createElement('tr');

      headers.forEach((header, index) => {
        const th = DOM.createElement('th', {
          style: `padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f2f2f2; font-weight: bold; width: ${this.getColumnWidth(
            headers.length,
            index
          )}vw`,
          textContent: headers.length === 5 && header === 'ELEMENT' ? 'VENDER' : header,
        });
        tr.appendChild(th);
      });

      thead.appendChild(tr);
      return thead;
    },

    createTableBody (data) {
      const tbody = DOM.createElement('tbody');
      console.log(data);
      data.forEach(row => {
        const tr = DOM.createElement('tr');
        const rowData = Array.isArray(row) ? row : Object.values(row);
        console.log(rowData);

        rowData.forEach(cell => {
          const cellData = typeof cell === 'object' ? cell.value : cell;
          const td = DOM.createElement('td', {
            style: 'padding: 6px; border: 1px solid #ddd; vertical-align: middle; white-space: pre-wrap;',
            textContent: cellData,
          });

          if (typeof cell === 'object' && cell.rowspan > 1) {
            td.rowSpan = cell.rowspan;
          }

          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });

      return tbody;
    },

    swapColumns (array, index1, index2) {
      [array[index1], array[index2]] = [array[index2], array[index1]];
    },

    mergeConsecutiveCells (rows) {
      if (!rows.length) return rows;

      const colCount = rows[0].length;
      const mergeMap = Array.from({ length: rows.length }, () =>
        Array.from({ length: colCount }, () => ({ rowspan: 1, skip: false }))
      );

      // Check each column for consecutive same values
      for (let col = 0; col < colCount; col++) {
        if (col == 0 || col == 1 || col == 5) {
          let currentValue = rows[0][col];
          let startRow = 0;
          let count = 1;

          for (let row = 1; row <= rows.length; row++) {
            if (row < rows.length && rows[row][col] === currentValue) {
              count++;
            } else {
              if (count > 1) {
                // Mark cells to be merged
                mergeMap[startRow][col].rowspan = count;
                for (let i = startRow + 1; i < startRow + count; i++) {
                  mergeMap[i][col].skip = true;
                }
              }

              if (row < rows.length) {
                currentValue = rows[row][col];
                startRow = row;
                count = 1;
              }
            }
          }
        }
      }

      // Apply merge information to rows
      const mergedRows = [];
      for (let row = 0; row < rows.length; row++) {
        const newRow = [];
        for (let col = 0; col < colCount; col++) {
          if (!mergeMap[row][col].skip) {
            newRow.push({
              value: rows[row][col],
              rowspan: mergeMap[row][col].rowspan,
              colspan: 1,
            });
          }
        }
        mergedRows.push(newRow);
      }

      return mergedRows;
    },

    getColumnWidth (columnCount, index) {
      return CONFIG.table.widthConfig[columnCount]?.[index] || 100 / columnCount;
    },

    render (containerId, headers, data) {
      const container = DOM.getElement(containerId);
      if (!container) return;

      const table = this.createTable(headers, data);
      container.innerHTML = '';
      container.appendChild(table);
    },

    removeOriginal () {
      const results = document.getElementById(CONFIG.selectors.resultGridId);
      results.style.display = 'none';
      const main = document.querySelector(`.${CONFIG.selectors.main}`);
      main.setAttribute('style', 'min-height: auto');
    },

    downloadAsHtml (filename, headers, data) {
      const tableHtml = this.createTable(headers, data).outerHTML;
      const fullHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>${filename}</title>
    <style>
        table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
        th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; font-size: 14px; }
    </style>
</head>
<body>
    <h2>Protection Settings - ${filename}</h2>
    ${tableHtml}
</body>
</html>`;

      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = DOM.createElement('a', {
        href: url,
        download: `${filename}.html`,
      });

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };

  // Data Processing with better state management
  const DataProcessor = {
    processResults () {
      try {
        console.log('Processing query results...');

        // Check for required global objects
        if (!this.hasRequiredGlobals()) {
          this.showCompletionAlert();
          return;
        }

        this.updateStateFromGlobals();

        if (currentState.tableRows.length > CONFIG.table.rowThreshold) {
          this.addDescriptionColumn();
          TableRenderer.swapColumns(currentState.headerRow, 4, 5);
        }

        const feederId = this.extractFeederId();
        this.showCompletionAlert();

        TableManager.createContainer(feederId);
        this.renderTable();
      } catch (err) {
        console.error('Results processing error:', err);
        this.showCompletionAlert();
      }
    },

    hasRequiredGlobals () {
      return !!(cvAvailableTableFields?._ncc && _C1MVCCtrl5?._ncc);
    },

    updateStateFromGlobals () {
      currentState.headerRow = Array.from(cvAvailableTableFields._ncc);
      currentState.tableRows = Array.from(_C1MVCCtrl5._ncc);
    },

    addDescriptionColumn () {
      currentState.headerRow.push({
        Key: '5',
        Table: '',
        Name: 'PN ELEMENT DESC',
        Alias: null,
      });

      currentState.tableRows = currentState.tableRows.map(row => {
        const rowArray = Array.isArray(row) ? [...row] : Object.values(row);
        rowArray[5] = SettingDecoder.decode(rowArray[2]);
        TableRenderer.swapColumns(rowArray, 4, 5);

        return rowArray;
      });

      // Sort by setting value
      currentState.tableRows.sort((a, b) => {
        const aValue = a[4] || '';
        const bValue = b[4] || '';
        return aValue.localeCompare(bValue);
      });
    },

    extractFeederId () {
      if (!currentState.tableRows.length) return 'unknown';
      const firstRow = currentState.tableRows[0];
      const firstCell = Array.isArray(firstRow) ? firstRow[0] : Object.values(firstRow)[0];
      return firstCell.split(' ').slice(0, 2).join(' ');
    },

    renderTable () {
      const headers = currentState.headerRow.map(header => header.Name);
      if (currentState.tableRows.length > CONFIG.table.rowThreshold) {
        currentState.tableRows = TableRenderer.mergeConsecutiveCells(currentState.tableRows);
      }
      TableRenderer.render(CONFIG.selectors.tableContainer, headers, currentState.tableRows);
      TableRenderer.removeOriginal();
    },

    showCompletionAlert () {
      alert('Query Completed');
    },
  };

  // Table Manager for container management
  const TableManager = {
    createContainer (filename) {
      let container = DOM.getElement(CONFIG.selectors.tableContainer);

      if (!container) {
        this.createDownloadButton(filename);
        container = DOM.createElement('div', {
          id: CONFIG.selectors.tableContainer,
          style: 'margin: 20px 0; padding: 10px; border: 1px solid #ccc;',
        });

        document.body.appendChild(container);
      }

      return container;
    },

    createDownloadButton (filename) {
      const downloadBtn = DOM.createElement('button', {
        className: CONFIG.classes.button,
        textContent: 'Download as HTML',
        onclick: () => {
          const headers = currentState.headerRow.map(header => header.Name);
          TableRenderer.downloadAsHtml(filename, headers, currentState.tableRows);
        },
      });

      document.body.appendChild(downloadBtn);
      document.body.appendChild(DOM.createElement('br'));
      document.body.appendChild(DOM.createElement('br'));
    },
  };

  // Optimized Search Component
  const SearchComponent = {
    init () {
      try {
        this.injectExternalDependencies();
        this.createSearchBar();
        this.attachEventHandlers();
      } catch (err) {
        console.error('Search component initialization error:', err);
      }
    },

    injectExternalDependencies () {
      if (typeof switchEditor === 'function') {
        switchEditor();
      }
    },

    createSearchBar () {
      const wrapper = DOM.createElement('div', {
        id: CONFIG.selectors.searchContainerId,
        className: 'input-group',
        style: CONFIG.styles.wrapper,
      });

      const input = DOM.createElement('input', {
        type: 'text',
        id: CONFIG.selectors.inputId,
        placeholder: 'e.g. CSQ 12F411',
        className: CONFIG.classes.input,
        pattern: CONFIG.patterns.searchInput.source,
        title: 'Please follow the pattern: ABC 12F123',
      });

      const button = DOM.createElement('button', {
        type: 'button',
        id: CONFIG.selectors.buttonId,
        className: CONFIG.classes.button,
        textContent: 'Search',
      });

      const warning = DOM.createElement('em', {
        id: CONFIG.selectors.warningId,
        style: CONFIG.styles.warning,
      });

      wrapper.append(input, button, warning);
      document.body.insertBefore(wrapper, document.body.firstChild);

      DOM.injectStyles();
    },

    attachEventHandlers () {
      const button = DOM.getElement(CONFIG.selectors.buttonId);
      const input = DOM.getElement(CONFIG.selectors.inputId);

      if (!button || !input) return;

      button.addEventListener('click', () => this.handleSearch());
      input.addEventListener('keypress', e => {
        if (e.key === 'Enter') this.handleSearch();
      });
    },

    handleSearch () {
      if (currentState.isProcessing) return;

      DOM.clearWarning();

      const inputEl = DOM.getElement(CONFIG.selectors.inputId);
      const rawValue = inputEl.value.trim().toUpperCase();

      if (!this.validateInput(rawValue)) {
        DOM.showWarning('Please use the correct format (e.g., ABC 12F123)!');
        this.hideTable();
        return;
      }

      this.executeSearch(rawValue);
    },

    validateInput (value) {
      return CONFIG.patterns.searchInput.test(value);
    },

    hideTable () {
      const grid = DOM.getElement(CONFIG.selectors.tableContainer);
      if (grid) grid.style.display = 'none';
    },

    executeSearch (searchValue) {
      currentState.isProcessing = true;

      try {
        const sql = SQL.generate(searchValue);
        this.displaySql(sql);

        if (typeof runQuery === 'function') {
          runQuery();
        }

        setTimeout(() => {
          DataProcessor.processResults();
          currentState.isProcessing = false;
        }, 6000);
      } catch (err) {
        console.error('Search execution error:', err);
        currentState.isProcessing = false;
      }
    },

    displaySql (sql) {
      const sqlEditor = DOM.getElement(CONFIG.selectors.sqlEditorId);
      if (sqlEditor) {
        sqlEditor.textContent = sql;
      }
    },
  };

  // Public API
  window.AspenQuery = Object.freeze({
    addSearchBar: () => SearchComponent.init(),
    minifySqlManual: SQL.minify,
    decodeSettingName: SettingDecoder.decode.bind(SettingDecoder),
    processResults: DataProcessor.processResults.bind(DataProcessor),
    getSqlText: SQL.generate,
    TableRenderer,
    createTableContainer: TableManager.createContainer.bind(TableManager),
    getState: () => ({ ...currentState }),
    CONFIG,
  });

  // Initialize the application
  SearchComponent.init();
})();
