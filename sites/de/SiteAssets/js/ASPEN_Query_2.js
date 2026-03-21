javascript: (function () {
  'use strict';

  const INITIAL_STATE = {
    headerRow: null,
    tableRows: null,
    isProcessing: false,
    relayType: '',
    relayModel: '',
  };
  // ============================================================================
  // CONFIGURATION & CONSTANTS
  // ============================================================================

  const CONFIG = {
    // Enable verbose runtime logging for troubleshooting
    debug: false,

    // DOM Element IDs and Classes
    selectors: {
      searchContainerId: 'aspen-search-container',
      inputId: 'searchInput',
      buttonId: 'searchButton',
      warningId: 'warning',
      sqlEditorId: 'sql-editor',
      resultGridId: 'QueryResultGrid',
      resultGridClass: 'query-result',
      containerId: 'tableContainer',
      mainAppClass: 'app-main',
      styleId: 'aspen-search-style',
    },

    // Input validation patterns
    patterns: {
      searchInput: /^[A-Z]{3}\s(4|12|25|35)[F]\d{2,3}[A-Z]?$/i,
      deviceCode: /^(?<prefix>[A-Z]{3})\s(?<type>4|12|25|35)F(?<number>\d{2,3})(?<suffix>[A-Z]?)$/i,
    },

    // CSS class names
    classes: {
      input: 'text-uppercase app-search app-wj-search wj-control wj-content mr-2 pl-3',
      button: 'btn app-btn app-btn-outline-primary mr-2',
    },
    settingStatus: {
      inService: 'IN SERVICE',
      issued: 'ISSUED',
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
      ],

      queryDelay: 3000,
      dbmsLobLength: 4000,
      timeout: 15000,
      pollInterval: 200,
      queryStartDelay: 300,
    },

    // Table layout configuration
    table: {
      widthConfig: {
        'SEL-151': [5, 5, 5, 5, 10, 'fit-content'],
        SEL: [12, 12, 12, 15, 24, 25],
        ELECTRO: [5, 5, 5, 5, 'fit-content'],
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
        ELEMENT: 'VENDOR', // For 5-column ELECTRO tables
      },
    },

    // User-facing messages
    messages: {
      queryCompletedInService: 'Query Completed for [IN Service] Settings',
      queryCompletedIssued: 'Query Completed for [ISSUED] Settings',
      invalidFormat: 'Please use the correct format (e.g., ABC 12F123)!',
      inputPattern: 'Please follow the pattern: ABC 12F123',
      placeholder: '...ABC 12F123',
      noInServiceResults: 'No In Service Settings - Looking for ISSUED Settings instead.',
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
  };

  // ============================================================================
  // SQL GENERATION
  // ============================================================================

  const SQL = {
    // Cache for generated SQL queries
    _cachedSql: {},
    // Cached regex patterns for minification
    _regexCache: {
      lineComments: /--.*$/gm,
      blockComments: /\/\*[\s\S]*?\*\//g,
      whitespace: /\s+/g,
      deviceCode: /^(?<prefix>[A-Z]{3})\s(?<type>4|12|25|35)F(?<number>\d{2,3})(?<suffix>[A-Z]?)$/i,
    },

    /*
     * Minifies SQL by removing comments and extra whitespace (optimized)
     * @param {string} sql - SQL query
     * @returns {string} Minified SQL
     */
    _minify (sql) {
      if (!sql?.trim()) return '';

      return sql
        .replace(this._regexCache.lineComments, '')
        .replace(this._regexCache.blockComments, '')
        .replace(this._regexCache.whitespace, ' ')
        .trim();
    },
    /**
     * Generates optimized SQL query for ASPEN relay protection settings.
     * @param {string} inputCode - Device code in format 'ABC 12F123'
     * @param {string} [status='IN SERVICE'] - Query status filter
     * @returns {string} Minified SQL query string
     * @example
     * const sql = SQL.generate('ABC 12F123', 'IN SERVICE');
     */
    generate (inputCode, status = CONFIG.settingStatus.inService) {
      const normalizedInput = String(inputCode ?? '').trim();
      if (!normalizedInput) return '';

      // Check cache first
      const cacheKey = `${normalizedInput}-${status}`;
      if (this._cachedSql[cacheKey]) {
        return this._cachedSql[cacheKey];
      }

      const sql = this._buildSQL(normalizedInput, status);
      const minifiedSql = this._minify(sql);
      this._cachedSql[cacheKey] = minifiedSql;
      return minifiedSql;
    },

    /*
     * Cached SQL components for efficient generation
     * @private
     */
    _cachedSqlComponents: {},

    _getCachedList (key, arr) {
      if (!this._cachedSqlComponents[key]) {
        this._cachedSqlComponents[key] = this._formatList(arr);
      }
      return this._cachedSqlComponents[key];
    },

    /*
     * Formats array as SQL list
     * @private
     */
    _formatList (arr) {
      if (!Array.isArray(arr)) return '';
      return arr.map(item => `'${item}'`).join(',');
    },

    /*
     * Builds SQL query string (optimized)
     * @private
     */
    _buildSQL (inputCode, status) {
      const settingsList = this._getCachedList('settings', CONFIG.sql.settingNames);
      const lobLen = CONFIG.sql.dbmsLobLength;

      return `
      WITH base_settings AS (
    SELECT
        R.S01 AS DEVICE,
        Q.RELAYTYPE AS RELAY,
        T.SETTINGNAME AS ELEMENT,
        DBMS_LOB.SUBSTR(S.SETTING, ${lobLen}, 1) AS SETTING,
        Q.M01 AS MEMO,
        S.REQUESTID,
        S.ROWNUMBER,
        -- Extract subset number from the setting name (e.g., 'SUBSET 1' -> 1)
        TO_NUMBER(
            REGEXP_SUBSTR(T.SETTINGNAME, 'SUBSET (\\d+)', 1, 1, NULL, 1)
        ) AS SUBSET_NUM
    FROM
        TRELAY R
        INNER JOIN TREQUEST Q ON R.ID = Q.RELAYID
        INNER JOIN TSETTING1 S ON Q.ID = S.REQUESTID
        INNER JOIN TSETTYPE1 T ON T.RELAYTYPE = Q.RELAYTYPE
        AND T.ROWNUMBER = S.ROWNUMBER
    WHERE
        R.S01 LIKE '${inputCode}%'
        AND R.RELAYTYPE LIKE 'AREVA%'
        AND UPPER(Q.S02) = '${status}'
        AND S.GROUPNAME = 'PARAMETERS'
        AND UPPER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLen}, 1)) != 'BLOCKED' -- Keep only IDMT1 and DTOC settings (all subsets)
        AND (
            T.SETTINGNAME LIKE '%/IDMT1%'
            OR T.SETTINGNAME LIKE '%/DTOC%'
        )
),
enable_settings AS (
    SELECT
        SE.REQUESTID,
        TE.ROWNUMBER,
        SE.SETTING AS ENABLE_VALUE,
        TO_NUMBER(
            REGEXP_SUBSTR(TE.SETTINGNAME, 'SUBSET (\\d+)', 1, 1, NULL, 1)
        ) AS SUBSET_NUM
    FROM
        TSETTING1 SE
        INNER JOIN TSETTYPE1 TE ON TE.ROWNUMBER = SE.ROWNUMBER
        INNER JOIN TREQUEST QE ON QE.ID = SE.REQUESTID
        AND TE.RELAYTYPE = QE.RELAYTYPE -- to get RELAYTYPE
        INNER JOIN TRELAY RE ON RE.ID = QE.RELAYID
    WHERE
        SE.GROUPNAME = 'PARAMETERS'
        AND TE.SETTINGNAME LIKE '%SUBSET _/F<>/ENABLE%'
        AND RE.S01 LIKE '${inputCode}%'
        AND RE.RELAYTYPE LIKE 'AREVA%'
        AND UPPER(QE.S02) = '${status}'
)
SELECT
    b.DEVICE,
    b.RELAY,
    b.ELEMENT,
    b.SETTING,
    b.MEMO
FROM
    base_settings b
    LEFT JOIN enable_settings e ON e.REQUESTID = b.REQUESTID
    AND e.SUBSET_NUM = b.SUBSET_NUM
WHERE
    UPPER(DBMS_LOB.SUBSTR(e.ENABLE_VALUE, ${lobLen}, 1)) = 'YES'
    AND b.ELEMENT NOT LIKE '%/PULS.PROL.IN>%'
    AND b.ELEMENT NOT LIKE '%/HOLD-T. TIN>%'
    AND b.ELEMENT NOT LIKE '%/EVALUATION IN%'
    AND b.ELEMENT NOT LIKE '%/EVAL. IN%'
UNION
ALL
SELECT
    R.S01 AS DEVICE,
    Q.RELAYTYPE AS RELAY,
    T.SETTINGNAME AS ELEMENT,
    DBMS_LOB.SUBSTR(S.SETTING, ${lobLen}, 1) AS SETTING,
    Q.M01 AS MEMO
FROM
    TRELAY R
    INNER JOIN TREQUEST Q ON R.ID = Q.RELAYID
    INNER JOIN TSETTING1 S ON Q.ID = S.REQUESTID
    INNER JOIN TSETTYPE1 T ON T.RELAYTYPE = Q.RELAYTYPE
    AND T.ROWNUMBER = S.ROWNUMBER
WHERE
    R.S01 LIKE '${inputCode}%'
    AND R.RELAYTYPE LIKE 'AREVA%'
    AND UPPER(Q.S02) = '${status}'
    AND S.GROUPNAME = 'PARAMETERS'
    AND T.SETTINGNAME LIKE '%/GLOBAL/MAIN/INOM C.T. PRIM.%'
    AND UPPER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLen}, 1)) != 'BLOCKED'
UNION
ALL
SELECT
    R.S01 AS DEVICE,
    Q.RELAYTYPE AS RELAY,
    T.SETTINGNAME AS ELEMENT,
    CASE
        WHEN T.SETTINGNAME NOT LIKE '%C'
        AND T.SETTINGNAME NOT LIKE '%D'
        AND T.SETTINGNAME NOT LIKE '%T'
        AND T.SETTINGNAME NOT LIKE '%OI%'
        AND S.GROUPNAME = '1'
        AND DBMS_LOB.SUBSTR(S.SETTING, ${lobLen}) <> 'OFF' THEN UPPER(
            TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLen})) * (
                SELECT
                    TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLen})) AS CTR
                FROM
                    TSETTING1 S,
                    TSETTYPE1 T,
                    TRELAY R,
                    TREQUEST Q
                WHERE
                    R.S01 LIKE '${inputCode}%'
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
        WHEN (
            (T.SETTINGNAME LIKE '%OI%')
            OR (
                (
                    T.SETTINGNAME LIKE '67%D'
                    OR T.SETTINGNAME LIKE '%LT'
                )
                AND S.GROUPNAME = '1'
            )
        )
        AND DBMS_LOB.SUBSTR(S.SETTING, ${lobLen}) <> 'OFF' THEN UPPER(
            TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLen})) / 60
        )
        ELSE DBMS_LOB.SUBSTR(S.SETTING, ${lobLen})
    END AS SETTING,
    Q.M01 AS MEMO
FROM
    TSETTING1 S,
    TSETTYPE1 T,
    TRELAY R,
    TREQUEST Q
WHERE
    R.S01 LIKE '${inputCode}%'
    AND R.RELAYTYPE LIKE 'SEL%'
    AND R.ID = Q.RELAYID
    AND Q.ID = S.REQUESTID
    AND T.RELAYTYPE = Q.RELAYTYPE
    AND T.ROWNUMBER = S.ROWNUMBER
    AND UPPER(Q.S02) = '${status}'
    AND (
        (
            S.GROUPNAME = '1'
            AND T.SETTINGNAME IN (${settingsList})
        )
        OR (
            S.GROUPNAME = 'L1'
            AND (
                T.SETTINGNAME LIKE (
                    SELECT
                        S.SETTING AS TR
                    FROM
                        TSETTING1 S,
                        TSETTYPE1 T,
                        TRELAY R,
                        TREQUEST Q
                    WHERE
                        R.S01 LIKE '${inputCode}%'
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
UNION
ALL
SELECT
    R.S01 AS DEVICE,
    Q.RELAYTYPE AS RELAY,
    R.S06 AS VENDOR,
    TO_CHAR(R.S04) AS MODEL,
    Q.M01 AS MEMO
FROM
    TRELAY R,
    TREQUEST Q
WHERE
    R.S01 LIKE '${inputCode}%'
    AND UPPER(R.RELAYTYPE) LIKE 'ELECTRO%'
    AND R.ID = Q.RELAYID
    AND UPPER(Q.S02) = '${status}'
      `;
    },
  };

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  let state = { ...INITIAL_STATE };
  const QUERY_RESULT_CONTROLLER_KEY = '_C1MVCCtrl5';

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

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

  const regexValidator = (pattern, value = '') => {
    if (!(pattern instanceof RegExp)) return false;
    // Reset stateful regexes to avoid false negatives across calls.
    if (pattern.global || pattern.sticky) pattern.lastIndex = 0;
    return pattern.test(String(value ?? ''));
  };

  const debugLog = (...args) => {
    if (CONFIG.debug) {
      console.log(...args);
    }
  };

  const parseDeviceCode = rawCode => {
    const code = String(rawCode ?? '').trim();
    const match = CONFIG.patterns.deviceCode.exec(code);
    return match?.groups ?? null;
  };

  const getRowCell = (row, index) => toArray(row)?.[index];
  const parseRelayType = relayValue => {
    const relayText = String(relayValue ?? '').toUpperCase();
    const relayType =
      Object.values(CONFIG.relayTypes).find(type => relayText.includes(type)) ?? CONFIG.relayTypes.UNKNOWN;
    const relayModel = relayText === 'SEL-151' ? 'SEL-151' : '';
    return { relayType, relayModel, relayText };
  };

  const getQueryResultController = () => window[QUERY_RESULT_CONTROLLER_KEY];
  const hasQuerySource = queryResult => !!(queryResult && typeof queryResult._src !== 'undefined');

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
    _elementCache: new Map(),

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
      const cachedElement = this._elementCache.get(id);
      if (cachedElement?.isConnected) {
        return cachedElement;
      }

      const element = document.getElementById(id);
      if (element) {
        this._elementCache.set(id, element);
      } else {
        this._elementCache.delete(id);
      }
      if (!element && !silent) {
        console.warn(`Element with id '${id}' not found`);
      }
      return element;
    },

    cacheElement (id, element) {
      if (id && element) {
        this._elementCache.set(id, element);
      }
    },

    clearElementCache (id) {
      if (id) {
        this._elementCache.delete(id);
        return;
      }
      this._elementCache.clear();
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

    resetState () {
      state = { ...INITIAL_STATE };
    },

    /*
     * Clears all messages and previous results
     */
    clearAll () {
      this.showWarning('');
      const container = this.getElement(CONFIG.selectors.containerId, true);
      if (container) {
        container.remove();
        this.clearElementCache(CONFIG.selectors.containerId);
      }

      const sqlEditor = this.getElement(CONFIG.selectors.sqlEditorId, true);
      if (sqlEditor) sqlEditor.textContent = '';

      this.resetState();
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
        .aspen-table { border-collapse: collapse; max-width: 100%; font-family: monospace; font-size: 0.9rem; border: 1px solid #bbb; box-shadow: rgba(23, 43, 77, 0.1) 0px 2px 2px, rgba(23, 43, 77, 0.1) 2px 2px 2px; text-wrap-style: balance; }
        .aspen-table th { padding: 8px;  text-align: left; background-color: #eee; font-weight: bold; border: 1px solid #bbb;}
        .aspen-table td { padding: 6px;  vertical-align: middle; white-space: pre-wrap; border: 1px solid #bbb; }
        .aspen-container { margin: 20px 0; padding: 10px; border: 1px solid #ccc; }
      `;
      document.head.appendChild(style);
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
        this._createSearchUI();
        this._switchQueryEditor();
        this._attachEventHandlers();
      } catch (err) {
        ErrorHandler.handle(err, 'SearchComponent.init');
      }
    },

    /*
     * Injects external dependencies if available
     * @private
     */
    _switchQueryEditor () {
      if (window.editorType === 'Wizard' && typeof window.switchEditor === 'function') {
        window.switchEditor();
      }
      if (typeof window.editorReady === 'function') {
        window.editorReady('SQLEditor');
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
      DOM.cacheElement(CONFIG.selectors.searchContainerId, wrapper);
      DOM.cacheElement(CONFIG.selectors.inputId, input);
      DOM.cacheElement(CONFIG.selectors.buttonId, button);
      DOM.cacheElement(CONFIG.selectors.warningId, warning);

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

      DOM.clearAll();

      const searchValue = inputEl.value.trim().toUpperCase();
      const parsedCode = parseDeviceCode(searchValue);
      if (!parsedCode || !regexValidator(CONFIG.patterns.searchInput, searchValue)) {
        DOM.showWarning(CONFIG.messages.invalidFormat);
        return;
      }

      debugLog('Parsed device code:', parsedCode);
      await this._executeSearch(searchValue);
    },

    /*
     * Executes search with fallback to ISSUED settings if IN SERVICE yields no results
     * @private
     */
    async _executeSearch (searchValue) {
      state.isProcessing = true;
      const startTime = performance.now();

      try {
        const inServiceSuccess = await this._executeStatusSearch(searchValue, CONFIG.settingStatus.inService);
        if (inServiceSuccess) {
          debugLog('IN SERVICE results processed');
          this._logExecutionTime(startTime);
          DOM.showWarning(CONFIG.messages.queryCompletedInService);
          return;
        }

        debugLog('No IN SERVICE results; trying ISSUED');
        DOM.showWarning(CONFIG.messages.noInServiceResults);

        const issuedSuccess = await this._executeStatusSearch(searchValue, CONFIG.settingStatus.issued);
        if (!issuedSuccess) {
          debugLog('No ISSUED results');
          DOM.showWarning(CONFIG.messages.noResults);
          return;
        }

        this._logExecutionTime(startTime);
        DOM.showWarning(CONFIG.messages.queryCompletedIssued);
      } catch (err) {
        ErrorHandler.handle(err, 'SearchComponent._executeSearch');
      } finally {
        state.isProcessing = false;
      }
    },

    async _executeStatusSearch (searchValue, status) {
      debugLog(`Search started for ${status}`);
      const { fingerprint, startTime } = this._runQuery(searchValue, status);
      debugLog(`Waiting for ${status} results`);
      await DataProcessor.getQueryResults(fingerprint, startTime, status);
      return DataProcessor.processResults();
    },

    /*
     * Executes query by generating and displaying SQL
     * @private
     */
    _runQuery (searchValue, status) {
      const sql = SQL.generate(searchValue, status);
      this._displaySql(sql);

      const queryResult = getQueryResultController();
      if (!hasQuerySource(queryResult)) {
        throw new Error('Query result is unavailable');
      }

      const fingerprint = queryResult._src;
      const start = Date.now();
      window.runQuery();
      return { fingerprint, startTime: start };
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
     * Logs query execution time
     * @private
     */
    _logExecutionTime (startTime) {
      const duration = ((performance.now() - startTime) / 1000).toFixed(2);
      debugLog(`Query executed and results processed in: ${duration} seconds`);
    },
  };

  const ErrorHandler = {
    log (error, context = '') {
      const contextText = context ? ` [${context}]` : '';
      console.error(`ASPEN Query Error${contextText}:`, error);
      if (CONFIG.debug) {
        console.trace();
      }
    },
    notify (userMessage, error = null) {
      DOM.showWarning(userMessage);
      if (error) {
        this.log(error, 'User Notification');
      }
    },
    handle (error, context = '', userMessage = CONFIG.messages.errorOccurred) {
      this.log(error, context);
      this.notify(userMessage);
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
        debugLog('Starting results processing');

        const hasPreparedData = this._prepareTableData();
        debugLog(`Failed to prepare table data: ${!hasPreparedData}`);

        if (!hasPreparedData) {
          return false;
        }
        debugLog('Data Prepared');
        this._detectRelayType();
        this._rearrangeTableData();

        const feederId = this._extractFeederId();
        this._renderResults();
        TableRenderer.setupDownloadButton(feederId);
        TableRenderer.hideOriginalResults();

        return true;
      } catch (err) {
        ErrorHandler.handle(err, 'DataProcessor.processResults');
        return false;
      }
    },

    /*
     * Waits for query to complete
     * @private
     */
    async getQueryResults (fingerprint, startTime, status) {
      return new Promise((resolve, reject) => {
        debugLog('Creating new fingerprint');

        if (typeof startTime !== 'number') {
          reject(new Error(`Invalid query start time for '${status}'`));
          return;
        }

        const poll = () => {
          const elapsed = Date.now() - startTime;
          const queryResult = getQueryResultController();
          if (!hasQuerySource(queryResult)) {
            reject(new Error(`Query result is unavailable for '${status}'`));
            return;
          }
          if (elapsed > CONFIG.sql.timeout) {
            reject(new Error(`Query for '${status}' timed out`));
            return;
          }
          const hasFingerprintChanged = queryResult._src !== fingerprint;
          debugLog(`Has fingerprint changed: ${hasFingerprintChanged}`);
          if (hasFingerprintChanged) {
            resolve();
            console.log(`Query completed for '${status}' after ${elapsed} ms`);
            return;
          }

          if (elapsed > CONFIG.sql.queryDelay) {
            resolve();
            console.log(`Query delay exceeded for '${status}' after ${elapsed} ms`);
            return;
          }
          setTimeout(poll, CONFIG.sql.pollInterval);
        };
        setTimeout(poll, CONFIG.sql.queryStartDelay);
      });
    },

    /*
     * Loads state from global query result objects
     * @private
     */
    _prepareTableData () {
      state.headerRow = toArray(window.resultGrid?._cols?.map(col => col?._hdr ?? col)) ?? [];
      state.tableRows = toArray(window.resultGrid?._rows?.map(row => row?._data ?? row)) ?? [];

      debugLog('Header Row:', state.headerRow);
      debugLog('Table Rows:', state.tableRows);
      return hasElements(state.tableRows) && hasElements(state.headerRow);
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
      const relayCell = getRowCell(firstRow, 1);
      const { relayType, relayModel } = parseRelayType(relayCell);
      state.relayType = relayType;
      state.relayModel = relayModel;
    },

    /*
     * Enhances table data with decoded setting descriptions
     * @private
     */
    _rearrangeTableData () {
      // Add description column for decodable types
      if (state.relayType === CONFIG.relayTypes.SEL) {
        state.headerRow.push('PN ELEMENT DESC');
        this._swapColumns(state.headerRow, 4, 5);
      }

      // Decode and normalize each row in a single pass.
      state.tableRows = state.tableRows.map(row => {
        const rowArray = toArray(row);

        debugLog('Decoding row:', rowArray[2], rowArray[3]);
        if (state.relayType === CONFIG.relayTypes.AREVA) {
          [rowArray[2], rowArray[3]] = AREVADecoder.preDecode(rowArray[2], rowArray[3]);
        }

        if (state.relayType === CONFIG.relayTypes.SEL) {
          const [desc, val] = SELDecoder.decode(rowArray[2], rowArray[3]);
          rowArray[5] = desc;
          rowArray[3] = val;
          this._swapColumns(rowArray, 4, 5);
        } else if (state.relayType === CONFIG.relayTypes.AREVA) {
          debugLog('Decoding AREVA row:', rowArray[2], rowArray[3]);
          [rowArray[2], rowArray[3]] = AREVADecoder.decode(rowArray[2], rowArray[3]);
        }

        return rowArray;
      });

      // Sort by appropriate column
      this._sortResults();
    },

    /*
     * Merges consecutive identical cells in specified columns (optimized)
     * @param {Array<Array>} rows - Table rows to merge
     * @returns {Array<Array>} Rows with merge information
     */
    _mergeConsecutiveCells (rows) {
      if (!rows.length) return rows;

      const mergeColumns = CONFIG.table.mergeColumns[state.relayType];
      if (!mergeColumns?.length) return rows;

      const rowCount = rows.length;
      const colCount = rows[0].length;
      const mergeColSet = new Set(mergeColumns);
      const rowspanMap = new Map();

      // Pre-calculate rowspans in linear passes (per merge column)
      for (const col of mergeColumns) {
        if (col >= colCount) continue;
        let row = 0;
        while (row < rowCount) {
          const start = row;
          const cellValue = rows[start][col];

          while (row + 1 < rowCount && rows[row + 1][col] === cellValue) {
            row++;
          }

          rowspanMap.set(`${start}-${col}`, row - start + 1);
          row++;
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
     * Swaps two columns in an array
     * @private
     */
    _swapColumns (array, index1, index2) {
      [array[index1], array[index2]] = [array[index2], array[index1]];
      const hasKeyOnBoth =
        typeof array[index1] === 'object' &&
        array[index1] !== null &&
        typeof array[index2] === 'object' &&
        array[index2] !== null &&
        'Key' in array[index1] &&
        'Key' in array[index2];
      if (hasKeyOnBoth) {
        [array[index1].Key, array[index2].Key] = [array[index2].Key, array[index1].Key];
      }
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
      const firstCell = getRowCell(firstRow, 0) ?? '';
      const parts = String(firstCell).split(' ');

      return parts.slice(0, 2).join(' ') || 'unknown';
    },

    /*
     * Renders processed table to page
     * @private
     */
    _renderResults () {
      // Apply cell merging if applicable
      if ([CONFIG.relayTypes.SEL, CONFIG.relayTypes.AREVA].includes(state.relayType)) {
        state.tableRows = this._mergeConsecutiveCells(state.tableRows);
      }
      const container = TableRenderer.ensureContainer();
      TableRenderer.render(container, state.headerRow, state.tableRows);
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
        this._phasePatterns ??= [
          { type: 'PHS', pattern: /P(\.|\s|\.?\s)?PS1$/ },
          { type: 'GND', pattern: /N(\.|\s|\.?\s)?PS1$/ },
          { type: 'NEG', pattern: /NEG(\.|\s|\.?\s)?PS1$/ },
        ];
      }
      return this._phasePatterns;
    },
    phaseText: {
      I: 'PHS',
      IN: 'GND',
      INEG: 'NEG',
    },
    // Suffix descriptions
    OCSuffix: [
      {
        text: 'IREF',
        desc: 'Pick Up (A)',
      },
      { text: 'CHARACTER', desc: 'Curve' },
      { text: 'FACTOR', desc: 'Time Dial' },
      { text: 'TRIP TIME', desc: 'Min. Trip Time (s)' },
      { text: 'HOLD TIME', desc: 'Hold Time (s)' },
      { text: 'RELEASE', desc: 'Release' },
      { text: 'ENABLE', desc: 'Enabled' },
    ],

    DTSuffix: [
      { pattern: /\/(I(?:NEG)?N?)(>+)\s/, desc: 'Pick Up (A)' },
      { pattern: /\/T(I(?:NEG)?N?)(>+)\s/, desc: 'Delay (s)' },
      { pattern: /\/(ENABLE)/, desc: 'Enabled' },
    ],

    // Overcurrent setting type
    overCurrentType: 'Timed Overcurrent',
    definiteTimeType: 'Definite Time',
    ctPrimary: 0,

    preDecode (settingName, settingValue) {
      debugLog('AREVA preDecoder:', settingName, settingValue);
      if (settingName.includes('INOM')) {
        const returnValue = Number(settingValue.toString().split(' ')[0]) || 0;
        this.ctPrimary = returnValue;
        debugLog('CT PRIMARY:', returnValue);
        return ['CT PRIMARY (A)', returnValue];
      } else return [settingName, settingValue];
    },
    /*
     * Decodes AREVA
     * @param {string} settingName - Setting Name
     * @param {string|number} settingValue - Setting value
     * @returns {Array<string>} [description, value]
     */
    decode (settingName, settingValue) {
      if (!this._isValid(settingName, settingValue)) return ['', ''];
      debugLog('AREVA decoder:', settingName, settingValue);
      try {
        // Check phase patterns
        const isTimed = settingName.includes('IDMT1');
        const isDefiniteTime = settingName.includes('DTOC');
        if (settingName === 'CT PRIMARY (A)') return [settingName, settingValue];
        if (isTimed) {
          return this._decodeOverCurrent(settingName, settingValue);
        }

        if (isDefiniteTime) {
          return this._decodeDefiniteTime(settingName, settingValue);
        }
      } catch (err) {
        ErrorHandler.log(err, 'AREVADecoder.decode');
      }

      return ['', ''];
    },

    /*
     * Validates input parameters
     * @private
     */
    _isValid (settingName, settingValue) {
      return !!(settingName && typeof settingName === 'string' && settingValue !== undefined);
    },

    /*
     * Parses setting value with INOM conversion
     * @private
     */
    _parseSettingValue (settingValue) {
      if (settingValue.toString().toUpperCase().includes('INOM')) {
        const value = Number(settingValue.toString().split(' ')[0]) || 0;
        return Math.round(value * this.ctPrimary);
      }
      if (settingValue.toString().endsWith(' s')) {
        settingValue = settingValue.toString().replace(' s', '');
      }
      return settingValue.toString();
    },

    /*
     * Decodes phase-specific pattern
     * @private
     */
    _decodeOverCurrent (settingName, settingValue) {
      let [phase, description, suffix] = ['', '', ''];
      for (const { type, pattern } of this.phasePatterns) {
        if (regexValidator(pattern, settingName)) {
          phase = type;
        }
      }
      suffix = this._getOCSuffix(settingName);
      description = [phase, this.overCurrentType, suffix].filter(Boolean).join(' ').toUpperCase();

      let value = this._parseSettingValue(settingValue);
      debugLog(['description', description, 'value', value]);
      return [description, value];
    },

    _decodeDefiniteTime (settingName, settingValue) {
      let [phase, description, suffix] = ['', '', ''];

      const dtDesc = this._getDTSuffix(settingName);
      debugLog('DT DESC:', dtDesc);
      phase = dtDesc[0];
      suffix = dtDesc[1];
      description = [phase, this.definiteTimeType, suffix].filter(Boolean).join(' ').toUpperCase();

      let value = this._parseSettingValue(settingValue);
      debugLog(['description', description, 'value', value]);
      return [description, value];
    },
    /*
     * Gets suffix description from code
     * @private
     */
    _getOCSuffix (settingName) {
      for (const { text, desc } of this.OCSuffix) {
        if (settingName.includes(text)) return desc;
      }
      return '';
    },

    _getDTSuffix (settingName) {
      let [part1, part2] = ['', ''];
      for (const { pattern, desc } of this.DTSuffix) {
        debugLog('DT Suffix pattern:', pattern, settingName, desc);
        if (regexValidator(pattern, settingName)) {
          const match = settingName.match(pattern);
          if (match[1] === 'ENABLE') {
            part1 = '';
            part2 = desc;
          } else if (match[2]) {
            const base = match[1];
            const stage = match[2].length;
            part1 = this.phaseText[base] ?? base;
            part2 = `Stage ${stage ?? ''} ${desc}`;
          }
        }
      }
      return [part1, part2];
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
      H: 'Pick Up (A)',
    },

    // Cached pattern lists
    _definiteTime: null,
    _overCurrent: null,
    _liveLine: null,
    _tripEquation: null,
    _autoReclose: null,

    get definiteTime () {
      return (this._definiteTime ??= [
        { pattern: /^50(?:P[234]P|N?L)$/, desc: 'Definite Time Pick Up (A)' },
        { pattern: /^(?:67P[234]D|50LT|50NLT)$/, desc: 'Definite Time Delay (s)' },
      ]);
    },

    get overCurrent () {
      return (this._overCurrent ??= [
        { pattern: /^50/, desc: 'Inst. Overcurrent' },
        { pattern: /^51/, desc: 'Timed Overcurrent' },
      ]);
    },

    get liveLine () {
      return (this._liveLine ??= { pattern: /^50[PG]5/, desc: 'Live Line' });
    },

    get tripEquation () {
      return (this._tripEquation ??= { pattern: /^SV\d?\w+/, desc: '_Trip Equation' });
    },

    get autoReclose () {
      return (this._autoReclose ??= { pattern: /^79/, desc: '_Auto-Reclose Interval (s)' });
    },

    /*
     * Decodes SEL setting code
     * @param {string} settingName - Setting Name
     * @param {string|number} settingValue - Setting value
     * @returns {Array<string>} [description, value]
     */
    decode (settingName, settingValue) {
      if (!this._isValid(settingName, settingValue)) return ['', ''];

      try {
        // Check definite time patterns first (most specific)
        for (const { pattern, desc } of this.definiteTime) {
          if (regexValidator(pattern, settingName)) {
            const base = this._getPhaseDescription(settingName);
            const stage =
              typeof settingValue === 'string'
                ? settingValue.match(/(?:50P[234]P|67P[234]D)/)
                  ? settingValue
                      .replace(/50P([234])P/g, (match, num) => `Stage ${String(num)} `)
                      .replace(/67P([234])D/g, (match, num) => `Stage ${String(num)} `)
                  : ''
                : '';
            debugLog(`${base} ${stage}${desc}`, settingValue);
            return [`${base} ${stage}${desc}`, settingValue];
          }
        }

        // Check overcurrent patterns
        for (const { pattern, desc } of this.overCurrent) {
          if (regexValidator(pattern, settingName)) {
            return this._decodeOverCurrent(settingName, desc, settingValue);
          }
        }
        // Check special trip equation pattern
        if (regexValidator(this.tripEquation.pattern, settingName)) {
          return [this.tripEquation.desc, settingValue];
        }
        if (regexValidator(this.autoReclose.pattern, settingName)) {
          return [this.autoReclose.desc, settingValue];
        }
      } catch (err) {
        ErrorHandler.log(err, 'SELDecoder.decode');
      }

      return ['', ''];
    },

    /*
     * Validates input parameters
     * @private
     */
    _isValid (settingName, settingValue) {
      return !!(
        settingName &&
        typeof settingName === 'string' &&
        settingValue &&
        (typeof settingValue === 'string' || typeof settingValue === 'number')
      );
    },

    /*
     * Gets phase description from code
     * @private
     */
    _getPhaseDescription (settingName) {
      const thirdChar = settingName.charAt(2);
      return this.phases[thirdChar] ?? 'PHS';
    },

    /*
     * Gets suffix description from code
     * @private
     */
    _getOCSuffix (settingName) {
      const last2 = settingName.slice(-2);
      const last1 = settingName.slice(-1);
      return this.suffixes[last2] ?? this.suffixes[last1] ?? '';
    },

    /*
     * Decodes overcurrent setting
     * @private
     */
    _decodeOverCurrent (settingName, OC_desc, settingValue) {
      const phase = this._getPhaseDescription(settingName);
      const suffix = this._getOCSuffix(settingName);
      const isLiveLine = regexValidator(this.liveLine.pattern, settingName);

      let finalSetting = settingValue.toString();
      if (suffix.includes('Curve') && settingValue in this.curves) {
        finalSetting = `${settingValue} ${this.curves[settingValue]}`;
      }

      const addLiveLine = isLiveLine ? this.liveLine.desc : '';
      const description = [phase, OC_desc, suffix, addLiveLine].filter(Boolean).join(' ');

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
    _createTable (headers, rows) {
      const table = DOM.createElement('table', { class: 'aspen-table' });
      table.appendChild(this._createHead(headers));
      table.appendChild(this._createBody(rows));
      return table;
    },

    /*
     * Creates table header section
     * @private
     */
    _createHead (headers) {
      const thead = DOM.createElement('thead');
      const tr = DOM.createElement('tr');

      headers.forEach((header, index) => {
        const displayHeader = this._changeHeader(header);
        const widthPercent = this._getColumnWidth(index, headers.length);

        const th = DOM.createElement('th', {
          style: `width: ${widthPercent !== 'fit-content' ? widthPercent + 'vw' : 'fit-content'}`,
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
    _changeHeader (header) {
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
      const widths = CONFIG.table.widthConfig[state.relayModel] ?? CONFIG.table.widthConfig[state.relayType];
      return widths?.[index] ?? 100 / columnCount;
    },

    /*
     * Renders table to container
     * @private
     */
    render (container, headers, rows) {
      if (!container) return;

      const table = this._createTable(headers, rows);
      container.innerHTML = '';
      container.appendChild(table);
    },

    /*
     * Hides original query result grid
     */
    hideOriginalResults () {
      const resultGridById = DOM.getElement(CONFIG.selectors.resultGridId, true);
      if (resultGridById) resultGridById.style.display = 'none';

      const resultGridByClass = document.querySelector(`.${CONFIG.selectors.resultGridClass}`);
      if (resultGridByClass) resultGridByClass.style.display = 'none';

      const main = document.querySelector(`.${CONFIG.selectors.mainAppClass}`);
      if (main) main.setAttribute('style', 'min-height: auto');
    },

    /*
     * Adds download button to results
     * @private
     */
    setupDownloadButton (feederId) {
      const container = DOM.getElement(CONFIG.selectors.containerId, true);
      if (!container) return;

      const btn = DOM.createElement('button', {
        className: CONFIG.classes.button,
        textContent: 'Download',
        onclick: () => {
          this._downloadAsHtml(feederId, state.headerRow, state.tableRows);
        },
      });

      container.insertBefore(DOM.createElement('p'), container.firstChild);
      container.insertBefore(btn, container.firstChild);
    },
    /*
     * Downloads table as HTML file
     * @private
     */
    _downloadAsHtml (filename, headers, rows) {
      const tableHtml = this._createTable(headers, rows).outerHTML;
      const currentDate = new Date().toLocaleDateString();

      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8'>
  <title>${filename}</title>
  <style>
    body { font-family: monospace; font-size: 0.9rem; padding: 20px; }
    h2 { margin-bottom: 20px; }
    table { border: 1px solid #999; border-collapse: collapse; font-size: 0.9rem; white-space: pre-wrap;  text-wrap-style: balance; }
    table th { background-color: #eee; font-weight: bold; }
    table th, td { padding: 6px; text-align: left;border: 1px solid #999; }
    
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

    /*
     * Ensures table container exists in DOM
     * @returns {HTMLElement}
     */
    ensureContainer () {
      let container = DOM.getElement(CONFIG.selectors.containerId, true);
      if (!container) {
        container = this._createContainer();
      }
      return container;
    },

    /*
     * Creates and appends table container element
     * @returns {HTMLElement}
     */
    _createContainer () {
      const container = DOM.createElement('div', {
        id: CONFIG.selectors.containerId,
        class: 'aspen-container',
      });
      document.body.appendChild(container);
      DOM.cacheElement(CONFIG.selectors.containerId, container);
      return container;
    },
  };

  const cleanup = () => {
    SQL._cachedSql = {};
    SQL._cachedSqlComponents = {};
    DOM.clearElementCache();
  };

  window.addEventListener('beforeunload', cleanup);

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

    /*
     * Utility helpers for testability
     */
    utils: Object.freeze({
      validateDeviceCode: code => regexValidator(CONFIG.patterns.searchInput, String(code ?? '').trim()),
      parseDeviceCode,
      parseRelayType,
    }),

    /*
     * Clears caches and internal retained state
     */
    cleanup,
  });

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  SearchComponent.init();
})();
