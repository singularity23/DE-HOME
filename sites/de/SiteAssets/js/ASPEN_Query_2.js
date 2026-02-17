javascript: (function () {
  'use strict';

  /*
   * Enhanced Configuration with better organization
   * All configurable values centralized for easy maintenance
   */
  const CONFIG = {
    selectors: {
      searchContainerId: 'aspen-search-container',
      inputId: 'searchInput',
      buttonId: 'searchButton',
      warningId: 'warning',
      sqlEditorId: 'sql-editor',
      sqlEditorSectionId: 'sql-editor-section',
      resultGridId: 'QueryResultGrid',
      resultGridClass: 'query-result',
      containerId: 'tableContainer',
      mainAppClass: 'app-main',
      styleId: 'aspen-search-style',
    },
    patterns: {
      searchInput: /^\w{3}\s(4|12|25|35)[fF]\d{2,3}\w?$/i,
    },
    styles: {
      wrapper:
        'padding:10px; box-shadow:rgba(23, 43, 77, 0.1) 0px 2px 2px, rgba(23, 43, 77, 0.1) 2px 2px 2px;justify-content:center;z-index:1000;',
      warning: 'color:#fa4616;font-size:0.9rem;margin:auto 5px;font-weight:bold;',
      inputValid: 'background-color:#dcf1da;',
      inputInvalid: 'background-color:#fedad0;',
      table:
        'border-collapse: collapse; max-width:100%; font-family: monospace; font-size: 12px; border: 1px solid #ddd; box-shadow: rgba(23, 43, 77, 0.1) 0px 2px 2px, rgba(23, 43, 77, 0.1) 2px 2px 2px;',
      tableHeader:
        'padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #97979780; font-weight: bold;',
      tableCell: 'padding: 6px; border: 1px solid #ddd; vertical-align: middle; white-space: pre-wrap;',
      container: 'margin: 20px 0; padding: 10px; border: 1px solid #ccc;',
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
      settingStatus: {
        inService: 'IN SERVICE',
        issued: 'ISSUED',
      },
      queryDelay: 2000,
      dbmsLobLength: 4000,
    },
    table: {
      widthConfig: {
        SEL: [12, 12, 12, 15, 24, 25],
        ELECTRO: [5, 5, 5, 5, 80],
        AREVA: [10, 10, 60, 15, 5],
      },
      mergeColumns: {
        SEL: [0, 1, 5], // DEVICE, RELAY, PN DESC
        AREVA: [0, 1], // DEVICE, RELAY
      },
      SEL_sortColumnIndex: 4,
      AREVA_sortColumnIndex: 2,
      headerReplacements: {
        ELEMENT: 'VENDER', // For 5-column tables (ELECTRO)
      },
    },
    messages: {
      queryCompleted: 'Query Completed',
      invalidFormat: 'Please use the correct format (e.g., ABC 12F123)!',
      inputPattern: 'Please follow the pattern: ABC 12F123',
      placeholder: '...ABC 12F123',
      noInServiceResults: 'No In Service Settings - Obtained ISSUED Settings instead.',
      noResults: 'No Settings Found',
      errorOccurred: 'An error occurred while processing the query.',
    },
    relayTypes: {
      SEL: 'SEL',
      ELECTRO: 'ELECTRO',
      AREVA: 'AREVA',
      UNKNOWN: 'unknown',
    },
  };

  /*
   * State management with proper encapsulation
   */
  const createState = () => ({ headerRow: null, tableRows: null, isProcessing: false, relayType: '' });

  let state = createState();

  /*
   * Enhanced DOM Utilities with better error handling and performance
   */
  const DOM = {
    /*
     * Creates a DOM element with options
     * @param {string} tag - HTML tag name
     * @param {Object} options - Element attributes and properties
     * @returns {HTMLElement}
     */
    createElement (tag, options = {}) {
      const element = document.createElement(tag);

      // Optimized property setters using a map
      const setters = {
        style: (el, val) => (el.style.cssText = val),
        textContent: (el, val) => (el.textContent = val),
        className: (el, val) => (el.className = val),
        onclick: (el, val) => (el.onclick = val),
        innerHTML: (el, val) => (el.innerHTML = val),
      };

      for (const [key, value] of Object.entries(options)) {
        const setter = setters[key];
        if (setter) {
          setter(element, value);
        } else {
          element.setAttribute(key, value);
        }
      }

      return element;
    },

    /*
     * Gets element by ID with error handling
     * @param {string} id - Element ID
     * @returns {HTMLElement|null}
     */
    getElement (id) {
      const element = document.getElementById(id);
      if (!element && id !== CONFIG.selectors.searchContainerId) {
        console.warn(`Element with id '${id}' not found`);
      }
      return element;
    },

    /*
     * Injects CSS styles into the document head
     */
    injectStyles () {
      if (document.getElementById(CONFIG.selectors.styleId)) return;

      const style = this.createElement('style', { id: CONFIG.selectors.styleId });
      style.textContent = `
        input:valid { ${CONFIG.styles.inputValid} }
        input:invalid { ${CONFIG.styles.inputInvalid} }
      `;
      document.head.appendChild(style);
    },

    /*
     * Shows warning message
     * @param {string} message - Warning message
     */
    showWarning (message) {
      const warningEl = this.getElement(CONFIG.selectors.warningId);
      if (warningEl) {
        warningEl.textContent = message;
      }
    },

    /*
     * Clears warning and removes previous results
     */
    clearWarning () {
      this.showWarning('');
      const container = document.getElementById(CONFIG.selectors.containerId);
      if (container) container.remove();

      const sqlEditor = document.getElementById(CONFIG.selectors.sqlEditorId);
      if (sqlEditor) sqlEditor.textContent = '';
    },
  };

  /*
   * AREVA Setting Decoder with optimized pattern matching
   */
  const AREVA_SettingDecoder = {
    phaseMap: [
      { type: 'PHS', pattern: /P(\.|\s|\.?\s)?PS1$/ },
      { type: 'GND', pattern: /N(\.|\s|\.?\s)?PS1$/ },
      { type: 'NEG', pattern: /NEG(\.|\s|\.?\s)?PS1$/ },
    ],

    definiteTimeMap: [
      { text: 'DTOC/I>', replacement: 'PHS Definite Time Pick Up (A)' },
      { text: 'DTOC/IN>', replacement: 'GND Definite Time Pick Up (A)' },
      { text: 'DTOC/INEG>', replacement: 'NEG Definite Time Pick Up (A)' },
      { text: 'DTOC/TI>', replacement: 'PHS Definite Time Delay (s)' },
      { text: 'DTOC/TIN>', replacement: 'GND Definite Time Delay (s)' },
      { text: 'DTOC/TINEG>', replacement: 'NEG Definite Time Delay (s)' },
    ],
    TimedMap: {
      IREF: 'Pick Up (A)',
      CHARACTER: 'Curve',
      FACTOR: 'Time Dial',
    },
    overCurrentMap: {
      IDMT1: 'Timed Overcurrent',
    },
    CTP: 0,

    /*
     * Decodes setting code to human-readable description
     * @param {string} code - Setting code
     * @param {string} setting - Setting value
     * @returns {Array<string>} [description, value]
     */
    decode (code, setting) {
      if (!code || typeof code !== 'string') return ['', ''];

      if (!setting || typeof setting !== 'string') return ['', ''];

      if (code.includes('INOM')) {
        this.CTP = Number(setting.split(' ')[0]) || 0;
        return ['CT Primary (A)'.toUpperCase(), this.CTP];
      }

      try {
        // Check definite time patterns first (most specific)
        for (const { text, replacement } of this.definiteTimeMap) {
          if (code.includes(text)) {
            return [replacement.toUpperCase(), this.getSettingNumber(setting).toString().replace(' s', '')];
          }
        }

        // Check phase patterns
        for (const { type, pattern } of this.phaseMap) {
          if (pattern.test(code)) {
            const suffix = this.getSuffixDescription(code, pattern);
            const overCurrent = code.includes('IDMT1') ? this.overCurrentMap.IDMT1 : '';
            const settingValue = this.getSettingNumber(setting);
            let decodedCode = [type, overCurrent, suffix].join(' ');

            if (String(settingValue).endsWith(' s')) {
              decodedCode += ' (s)';
            }

            return [decodedCode.toUpperCase(), settingValue.toString().replace(' s', '')];
          }
        }
      } catch (err) {
        console.error('Setting name decode error:', err);
      }

      console.warn('No match found for code:', code);
      return ['', ''];
    },

    /*
     * Gets setting number with INOM conversion
     * @param {string} setting - Setting value
     * @returns {string|number} Converted setting
     */
    getSettingNumber (setting) {
      if (setting.toUpperCase().includes('INOM')) {
        const value = Number(setting.split(' ')[0]) || 0;
        return Math.round(value * this.CTP, 0);
      }
      return setting;
    },

    /*
     * Gets suffix description from code
     * @param {string} code - Setting code
     * @param {RegExp} pattern - Phase pattern
     * @returns {string} Suffix description
     */
    getSuffixDescription (code, pattern) {
      if (code.includes('IREF')) return this.TimedMap.IREF;

      if (code.includes('CHARACTER')) return this.TimedMap.CHARACTER;

      if (code.includes('FACTOR')) return this.TimedMap.FACTOR;

      const parts = code.split('/');
      return parts[parts.length - 1]?.replace(pattern, '').trim() || '';
    },
  };

  /*
   * Enhanced Setting Name Decoder with optimized pattern matching
   */
  const SEL_SettingDecoder = {
    curveMap: {
      1: '(Moderately Inverse)',
      2: '(Inverse)',
      3: '(Very Inverse)',
      4: '(Extremely Inverse)',
    },
    phaseMap: {
      G: 'GND',
      P: 'PHS',
      Q: 'NEG',
      N: 'GND',
    },
    suffixMap: {
      P: 'Pick Up (A)',
      C: 'Curve',
      TD: 'Time Dial',
      TC: 'Torque Control',
      L: 'Low Set (A)',
      H: 'High Set (A)',
    },
    definiteTimePatterns: [
      { pattern: /^50P[234]/, replacement: 'Definite Time Pick Up (A)' },
      { pattern: /^67P[234]/, replacement: 'Definite Time Delay (s)' },
    ],
    overCurrentPatterns: [
      { pattern: /^50/, replacement: 'Inst. Overcurrent' },
      { pattern: /^51/, replacement: 'Timed Overcurrent' },
    ],
    specialPatterns: {
      liveLine: /^50[PG]5/,
      tripEquation: /^SV\d?\w+/,
    },

    /*
     * Decodes setting code to human-readable description
     * @param {string} code - Setting code
     * @param {string} setting - Setting value
     * @returns {Array<string>} [description, value]
     */
    decode (code, setting) {
      if (!code || typeof code !== 'string' || !setting || typeof setting !== 'string') {
        return ['', ''];
      }

      try {
        // Check definite time patterns first
        for (const { pattern, replacement } of this.definiteTimePatterns) {
          if (pattern.test(code)) {
            return [[this.getBaseDescription(code), replacement].join(' '), setting];
          }
        }

        // Check overcurrent patterns
        for (const { pattern, replacement } of this.overCurrentPatterns) {
          if (pattern.test(code)) {
            const base = this.getBaseDescription(code);
            const suffix = this.getSuffixDescription(code);
            let finalSetting = setting;

            if (suffix.includes('Curve') && setting in this.curveMap) {
              finalSetting = [setting, this.curveMap[setting]].join(' ');
            }

            const liveLine = this.specialPatterns.liveLine.test(code) ? '(Live Line)' : '';
            return [[base, replacement, suffix, liveLine].join(' '), finalSetting];
          }
        }
        // Check special trip equation pattern
        if (this.specialPatterns.tripEquation.test(code)) {
          return ['_Trip Equation', setting];
        }
      } catch (err) {
        console.error('Setting name decode error:', err);
      }

      return ['', ''];
    },

    /*
     * Gets base phase description from code
     * @param {string} code - Setting code
     * @returns {string} Phase description
     */
    getBaseDescription (code) {
      const thirdChar = code.charAt(2);
      return this.phaseMap[thirdChar] ?? 'PHS';
    },

    /*
     * Gets suffix description from code
     * @param {string} code - Setting code
     * @returns {string} Suffix description
     */
    getSuffixDescription (code) {
      const last2 = code.slice(-2);
      const last1 = code.slice(-1);
      return this.suffixMap[last2] ?? this.suffixMap[last1] ?? '';
    },
  };

  /*
   * Optimized Table Renderer with better performance
   */
  const TableRenderer = {
    /*
     * Creates a complete table element
     * @param {Array<string>} headers - Table headers
     * @param {Array} data - Table data rows
     * @returns {HTMLTableElement}
     */
    createTable (headers, data) {
      const table = DOM.createElement('table', { style: CONFIG.styles.table });
      table.appendChild(this.createTableHead(headers));
      table.appendChild(this.createTableBody(data));
      return table;
    },

    /*
     * Creates table header row
     * @param {Array<string>} headers - Header names
     * @returns {HTMLTableSectionElement}
     */
    createTableHead (headers) {
      const thead = DOM.createElement('thead');
      const tr = DOM.createElement('tr');
      const columnCount = headers.length;

      for (let index = 0; index < headers.length; index++) {
        const displayHeader = this.getDisplayHeader(state.relayType, headers[index], columnCount);
        const width = this.getColumnWidth(state.relayType, columnCount, index);

        const th = DOM.createElement('th', {
          style: `${CONFIG.styles.tableHeader} width: ${width}vw`,
          textContent: displayHeader,
        });

        tr.appendChild(th);
      }

      thead.appendChild(tr);
      return thead;
    },

    /*
     * Gets display header name with replacements
     * @param {string} relayType - Relay type (SEL, ELECTRO, AREVA)
     * @param {string} header - Original header
     * @param {number} columnCount - Total column count
     * @returns {string} Display header
     */
    getDisplayHeader (relayType, header, columnCount) {
      return relayType === 'ELECTRO' && columnCount === 5 && header === 'ELEMENT'
        ? CONFIG.table.headerReplacements.ELEMENT
        : header;
    },

    /*
     * Creates table body with data rows
     * @param {Array} data - Table data
     * @returns {HTMLTableSectionElement}
     */
    createTableBody (data) {
      const tbody = DOM.createElement('tbody');

      for (const row of data) {
        const tr = DOM.createElement('tr');
        const rowData = Array.isArray(row) ? row : Object.values(row);

        for (const cell of rowData) {
          const cellData = typeof cell === 'object' ? cell.value : cell;
          const td = DOM.createElement('td', {
            style: CONFIG.styles.tableCell,
            textContent: cellData,
          });

          if (typeof cell === 'object' && cell.rowspan > 1) {
            td.rowSpan = cell.rowspan;
          }

          tr.appendChild(td);
        }

        tbody.appendChild(tr);
      }

      return tbody;
    },

    /*
     * Swaps two columns in an array
     * @param {Array} array - Array to modify
     * @param {number} index1 - First index
     * @param {number} index2 - Second index
     */
    swapColumns (array, index1, index2) {
      [array[index1], array[index2]] = [array[index2], array[index1]];
    },

    /*
     * Merges consecutive identical cells in specified columns
     * Optimized algorithm with reduced memory allocation
     * @param {Array<Array>} rows - Table rows
     * @returns {Array<Array>} Rows with merged cell information
     */
    mergeConsecutiveCells (rows) {
      if (!rows.length) return rows;

      const mergeColumns = CONFIG.table.mergeColumns[state.relayType];
      if (!mergeColumns?.length) return rows;

      const rowCount = rows.length;
      const colCount = rows[0].length;

      // Track merged rows more efficiently
      const mergedRows = [];
      const skipMap = new Set();

      // Process each mergeable column
      for (const col of mergeColumns) {
        if (col >= colCount) continue;

        let currentValue = rows[0][col];
        let startRow = 0;
        let count = 1;

        for (let row = 1; row <= rowCount; row++) {
          const isLastRow = row === rowCount;
          const isSameValue = !isLastRow && rows[row][col] === currentValue;

          if (isSameValue) {
            count++;
          } else {
            // Mark rows to skip if merged
            if (count > 1) {
              for (let i = startRow + 1; i < startRow + count; i++) {
                skipMap.add(`${i}-${col}`);
              }
            }

            if (!isLastRow) {
              currentValue = rows[row][col];
              startRow = row;
              count = 1;
            }
          }
        }
      }

      // Build merged rows
      for (let row = 0; row < rowCount; row++) {
        const newRow = [];
        for (let col = 0; col < colCount; col++) {
          const skipKey = `${row}-${col}`;

          if (!skipMap.has(skipKey)) {
            // Count rowspans for this cell
            let rowspan = 1;
            for (let mergeCol of mergeColumns) {
              if (mergeCol === col) {
                for (let r = row + 1; r < rowCount; r++) {
                  if (rows[r][col] === rows[row][col]) {
                    rowspan++;
                  } else {
                    break;
                  }
                }
                break;
              }
            }
            newRow.push({ value: rows[row][col], rowspan, colspan: 1 });
          }
        }
        if (newRow.length > 0) {
          mergedRows.push(newRow);
        }
      }

      return mergedRows;
    },

    /*
     * Gets column width based on relay type
     * @param {string} relayType - Relay type
     * @param {number} columnCount - Total columns
     * @param {number} index - Column index
     * @returns {number} Column width in vw
     */
    getColumnWidth (relayType, columnCount, index) {
      return CONFIG.table.widthConfig[relayType]?.[index] || 100 / columnCount;
    },

    /*
     * Renders table to container
     * @param {container} object - Container element ID
     * @param {Array<string>} headers - Table headers
     * @param {Array} data - Table data
     */
    render (container, headers, data) {
      if (!container) return;

      const table = this.createTable(headers, data);
      container.innerHTML = '';
      container.appendChild(table);
    },

    /*
     * Hides original query result grid
     */
    removeOriginal () {
      const results = DOM.getElement(CONFIG.selectors.resultGridId);
      if (results) results.style.display = 'none';

      const grid = document.getElementsByClassName(CONFIG.selectors.resultGridClass)[0];
      if (grid) grid.style.display = 'none';

      const main = document.querySelector(`.${CONFIG.selectors.mainAppClass}`);
      if (main) main.setAttribute('style', 'min-height: auto');
    },

    /*
     * Downloads table as HTML file
     * @param {string} filename - Filename without extension
     * @param {Array<string>} headers - Table headers
     * @param {Array} data - Table data
     */
    downloadAsHtml (filename, headers, data) {
      const tableHtml = this.createTable(headers, data).outerHTML;
      const currentDate = new Date();
      const fullHtml = `<!DOCTYPE html>
      <html>
      <head>
          <title>${filename}</title>
          <style>
              body { font-family: monospace; font-size: 12px; }
          </style>
      </head>
      <body>
          <h2>Protection Settings - ${filename} - ${currentDate.toLocaleDateString()}</h2>
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

  /*
   * Data Processing with optimized state management
   */
  const DataProcessor = {
    /*
     * Main processing function for query results.
     * Validates through hasRequiredGlobals() and hasValidResults().
     * @returns {Promise<boolean>} true if results were valid and rendered
     */
    async processResults () {
      try {
        if (!this.hasRequiredGlobals()) {
          DOM.showWarning(CONFIG.messages.errorOccurred);
          return false;
        }

        this.updateStateFromGlobals();

        if (!this.hasValidResults()) {
          return false;
        }

        this.detectRelayType();
        const feederId = this.extractFeederId();

        this.addDescriptionColumn();
        this.renderTable();

        this.setupDownloadButton(feederId);
        TableRenderer.removeOriginal();
        DOM.showWarning(CONFIG.messages.queryCompleted);

        return this.hasValidResults();
      } catch (err) {
        console.error('Results processing error:', err);
        DOM.showWarning(CONFIG.messages.errorOccurred);
        return false;
      }
    },

    /*
     * Checks if required global objects exist
     * @returns {boolean}
     */
    hasRequiredGlobals () {
      return !!(window.cvAvailableTableFields?._ncc && window._C1MVCCtrl5?._ncc);
    },

    hasValidResults () {
      if (Array.isArray(state.tableRows) && state.tableRows.length > 0) {
        return true;
      }
      if (window.resultGrid && Array.isArray(window.resultGrid._rows)) {
        return window.resultGrid._rows.length > 0;
      }
      return false;
    },

    /*
     * Updates state from global query result objects
     */
    updateStateFromGlobals () {
      state.headerRow = Array.from(window.cvAvailableTableFields?._ncc ?? []);
      state.tableRows = Array.from(window._C1MVCCtrl5?._ncc ?? []);
    },

    /*
     * Detects relay type from table data
     */
    detectRelayType () {
      if (!state.tableRows?.length) {
        state.relayType = CONFIG.relayTypes.UNKNOWN;
        return;
      }

      const firstRow = state.tableRows[0];
      const relayTypeCell = Array.isArray(firstRow) ? firstRow[1] : Object.values(firstRow)[1];
      const upperRelayType = String(relayTypeCell ?? '').toUpperCase();

      state.relayType =
        [
          { type: CONFIG.relayTypes.SEL, includes: CONFIG.relayTypes.SEL },
          { type: CONFIG.relayTypes.ELECTRO, includes: CONFIG.relayTypes.ELECTRO },
          { type: CONFIG.relayTypes.AREVA, includes: CONFIG.relayTypes.AREVA },
        ].find(entry => upperRelayType.includes(entry.includes))?.type ?? CONFIG.relayTypes.UNKNOWN;
    },

    /*
     * Adds description column for SEL/AREVA relays and applies decoders
     */
    addDescriptionColumn () {
      if (!state.tableRows?.length || !state.headerRow?.length) return;

      // Add description column header for SEL
      if (state.relayType === CONFIG.relayTypes.SEL) {
        state.headerRow.push({ Key: '5', Table: '', Name: 'PN ELEMENT DESC', Alias: null });
        TableRenderer.swapColumns(state.headerRow, 4, 5);
      }

      // Process rows with appropriate decoders
      state.tableRows.forEach((row, idx) => {
        const rowArray = Array.isArray(row) ? [...row] : Object.values(row);

        if (state.relayType === CONFIG.relayTypes.SEL) {
          const [decodedCode, decodedSetting] = SEL_SettingDecoder.decode(rowArray[2], rowArray[3]);
          rowArray[5] = decodedCode;
          rowArray[3] = decodedSetting;
          TableRenderer.swapColumns(rowArray, 4, 5);
        } else if (state.relayType === CONFIG.relayTypes.AREVA) {
          const [decodedCode, decodedSetting] = AREVA_SettingDecoder.decode(rowArray[2], rowArray[3]);
          rowArray[2] = decodedCode;
          rowArray[3] = decodedSetting;
        }

        state.tableRows[idx] = rowArray;
      });

      // Sort by setting value column
      const columnIndex =
        state.relayType === CONFIG.relayTypes.SEL
          ? CONFIG.table.SEL_sortColumnIndex
          : state.relayType === CONFIG.relayTypes.AREVA
          ? CONFIG.table.AREVA_sortColumnIndex
          : null;

      if (columnIndex !== null) {
        state.tableRows.sort((a, b) => String(a[columnIndex] ?? '').localeCompare(String(b[columnIndex] ?? '')));
      }
    },

    /*
     * Extracts feeder ID from first row
     * @returns {string} Feeder ID
     */
    extractFeederId () {
      if (!state.tableRows?.length) return 'unknown';

      const firstRow = state.tableRows[0];
      const firstCell = (Array.isArray(firstRow) ? firstRow[0] : Object.values(firstRow)[0]) ?? '';
      const parts = String(firstCell).split(' ');

      return parts.slice(0, 2).join(' ') || 'unknown';
    },

    /*
     * Renders the processed table
     */
    renderTable () {
      const headers = state.headerRow?.map(header => header.Name) ?? [];

      if ([CONFIG.relayTypes.SEL, CONFIG.relayTypes.AREVA].includes(state.relayType)) {
        state.tableRows = TableRenderer.mergeConsecutiveCells(state.tableRows);
      }

      const container = document.getElementById(CONFIG.selectors.containerId) ?? TableManager.createContainer();
      TableRenderer.render(container, headers, state.tableRows);
    },

    /*
     * Sets up download button
     * @param {string} feederId - Feeder ID for filename
     */
    setupDownloadButton (feederId) {
      const container = document.getElementById(CONFIG.selectors.containerId);
      if (!container) return;

      const downloadBtn = TableManager.createDownloadButton(feederId);
      container.insertBefore(DOM.createElement('br'), container.firstChild);
      container.insertBefore(DOM.createElement('br'), container.firstChild);
      container.insertBefore(downloadBtn, container.firstChild);
    },

    /*
     * Shows completion alert
     */
  };

  /*
   * Table Manager for container management
   */
  const TableManager = {
    /*
     * Creates table container element
     * @returns {HTMLElement}
     */
    createContainer () {
      const container = DOM.createElement('div', {
        id: CONFIG.selectors.containerId,
        style: CONFIG.styles.container,
      });
      document.body.appendChild(container);
      return container;
    },

    /*
     * Creates download button
     * @param {string} filename - Filename for download
     * @returns {HTMLButtonElement}
     */
    createDownloadButton (filename) {
      const downloadBtn = DOM.createElement('button', {
        className: CONFIG.classes.button,
        textContent: 'Download',
        onclick: () => {
          const headers = state.headerRow.map(header => header.Name);
          TableRenderer.downloadAsHtml(filename, headers, state.tableRows);
        },
      });

      return downloadBtn;
    },
  };

  /*
   * Optimized Search Component
   */
  const SearchComponent = {
    /*
     * Initializes search component
     */
    init () {
      try {
        this.injectExternalDependencies();
        this.createSearchBar();
        this.attachEventHandlers();
      } catch (err) {
        console.error('Search component initialization error:', err);
      }
    },

    /*
     * Injects external dependencies if available
     */
    injectExternalDependencies () {
      const sqlEditorSection = DOM.getElement(CONFIG.selectors.sqlEditorSectionId);
      if (typeof window.switchEditor === 'function' && sqlEditorSection && sqlEditorSection.style.display === 'none') {
        window.switchEditor();
      }
    },

    /*
     * Creates search bar UI
     */
    createSearchBar () {
      const searchContainer = DOM.getElement(CONFIG.selectors.searchContainerId);
      if (searchContainer) {
        return;
      }
      const wrapper = DOM.createElement('div', {
        id: CONFIG.selectors.searchContainerId,
        className: 'input-group',
        style: CONFIG.styles.wrapper,
      });

      const input = DOM.createElement('input', {
        type: 'text',
        id: CONFIG.selectors.inputId,
        placeholder: CONFIG.messages.placeholder,
        className: CONFIG.classes.input,
        pattern: CONFIG.patterns.searchInput.source,
        title: CONFIG.messages.inputPattern,
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

    /*
     * Attaches event handlers to search elements
     */
    attachEventHandlers () {
      const button = DOM.getElement(CONFIG.selectors.buttonId);
      const input = DOM.getElement(CONFIG.selectors.inputId);

      if (!button || !input) return;

      button.addEventListener('click', () => this.handleSearch(input));
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') this.handleSearch(input);
      });
      input.addEventListener('input', () => {
        input.value = input.value.toUpperCase();
      });
    },

    /*
     * Handles search action
     * @param {HTMLInputElement} inputEl - Input element
     */
    async handleSearch (inputEl) {
      if (state.isProcessing) return;

      DOM.clearWarning();

      const rawValue = inputEl.value.trim().toUpperCase();

      if (!this.validateInput(rawValue)) {
        DOM.showWarning(CONFIG.messages.invalidFormat);
        return;
      }

      await this.executeSearch(rawValue);
    },

    /*
     * Validates input against pattern
     * @param {string} value - Input value
     * @returns {boolean}
     */
    validateInput (value) {
      return CONFIG.patterns.searchInput.test(value);
    },

    /*
     * Returns a promise that resolves after query delay
     * @returns {Promise<void>}
     */
    waitForQueryResults () {
      return new Promise(resolve => setTimeout(resolve, CONFIG.sql.queryDelay));
    },

    /*
     * Executes search query with sequential async flow
     * @param {string} searchValue - Search value
     */
    async executeSearch (searchValue) {
      state.isProcessing = true;
      try {
        const start = performance.now();
        this.executeQuery(searchValue);
        await this.waitForQueryResults();

        const validAfterFirst = await DataProcessor.processResults();
        if (validAfterFirst) {
          const end = performance.now();
          console.log(`Query executed and results processed in:【${(end - start) / 1000}】seconds`);
          return;
        }

        DOM.showWarning(CONFIG.messages.noInServiceResults);
        this.executeQuery(searchValue, CONFIG.sql.settingStatus.issued);
        await this.waitForQueryResults();

        const secondAttemptSuccess = await DataProcessor.processResults();
        if (!secondAttemptSuccess) {
          DOM.showWarning(CONFIG.messages.noResults);
        }
        const end = performance.now();
        console.log(`Query executed and results processed in:【${(end - start) / 1000}】seconds`);
      } catch (err) {
        console.error('Search execution error:', err);
      } finally {
        state.isProcessing = false;
      }
    },

    executeQuery (searchValue, status = CONFIG.sql.settingStatus.inService) {
      const sql = SQL.generate(searchValue, status);
      this.displaySql(sql);
      if (typeof window.runQuery === 'function') {
        window.runQuery();
      }
    },

    /*
     * Displays SQL in editor
     * @param {string} sql - SQL query
     */
    displaySql (sql) {
      const sqlEditor = DOM.getElement(CONFIG.selectors.sqlEditorId);
      if (sqlEditor) {
        sqlEditor.textContent = sql;
      }
    },
  };

  /*
   * Optimized SQL Utilities with cached fragments
   */
  const SQL = {
    // Cache compiled fragments
    _cache: {},
    /*
     * Minifies SQL by removing comments and extra whitespace
     * @param {string} sql - SQL query
     * @returns {string} Minified SQL
     */
    /*     minify (sql) {
      if (!sql?.trim()) return '';

      return sql
        .replace(/--.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }, */
    /*
     * Generates SQL query for given input code
     * @param {string} inputCode - Device code (e.g., 'ABC 12F123')
     * @param {string} status - Query status (IN SERVICE or ISSUED)
     * @returns {string} Generated SQL query
     */
    generate (inputCode, status = CONFIG.sql.settingStatus.inService) {
      if (!inputCode) return '';

      // Build cache key
      const cacheKey = `${inputCode}-${status}`;
      if (this._cache[cacheKey]) {
        return this._cache[cacheKey];
      }

      // Pre-compute SQL fragments
      const settingsList = CONFIG.sql.settingNames.map(name => `'${name}'`).join(',');
      const excludedSettings = CONFIG.sql.excludedArevaSettings.map(name => `'${name}'`).join(',');
      const baseCondition = `R.S01 LIKE '${inputCode}%'`;
      const lobLength = CONFIG.sql.dbmsLobLength;

      const sql = `
        SELECT
          R.S01 AS DEVICE,
          Q.RELAYTYPE AS RELAY,
          T.SETTINGNAME AS ELEMENT,
          CASE
            WHEN T.SETTINGNAME NOT LIKE '%C'
            AND T.SETTINGNAME NOT LIKE '%D'
            AND S.GROUPNAME = '1'
            AND DBMS_LOB.SUBSTR(S.SETTING, ${lobLength}) <> 'OFF' THEN UPPER(
              TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLength})) * (
                SELECT TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLength})) AS CTR
                FROM TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q
                WHERE ${baseCondition}
                  AND R.RELAYTYPE LIKE 'SEL%'
                  AND R.ID = Q.RELAYID
                  AND Q.ID = S.REQUESTID
                  AND T.RELAYTYPE = Q.RELAYTYPE
                  AND T.ROWNUMBER = S.ROWNUMBER
                  AND S.GROUPNAME = '1'
                  AND T.SETTINGNAME = 'CTR'
                  AND UPPER(Q.S02) = '${status}'
              )
            )
            WHEN T.SETTINGNAME LIKE '67%D'
            AND S.GROUPNAME = '1'
            AND DBMS_LOB.SUBSTR(S.SETTING, ${lobLength}) <> 'OFF' THEN UPPER(
              TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLength})) / 60
            )
            ELSE DBMS_LOB.SUBSTR(S.SETTING, ${lobLength})
          END AS SETTING,
          Q.M01 AS MEMO
        FROM TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q
        WHERE ${baseCondition}
          AND R.RELAYTYPE LIKE 'SEL%'
          AND R.ID = Q.RELAYID
          AND Q.ID = S.REQUESTID
          AND T.RELAYTYPE = Q.RELAYTYPE
          AND T.ROWNUMBER = S.ROWNUMBER
          AND UPPER(Q.S02) = '${status}'
          AND (
            (S.GROUPNAME = '1' AND T.SETTINGNAME IN (${settingsList}))
            OR (
              S.GROUPNAME = 'L1' AND (
                T.SETTINGNAME LIKE (
                  SELECT S.SETTING AS TR
                  FROM TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q
                  WHERE ${baseCondition}
                    AND R.RELAYTYPE LIKE 'SEL%'
                    AND R.ID = Q.RELAYID
                    AND Q.ID = S.REQUESTID
                    AND T.RELAYTYPE = Q.RELAYTYPE
                    AND T.ROWNUMBER = S.ROWNUMBER
                    AND S.GROUPNAME = 'L1'
                    AND T.SETTINGNAME = 'TR'
                    AND UPPER(Q.S02) = '${status}'
                )
                OR T.SETTINGNAME IN ('51P1TC', '51PTC')
              )
            )
          )
        UNION ALL
        SELECT
          R.S01 AS DEVICE,
          Q.RELAYTYPE AS RELAY,
          R.S06 AS VENDER,
          TO_CHAR(R.S04) AS MODEL,
          Q.M01 AS MEMO
        FROM TRELAY R, TREQUEST Q
        WHERE ${baseCondition}
          AND UPPER(R.RELAYTYPE) LIKE 'ELECTRO%'
          AND R.ID = Q.RELAYID
          AND UPPER(Q.S02) = '${status}'
        UNION ALL
        SELECT
          R.S01 AS DEVICE,
          Q.RELAYTYPE AS RELAY,
          T.SETTINGNAME AS ELEMENT,
          TO_CHAR(S.SETTING) AS SETTING,
          Q.M01 AS MEMO
        FROM TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q
        WHERE ${baseCondition}
          AND R.RELAYTYPE LIKE 'AREVA%'
          AND R.ID = Q.RELAYID
          AND Q.ID = S.REQUESTID
          AND T.RELAYTYPE = Q.RELAYTYPE
          AND T.ROWNUMBER = S.ROWNUMBER
          AND UPPER(Q.S02) = '${status}'
          AND S.GROUPNAME = 'PARAMETERS'
          AND (
            T.SETTINGNAME LIKE 'FUNCTION PARAMETERS/PARAMETER SUBSET 1/IDMT1%'
            OR T.SETTINGNAME LIKE 'FUNCTION PARAMETERS/PARAMETER SUBSET 1/DTOC%'
            OR T.SETTINGNAME LIKE 'FUNCTION PARAMETERS/GLOBAL/MAIN/INOM C.T. PRIM.%'
          )
          AND UPPER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLength})) != 'BLOCKED'
          AND T.SETTINGNAME NOT IN (${excludedSettings})
      `;

      // Cache the result
      this._cache[cacheKey] = sql;
      return sql;
    },
  };

  /*
   * Public API - Exposed for external use
   */
  window.AspenQuery = Object.freeze({
    addSearchBar: () => SearchComponent.init(),
    decodeSELSettingName: SEL_SettingDecoder.decode.bind(SEL_SettingDecoder),
    decodeAREVASettingName: AREVA_SettingDecoder.decode.bind(AREVA_SettingDecoder),
    processResults: DataProcessor.processResults.bind(DataProcessor),
    getSqlText: SQL.generate,
    TableRenderer,
    createTableContainer: TableManager.createContainer.bind(TableManager),
    getState: () => ({
      ...state,
    }),
    CONFIG,
  });

  // Initialize the application
  SearchComponent.init();
})();
