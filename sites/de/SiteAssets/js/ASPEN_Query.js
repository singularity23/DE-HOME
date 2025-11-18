(() => {
  'use strict';

  // Configuration constants
  const CONFIG = {
    selectors: {
      searchContainerId: 'aspen-search-container',
      inputId: 'searchInput',
      buttonId: 'searchButton',
      warningId: 'warning',
      sqlEditorId: 'sql-editor',
      resultGridId: 'QueryResultGrid',
      tableContainer: 'tableContainer',
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
  };

  // State management
  const state = {
    headerRow: null,
    tableRows: null,
    isProcessing: false,
  };

  const widthSize = {
    6: [12, 12, 12, 15, 24, 25],
    5: [10, 10, 10, 10, 60],
  };

  // DOM Utilities
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
        } else {
          element.setAttribute(key, value);
        }
      });
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
  };

  // SQL Utilities
  const SQL = {
    minify (sql) {
      if (!sql) return '';
      try {
        return sql
          .replace(/--.*$/gm, '')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\s+/g, ' ')
          .trim();
      } catch (err) {
        console.error('SQL minification error:', err);
        return sql;
      }
    },

    generate (inputCode) {
      if (!inputCode) return '';

      const settingsList = CONFIG.sql.settingNames.map(name => `'${name}'`).join(',');

      return `
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
                WHERE R.S01 LIKE '${inputCode}%'
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
            AND DBMS_LOB.SUBSTR(S.SETTING, 4000) <> 'OFF' THEN UPPER(
              TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, 4000)) / 60
            )
            ELSE DBMS_LOB.SUBSTR(S.SETTING, 4000)
          END AS SETTING,
          Q.M01 AS MEMO
        FROM TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q
        WHERE R.S01 LIKE '${inputCode}%'
          AND R.RELAYTYPE LIKE 'SEL%'
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
                  WHERE R.S01 LIKE '${inputCode}%'
                    AND R.RELAYTYPE LIKE 'SEL%'
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
      `;
    },
  };

  // Data Processing
  const DataProcessor = {
    decodeSettingName (code) {
      if (!code) return '';

      try {
        const phaseMap = { G: 'GND ', P: 'PHS ', Q: 'NEG ', N: 'GND ' };
        const thirdChar = code.charAt(2);
        let result = phaseMap[thirdChar] || 'PHS ';

        // Handle special cases
        if (/^50P[234]/.test(code)) return 'Definite Time Pick Up (A)';
        if (/^67P[234]/.test(code)) return 'Definite Time Delay (s)';

        // Main element types
        if (/^50/.test(code)) result += 'Inst. Overcurrent ';
        else if (/^51/.test(code)) result += 'Timed Overcurrent ';

        // Suffix mapping
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

        // Special patterns
        if (/^50[PG]5/.test(code)) result += ' (Live Line)';
        if (/^SV\d?\w+/.test(code)) result = '_Trip Equation';

        return result;
      } catch (err) {
        console.error('Setting name decode error:', err);
        return '';
      }
    },

    processResults () {
      try {
        console.log('Processing query results...');

        // Your existing processing logic
        if (!cvAvailableTableFields?._ncc || !_C1MVCCtrl5?._ncc) {
          document.body.style.fontFamily = 'monospace';
          this.showCompletionAlert();
          return;
        }

        const headrowCollection = cvAvailableTableFields._ncc;
        state.headerRow = Array.from(headrowCollection);
        state.tableRows = Array.from(_C1MVCCtrl5._ncc);
        if (state.tableRows.length > 10) {
          state.headerRow.push({ Key: '5', Table: '', Name: 'PN ELEMENT DESC', Alias: null });
        }
        // Add description column header
        let feeder_id = state.tableRows[0][0];
        feeder_id = feeder_id.split(' ').slice(0, 2).join(' ');

        this.showCompletionAlert();
        // Auto-render table if container exists
        createTableContainer(feeder_id);

        TableRenderer.renderTable(CONFIG.selectors.tableContainer);
      } catch (err) {
        console.error('Results processing error:', err);
        this.showCompletionAlert();
      }
    },

    showCompletionAlert () {
      alert('Query Completed');
    },
  };

  // Search Component
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
      // Switch editor if function exists
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

      // Create input element
      const input = DOM.createElement('input', {
        type: 'text',
        id: CONFIG.selectors.inputId,
        placeholder: 'e.g. CSQ 12F411',
        className: CONFIG.classes.input,
        pattern: '^\\w{3}\\s(4|12|25|35)[fF]\\d{2,3}\\w?$',
        title: 'Please follow the pattern: ABC 12F123',
      });

      // Create button element
      const button = DOM.createElement('button', {
        type: 'button',
        id: CONFIG.selectors.buttonId,
        className: CONFIG.classes.button,
        textContent: 'Search',
      });

      // Create warning element
      const warning = DOM.createElement('em', {
        id: CONFIG.selectors.warningId,
        style: CONFIG.styles.warning,
      });

      // Assemble components
      wrapper.append(input, button, warning);
      document.body.insertBefore(wrapper, document.body.firstChild);

      // Inject CSS styles
      DOM.injectStyles();
    },

    attachEventHandlers () {
      const button = document.getElementById(CONFIG.selectors.buttonId);
      const input = document.getElementById(CONFIG.selectors.inputId);

      if (!button || !input) return;

      button.addEventListener('click', () => this.handleSearch());
      input.addEventListener('keypress', e => {
        if (e.key === 'Enter') this.handleSearch();
      });
    },

    handleSearch () {
      if (state.isProcessing) return;

      const warningEl = document.getElementById(CONFIG.selectors.warningId);
      const inputEl = document.getElementById(CONFIG.selectors.inputId);
      const sqlEditor = document.getElementById(CONFIG.selectors.sqlEditorId);
      const grid = document.getElementById(CONFIG.selectors.tableContainer);

      // Clear previous warnings
      if (warningEl) warningEl.textContent = '';
      if (sqlEditor) sqlEditor.textContent = '';

      const rawValue = inputEl.value.toUpperCase().trim();

      // Validate input
      if (!CONFIG.patterns.searchInput.test(rawValue)) {
        if (warningEl) {
          warningEl.textContent = 'Please use the correct format (e.g., ABC 12F123)!';
        }
        if (grid) grid.style.display = 'none';
        return;
      }

      this.executeSearch(rawValue, sqlEditor);
    },

    executeSearch (searchValue, sqlEditor) {
      state.isProcessing = true;

      try {
        // Generate and display SQL
        const sql = SQL.minify(SQL.generate(searchValue));
        if (sqlEditor) {
          sqlEditor.textContent = sql;
        }

        // Execute query if function exists
        if (typeof runQuery === 'function') {
          runQuery();
        }

        // Process results after delay
        setTimeout(() => {
          DataProcessor.processResults();
          state.isProcessing = false;
        }, 6000);
      } catch (err) {
        console.error('Search execution error:', err);
        state.isProcessing = false;
      }
    },
  };

  // Add these functions to your existing code

  const TableRenderer = {
    /**
     * Convert the result data to an HTML table with merged cells and empty column
     */
    convertToHtmlTable (swapColumns = [4, 5]) {
      try {
        if (!state.tableRows || state.tableRows.length === 0) {
          console.warn('No table data available');
          return '';
        }

        // Get headers (skip the last one since we're adding description column)
        const headers = state.headerRow.map(header => header.Name);
        console.log(state.headerRow);
        console.log(headers);
        // Process rows for merging and empty column
        // Swap specified columns if valid
        swapColumns = state.tableRows.length < 10 ? [0, 0] : [4, 5];

        if (this.isValidColumnSwap(headers, swapColumns)) {
          this.swapColumns(headers, swapColumns[0], swapColumns[1]);
        }
        // Process rows for merging, empty column, and swapping
        const processedData = this.processTableData(state.tableRows, swapColumns);
        console.log(processedData);
        // Generate HTML table
        return this.generateHtmlTable(headers, processedData);
      } catch (err) {
        console.error('HTML table conversion error:', err);
        return '<p>Error generating table</p>';
      }
    },

    isValidColumnSwap (headers, swapColumns) {
      if (!Array.isArray(swapColumns) || swapColumns.length !== 2) {
        console.warn('Invalid swapColumns parameter. Expected array of two indices.');
        return false;
      }

      const [col1, col2] = swapColumns;

      if (col1 < 0 || col2 < 0 || col1 >= headers.length || col2 >= headers.length) {
        console.warn(`Column indices out of range. Columns: ${headers.length}, Requested: ${col1}, ${col2}`);
        return false;
      }

      if (col1 === col2) {
        console.warn('Cannot swap column with itself');
        return false;
      }

      return true;
    },

    /**
     * Swap two columns in an array
     */
    swapColumns (array, index1, index2) {
      [array[index1], array[index2]] = [array[index2], array[index1]];
    },

    /**
     * Process table data for merging and add empty column
     */
    processTableData (rows, swapColumns = [4, 5]) {
      console.log(swapColumns);
      const processedRows = [];

      if (rows.length > 10) {
        rows.forEach(row => {
          // Convert row object to array if needed
          const rowArray = Array.isArray(row) ? row : Object.values(row);
          rowArray[5] = DataProcessor.decodeSettingName(rowArray[2]);
          const newRow = [...rowArray];
          if (this.isValidColumnSwap(newRow, swapColumns)) {
            this.swapColumns(newRow, swapColumns[0], swapColumns[1]);
          }
          processedRows.push(newRow);
        });
        console.log(processedRows);
        processedRows.sort((a, b) => {
          const aValue = a[4];
          const bValue = b[4];
          return aValue.localeCompare(bValue);
        });
        return this.mergeConsecutiveCells(processedRows);
      } else {
        document.body.style.fontFamily = 'monospace';
        return rows;
      }
    },

    /**
     * Merge consecutive cells with same values in each column
     */
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

    /**
     * Generate HTML table from headers and processed data
     */
    generateHtmlTable (headers, data) {
      let html =
        '<table border="1" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 13px; font-family: monospace">';

      // Generate table header
      html += '<thead style="background-color: #f2f2f2; font-weight: bold;">';
      html += '<tr>';
      const n = headers.length;
      headers.forEach((header, idx) => {
        if (n == 5 && header == 'ELEMENT') header = 'VENDER';
        html += `<th style="padding: 8px; border: 1px solid #ddd; text-align: left;width: ${
          widthSize[n][idx]
        }vw">${this.escapeHtml(header)}</th>`;
      });
      html += '</tr>';
      html += '</thead>';

      // Generate table body
      let rowArray = [];
      html += '<tbody>';
      console.log(data);
      data.forEach(row => {
        html += '<tr>';
        if (typeof row == 'object') rowArray = Object.values(row);
        else if (typeof row == 'array') rowArray = row;
        console.log(rowArray);
        rowArray.forEach(cell => {
          const rowspan = cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : '';
          const colspan = cell.colspan > 1 ? ` colspan="${cell.colspan}"` : '';
          html += `<td style="padding: 6px; border: 1px solid #ddd; vertical-align: middle; white-space:pre-wrap;"${rowspan}${colspan}>${this.escapeHtml(
            cell.value || cell
          )}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody>';
      html += '</table>';

      return html;
    },

    sortTable (columnIndex, dataType) {
      const tbody = document.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));

      const sortedRows = rows.sort((a, b) => {
        console.log(a, b);
        const aValue = a.cells[columnIndex].textContent;
        const bValue = b.cells[columnIndex].textContent;

        switch (dataType) {
          case 'number':
            return parseFloat(aValue) - parseFloat(bValue);
          case 'date':
            return new Date(aValue) - new Date(bValue);
          case 'text':
            return aValue.localeCompare(bValue);
        }
      });

      tbody.innerHTML = '';
      sortedRows.forEach(row => tbody.appendChild(row));
    },

    escapeHtml (text) {
      if (text === null || text === undefined) return '';

      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    /**
     * Render table in a specific container
     */
    renderTable (containerId) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`Container with ID '${containerId}' not found`);
        return;
      }
      const swapCols = state.tableRows.length > 10 ? [4, 5] : [0, 0];
      const tableHtml = this.convertToHtmlTable(swapCols);
      container.innerHTML = tableHtml;
    },

    /**
     * Download table as HTML file
     */
    downloadAsHtml (fileName = 'protection_settings') {
      const swapCols = state.tableRows.length > 10 ? [4, 5] : [0, 0];

      const tableHtml = this.convertToHtmlTable(swapCols);
      const fullHtml = `
  <!DOCTYPE html>
  <html>
  <head>
      <title>${fileName}</title>
      <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
          th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
      </style>
  </head>
  <body>
      <h2>Protection Settings</h1>
      ${tableHtml}
  </body>
  </html>`;

      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };

  // Add to your public API
  // Modify your existing processResults function to include table rendering

  // Replace the original DataProcessor
  // Create a table container automatically (optional)
  const createTableContainer = filename => {
    const existingContainer = document.getElementById(CONFIG.selectors.tableContainer);

    if (!existingContainer) {
      const container = document.createElement('div');
      container.id = CONFIG.selectors.tableContainer;
      container.style.margin = '20px 0';
      container.style.padding = '10px';
      container.style.border = '1px solid #ccc';

      // Add download button
      const downloadBtn = document.createElement('button');
      downloadBtn.textContent = 'Download as HTML';
      downloadBtn.className = 'btn app-btn app-btn-outline-primary mr-2';
      downloadBtn.onclick = () => TableRenderer.downloadAsHtml(filename);

      document.body.appendChild(downloadBtn);
      document.body.appendChild(document.createElement('br'));
      document.body.appendChild(document.createElement('br'));
      console.log(container);
      document.body.appendChild(container);
    }
  };

  // Public API for debugging
  window.AspenQuery = {
    addSearchBar: () => SearchComponent.init(),
    minifySqlManual: SQL.minify,
    decodeSettingName: DataProcessor.decodeSettingName,
    processResults: DataProcessor.processResults,
    getSqlText: SQL.generate,
    TableRenderer: TableRenderer,
    createTableContainer: createTableContainer,
    state: state,
    CONFIG: CONFIG,
  };

  // Initialize the application
  SearchComponent.init();
})();
