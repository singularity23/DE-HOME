javascript: (function () {
  'use strict';

  // ============================================================================
  // CONFIGURATION & CONSTANTS
  // ============================================================================

  const CONFIG = {
    // DOM Element IDs and Classes
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

    // Input validation patterns
    patterns: {
      searchInput: /^\w{3}\s(4|12|25|35)[fF]\d{2,3}\w?$/i,
    },

    // CSS class names
    classes: {
      input: 'text-uppercase app-search app-wj-search wj-control wj-content mr-2 pl-3',
      button: 'btn app-btn app-btn-outline-primary mr-2',
    },

    // SQL-related configuration
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
      timeout: 15000,
      pollInterval: 100,
      queryStartDelay: 300,
    },

    // Table layout configuration
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
      sortColumnIndex: {
        SEL: 4,
        AREVA: 2,
      },
      headerReplacements: {
        ELEMENT: 'VENDER', // For 5-column ELECTRO tables
      },
    },

    // User-facing messages
    messages: {
      queryCompleted: 'Query Completed',
      invalidFormat: 'Please use the correct format (e.g., ABC 12F123)!',
      inputPattern: 'Please follow the pattern: ABC 12F123',
      placeholder: '...ABC 12F123',
      noInServiceResults: 'No In Service Settings - Obtained ISSUED Settings instead.',
      noResults: 'No Settings Found',
      errorOccurred: 'An error occurred while processing the query.',
    },

    // Relay type constants
    relayTypes: {
      SEL: 'SEL',
      ELECTRO: 'ELECTRO',
      AREVA: 'AREVA',
      UNKNOWN: 'unknown',
    },

    // Cached set for fast relay type lookups
    _relayTypeSet: null,
    get relayTypeSet () {
      if (!this._relayTypeSet) {
        this._relayTypeSet = new Set(['SEL', 'ELECTRO', 'AREVA']);
      }
      return this._relayTypeSet;
    },
  };

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  /*
   * Application state object
   * @typedef {Object} AppState
   * @property {Array|null} headerRow - Table header row data
   * @property {Array|null} tableRows - Query result rows
   * @property {boolean} isProcessing - Whether a query is currently executing
   * @property {string} relayType - Detected relay type (SEL, ELECTRO, AREVA)
   */
  const state = {
    headerRow: null,
    tableRows: null,
    isProcessing: false,
    relayType: '',
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /*
   * Safe property getter with default value
   */
  const safeGet = (obj, path, defaultValue = null) => {
    try {
      return path.split('.').reduce((acc, part) => acc?.[part], obj) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  };

  /*
   * Converts array-like object to array (optimized)
   */
  const toArray = row => {
    if (!row) return [];
    if (Array.isArray(row)) return row;
    if (row?.length !== undefined) return Array.from(row);
    if (typeof row === 'object') return Object.values(row);
    return [];
  };

  /*
   * Validates if object has array with elements
   */
  const hasElements = arr => Array.isArray(arr) && arr.length > 0;

  /*
   * Formats performance time for logging
   */
  const formatTime = milliseconds => (milliseconds / 1000).toFixed(2);

  // ============================================================================
  // DOM UTILITIES
  // ============================================================================

  const DOM = {
    // Cached setter map for createElement optimization
    _setters: {
      style: (el, val) => (el.style.cssText = val),
      textContent: (el, val) => (el.textContent = val),
      className: (el, val) => (el.className = val),
      onclick: (el, val) => (el.onclick = val),
      innerHTML: (el, val) => (el.innerHTML = val),
    },

    /*
     * Creates a DOM element with properties and attributes (optimized)
     * @param {string} tag - HTML tag name
     * @param {Object} options - Element options
     * @returns {HTMLElement}
     */
    createElement (tag, options = {}) {
      const element = document.createElement(tag);

      Object.entries(options).forEach(([key, value]) => {
        const setter = this._setters[key];
        setter ? setter(element, value) : element.setAttribute(key, value);
      });

      return element;
    },

    /*
     * Gets element by ID with optional logging
     * @param {string} id - Element ID
     * @param {boolean} silent - Suppress warning if not found
     * @returns {HTMLElement|null}
     */
    getElement (id, silent = false) {
      const element = document.getElementById(id);
      if (!element && !silent) {
        console.warn(`Element with id '${id}' not found`);
      }
      return element;
    },

    /*
     * Shows warning message to user
     * @param {string} message - Message text
     */
    showWarning (message) {
      const warningEl = this.getElement(CONFIG.selectors.warningId, true);
      if (warningEl) {
        warningEl.textContent = message;
      }
    },

    /*
     * Clears all messages and previous results
     */
    clearWarning () {
      this.showWarning('');
      const container = this.getElement(CONFIG.selectors.containerId, true);
      if (container) container.remove();

      const sqlEditor = this.getElement(CONFIG.selectors.sqlEditorId, true);
      if (sqlEditor) sqlEditor.textContent = '';
    },

    /*
     * Injects CSS for input validation styling
     */
    injectStyles () {
      if (this.getElement(CONFIG.selectors.styleId, true)) return;

      const style = this.createElement('style', { id: CONFIG.selectors.styleId });
      style.textContent = `
        input:valid { background-color: #dcf1da; }
        input:invalid { background-color: #fedad0; }
        .aspen-search-wrapper {
          padding: 10px;
          box-shadow: rgba(23, 43, 77, 0.1) 0px 2px 2px, rgba(23, 43, 77, 0.1) 2px 2px 2px;
          justify-content: center;
          z-index: 1000;
        }
        .aspen-warning { color: #fa4616; font-size: 0.9rem; margin: auto 5px; font-weight: bold; }
        .aspen-table { border-collapse: collapse; max-width: 100%; font-family: monospace; font-size: 12px; border: 1px solid #ddd; box-shadow: rgba(23, 43, 77, 0.1) 0px 2px 2px, rgba(23, 43, 77, 0.1) 2px 2px 2px; }
        .aspen-table th { padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #97979780; font-weight: bold; }
        .aspen-table td { padding: 6px; border: 1px solid #ddd; vertical-align: middle; white-space: pre-wrap; }
        .aspen-container { margin: 20px 0; padding: 10px; border: 1px solid #ccc; }
      `;
      document.head.appendChild(style);
    },
  };

  // ============================================================================
  // SETTING DECODERS
  // ============================================================================

  /*
   * AREVA Relay Setting Decoder (optimized)
   * Converts raw setting codes to human-readable descriptions
   */
  const AREVADecoder = {
    // Phase mapping (cached to avoid regex recreation)
    _phasePatterns: null,
    get phasePatterns () {
      if (!this._phasePatterns) {
        this._phasePatterns = [
          { type: 'PHS', pattern: /P(\.|\s|\.?\s)?PS1$/ },
          { type: 'GND', pattern: /N(\.|\s|\.?\s)?PS1$/ },
          { type: 'NEG', pattern: /NEG(\.|\s|\.?\s)?PS1$/ },
        ];
      }
      return this._phasePatterns;
    },

    // Definite time setting mappings
    definiteTime: [
      { text: 'DTOC/I>', desc: 'PHS Definite Time Pick Up (A)' },
      { text: 'DTOC/IN>', desc: 'GND Definite Time Pick Up (A)' },
      { text: 'DTOC/INEG>', desc: 'NEG Definite Time Pick Up (A)' },
      { text: 'DTOC/TI>', desc: 'PHS Definite Time Delay (s)' },
      { text: 'DTOC/TIN>', desc: 'GND Definite Time Delay (s)' },
      { text: 'DTOC/TINEG>', desc: 'NEG Definite Time Delay (s)' },
    ],

    // Suffix descriptions
    suffixMap: [
      {
        IREF: 'Pick Up (A)',
      },
      { CHARACTER: 'Curve' },
      { FACTOR: 'Time Dial' },
    ],

    // Overcurrent setting type
    overCurrentType: 'Timed Overcurrent',
    ctPrimary: 0,

    /*
     * Decodes AREVA setting code
     * @param {string} code - Setting code
     * @param {string|number} setting - Setting value
     * @returns {Array<string>} [description, value]
     */
    decode (code, setting) {
      if (!this._isValid(code, setting)) return ['', ''];

      try {
        // Handle CT primary current
        if (code.includes('INOM')) {
          this.ctPrimary = Number(setting.toString().split(' ')[0]) || 0;
          return ['CT PRIMARY (A)', this.ctPrimary];
        }

        // Check definite time patterns first
        const dtMatch = this.definiteTime.find(dt => code.includes(dt.text));
        if (dtMatch) {
          return [dtMatch.desc.toUpperCase(), this._parseSettingValue(setting)];
        }

        // Check phase patterns
        for (const { type, pattern } of this.phasePatterns) {
          if (pattern.test(code)) {
            return this._decodePhasePattern(code, pattern, type, setting);
          }
        }
      } catch (err) {
        console.error('AREVA decoder error:', err);
      }

      return ['', ''];
    },

    /*
     * Validates input parameters
     * @private
     */
    _isValid (code, setting) {
      return !!(code && typeof code === 'string' && setting);
    },

    /*
     * Parses setting value with INOM conversion
     * @private
     */
    _parseSettingValue (setting) {
      if (setting.toString().toUpperCase().includes('INOM')) {
        const value = Number(setting.toString().split(' ')[0]) || 0;
        return Math.round(value * this.ctPrimary);
      }
      return setting.toString();
    },

    /*
     * Decodes phase-specific pattern
     * @private
     */
    _decodePhasePattern (code, pattern, type, setting) {
      const suffix = this._getSuffix(code, pattern);
      const isTimed = code.includes('IDMT1');
      const description = [type, isTimed ? this.overCurrentType : '', suffix].filter(Boolean).join(' ').toUpperCase();

      let value = this._parseSettingValue(setting);
      if (value.toString().endsWith(' s')) {
        value = value.toString().replace(' s', '');
      }
      return [description, value];
    },

    /*
     * Gets suffix description from code
     * @private
     */
    _getSuffix (code, pattern) {
      for (const { key, value } of this.suffixMap) {
        if (code.includes(key)) return value;
      }
      const parts = code.split('/');
      return parts[parts.length - 1]?.replace(pattern, '').trim() || '';
    },
  };

  /*
   * SEL Relay Setting Decoder (optimized with cached patterns)
   * Converts SEL setting codes to human-readable descriptions
   */
  const SELDecoder = {
    // Curve type mappings
    curves: {
      1: '(Moderately Inverse)',
      2: '(Inverse)',
      3: '(Very Inverse)',
      4: '(Extremely Inverse)',
    },

    // Phase type mappings
    phases: {
      G: 'GND',
      P: 'PHS',
      Q: 'NEG',
      N: 'GND',
    },

    // Setting suffix mappings
    suffixes: {
      P: 'Pick Up (A)',
      C: 'Curve',
      TD: 'Time Dial',
      TC: 'Torque Control',
      L: 'Low Set (A)',
      H: 'High Set (A)',
    },

    // Cached pattern lists
    _definiteTime: null,
    _overCurrent: null,
    _liveLinePattern: null,
    _tripEquationPattern: null,

    get definiteTime () {
      return (this._definiteTime ??= [
        { pattern: /^50P[234]/, desc: 'Definite Time Pick Up (A)' },
        { pattern: /^67P[234]/, desc: 'Definite Time Delay (s)' },
      ]);
    },

    get overCurrent () {
      return (this._overCurrent ??= [
        { pattern: /^50/, desc: 'Inst. Overcurrent' },
        { pattern: /^51/, desc: 'Timed Overcurrent' },
      ]);
    },

    get liveLinePattern () {
      return (this._liveLinePattern ??= /^50[PG]5/);
    },

    get tripEquationPattern () {
      return (this._tripEquationPattern ??= /^SV\d?\w+/);
    },

    /*
     * Decodes SEL setting code
     * @param {string} code - Setting code
     * @param {string|number} setting - Setting value
     * @returns {Array<string>} [description, value]
     */
    decode (code, setting) {
      if (!this._isValid(code, setting)) return ['', ''];

      try {
        // Check definite time patterns first (most specific)
        for (const { pattern, desc } of this.definiteTime) {
          if (pattern.test(code)) {
            const base = this._getPhaseDescription(code);

            return [`${base} ${desc}`, setting];
          }
        }

        // Check overcurrent patterns
        for (const { pattern, desc } of this.overCurrent) {
          if (pattern.test(code)) {
            return this._decodeOverCurrent(code, desc, setting);
          }
        }

        // Check special trip equation pattern
        if (this.tripEquationPattern.test(code)) {
          return ['_Trip Equation', setting];
        }
      } catch (err) {
        console.error('SEL decoder error:', err);
      }

      return ['', ''];
    },

    /*
     * Validates input parameters
     * @private
     */
    _isValid (code, setting) {
      return !!(
        code &&
        typeof code === 'string' &&
        setting &&
        (typeof setting === 'string' || typeof setting === 'number')
      );
    },

    /*
     * Gets phase description from code
     * @private
     */
    _getPhaseDescription (code) {
      const thirdChar = code.charAt(2);
      return this.phases[thirdChar] ?? 'PHS';
    },

    /*
     * Gets suffix description from code
     * @private
     */
    _getSuffix (code) {
      const last2 = code.slice(-2);
      const last1 = code.slice(-1);
      return this.suffixes[last2] ?? this.suffixes[last1] ?? '';
    },

    /*
     * Decodes overcurrent setting
     * @private
     */
    _decodeOverCurrent (code, OC_desc, setting) {
      const phase = this._getPhaseDescription(code);
      const suffix = this._getSuffix(code);
      const isLiveLine = this.liveLinePattern.test(code);

      let finalSetting = setting.toString();
      if (suffix.includes('Curve') && setting in this.curves) {
        finalSetting = `${setting} ${this.curves[setting]}`;
      }

      const liveLine = isLiveLine ? '(Live Line)' : '';
      const description = [phase, OC_desc, suffix, liveLine].filter(Boolean).join(' ');

      return [description, finalSetting];
    },
  };

  // ============================================================================
  // TABLE RENDERER
  // ============================================================================

  const TableRenderer = {
    /*
     * Creates a complete HTML table from headers and data
     * @param {Array<string>} headers - Column headers
     * @param {Array} rows - Row data
     * @returns {HTMLTableElement}
     */
    createTable (headers, rows) {
      const table = DOM.createElement('table', { class: 'aspen-table' });
      table.appendChild(this._createHead(headers));
      table.appendChild(this._createBody(rows));
      return table;
    },
    /*
     * Swaps two columns in an array
     * @private
     */
    _swapColumns (array, index1, index2) {
      [array[index1], array[index2]] = [array[index2], array[index1]];
    },
    /*
     * Creates table header section
     * @private
     */
    _createHead (headers) {
      const thead = DOM.createElement('thead');
      const tr = DOM.createElement('tr');

      headers.forEach((header, index) => {
        const displayHeader = this._getDisplayHeader(header);
        const widthPercent = this._getColumnWidth(index, headers.length);
        const th = DOM.createElement('th', {
          style: `width: ${widthPercent}vw;`,
          textContent: displayHeader,
        });
        tr.appendChild(th);
      });

      thead.appendChild(tr);
      return thead;
    },

    /*
     * Creates table body section
     * @private
     */
    _createBody (rows) {
      const tbody = DOM.createElement('tbody');

      rows.forEach(row => {
        const tr = DOM.createElement('tr');

        const rowData = Array.isArray(row) ? row : Object.values(row);

        rowData.forEach(cell => {
          const content = typeof cell === 'object' ? cell.value : cell;
          const td = DOM.createElement('td', {
            textContent: content,
            class: 'aspen-cell',
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

    /*
     * Gets display header name (applies replacements)
     * @private
     */
    _getDisplayHeader (header) {
      if (state.relayType === CONFIG.relayTypes.ELECTRO && header === 'ELEMENT') {
        return CONFIG.table.headerReplacements.ELEMENT;
      }
      return header;
    },

    /*
     * Calculates column width in viewport units
     * @private
     */
    _getColumnWidth (index, columnCount) {
      const widths = CONFIG.table.widthConfig[state.relayType];
      return widths?.[index] ?? 100 / columnCount;
    },

    /*
     * Merges consecutive identical cells in specified columns (optimized)
     * @param {Array<Array>} rows - Table rows to merge
     * @returns {Array<Array>} Rows with merge information
     */
    mergeConsecutiveCells (rows) {
      if (!rows.length) return rows;

      const mergeColumns = CONFIG.table.mergeColumns[state.relayType];
      if (!mergeColumns?.length) return rows;

      const rowCount = rows.length;
      const colCount = rows[0].length;
      const mergeColSet = new Set(mergeColumns);
      const rowspanMap = new Map();

      // Pre-calculate all rowspans for merge columns in one pass
      for (const col of mergeColumns) {
        if (col >= colCount) continue;
        for (let row = 0; row < rowCount; row++) {
          let rowspan = 1;
          const cellValue = rows[row][col];
          // Skip if this cell is part of a merge from above
          let startFound = true;
          for (let prevRow = row - 1; prevRow >= 0; prevRow--) {
            if (rows[prevRow][col] === cellValue) {
              startFound = false;
              break;
            }
          }

          if (startFound) {
            // Count consecutive identical cells below
            for (let nextRow = row + 1; nextRow < rowCount; nextRow++) {
              if (rows[nextRow][col] === cellValue) {
                rowspan++;
              } else {
                break;
              }
            }
            rowspanMap.set(`${row}-${col}`, rowspan);
          }
        }
      }

      // Build merged rows
      return rows.map((row, rowIndex) => {
        return row
          .map((cell, colIndex) => {
            // Skip cells that are part of a rowspan from above
            if (mergeColSet.has(colIndex) && rowIndex > 0) {
              if (rows[rowIndex][colIndex] === rows[rowIndex - 1][colIndex]) {
                return null;
              }
            }

            const rowspan = rowspanMap.get(`${rowIndex}-${colIndex}`) || 1;

            return {
              value: cell,
              rowspan,
              colspan: 1,
            };
          })
          .filter(Boolean);
      });
    },

    /*
     * Renders table to container
     * @param {HTMLElement} container - Target container
     * @param {Array<string>} headers - Column headers
     * @param {Array} rows - Row data
     */
    render (container, headers, rows) {
      if (!container) return;

      const table = this.createTable(headers, rows);
      container.innerHTML = '';
      container.appendChild(table);
    },

    /*
     * Hides original query result grid
     */
    hideOriginalResults () {
      [CONFIG.selectors.resultGridId, CONFIG.selectors.resultGridClass].forEach(selector => {
        const el = selector.startsWith('#')
          ? DOM.getElement(selector.slice(1), true)
          : document.querySelector(`.${selector}`);
        if (el) el.style.display = 'none';
      });

      const main = document.querySelector(`.${CONFIG.selectors.mainAppClass}`);
      if (main) main.setAttribute('style', 'min-height: auto');
    },

    /*
     * Downloads table as HTML file
     * @param {string} filename - Base filename
     * @param {Array<string>} headers - Column headers
     * @param {Array} rows - Row data
     */
    downloadAsHtml (filename, headers, rows) {
      const tableHtml = this.createTable(headers, rows).outerHTML;
      const currentDate = new Date().toLocaleDateString();

      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8'>
  <title>${filename}</title>
  <style>
    body { font-family: monospace; font-size: 12px; padding: 20px; }
    h2 { margin-bottom: 20px; }
    table { border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #999; padding: 8px; text-align: left; }
    th { background-color: #f0f0f0; font-weight: bold; }
  </style>
</head>
<body>
  <h2>Protection Settings - ${filename} - ${currentDate}</h2>
  ${tableHtml}
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = DOM.createElement('a', {
        href: url,
        download: `${filename}.html`,
      });

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  };

  // ============================================================================
  // DATA PROCESSOR
  // ============================================================================

  const DataProcessor = {
    /*
     * Main processing pipeline for query results
     * @returns {Promise<boolean>} True if results were processed successfully
     */
    async processResults () {
      try {
        if (!this._validateGlobals()) return false;
        if (!this._loadState()) return false;

        this._detectRelayType();
        this._enhanceWithDecodings();

        const feederId = this._extractFeederId();
        this._renderResults();
        this._setupDownloadButton(feederId);
        TableRenderer.hideOriginalResults();
        DOM.showWarning(CONFIG.messages.queryCompleted);

        return true;
      } catch (err) {
        console.error('Results processing error:', err);
        DOM.showWarning(CONFIG.messages.errorOccurred);
        return false;
      }
    },

    /*
     * Validates required global objects exist
     * @private
     */
    _validateGlobals () {
      const hasFields = !!window.cvAvailableTableFields?._ncc;
      const hasResults = !!window._C1MVCCtrl5?._ncc;
      return hasFields && hasResults;
    },

    /*
     * Loads state from global query result objects
     * @private
     */
    _loadState () {
      state.headerRow = toArray(window.cvAvailableTableFields?._ncc);
      state.tableRows = toArray(window._C1MVCCtrl5?._ncc);

      if (hasElements(state.tableRows)) return true;
      if (window.resultGrid && hasElements(window.resultGrid._rows)) {
        return true;
      }
      return false;
    },

    /*
     * Detects relay type from first row of data (optimized)
     * @private
     */
    _detectRelayType () {
      if (!hasElements(state.tableRows)) {
        state.relayType = CONFIG.relayTypes.UNKNOWN;
        return;
      }

      const firstRow = state.tableRows[0];
      const relayCell = Array.isArray(firstRow) ? firstRow[1] : Object.values(firstRow)[1];
      const relayText = String(relayCell ?? '').toUpperCase();

      // Quick lookup using relay type set
      for (const type of CONFIG.relayTypeSet) {
        if (relayText.includes(type)) {
          state.relayType = type;
          return;
        }
      }

      state.relayType = CONFIG.relayTypes.UNKNOWN;
    },

    /*
     * Enhances table data with decoded setting descriptions
     * @private
     */
    _enhanceWithDecodings () {
      if (!hasElements(state.tableRows) || !hasElements(state.headerRow)) return;

      // Add description column for decodable types
      if (state.relayType === CONFIG.relayTypes.SEL) {
        state.headerRow.push({ Key: '5', Table: '', Name: 'PN ELEMENT DESC', Alias: null });
        TableRenderer._swapColumns(state.headerRow, 4, 5);
      }

      // Decode each row
      state.tableRows.forEach((row, idx) => {
        const rowArray = toArray(row);

        if (state.relayType === CONFIG.relayTypes.SEL) {
          const [desc, val] = SELDecoder.decode(rowArray[2], rowArray[3]);
          rowArray[5] = desc;
          rowArray[3] = val;
          TableRenderer._swapColumns(rowArray, 4, 5);
        } else if (state.relayType === CONFIG.relayTypes.AREVA) {
          const [desc, val] = AREVADecoder.decode(rowArray[2], rowArray[3]);
          rowArray[2] = desc;
          rowArray[3] = val;
        }

        state.tableRows[idx] = rowArray;
      });

      // Sort by appropriate column
      this._sortResults();
    },

    /*
     * Sorts results by setting column
     * @private
     */
    _sortResults () {
      const sortIdx = CONFIG.table.sortColumnIndex[state.relayType];
      if (sortIdx === undefined) return;

      state.tableRows.sort((a, b) => {
        const aVal = String(a[sortIdx] ?? '');
        const bVal = String(b[sortIdx] ?? '');
        return aVal.localeCompare(bVal);
      });
    },

    /*
     * Extracts feeder ID from first row's first cell
     * @private
     */
    _extractFeederId () {
      if (!hasElements(state.tableRows)) return 'unknown';

      const firstRow = state.tableRows[0];
      const firstCell = (Array.isArray(firstRow) ? firstRow[0] : Object.values(firstRow)[0]) ?? '';
      const parts = String(firstCell).split(' ');

      return parts.slice(0, 2).join(' ') || 'unknown';
    },

    /*
     * Renders processed table to page
     * @private
     */
    _renderResults () {
      const headers = state.headerRow?.map(h => h.Name) ?? [];

      // Apply cell merging if applicable
      if ([CONFIG.relayTypes.SEL, CONFIG.relayTypes.AREVA].includes(state.relayType)) {
        state.tableRows = TableRenderer.mergeConsecutiveCells(state.tableRows);
      }
      const container = TableManager.ensureContainer();
      TableRenderer.render(container, headers, state.tableRows);
    },

    /*
     * Adds download button to results
     * @private
     */
    _setupDownloadButton (feederId) {
      const container = DOM.getElement(CONFIG.selectors.containerId, true);
      if (!container) return;

      const btn = DOM.createElement('button', {
        className: CONFIG.classes.button,
        textContent: 'Download',
        onclick: () => {
          const headers = state.headerRow.map(h => h.Name);
          TableRenderer.downloadAsHtml(feederId, headers, state.tableRows);
        },
      });

      container.insertBefore(DOM.createElement('p'), container.firstChild);
      container.insertBefore(btn, container.firstChild);
    },
  };

  // ============================================================================
  // TABLE MANAGER
  // ============================================================================

  const TableManager = {
    /*
     * Ensures table container exists in DOM
     * @returns {HTMLElement}
     */
    ensureContainer () {
      let container = DOM.getElement(CONFIG.selectors.containerId, true);
      if (!container) {
        container = this.createContainer();
      }
      return container;
    },

    /*
     * Creates and appends table container element
     * @returns {HTMLElement}
     */
    createContainer () {
      const container = DOM.createElement('div', {
        id: CONFIG.selectors.containerId,
        class: 'aspen-container',
      });
      document.body.appendChild(container);
      return container;
    },
  };

  // ============================================================================
  // SEARCH COMPONENT
  // ============================================================================

  const SearchComponent = {
    /*
     * Initializes search component
     */
    init () {
      try {
        this._injectExternalDependencies();
        this._createSearchUI();
        this._attachEventHandlers();
      } catch (err) {
        console.error('Search component initialization error:', err);
      }
    },

    /*
     * Injects external dependencies if available
     * @private
     */
    _injectExternalDependencies () {
      const sqlSection = DOM.getElement(CONFIG.selectors.sqlEditorSectionId, true);
      if (typeof window.switchEditor === 'function' && sqlSection?.style.display === 'none') {
        window.switchEditor();
      }
    },

    /*
     * Creates search bar UI elements
     * @private
     */
    _createSearchUI () {
      if (DOM.getElement(CONFIG.selectors.searchContainerId, true)) {
        return; // Already exists
      }

      const wrapper = DOM.createElement('div', {
        id: CONFIG.selectors.searchContainerId,
        class: 'input-group aspen-search-wrapper',
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
        class: 'aspen-warning',
      });

      wrapper.append(input, button, warning);
      document.body.insertBefore(wrapper, document.body.firstChild);

      DOM.injectStyles();
    },

    /*
     * Attaches event handlers to search elements
     * @private
     */
    _attachEventHandlers () {
      const button = DOM.getElement(CONFIG.selectors.buttonId, true);
      const input = DOM.getElement(CONFIG.selectors.inputId, true);

      if (!button || !input) return;

      button.addEventListener('click', () => this._handleSearch(input));
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') this._handleSearch(input);
      });
      input.addEventListener('input', () => {
        input.value = input.value.toUpperCase();
      });
    },

    /*
     * Handles search action
     * @private
     */
    async _handleSearch (inputEl) {
      if (state.isProcessing) return;

      DOM.clearWarning();

      const searchValue = inputEl.value.trim().toUpperCase();
      if (!this._validateInput(searchValue)) {
        DOM.showWarning(CONFIG.messages.invalidFormat);
        return;
      }

      await this._executeSearch(searchValue);
    },

    /*
     * Validates search input
     * @private
     */
    _validateInput (value) {
      return CONFIG.patterns.searchInput.test(value);
    },

    /*
     * Executes search with fallback to ISSUED settings if IN SERVICE yields no results
     * @private
     */
    async _executeSearch (searchValue) {
      state.isProcessing = true;
      const startTime = performance.now();

      try {
        // First attempt: IN SERVICE
        const [fp1, s1] = this._runQuery(searchValue, CONFIG.sql.settingStatus.inService);
        await this._waitForResults(fp1, s1);

        if (await DataProcessor.processResults()) {
          this._logExecutionTime(startTime);
          return;
        }

        // Fallback: ISSUED
        DOM.showWarning(CONFIG.messages.noInServiceResults);
        const [fp2, s2] = this._runQuery(searchValue, CONFIG.sql.settingStatus.issued);
        await this._waitForResults(fp2, s2);

        if (!(await DataProcessor.processResults())) {
          DOM.showWarning(CONFIG.messages.noResults);
        }
        this._logExecutionTime(startTime);
      } catch (err) {
        console.error('Search execution error:', err);
        DOM.showWarning(CONFIG.messages.errorOccurred);
      } finally {
        state.isProcessing = false;
      }
    },

    /*
     * Executes query by generating and displaying SQL
     * @private
     */
    _runQuery (searchValue, status) {
      const sql = SQL.generate(searchValue, status);
      this._displaySql(sql);
      if (typeof window.runQuery === 'function') {
        const fingerPrint = window._C1MVCCtrl5?._src;
        const start = Date.now();
        window.runQuery();
        return [fingerPrint, start];
      }
    },

    /*
     * Displays SQL in editor
     * @private
     */
    _displaySql (sql) {
      const editor = DOM.getElement(CONFIG.selectors.sqlEditorId, true);
      if (editor) {
        editor.textContent = sql;
      }
    },

    /*
     * Waits for query to complete
     * @private
     */
    async _waitForResults (fingerPrint, startTime) {
      return new Promise((resolve, reject) => {
        const poll = () => {
          const elapsed = Date.now() - startTime;

          if (elapsed > CONFIG.sql.timeout) {
            reject(new Error('Query timed out'));
            return;
          }

          if (window._C1MVCCtrl5?._src !== fingerPrint) {
            resolve();
            console.log(`Query completed after : ${elapsed} ms`);
            return;
          }

          if (elapsed > CONFIG.sql.queryDelay) {
            resolve();
            console.log(`Query delay exceeded after : ${elapsed} ms`);
            return;
          }

          setTimeout(poll, CONFIG.sql.pollInterval);
        };

        setTimeout(poll, CONFIG.sql.queryStartDelay);
      });
    },

    /*
     * Logs query execution time
     * @private
     */
    _logExecutionTime (startTime) {
      const duration = formatTime(performance.now() - startTime);
      console.log(`Query executed and results processed in: ${duration} seconds`);
    },
  };

  // ============================================================================
  // SQL GENERATION
  // ============================================================================

  const SQL = {
    // Cache for generated SQL queries
    _cache: {},
    // Cached regex patterns for minification
    _regexCache: {
      lineComments: /--.*$/gm,
      blockComments: /\/\*[\s\S]*?\*\//g,
      whitespace: /\s+/g,
    },

    /*
     * Minifies SQL by removing comments and extra whitespace (optimized)
     * @param {string} sql - SQL query
     * @returns {string} Minified SQL
     */
    minify (sql) {
      if (!sql?.trim()) return '';

      return sql
        .replace(this._regexCache.lineComments, '')
        .replace(this._regexCache.blockComments, '')
        .replace(this._regexCache.whitespace, ' ')
        .trim();
    },
    /*
     * Generates SQL query for ASPEN relay protection settings
     * @param {string} inputCode - Device code (e.g., 'ABC 12F123')
     * @param {string} status - Query status (IN SERVICE or ISSUED)
     * @returns {string} Generated SQL query
     */
    generate (inputCode, status = CONFIG.sql.settingStatus.inService) {
      if (!inputCode) return '';

      // Check cache first
      const cacheKey = `${inputCode}-${status}`;
      if (this._cache[cacheKey]) {
        return this._cache[cacheKey];
      }

      const sql = this._buildSQL(inputCode, status);
      const minifiedSql = this.minify(sql);
      this._cache[cacheKey] = minifiedSql;
      return minifiedSql;
    },

    /*
     * Cached SQL components for efficient generation
     * @private
     */
    _cachedComponents: {},

    _getCachedList (key, arr) {
      if (!this._cachedComponents[key]) {
        this._cachedComponents[key] = this._formatList(arr);
      }
      return this._cachedComponents[key];
    },

    /*
     * Builds SQL query string (optimized)
     * @private
     */
    _buildSQL (inputCode, status) {
      const settingsList = this._getCachedList('settings', CONFIG.sql.settingNames);
      const excludedList = this._getCachedList('excluded', CONFIG.sql.excludedArevaSettings);
      const baseCondition = `R.S01 LIKE '${inputCode}%'`;
      const lobLen = CONFIG.sql.dbmsLobLength;

      return `
SELECT
  R.S01 AS DEVICE,
  Q.RELAYTYPE AS RELAY,
  T.SETTINGNAME AS ELEMENT,
  CASE
    WHEN T.SETTINGNAME NOT LIKE '%C'
    AND T.SETTINGNAME NOT LIKE '%D'
    AND S.GROUPNAME = '1'
    AND DBMS_LOB.SUBSTR(S.SETTING, ${lobLen}) <> 'OFF' THEN UPPER(
      TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLen})) * (
        SELECT TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLen})) AS CTR
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
    AND DBMS_LOB.SUBSTR(S.SETTING, ${lobLen}) <> 'OFF' THEN UPPER(
      TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLen})) / 60
    )
    ELSE DBMS_LOB.SUBSTR(S.SETTING, ${lobLen})
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
  AND UPPER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLen})) != 'BLOCKED'
  AND T.SETTINGNAME NOT IN (${excludedList})`;
    },

    /*
     * Formats array as SQL list
     * @private
     */
    _formatList (arr) {
      return arr.map(item => `'${item}'`).join(',');
    },
  };

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /*
   * Public API exported as window.AspenQuery
   */
  window.AspenQuery = Object.freeze({
    /*
     * Initializes and displays search bar
     */
    addSearchBar: () => SearchComponent.init(),

    /*
     * Decodes SEL relay setting name
     */
    decodeSELSettingName: (code, setting) => SELDecoder.decode(code, setting),

    /*
     * Decodes AREVA relay setting name
     */
    decodeAREVASettingName: (code, setting) => AREVADecoder.decode(code, setting),

    /*
     * Processes current query results
     */
    processResults: () => DataProcessor.processResults(),

    /*
     * Generates SQL query
     */
    getSqlText: (code, status) => SQL.generate(code, status),

    /*
     * Table rendering utilities
     */
    TableRenderer,

    /*
     * Gets current application state
     */
    getState: () => ({ ...state }),

    /*
     * Configuration object
     */
    CONFIG,
  });

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  SearchComponent.init();
})();
