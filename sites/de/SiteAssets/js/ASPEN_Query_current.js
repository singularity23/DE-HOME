javascript: (function () {
  'use strict';
  const pathname = window.location.pathname;
  if (pathname !== '/Aspen/query') {
    window.alert(`You are not on the correct page. Please navigate to the ASPEN 'Query' page to use this tool.`);
    return;
  }

  const INITIAL_STATE = Object.freeze({
    headerRow: null,
    tableRows: null,
    isProcessing: false,
    relayType: '',
    relayModel: '',
    feederId: '',
    lastError: null,
    lastQuery: null,
    queryCount: 0,
    startTime: null,
    cacheIdleTimer: null,
  });

  // ============================================================================
  // CONFIGURATION & CONSTANTS
  // ============================================================================

  const CONFIG = Object.freeze({
    version: '2.6.1',
    debug: true,

    selectors: Object.freeze({
      searchContainer: 'aspen-search-container',
      input: 'searchInput',
      button: 'searchButton',
      download: 'downloadButton',
      warning: 'warning',
      sqlEditor: 'sql-editor',
      resultGrid: 'QueryResultGrid',
      resultGridClass: 'query-result',
      container: 'tableContainer',
      mainApp: 'app-main',
      style: 'aspen-search-style',
      inService: 'in-service',
      issued: 'issued',
      statusMenu: 'aspen-search-status-menu',
    }),

    // Input validation with named capture groups
    patterns: Object.freeze({
      device: /^(?<prefix>[A-Z]{3})\s(?<type>4|12|25|35)F(?<number>\d{2,3})(?<suffix>[A-Z]?)$/i,
      get input () {
        // Strip anchors and named-group syntax for use as the HTML pattern attribute
        return new RegExp(
          this.device.source.replace(/\?<[^>]+>/g, ''),
          this.device.flags
        );
      },
    }),

    // CSS class definitions
    classes: Object.freeze({
      input: 'text-uppercase app-search app-wj-search wj-control wj-content pl-3',
      button: 'btn app-btn app-btn-outline-primary dropdown-toggle',
      download: 'btn app-btn app-btn-outline-primary',
      warning: 'aspen-warning',
      table: 'aspen-table',
      container: 'aspen-container',
      searchWrapper: 'input-group aspen-search-wrapper',
      statusMenu: 'dropdown-menu',
      statusMenuItem: 'dropdown-item',
      userQueryMenu: 'dropdown menu-user-query',
    }),

    // Application status constants
    status: Object.freeze({
      IN_SERVICE: 'IN SERVICE',
      ISSUED: 'ISSUED',
    }),

    // SQL query configuration
    sql: Object.freeze({
      settingNames: Object.freeze([
        '51P1P', '51P1TD', '51P1C', '50P1P', '50P2P', '50P3P', '50P4P', '50P5P',
        '67P2D', '67P3D', '67P4D', '51G1P', '51G1TD', '51G1C', '50G1P', '50G5P',
        '51PP', '51PTD', '51PC', '51GP', '51GTD', '51GC', '51P', '51TD', '51C',
        '50L', '50LT', '50H', '51NP', '51NTD', '51NC', '50NL', '50NLT', '50NH',
        '51QP', '51QTD', '51QC', '79OI1',
      ]),

      timing: Object.freeze({
        queryDelay: 3000,
        timeout: 15000,
        pollInterval: 200,
        startDelay: 300,
      }),

      dbmsLobLength: 4000,
    }),

    table: Object.freeze({
      widthConfig: Object.freeze({
        'SEL-151': [5, 5, 5, 5, 10, 'fit-content'],
        SEL: [12, 12, 12, 15, 24, 25],
        ELECTRO: [5, 5, 5, 5, 'fit-content'],
        AREVA: [15, 15, 25, 20, 25],
      }),

      mergeColumns: Object.freeze({
        SEL: [0, 1, 5],
        AREVA: [0, 1, 4],
      }),

      sortColumnIndex: Object.freeze({
        SEL: 4,
        AREVA: 2,
      }),

      headerReplacements: Object.freeze({
        ELEMENT: 'VENDOR',
      }),
    }),

    messages: Object.freeze({
      success: Object.freeze({
        inService: 'Query Completed for [IN SERVICE] Settings',
        issued: 'Query Completed for [ISSUED] Settings',
      }),

      validation: Object.freeze({
        invalidFormat: 'Please use the correct format (e.g., ABC 12F123)!',
        inputPattern: 'Please follow the pattern: ABC 12F123',
      }),

      ui: Object.freeze({
        placeholder: '...ABC 12F123',
        searchButton: 'Choose Status',
        downloadButton: 'Download',
      }),

      info: Object.freeze({
        noInServiceResults: 'No IN SERVICE Settings - Looking for ISSUED Settings.',
        noResults: 'No Settings Found',
        searching: 'Searching...',
        processing: 'Processing results...',
      }),

      error: Object.freeze({
        general: 'An error occurred while processing the query.',
        network: 'Network connection error. Please check your connection.',
        timeout: 'Query timed out. Please try again.',
        validation: 'Input validation failed.',
        queryUnavailable: 'Query system is currently unavailable.',
      }),
    }),

    // Relay type definitions
    relayTypes: Object.freeze({
      SEL: 'SEL',
      ELECTRO: 'ELECTRO',
      AREVA: 'AREVA',
      UNKNOWN: 'UNKNOWN', // Consistent casing
    }),

    // Performance and caching settings
    performance: Object.freeze({
      maxCacheSize: 50, // Maximum cached SQL queries
      debounceDelay: 300, // Input debounce delay (ms)
      throttleLimit: 1000, // Event throttle limit (ms)
      maxRetries: 1, // Maximum query retries
      /** Clear SQL + DOM element caches after this many ms with no cache use */
      cacheIdleClearMs: 5 * 60 * 1000,
    }),
  });

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================


  let state = { ...INITIAL_STATE };

  const StateManager = {
    /*
     * Updates state with validation and change tracking
     * @param {Object} updates - State updates to apply
     */
    get (key) {
      return state[key];
    },

    update (updates) {
      if (!updates || typeof updates !== 'object') throw new Error('State updates must be an object');

      Object.assign(state, updates);
      MyConsole.debug('State updated', updates);
    },

    /*
     * Resets state to initial values
     */
    reset () {
      Object.assign(state, { ...INITIAL_STATE });
      MyConsole.debug('State reset');
    },
  };

  /*
   * Resets idle timer: after cacheIdleClearMs with no further cache activity, SQL + DOM caches clear.
   */
  const _touchCacheIdleClear = () => {
    const delay = CONFIG.performance.cacheIdleClearMs;
    if (!delay || delay <= 0) return;

    let cacheIdleTimer = StateManager.get('cacheIdleTimer');
    clearTimeout(cacheIdleTimer);
    cacheIdleTimer = setTimeout(() => {
      StateManager.update({ cacheIdleTimer: null });
      SQL.clearCache();
      DOM.clearCache();
      MyConsole.debug('SQL and DOM caches auto-cleared after idle period');
    }, delay);
    StateManager.update({ cacheIdleTimer });
  };

  // ============================================================================
  // LOGGING & ERROR HANDLING
  // ============================================================================

  const MyConsole = {
    log (...args) {
      const timestamp = new Date().toISOString();
      console.log(`[ASPEN ${timestamp}]:`, ...args);
    },

    debug (...args) {
      if (CONFIG.debug) {
        const timestamp = new Date().toISOString();
        console.log(`[ASPEN ${timestamp}]:`, ...args);
      }
    },

    table (...args) {
      if (CONFIG.debug) {
        console.table(...args);
      }
    },
  };


  const ErrorHandler = {
    _normalizeLogArgs (contextOrError = '', errorOrContext = null) {
      const contextFirst = typeof contextOrError === 'string';
      const errorFirst = typeof errorOrContext === 'string' && !contextFirst;

      if (contextFirst) return { context: contextOrError, error: errorOrContext };
      if (errorFirst) return { context: errorOrContext, error: contextOrError };
      return { context: '', error: contextOrError };
    },

    log (contextOrError = '', errorOrContext = null) {
      const { context, error } = this._normalizeLogArgs(contextOrError, errorOrContext);
      const contextText = context ? ` [${context}]` : '';
      console.error(`ASPEN Query Error${contextText}:`, error);
      if (CONFIG.debug) console.trace();
    },

    notify (userMessage, error = null) {
      DOM.showWarning(userMessage);
      if (error) this.log('User Notification', error);
    },

    handle (error, context = '', userMessage = CONFIG.messages.error.general) {
      this.log(context, error);
      this.notify(userMessage);
    },
  };


  // ============================================================================
  // SQL GENERATION
  // ============================================================================

  const SQL = {
    // Cache management
    _cache: new Map(),
    _componentCache: new Map(),
    _stats: { hits: 0, misses: 0, generated: 0 },

    // Optimized regex patterns for SQL minification
    _regexPatterns: Object.freeze({
      lineComments: /--.*$/gm,
      blockComments: /\/\*[\s\S]*?\*\//g,
      multipleSpaces: /\s+/g,
      leadingSpaces: /^\s+/gm,
      trailingSpaces: /\s+$/gm,
    }),

    /*
     * Validates and sanitizes input code
     * @param {string} inputCode - Device code to validate
     * @returns {string} Sanitized input code
     * @throws {Error} If input code is invalid
     */
    _validateInput (inputCode) {
      if (!inputCode || typeof inputCode !== 'string') throw new Error('Input code must be a non-empty string');

      const trimmed = inputCode.trim().toUpperCase();
      if (!CONFIG.patterns.device.test(trimmed)) throw new Error(`Invalid device code format: ${inputCode}`);

      return trimmed;
    },

    /*
     * Validates query status
     * @param {string} status - Query status
     * @returns {string} Validated status
     * @throws {Error} If status is invalid
     */
    _validateStatus (status) {
      const validStatuses = [CONFIG.status.IN_SERVICE, CONFIG.status.ISSUED];
      if (!validStatuses.includes(status)) throw new Error(`Invalid status: ${status}`);
      return status;
    },

    /*
     * Minifies SQL by removing comments and normalizing whitespace
     * @param {string} sql - SQL query string
     * @returns {string} Minified SQL
     */
    _minify (sql) {
      if (!sql?.trim()) return '';

      try {
        return sql
          .replace(this._regexPatterns.lineComments, '')
          .replace(this._regexPatterns.blockComments, '')
          .replace(this._regexPatterns.multipleSpaces, ' ')
          .replace(this._regexPatterns.leadingSpaces, '')
          .replace(this._regexPatterns.trailingSpaces, '')
          .trim();
      } catch (error) {
        ErrorHandler.log('SQL minification failed:', error);
        return sql.trim(); // Return original if minification fails
      }
    },

    /*
     * Generates optimized SQL query for ASPEN relay protection settings
     * @param {string} inputCode - Device code (e.g., 'ABC 12F123')
     * @param {string} [status=CONFIG.status.IN_SERVICE] - Query status
     * @returns {string} Generated and minified SQL query
     * @throws {Error} For invalid input parameters
     */
    generate (inputCode, status = CONFIG.status.IN_SERVICE) {
      try {
        // Validate inputs
        const validatedCode = this._validateInput(inputCode);
        const validatedStatus = this._validateStatus(status);
        // Check cache first
        const cacheKey = `${validatedCode}|${validatedStatus}`;

        if (this._cache.has(cacheKey)) {
          this._stats.hits++;
          MyConsole.debug(`SQL cache hit for: ${cacheKey}`);
          return this._cache.get(cacheKey);
        }

        // Generate new SQL
        this._stats.misses++;
        const sql = this._buildSQL(validatedCode, validatedStatus);
        const minifiedSql = this._minify(sql);

        // Cache with size management
        this._cacheWithLimit(cacheKey, minifiedSql);
        this._stats.generated++;

        MyConsole.debug(`SQL generated for: ${cacheKey}`);
        return minifiedSql;
      } catch (error) {
        ErrorHandler.log('SQL generation failed:', error);
        throw error;
      } finally {
        _touchCacheIdleClear();
      }
    },

    /*
     * Manages cache size to prevent memory leaks
     * @private
     */
    _cacheWithLimit (key, value) {
      if (this._cache.size >= CONFIG.performance.maxCacheSize) {
        // Remove oldest entries (FIFO)
        const firstKey = this._cache.keys().next().value;
        this._cache.delete(firstKey);
      }
      this._cache.set(key, value);
    },

    /*
     * Gets cached SQL component list with validation
     * @private
     */
    _getCachedList (key, array) {
      if (!Array.isArray(array)) throw new Error(`Expected array for key '${key}'`);

      MyConsole.debug(`Getting cached list for: ${this._formatSqlList(array)}`);
      if (!this._componentCache.has(key)) {
        this._componentCache.set(key, this._formatSqlList(array));
      }
      _touchCacheIdleClear();
      return this._componentCache.get(key);
    },

    /*
     * Formats array as SQL IN list with proper escaping
     * @private
     */
    _formatSqlList (array) {
      return array
        .filter((item) => item != null)
        .map((item) => `'${String(item).replace(/'/g, `''`)}'`) // Remove null/undefined
        .join(', ');
    },

    /*
     * Builds complete SQL query string with proper formatting
     * @private
     */
    _buildSQL (inputCode, status) {
      try {
        const settingsList = this._getCachedList('settings', CONFIG.sql.settingNames);
        const lobLen = CONFIG.sql.dbmsLobLength;

        const baseSettings = `
          WITH base_settings AS (
          SELECT R.S01 AS DEVICE,
            Q.RELAYTYPE AS RELAY,
            T.SETTINGNAME AS ELEMENT,
            DBMS_LOB.SUBSTR(S.SETTING, ${lobLen}, 1) AS SETTING,
            Q.M01 AS MEMO,
            S.REQUESTID,
            S.ROWNUMBER,
            TO_NUMBER(
              REGEXP_SUBSTR(T.SETTINGNAME, 'SUBSET (\\d+)', 1, 1, NULL, 1)
            ) AS SUBSET_NUM
          FROM TRELAY R
            INNER JOIN TREQUEST Q ON R.ID = Q.RELAYID
            INNER JOIN TSETTING1 S ON Q.ID = S.REQUESTID
            INNER JOIN TSETTYPE1 T ON T.RELAYTYPE = Q.RELAYTYPE
            AND T.ROWNUMBER = S.ROWNUMBER
          WHERE R.S01 LIKE '${inputCode}%'
            AND R.RELAYTYPE LIKE 'AREVA%'
            AND UPPER(Q.S02) = '${status}'
            AND S.GROUPNAME = 'PARAMETERS'
            AND UPPER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLen}, 1)) != 'BLOCKED'
            AND (
              T.SETTINGNAME LIKE '%/IDMT1%'
              OR T.SETTINGNAME LIKE '%/DTOC%'
            )
          ),`;

        const enableSettings = `
          enable_settings AS (
            SELECT SE.REQUESTID,
              TE.ROWNUMBER,
              SE.SETTING AS ENABLE_VALUE,
              TO_NUMBER(
                REGEXP_SUBSTR(TE.SETTINGNAME, 'SUBSET (\\d+)', 1, 1, NULL, 1)
              ) AS SUBSET_NUM
            FROM TSETTING1 SE
              INNER JOIN TSETTYPE1 TE ON TE.ROWNUMBER = SE.ROWNUMBER
              INNER JOIN TREQUEST QE ON QE.ID = SE.REQUESTID
              AND TE.RELAYTYPE = QE.RELAYTYPE
              INNER JOIN TRELAY RE ON RE.ID = QE.RELAYID
            WHERE SE.GROUPNAME = 'PARAMETERS'
              AND TE.SETTINGNAME LIKE '%SUBSET _/F<>/ENABLE%'
              AND RE.S01 LIKE '${inputCode}%'
              AND RE.RELAYTYPE LIKE 'AREVA%'
              AND UPPER(QE.S02) = '${status}'
          ),`;

        const selCtr = `
          sel_ctr AS (
          SELECT TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLen})) AS val
          FROM TSETTING1 S,
            TSETTYPE1 T,
            TRELAY R,
            TREQUEST Q
          WHERE R.S01 LIKE '${inputCode}%'
            AND R.RELAYTYPE LIKE 'SEL%'
            AND R.ID = Q.RELAYID
            AND Q.ID = S.REQUESTID
            AND T.RELAYTYPE = Q.RELAYTYPE
            AND T.ROWNUMBER = S.ROWNUMBER
            AND S.GROUPNAME = '1'
            AND T.SETTINGNAME = 'CTR'
            AND UPPER(Q.S02) = '${status}'
          ),`;

        const selTr = `
          sel_tr AS (
          SELECT S.SETTING AS val
          FROM TSETTING1 S,
            TSETTYPE1 T,
            TRELAY R,
            TREQUEST Q
          WHERE R.S01 LIKE '${inputCode}%'
            AND R.RELAYTYPE LIKE 'SEL%'
            AND R.ID = Q.RELAYID
            AND Q.ID = S.REQUESTID
            AND T.RELAYTYPE = Q.RELAYTYPE
            AND T.ROWNUMBER = S.ROWNUMBER
            AND S.GROUPNAME = 'L1'
            AND T.SETTINGNAME = 'TR'
            AND UPPER(Q.S02) = '${status}'
          )`;

        const arevaMain = `
        SELECT b.DEVICE,
          b.RELAY,
          b.ELEMENT,
          b.SETTING,
          b.MEMO
        FROM base_settings b
          LEFT JOIN enable_settings e ON e.REQUESTID = b.REQUESTID
          AND e.SUBSET_NUM = b.SUBSET_NUM
        WHERE UPPER(DBMS_LOB.SUBSTR(e.ENABLE_VALUE, ${lobLen}, 1)) = 'YES'
          AND b.ELEMENT NOT LIKE '%/PULS.PROL.IN>%'
          AND b.ELEMENT NOT LIKE '%/HOLD-T. TIN>%'
          AND b.ELEMENT NOT LIKE '%/EVALUATION IN%'
          AND b.ELEMENT NOT LIKE '%/EVAL. IN%'
        UNION ALL
        SELECT R.S01 AS DEVICE,
          Q.RELAYTYPE AS RELAY,
          T.SETTINGNAME AS ELEMENT,
          DBMS_LOB.SUBSTR(S.SETTING, ${lobLen}, 1) AS SETTING,
          Q.M01 AS MEMO
        FROM TRELAY R
          INNER JOIN TREQUEST Q ON R.ID = Q.RELAYID
          INNER JOIN TSETTING1 S ON Q.ID = S.REQUESTID
          INNER JOIN TSETTYPE1 T ON T.RELAYTYPE = Q.RELAYTYPE
          AND T.ROWNUMBER = S.ROWNUMBER
        WHERE R.S01 LIKE '${inputCode}%'
          AND R.RELAYTYPE LIKE 'AREVA%'
          AND UPPER(Q.S02) = '${status}'
          AND S.GROUPNAME = 'PARAMETERS'
          AND T.SETTINGNAME LIKE '%/GLOBAL/MAIN/INOM C.T. PRIM.%'
          AND UPPER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLen}, 1)) != 'BLOCKED'`;

        const selMain = `
        SELECT R.S01 AS DEVICE,
          Q.RELAYTYPE AS RELAY,
          T.SETTINGNAME AS ELEMENT,
          CASE
            WHEN T.SETTINGNAME NOT LIKE '%C'
            AND T.SETTINGNAME NOT LIKE '%D'
            AND T.SETTINGNAME NOT LIKE '%T'
            AND T.SETTINGNAME NOT LIKE '%OI%'
            AND S.GROUPNAME = '1'
            AND DBMS_LOB.SUBSTR(S.SETTING, ${lobLen}) <> 'OFF' 
            THEN UPPER(
              TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLen})) * (
                SELECT val
                FROM sel_ctr
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
        FROM TSETTING1 S,
          TSETTYPE1 T,
          TRELAY R,
          TREQUEST Q
        WHERE R.S01 LIKE '${inputCode}%'
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
                  SELECT val
                  FROM sel_tr
                )
                OR T.SETTINGNAME IN ('51P1TC', '51PTC', 'TR')
              )
            )
          )`;

        const electroMain = `
        SELECT R.S01 AS DEVICE,
          Q.RELAYTYPE AS RELAY,
          R.S06 AS VENDOR,
          TO_CHAR(R.S04) AS MODEL,
          Q.M01 AS MEMO
        FROM TRELAY R,
          TREQUEST Q
        WHERE R.S01 LIKE '${inputCode}%'
          AND UPPER(R.RELAYTYPE) LIKE 'ELECTRO%'
          AND R.ID = Q.RELAYID
          AND UPPER(Q.S02) = '${status}'`;

        const sql = `${baseSettings} ${enableSettings} ${selCtr} ${selTr} 
        ${arevaMain} UNION ALL ${selMain} UNION ALL ${electroMain}`;
        return sql;

      } catch (error) {
        ErrorHandler.log('SQL building failed:', error);
        throw new Error(`Failed to build SQL query: ${error.message} `);
      }
    },

    /*
     * Clears all caches and resets statistics
     */
    clearCache () {
      this._cache.clear();
      this._componentCache.clear();
      this._stats = { hits: 0, misses: 0, generated: 0 };
      MyConsole.debug('SQL caches cleared');
    },

    /*
     * Gets cache performance statistics
     * @returns {Object} Cache statistics
     */
    getStats () {
      return {
        ...this._stats,
        cacheSize: this._cache.size,
        componentCacheSize: this._componentCache.size,
        hitRatio: this._stats.hits > 0
          ? (this._stats.hits / (this._stats.hits + this._stats.misses)).toFixed(3)
          : '0.000',
        memoryUsage: this._estimateMemoryUsage(),
      };
    },

    /*
     * Estimates memory usage of caches
     * @returns {string} Estimated memory usage
     * @private
     */
    _estimateMemoryUsage () {
      try {
        const cacheEntries = Array.from(this._cache.values()).join('');
        const componentEntries = Array.from(this._componentCache.values()).join('');
        const totalChars = cacheEntries.length + componentEntries.length;
        return `~${Math.round((totalChars * 2) / 1024)} KB`; // Rough estimate (2 bytes per char)
      } catch {
        return 'Unknown';
      }
    },
  };


  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const Utils = {
    /*
     * Safe property getter with optional chaining fallback
     * @param {Object} obj - Object to traverse
     * @param {string} path - Dot-notation path (e.g., 'a.b.c')
     * @param {*} defaultValue - Default value if path not found
     * @returns {*} Property value or default
     */
    safeGet (obj, path, defaultValue = null) {
      if (!obj || typeof obj !== 'object' || !path) return defaultValue;

      try {
        return (
          path.split('.').reduce((current, key) => {
            return current && typeof current === 'object' && key in current ? current[key] : undefined;
          }, obj) ?? defaultValue
        );
      } catch (error) {
        MyConsole.debug('SafeGet error:', error);
        return defaultValue;
      }
    },

    /*
     * Converts array-like objects to proper arrays with validation
     * @param {*} value - Value to convert
     * @returns {Array} Converted array
     */
    toArray (value) {
      if (value === null || value === undefined) return [];
      if (Array.isArray(value)) return [...value];
      if (typeof value === 'object' && typeof value.length === 'number') {
        try { return Array.from(value); } catch { return []; }
      }
      if (typeof value === 'object') return Object.values(value);
      return [value];
    },

    /*
     * Validates if value is a non-empty array
     * @param {*} value - Value to check
     * @returns {boolean} True if non-empty array
     */
    hasElements (value) {
      return Array.isArray(value) && value.length > 0;
    },

    /*
     * Enhanced regex validator with error handling
     * @param {RegExp} pattern - Regex pattern
     * @param {*} value - Value to test
     * @returns {boolean} True if pattern matches
     */
    validatePattern (pattern, value) {
      if (!(pattern instanceof RegExp)) return false;
      try {
        return pattern.test(String(value.trim() || ''));
      } catch (error) {
        MyConsole.debug('Pattern validation error:', error);
        return false;
      }
    },

    /*
     * Debounces function execution
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    debounce (func, delay = CONFIG.performance.debounceDelay) {
      let timeoutId;
      return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
      };
    },

    /*
     * Throttles function execution
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle (func, limit = CONFIG.performance.throttleLimit) {
      let inThrottle;
      return function (...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => (inThrottle = false), limit);
        }
      };
    },

    /*
     * Validates device code format
     * @param {string} code - Device code to validate
     * @returns {boolean} True if valid format
     */
    isValidDeviceCode (code) {
      return this.validatePattern(CONFIG.patterns.device, code);
    },

    /*
     * Formats device code consistently
     * @param {string} code - Device code to format
     * @returns {string} Formatted code
     */
    formatDeviceCode (code) {
      return String(code || '').toUpperCase();
    },

    /*
     * Creates a retry wrapper for async functions
     * @param {Function} asyncFn - Async function to retry
     * @param {number} maxRetries - Maximum retry attempts
     * @param {number} delay - Delay between retries
     * @returns {Function} Wrapped function with retry logic
     */
    withRetry (asyncFn, maxRetries = CONFIG.performance.maxRetries, delay = 1000) {
      return async function retryWrapper (...args) {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            return await asyncFn.apply(this, args);
          } catch (error) {
            StateManager.update({ lastError: error });
            if (attempt < maxRetries) {
              MyConsole.debug(`Retry attempt ${attempt + 1}/${maxRetries} after error:`, error.message);
              await new Promise((resolve) => setTimeout(resolve, delay * (attempt + 1))); // Exponential backoff
            }
          }
        }
        throw lastError;
      };
    },

    /*
     * Performance timing utility
     * @param {string} label - Performance label
     * @returns {Function} Function to end timing
     */
    startTiming (label) {
      const startTime = performance.now();
      return function endTiming () {
        const duration = performance.now() - startTime;
        MyConsole.log(`${label}: ${duration.toFixed(2)}ms`);
        return duration;
      };
    },
  };

  // ============================================================================
  // DOM UTILITIES
  // ============================================================================

  const DOM = {
    // Element cache for improved performance
    _elementCache: new Map(),
    _propertySetters: new Map([
      ['style', (el, val) => (el.style.cssText = val)],
      ['textContent', (el, val) => (el.textContent = val)],
      ['className', (el, val) => (el.className = val)],
      ['onclick', (el, val) => (el.onclick = val)],
      ['innerHTML', (el, val) => (el.innerHTML = val)],
      ['id', (el, val) => (el.id = val)],
      ['title', (el, val) => (el.title = val)],
      ['placeholder', (el, val) => (el.placeholder = val)],

    ]),

    /*
     * Creates DOM element with enhanced property setting
     * @param {string} tag - HTML tag name
     * @param {Object} [options={}] - Element properties and attributes
     * @returns {HTMLElement} Created element
     * @throws {Error} If element creation fails
     */
    createElement (tag, options = {}) {
      if (!tag || typeof tag !== 'string') {
        throw new Error('Invalid tag name for createElement');
      }
      try {
        const element = document.createElement(tag);
        Object.entries(options).forEach(([key, value]) => {
          if (value === null || value === undefined) return;
          const setter = this._propertySetters.get(key);
          if (setter) {
            MyConsole.debug('setter:', setter, 'value:', value);
            setter(element, value);
          } else if (key.startsWith('data-') || key.startsWith('aria-')) {
            element.setAttribute(key, String(value));
          } else if (key === 'classList') {
            element.classList.add(...value.split(/\s+/).filter(Boolean));
          } else {
            try { element[key] = value; }
            catch { element.setAttribute(key, String(value)); }
          }
        });
        return element;
      } catch (error) {
        ErrorHandler.log('Element creation failed:', error);
        throw new Error(`Failed to create ${tag} element: ${error.message}`, { cause: error });
      }
    },

    /*
     * Gets element by ID with intelligent caching
     * @param {string} id - Element ID
     * @param {boolean} [silent=false] - Suppress warnings
     * @returns {HTMLElement|null} Found element or null
     */
    getElement (id, silent = false) {
      if (!id || typeof id !== 'string') {
        if (!silent) MyConsole.debug('Invalid element ID provided:', id);
        return null;
      }

      try {
        // Check cache first
        if (this._elementCache.has(id)) {
          const element = this._elementCache.get(id);
          // Verify element is still in DOM
          if (document.contains(element)) return element;
          // Remove stale cache entry
          this._elementCache.delete(id);
        }

        // Query DOM
        const element = document.getElementById(id);

        if (!element && !silent) MyConsole.debug(`Element with id '${id}' not found in DOM`);
        // Cache successful lookups
        if (element) this._elementCache.set(id, element);
        return element;
      } catch (error) {
        if (!silent) ErrorHandler.log('Element lookup failed:', error);
        return null;
      } finally {
        _touchCacheIdleClear();
      }
    },

    cacheElement (id, element) {
      if (id && element) {
        this._elementCache.set(id, element);
        _touchCacheIdleClear();
      }
    },
    /*
     * Shows warning message with enhanced UX
     * @param {string} message - Warning message text
     * @param {string} [type='warning'] - Message type (warning, error, info)
     */
    showWarning (message, type = 'warning') {
      const warningEl = this.getElement(CONFIG.selectors.warning, true);
      if (!warningEl) return;

      try {
        warningEl.textContent = String(message || '');
        // Add type-specific styling
        warningEl.className = `${CONFIG.classes.warning} ${type}`;
      } catch (error) {
        ErrorHandler.log('Warning display failed:', error);
      }
    },

    /*
     * Shows success message
     * @param {string} message - Success message
     */
    showSuccess (message) {
      this.showWarning(message, 'success');
    },

    /*
     * Shows error message
     * @param {string} message - Error message
     */
    showError (message) {
      this.showWarning(message, 'error');
    },

    /*
     * Shows info message
     * @param {string} message - Info message
     */
    showInfo (message) {
      this.showWarning(message, 'info');
    },

    /*
     * Resets application state through StateManager
     */
    resetState () { StateManager.reset(); },
    /*
     * Clears all UI elements and state
     */
    clearAll () {
      try {
        // Clear messages
        this.showWarning('');
        // Remove results container
        const container = this.getElement(CONFIG.selectors.container, true);
        container?.remove();

        // Clear SQL editor
        const sqlEditor = this.getElement(CONFIG.selectors.sqlEditor, true);
        if (sqlEditor) sqlEditor.textContent = '';
        // Reset state
        this.resetState();
        // Clear element cache for removed elements
        this._clearStaleCache();
      } catch (error) {
        ErrorHandler.log('Clear all failed:', error);
      }
    },

    /*
     * Removes stale entries from element cache
     * @private
     */
    _clearStaleCache () {
      for (const [id, element] of this._elementCache.entries()) {
        if (!document.contains(element)) this._elementCache.delete(id);
      }
    },
    /*
     * Injects CSS for input validation styling
     */
    injectStyles () {
      if (this.getElement(CONFIG.selectors.style, true)) return;

      const style = this.createElement('style', { id: CONFIG.selectors.style });
      style.textContent = `
        input:valid { background-color: #dcf1da; }
        input:invalid { background-color: #fedad0; }
        .aspen-search-wrapper {padding: 10px;box-shadow: rgba(23, 43, 77, 0.1) 0px 2px 2px, rgba(23, 43, 77, 0.1) 2px 2px 2px; justify-content: center; display: grid;grid-template-columns: minmax(150px, 13%) minmax(150px, 7%);grid-template-rows: 1fr 1fr;grid-column-gap: 10px; z-index: 1000;}
        .aspen-warning { color: #fa4616; font-size: 0.9rem; margin: auto 5px; font-weight: bold; grid-column: 1 / span 2; grid-row: 2; }
        .aspen-table { border-collapse: collapse; max-width: 100%; font-family: monospace; font-size: 0.9rem; border: 1px solid #bbb; box-shadow: rgba(23, 43, 77, 0.1) 0px 2px 2px, rgba(23, 43, 77, 0.1) 2px 2px 2pxs; text-wrap-style: balance; }
        .aspen-table th { padding: 8px;  text-align: left; background-color: #eee; font-weight: bold; border: 1px solid #bbb; font-size: 1rem; }
        .aspen-table td { padding: 6px;  vertical-align: middle; white-space: pre-wrap; border: 1px solid #bbb; }
        .aspen-container { margin: 20px 0; padding: 10px; border: 1px solid #ccc; }
        #aspen-search-status-menu { position: absolute; transform: translate3d(0px, 33px, 0px); top: 0; left: 0; will-change: transform; } .merged { font-size: 1rem;}
        #searchInput { grid-column: 1 / 2; grid-row: 1; }
        #searchButton { grid-column: 2 / 3; grid-row: 1;  } #searchButton:focus-visible { outline: none; }
        .dropdown:focus-within .dropdown-menu { display: block; }`;
      document.head.appendChild(style);
    },

    attachEventListener (element, event, handler, options = {}) {
      if (!element || typeof handler !== 'function') {
        throw new Error('Invalid element or handler for addEventListener');
      }

      const wrapped = (e) => {
        try { return handler(e); }
        catch (error) { ErrorHandler.log(`Event handler error for ${event}:`, error); }
      };
      element.addEventListener(event, wrapped, options);
      return () => element.removeEventListener(event, wrapped, options);
    },

    /*
     * Gets cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats () {
      return {
        size: this._elementCache.size,
        keys: Array.from(this._elementCache.keys()),
        memoryEstimate: `~${this._elementCache.size * 50}B`, // Rough estimate
      };
    },

    /*
     * Clears all DOM cache
     */
    clearCache () {
      this._elementCache.clear();
      MyConsole.debug('DOM cache cleared');
    },
  };
  // ============================================================================
  // SEARCH COMPONENT
  // ============================================================================

  const SearchComponent = {
    _initialized: false,
    _eventHandlers: new Map(),
    /*
     * Initializes search component
     */
    async init () {
      if (this._initialized) {
        this._cleanupEventHandlers();
        this._initialized = false;
        MyConsole.debug('Search component already initialized');
        return;
      }

      const endInitTiming = Utils.startTiming('SearchComponent.init');

      try {
        await this._createSearchUI();
        this._switchQueryEditor();
        this._attachEventHandlers();
        this._initialized = true;

        MyConsole.debug('Search component initialized successfully');
      } catch (error) {
        ErrorHandler.log('Search component initialization failed:', error);
        DOM.showError('Failed to initialize search interface');
        throw error;
      } finally {
        endInitTiming();
      }
    },

    /*
     * Injects external dependencies if available
     * @private
     */
    _switchQueryEditor () {
      try {
        if (typeof window.editorReady === 'function') {
          window.editorReady('SQLEditor');
          MyConsole.debug('SQL editor initialized');
        }
        if (window.editorType === 'Wizard' && typeof window.switchEditor === 'function') {
          window.switchEditor();
          MyConsole.debug('Query editor switched to Wizard mode');
        }
      } catch (error) {
        MyConsole.debug('Query editor switch failed:', error);
        // Non-critical error, continue initialization
      }
    },

    /*
     * Creates search bar UI elements
     * @private
     */
    async _createSearchUI () {
      if (DOM.getElement(CONFIG.selectors.searchContainer, true)) return;
      try {
        const wrapper = DOM.createElement('div', {
          id: CONFIG.selectors.searchContainer,
          className: CONFIG.classes.searchWrapper,
        });

        const input = DOM.createElement('input', {
          type: 'text',
          id: CONFIG.selectors.input,
          placeholder: CONFIG.messages.ui.placeholder,
          className: CONFIG.classes.input,
          pattern: CONFIG.patterns.input.source,
          title: CONFIG.messages.ui.inputPattern,
        });

        const button = DOM.createElement('button', {
          type: 'button',
          id: CONFIG.selectors.button,
          className: CONFIG.classes.button,
          textContent: CONFIG.messages.ui.searchButton,
          'data-toggle': 'dropdown',
          'aria-expanded': 'false',
        });

        const warning = DOM.createElement('em', {
          id: CONFIG.selectors.warning,
          className: CONFIG.classes.warning,
        });

        const inService = DOM.createElement('a', {
          id: CONFIG.selectors.inService,
          href: '#',
          className: CONFIG.classes.statusMenuItem,
          textContent: CONFIG.status.IN_SERVICE,
        });

        const issued = DOM.createElement('a', {
          id: CONFIG.selectors.issued,
          href: '#',
          className: CONFIG.classes.statusMenuItem,
          textContent: CONFIG.status.ISSUED,
        });

        const statusMenu = DOM.createElement('div', {
          id: CONFIG.selectors.statusMenu,
          className: CONFIG.classes.statusMenu,
          'x-placement': 'bottom-start',
        });

        const userQueryMenu = DOM.createElement('div', {
          className: CONFIG.classes.userQueryMenu,
        });

        statusMenu.append(inService, issued);
        userQueryMenu.append(button, statusMenu);
        wrapper.append(input, userQueryMenu, warning);
        document.body.insertBefore(wrapper, document.body.firstChild);

        DOM.cacheElement(CONFIG.selectors.searchContainer, wrapper);
        DOM.cacheElement(CONFIG.selectors.input, input);
        DOM.cacheElement(CONFIG.selectors.button, button);
        DOM.cacheElement(CONFIG.selectors.warning, warning);
        DOM.cacheElement(CONFIG.selectors.statusMenu, statusMenu);
        DOM.cacheElement(CONFIG.selectors.inService, inService);
        DOM.cacheElement(CONFIG.selectors.issued, issued);

        DOM.injectStyles();
      } catch (error) {
        ErrorHandler.log('Failed to create search UI:', error);
        throw new Error('Search interface creation failed');
      }
    },

    /*
     * Attaches modern event handlers with proper error handling
     * @private
     */
    _attachEventHandlers () {
      const button = DOM.getElement(CONFIG.selectors.button);
      const input = DOM.getElement(CONFIG.selectors.input);
      const inService = DOM.getElement(CONFIG.selectors.inService);
      const issued = DOM.getElement(CONFIG.selectors.issued);
      const statusMenu = DOM.getElement(CONFIG.selectors.statusMenu);

      if (!button || !input || !inService || !issued || !statusMenu) {
        throw new Error('Required UI elements missing');
      }

      const inServiceHandler = (event) => {
        event.preventDefault();
        this._handleSearch(input, CONFIG.status.IN_SERVICE);
        DOM.showInfo(CONFIG.messages.info.searching);
      };
      this._eventHandlers.set('in-service-click', DOM.attachEventListener(inService, 'click', inServiceHandler));

      const issuedHandler = (event) => {
        event.preventDefault();
        this._handleSearch(input, CONFIG.status.ISSUED);
        DOM.showInfo(CONFIG.messages.info.searching);
      };
      this._eventHandlers.set('issued-click', DOM.attachEventListener(issued, 'click', issuedHandler));

      // Enter key handler
      const keyHandler = Utils.debounce((event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          this._handleSearch(input);
          DOM.showInfo(CONFIG.messages.info.searching);
        }
      }, 150);
      this._eventHandlers.set('input-keydown', DOM.attachEventListener(input, 'keydown', keyHandler));
      // Real-time input formatting and validation
      const inputHandler = Utils.throttle(() => {
        const formatted = Utils.formatDeviceCode(input.value);
        if (input.value !== formatted) {
          input.value = formatted;
        }
        this._validateInputRealtime(input);
      }, 150);

      this._eventHandlers.set('input-change', DOM.attachEventListener(input, 'input', inputHandler));

      // Focus handling for better UX
      const focusHandler = () => DOM.showWarning('');
      this._eventHandlers.set('input-focusin', DOM.attachEventListener(input, 'focusin', focusHandler));

      MyConsole.debug('Event handlers attached successfully');

    },

    _cleanupEventHandlers () {
      for (const [key, cleanup] of this._eventHandlers.entries()) {
        if (typeof cleanup === 'function') cleanup();
      }
      this._eventHandlers.clear();
    },

    /*
     * Real-time input validation with visual feedback
     * @param {HTMLInputElement} input - Input element to validate
     * @private
     */
    _validateInputRealtime (input) {
      const value = input.value;
      const isValid = Utils.isValidDeviceCode(value);

      // Update visual state
      input.classList.toggle('valid', isValid && value.length > 0);
      input.classList.toggle('invalid', !isValid && value.length > 0);

      // Update button state
      const button = DOM.getElement(CONFIG.selectors.button, true);
      if (button) button.disabled = !isValid && value.length > 0;

    },

    /*
     * Enhanced search handler with comprehensive validation and UX
     * @param {HTMLInputElement} inputEl - Search input element
     * @returns {Promise<void>}
     * @private
     */
    async _handleSearch (inputEl, status = null) {
      if (StateManager.get('isProcessing')) return;

      try {
        // Clear previous state and UI
        DOM.clearAll();
        // Validate and format inputs
        const searchValue = Utils.formatDeviceCode(inputEl.value);
        StateManager.update({ startTime: performance.now() });

        if (!searchValue) throw new Error('Search value cannot be empty');
        if (!Utils.isValidDeviceCode(searchValue)) {
          throw new Error(CONFIG.messages.validation.invalidFormat);
        }
        // Update state
        StateManager.update({
          isProcessing: true,
          lastQuery: searchValue,
          queryCount: StateManager.get('queryCount') + 1,
        });
        // Execute search
        await this._executeSearch(searchValue, status);
      } catch (error) {
        ErrorHandler.log('Search execution failed:', error);
        if (error.message === CONFIG.messages.validation.invalidFormat) {
          DOM.showWarning(error.message, 'warning');
        } else {
          DOM.showError(error.message || CONFIG.messages.error.general);
        }
      } finally {
        StateManager.update({ isProcessing: false });
      }
    },

    /*
     * Executes search with intelligent fallback strategy
     * @param {string} searchValue - Validated search value
     * @returns {Promise<void>}
     * @private
     */
    async _executeSearch (searchValue, status = null) {
      const endSearchTiming = Utils.startTiming('Search Execution');

      try {
        // Try IN SERVICE first
        MyConsole.debug(`Executing search for: ${searchValue}`);
        if (status !== CONFIG.status.ISSUED) {
          const inServiceSuccess = await this._executeStatusSearch(searchValue, CONFIG.status.IN_SERVICE);
          if (inServiceSuccess) {
            MyConsole.debug('IN SERVICE results found and processed');
            DOM.showSuccess(CONFIG.messages.success.inService);
            return;
          }
          MyConsole.debug('No IN SERVICE results found, trying ISSUED settings');
          DOM.showInfo(CONFIG.messages.info.noInServiceResults);
        }

        if (status !== CONFIG.status.IN_SERVICE) {
          const issuedSuccess = await this._executeStatusSearch(searchValue, CONFIG.status.ISSUED);
          if (issuedSuccess) {
            DOM.showSuccess(CONFIG.messages.success.issued);
            return;
          }
        }
        // No results found for either status
        MyConsole.debug('No results found for either status');
        DOM.showWarning(CONFIG.messages.info.noResults, 'warning');
      } catch (error) {
        ErrorHandler.log('Search execution failed:', error);
        // Provide specific error messages based on error type
        if (error.message.includes('timeout')) {
          DOM.showError(CONFIG.messages.error.timeout);
        } else if (error.message.includes('unavailable')) {
          DOM.showError(CONFIG.messages.error.queryUnavailable);
        } else {
          DOM.showError(CONFIG.messages.error.general);
        }
        throw error;
      } finally {
        endSearchTiming();
      }
    },

    /*
     * Executes search for specific status with enhanced error handling
     * @param {string} searchValue - Search value
     * @param {string} status - Query status (IN_SERVICE or ISSUED)
     * @returns {Promise<boolean>} Success status
     * @private
     */
    async _executeStatusSearch (searchValue, status) {
      MyConsole.debug(`Starting ${status} search for: ${searchValue}`);

      try {
        const [fingerPrint, startTime] = this._runQuery(searchValue, status);
        MyConsole.debug(`Query initiated for ${status}, waiting for results...`);
        const getQueryResultsWithRetry = Utils.withRetry(
          () => {
            console.debug('getQueryResultsWithRetry:', ...arguments);
            return DataProcessor.getQueryResults(fingerPrint, startTime, status);
          },
          1,
          300
        );
        await getQueryResultsWithRetry();
        const success = await DataProcessor.processResults();

        MyConsole.debug(`${status} search completed with success: ${success}`);
        return success;
      } catch (error) {
        ErrorHandler.log(`${status} search failed:`, error);
        throw new Error(`${status} query failed: ${error.message}`, { cause: error });
      }
    },

    /*
     * Executes SQL query with enhanced error handling and validation
     * @param {string} searchValue - Device search value
     * @param {string} status - Query status
     * @returns {Array<string|number>} [fingerPrint, startTime]
     * @throws {Error} If query execution fails
     * @private
     */
    _runQuery (searchValue, status) {
      try {
        // Generate SQL with validation
        const sql = SQL.generate(searchValue, status);
        MyConsole.debug(`Generated SQL for ${status}:`, sql);
        this._displaySql(sql);

        // Validate query system availability
        const queryResult = window._C1MVCCtrl5;
        if (!queryResult) throw new Error('Query system controller not available');
        if (typeof queryResult._src === 'undefined') {
          throw new Error('Query fingerprint system not initialized');
        }
        // Capture fingerprint before query execution
        const fingerPrint = queryResult._src;
        const startTime = Date.now();

        // Validate runQuery function exists
        if (typeof window.runQuery !== 'function') {
          throw new Error('Query execution function not available');
        }
        // Execute query
        window.runQuery();

        MyConsole.debug('fingerprint:', fingerPrint);
        return [fingerPrint, startTime];
      } catch (error) {
        ErrorHandler.log('Query execution setup failed:', error);
        throw new Error(`Query setup failed: ${error.message}`, { cause: error });
      }
    },

    /*
     * Displays SQL in editor with enhanced formatting
     * @param {string} sql - SQL query to display
     * @private
     */
    _displaySql (sql) {
      const editor = DOM.getElement(CONFIG.selectors.sqlEditor, true);
      if (!editor) {
        MyConsole.debug('SQL editor not available for display');
        return;
      }
      // Set SQL content with proper formatting
      editor.textContent = sql;
      // Add accessibility attributes
      editor.setAttribute('aria-label', 'Generated SQL Query');
      editor.setAttribute('role', 'textbox');
      editor.setAttribute('aria-readonly', 'true');

      MyConsole.debug('SQL query displayed in editor');
    },
  };

  // ============================================================================
  // DATA PROCESSOR
  // ============================================================================

  const DataProcessor = {
    // Reuse one collator instance for natural/numeric sorting performance.
    _naturalSortCollator: new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
    _queryDelay: 0,
    /*
     * Main processing pipeline for query results
     * @returns {Promise<boolean>} True if results were processed successfully
     */
    async processResults () {
      const endProcessingTiming = Utils.startTiming('DataProcessor.processResults');

      try {
        DOM.showInfo(CONFIG.messages.info.processing);
        MyConsole.debug('Starting comprehensive results processing pipeline');
        // Step 1: Prepare and validate table data
        if (!this._prepareTableData()) {
          MyConsole.debug('No table data available');
          return false;
        }
        MyConsole.debug('✓ Table data prepared and validated');
        // Step 2: Detect and validate relay type
        this._detectFeederRelay();
        MyConsole.debug('✓ Relay type detected');
        // Step 3: Enhance and process table data
        this._rearrangeTableData();
        MyConsole.debug('✓ Table data rearranged');

        const validation = this._validateData();
        if (!validation.isValid) {
          MyConsole.debug('Data validation issues detected:', validation.issues);
        }
        // Step 4: Render results
        this._renderResults();
        // Step 5: Setup additional features
        TableRenderer.setupDownloadButton(StateManager.get('feederId'));
        TableRenderer.hideOriginalResults();
        MyConsole.debug('✓ UI enhancements completed');

        this._logExecutionTime(StateManager.get('startTime'));
        return true;
      } catch (error) {
        ErrorHandler.log('Results processing pipeline failed:', error);
        DOM.showError('Failed to process query results');
        this._handleProcessingFailure(error);
        return false;
      } finally {
        endProcessingTiming();
      }
    },

    _handleProcessingFailure (originalError) {
      MyConsole.debug('Attempting graceful degradation');
      let headRow = StateManager.get('headerRow');
      let tableRows = StateManager.get('tableRows');
      if (Utils.hasElements(tableRows) && Utils.hasElements(headRow)) {
        MyConsole.debug('Rendering raw data as fallback');
        const container = TableRenderer.ensureContainer();
        TableRenderer.render(container, headRow, tableRows);
        DOM.showWarning('Results displayed with limited processing due to an error', 'warning');
      }
    },

    /*
     * Waits for query to complete
     * @private
     */
    async getQueryResults (fingerPrint, startTime, status) {
      return new Promise((resolve, reject) => {
        // Validate inputs
        if (typeof startTime !== 'number' || startTime <= 0) {
          reject(new Error(`Invalid query start time for '${status}': ${startTime}`));
          return;
        }

        if (!fingerPrint) {
          reject(new Error(`Invalid fingerprint for '${status}': ${fingerPrint}`));
          return;
        }

        MyConsole.debug(`Monitoring query completion for ${status}`);

        let pollCount = 0;
        const maxPolls = Math.ceil(CONFIG.sql.timing.timeout / CONFIG.sql.timing.pollInterval);

        const poll = () => {
          try {
            pollCount++;
            const elapsed = Date.now() - startTime;
            // Check for timeout
            if (elapsed > CONFIG.sql.timing.timeout) {
              reject(new Error(`Query timed out after ${elapsed}ms for '${status}'`));
              return;
            }
            // Validate query system availability
            const queryResult = window._C1MVCCtrl5;
            if (!queryResult || typeof queryResult._src === 'undefined') {
              reject(new Error(`Query system became unavailable during '${status}' execution`));
              return;
            }
            // Check for completion indicators
            const currentFingerprint = queryResult._src;
            const fingerprintChanged = currentFingerprint !== fingerPrint;
            const timeExceeded = elapsed > CONFIG.sql.timing.queryDelay + this._queryDelay;

            MyConsole.debug(`Query poll ${pollCount}/${maxPolls}:`, {
              elapsed: `${elapsed}ms`,
              fingerprintChanged,
              timeExceeded,
              currentFingerprint,
            });
            // Query completion conditions
            if (fingerprintChanged) {
              MyConsole.log(`✓ Query completed for '${status}' after ${elapsed}ms`);
              resolve();
              return;
            } else if (timeExceeded) {
              MyConsole.log(`Query for '${status}' - delay exceeded after ${elapsed}ms`);
              this._queryDelay = this._queryDelay + 2000;
              reject(new Error(`Query delay exceeded after ${elapsed}ms for '${status}'`));
              return;
            } else if (pollCount < maxPolls) {
              setTimeout(poll, CONFIG.sql.timing.pollInterval);
            } else {
              reject(new Error(`Maximum polling attempts exceeded for '${status}'`));
            }
          } catch (error) {
            reject(new Error(`Query monitoring failed for '${status}': ${error.message}`));
          }
        };
        // Start polling after initial delay
        setTimeout(poll, CONFIG.sql.timing.startDelay);
      });
    },

    /*
     * Loads state from global query result objects
     * @private
     */
    _prepareTableData () {
      try {
        // Access global result grid with comprehensive null checking
        const resultGrid = window.resultGrid;
        if (!resultGrid) {
          MyConsole.debug('No resultGrid found in window object');
          return false;
        }
        // Extract and validate headers
        const rawHeaders = Utils.safeGet(resultGrid, '_cols', []);
        const headerRow = Utils.toArray(rawHeaders).map((col) => Utils.safeGet(col, '_hdr', col) || 'Unknown Column');
        // Extract and validate rows
        const rawRows = Utils.safeGet(resultGrid, '_rows', []);
        const tableRows = Utils.toArray(rawRows).map((row) => Utils.safeGet(row, '_data', row));
        // Validate data integrity
        if (!Utils.hasElements(headerRow) || !Utils.hasElements(tableRows)) {
          MyConsole.debug('No valid table data');
          return false;
        }
        MyConsole.debug('_prepareTableData:');
        MyConsole.table(headerRow);
        MyConsole.table(tableRows);
        // Update state with validated data
        StateManager.update({ headerRow, tableRows });

        return true;
      } catch (error) {
        ErrorHandler.log('Table data preparation failed:', error);
        StateManager.update({ headerRow: [], tableRows: [] });
        return false;
      }
    },
    /*
     * Detects relay type from first row of data (optimized)
     * @private
     */
    _detectFeederRelay () {
      try {
        // Extract relay information from second column (index 1)
        const firstRow = StateManager.get('tableRows')[0];
        const relayCell = firstRow[1];
        const relayText = String(relayCell || '').trim().toUpperCase();

        const feederCell = firstRow[0];
        const feederText = String(feederCell || '').trim().toUpperCase();

        if (!relayText || !feederText) {
          MyConsole.debug('No relay or feeder information found in data');
          StateManager.update({
            relayType: CONFIG.relayTypes.UNKNOWN,
            relayModel: '',
          });
          return;
        }

        MyConsole.debug('Analyzing relay text:', relayText);

        // Detect specific models first
        let detectedModel = '';
        if (relayText === 'SEL-151' || relayText.includes('SEL-151')) {
          detectedModel = 'SEL-151';
        }

        // Detect general relay types
        let detectedType = CONFIG.relayTypes.UNKNOWN;
        const relayTypeEntries = Object.entries(CONFIG.relayTypes);

        for (const [key, value] of relayTypeEntries) {
          if (value !== CONFIG.relayTypes.UNKNOWN && relayText.includes(value)) {
            detectedType = value;
            break; // Use first match for priority
          }
        }

        const parts = feederText.split(/\s+/).filter((part) => part.length > 0);
        const feederId = parts.slice(0, 2).join(' ') || feederText;

        MyConsole.debug(`Extracted feeder ID: '${feederId}' from cell: '${feederText}'`);
        // Update state with detection results
        StateManager.update({
          relayType: detectedType,
          relayModel: detectedModel,
          feederId: feederId,
        });

        MyConsole.debug('Feeder relay detection completed:', {
          detectedType,
          detectedModel,
          originalText: relayText,
          feederId,
        });
      } catch (error) {
        ErrorHandler.log('Relay type detection failed:', error);
        StateManager.update({
          relayType: CONFIG.relayTypes.UNKNOWN,
          relayModel: '',
          feederId: '',
        });
      }
    },

    /*
     * Enhances table data with decoded setting descriptions
     * @private
     */
    _rearrangeTableData () {
      let headerRow = StateManager.get('headerRow');
      let tableRows = StateManager.get('tableRows');

      let relayType = StateManager.get('relayType');
      MyConsole.debug('relayType:', relayType);
      // Add description column for decodable types
      if (relayType === CONFIG.relayTypes.SEL) {
        headerRow.push('PN ELEMENT DESC');
        this._swapColumns(headerRow, 4, 5);
      }

      let ctPrimary = 0;
      tableRows = Utils.toArray(tableRows).map((row) => {
        const rowArray = Utils.toArray(row);

        if (relayType === CONFIG.relayTypes.AREVA) {
          const result = AREVADecoder.preDecode(rowArray[2], rowArray[3]);
          if (result[1] != null) ctPrimary = result[1];
          rowArray[2] = result[0];
          rowArray[3] = result[1];
        }
        return rowArray;
      });
      MyConsole.debug(tableRows);

      // Decode and normalize each row in a single pass.
      tableRows = tableRows.map((row) => {
        if (relayType === CONFIG.relayTypes.SEL) {
          MyConsole.debug('rowArray before decode:', row);

          const [desc, val] = SELDecoder.decode(row[2], row[3]);
          row[5] = desc;
          row[3] = val;
          this._swapColumns(row, 4, 5);
        }

        if (relayType === CONFIG.relayTypes.AREVA) {
          MyConsole.debug('decoding AREVA row:', row[2], row[3], ctPrimary);
          [row[2], row[3]] = AREVADecoder.decode(row[2], row[3], ctPrimary);
        }
        return row;
      });

      MyConsole.debug('_rearrangeTableData:');
      MyConsole.table(headerRow);
      MyConsole.table(tableRows);

      StateManager.update({ headerRow, tableRows });
      this._sortResults();
      // Sort by appropriate column
    },

    /*
     * Merges consecutive identical cells in specified columns (optimized)
     * @param {Array<Array>} rows - Table rows to merge
     * @returns {Array<Array>} Rows with merge information
     */
    _mergeConsecutiveCells (rows) {
      try {
        if (!Array.isArray(rows) || rows.length === 0) {
          MyConsole.debug('No rows provided for cell merging');
          return rows;
        }
        let relayType = StateManager.get('relayType');
        const mergeColumns = CONFIG.table.mergeColumns[relayType];

        if (!Array.isArray(mergeColumns) || mergeColumns.length === 0) return rows;

        MyConsole.debug(`Merging cells for columns: [${mergeColumns.join(', ')}]`);

        const rowCount = rows.length;
        const colCount = rows[0]?.length || 0;

        if (colCount === 0) return rows;

        const mergeColSet = new Set(mergeColumns.filter((col) => col < colCount));
        const rowspanMap = new Map();

        // Calculate rowspans for each merge column efficiently
        for (const col of mergeColSet) {
          let currentRow = 0;

          while (currentRow < rowCount) {
            const startRow = currentRow;
            const cellValue = rows[startRow]?.[col];
            // Find consecutive identical values
            while (currentRow + 1 < rowCount &&
              rows[currentRow + 1]?.[col] === cellValue && cellValue != null && cellValue !== '') {
              currentRow++;
            }

            const spanLength = currentRow - startRow + 1;
            if (spanLength > 1) rowspanMap.set(`${startRow}-${col}`, spanLength);

            currentRow++;
          }
        }

        MyConsole.debug(`Generated ${rowspanMap.size} rowspan mappings`);
        // Build enhanced rows with merge information
        const mergedRows = rows.map((row, rowIndex) => {

          const rowArray = Utils.toArray(row);
          return rowArray
            .map((cell, colIndex) => {
              // Check if this cell should be hidden (part of a merged group)
              if (mergeColSet.has(colIndex) && rowIndex > 0) {
                const prev = rows[rowIndex - 1]?.[colIndex];

                if (cell === prev && cell != null && cell !== '') {
                  return null; // Cell will be hidden
                }
              }
              // Determine rowspan for this cell
              const rowspan = rowspanMap.get(`${rowIndex}-${colIndex}`) || 1;

              return {
                value: cell,
                rowspan,
                colspan: 1,
                originalIndex: colIndex,
                merged: rowspan > 1,
              };
            })
            .filter((cellData) => cellData !== null);
        });

        MyConsole.debug(`Cell merging completed: ${mergedRows.length} rows processed`);
        MyConsole.debug('mergedRows:', mergedRows);
        return mergedRows;
      } catch (error) {
        ErrorHandler.log('Cell merging failed:', error);
        MyConsole.debug('Returning original rows without merging');
        return rows;
      }
    },

    /*
     * Swaps two columns in an array
     * @private
     */
    _swapColumns (array, index1, index2) {
      if (!Array.isArray(array)) {
        MyConsole.debug('Cannot swap columns: not an array');
        return;
      }

      if (index1 < 0 || index1 >= array.length || index2 < 0 || index2 >= array.length) {
        MyConsole.debug(`Cannot swap columns: indices out of bounds (${index1}, ${index2}) for array length ${array.length}`);
        return;
      }

      try {
        // Swap values
        [array[index1], array[index2]] = [array[index2], array[index1]];
        // Preserve keyed cell metadata if row values are keyed objects
        if (array[index1]?.Key && array[index2]?.Key) {
          [array[index1].Key, array[index2].Key] = [array[index2].Key, array[index1].Key];
        }
      } catch (error) {
        MyConsole.debug('Column swap failed:', error);
      }
    },
    /*
     * Sorts results by setting column
     * @private
     */
    _sortResults () {
      try {
        let relayType = StateManager.get('relayType');
        const sortIdx = CONFIG.table.sortColumnIndex[relayType];
        if (typeof sortIdx !== 'number') {
          MyConsole.debug(`No sort configuration for relay type: ${relayType}`);
          return;
        }

        let tableRows = [...StateManager.get('tableRows')];

        if (!Utils.hasElements(tableRows)) {
          MyConsole.debug('No rows to sort');
          return;
        }

        // Validate sort index against row structure
        const firstRowLength = tableRows[0]?.length || 0;
        if (sortIdx >= firstRowLength) {
          MyConsole.debug(`Sort index ${sortIdx} exceeds row length ${firstRowLength}`);
          return;
        }

        const originalRowCount = tableRows.length;

        tableRows.sort((a, b) => {
          try {
            const aVal = String(a?.[sortIdx] || '');
            const bVal = String(b?.[sortIdx] || '');
            return this._naturalSortCollator.compare(aVal, bVal);
          } catch (error) {
            MyConsole.debug('Individual row sort comparison failed:', error);
            return 0; // Maintain original order on error
          }
        });
        MyConsole.debug('Results sorted');
        MyConsole.table(tableRows);
        StateManager.update({ tableRows });

        MyConsole.debug(`Results sorted by column ${sortIdx}: ${originalRowCount} rows`);
      } catch (error) {
        ErrorHandler.log('Result sorting failed:', error);
        MyConsole.debug('Continuing with unsorted results');
      }
    },

    /*
     * Renders processed table to page
     * @private
     */
    _renderResults () {

      MyConsole.debug('Starting result rendering process');
      let relayType = StateManager.get('relayType');
      let tableRows = [...StateManager.get('tableRows')];
      let headerRow = [...StateManager.get('headerRow')];

      if (!Utils.hasElements(headerRow) || !Utils.hasElements(tableRows)) {
        throw new Error('No data to render');
      }
      // Apply cell merging for supported relay types
      const mergingTypes = [CONFIG.relayTypes.SEL, CONFIG.relayTypes.AREVA];
      if (mergingTypes.includes(relayType)) {
        MyConsole.debug(`Applying cell merging for ${relayType} relay type`);
        const mergedRows = this._mergeConsecutiveCells(tableRows);
        StateManager.update({ tableRows: mergedRows });
      }
      // Create or get container and render
      const container = TableRenderer.ensureContainer();

      tableRows = [...StateManager.get('tableRows')];
      TableRenderer.render(container, headerRow, tableRows);
      MyConsole.debug(`Results rendered successfully: ${tableRows.length} rows, ${headerRow.length} columns`);

    },

    /*
     * Gets processing statistics and performance metrics
     * @returns {Object} Processing statistics
     */
    getStats () {
      return {
        tableRows: StateManager.get('tableRows')?.length || 0,
        headerColumns: StateManager.get('headerRow')?.length || 0,
        relayType: StateManager.get('relayType'),
        relayModel: StateManager.get('relayModel'),
        lastQuery: StateManager.get('lastQuery'),
        queryCount: StateManager.get('queryCount'),
        processing: StateManager.get('isProcessing'),
        lastError: StateManager.get('lastError')?.message || null,
      };
    },
    /*
     * Logs comprehensive execution metrics
     * @param {number} startTime - Start timestamp
     * @param {string} [context='Query'] - Execution context
     * @private
     */
    _logExecutionTime (startTime, context = 'Query') {

      const duration = ((performance.now() - startTime) / 1000).toFixed(2);
      const sqlStats = SQL.getStats();
      const domStats = DOM.getCacheStats();

      MyConsole.debug('sqlStats:', sqlStats);
      MyConsole.debug('domStats:', domStats);
      MyConsole.debug(`${context} Performance Metrics:`, {
        duration: `${duration}s`,
        sqlCacheHitRatio: sqlStats.hitRatio,
        sqlCacheSize: sqlStats.cacheSize,
        domCacheSize: domStats.size,
        totalQueries: StateManager.get('queryCount'),
        memoryUsage: performance.memory
          ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
          }
          : 'Not available',
      });
    },

    /*
     * Validates current data integrity
     * @returns {Object} Validation results
     */
    _validateData () {
      const issues = [];
      let headerRow = [...StateManager.get('headerRow')];
      let tableRows = [...StateManager.get('tableRows')];
      if (!Utils.hasElements(headerRow)) issues.push('No header');

      if (!Utils.hasElements(tableRows)) issues.push('No table');

      if (headerRow && tableRows) {
        const expected = state.headerRow.length;
        const inconsistent = state.tableRows.filter(r => Utils.toArray(r).length !== expected).length;
        if (inconsistent > 0) issues.push(`${inconsistent} rows have inconsistent column count`);
      }

      return {
        isValid: issues.length === 0,
        issues,
      };
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
    // Phase mapping
    phasePatterns: Object.freeze([
      { type: 'PHS', pattern: /P(\.|\s|\.?\s)?PS1$/ },
      { type: 'GND', pattern: /N(\.|\s|\.?\s)?PS1$/ },
      { type: 'NEG', pattern: /NEG(\.|\s|\.?\s)?PS1$/ },
    ]),
    phaseText: Object.freeze({ I: 'PHS', IN: 'GND', INEG: 'NEG', }),
    // Suffix descriptions
    OCSuffix: Object.freeze([
      { text: 'IREF', desc: 'Pick Up (A)', },
      { text: 'CHARACTER', desc: 'Curve' },
      { text: 'FACTOR', desc: 'Time Dial' },
      { text: 'TRIP TIME', desc: 'Min. Trip Time (s)' },
      { text: 'HOLD TIME', desc: 'Hold Time (s)' },
      { text: 'RELEASE', desc: 'Release' },
      { text: 'ENABLE', desc: '_Enabled' },
    ]),

    DTSuffix: Object.freeze([
      { pattern: /\/(I(?:NEG)?N?)(>+)\s/, desc: 'Pick Up (A)' },
      { pattern: /\/T(I(?:NEG)?N?)(>+)\s/, desc: 'Delay (s)' },
      { pattern: /\/(ENABLE)/, desc: '_Enabled' },
    ]),

    // Overcurrent setting type
    overCurrentType: 'Timed Overcurrent',
    definiteTimeType: 'Definite Time',

    preDecode (settingName, settingValue) {
      if (typeof settingName !== 'string' || !settingName.includes('INOM')) return [settingName, settingValue];

      const ctPrimary = this._parseLeadingNumber(settingValue);
      MyConsole.debug('CT PRIMARY:', ctPrimary);
      return ['_CT PRIMARY (A)', ctPrimary];
    },
    /*
     * Decodes AREVA
     * @param {string} settingName - Setting Name
     * @param {string|number} settingValue - Setting value
     * @returns {Array<string>} [description, value]
     */
    decode (settingName, settingValue, ctPrimary = 0) {
      if (!this._isValid(settingName, settingValue)) return ['', ''];

      try {
        if (settingName === '_CT PRIMARY (A)') return [settingName, settingValue];

        if (settingName.includes('IDMT1')) return this._decodeOverCurrent(settingName, settingValue, ctPrimary);
        if (settingName.includes('DTOC')) return this._decodeDefiniteTime(settingName, settingValue, ctPrimary);

      } catch (error) {
        ErrorHandler.log('AREVADecoder.decode', error);
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

    _parseLeadingNumber (settingValue) {
      const raw = String(settingValue ?? '').trim();
      const [head = '0'] = raw.split(/\s+/, 1);
      const parsed = Number(head);
      return Number.isFinite(parsed) ? parsed : 0;
    },

    /*
     * Parses setting value with INOM conversion
     * @private
     */
    _parseSettingValue (settingValue, ctPrimary = 0) {
      const rawValue = String(settingValue ?? '');
      const normalized = rawValue.toUpperCase();

      if (normalized.includes('INOM')) {
        const value = this._parseLeadingNumber(rawValue);
        return Math.round(value * ctPrimary);
      }

      if (rawValue.endsWith(' s')) return rawValue.slice(0, -2);

      return rawValue;
    },

    /*
     * Decodes phase-specific pattern
     * @private
     */
    _decodeOverCurrent (settingName, settingValue, ctPrimary) {
      let phase = this._getOCPhase(settingName);
      let suffix = this._getOCSuffix(settingName);

      if (suffix === '_Enabled') { phase = suffix; suffix = ''; }

      const description = [phase, this.overCurrentType, suffix].filter(Boolean).join(' ').toUpperCase();
      let value = this._parseSettingValue(settingValue, ctPrimary);
      MyConsole.debug('description:', description, 'value:', value);
      return [description, value];
    },

    _decodeDefiniteTime (name, val, ctPrimary) {
      const [phase, suffix] = this._getDTSuffix(name);
      const desc = [phase, this.definiteTimeType, suffix].filter(Boolean).join(' ').toUpperCase();
      MyConsole.debug('description:', desc, 'value:', val);
      return [desc, this._parseSettingValue(val, ctPrimary)];
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

    _getOCPhase (settingName) {
      for (const { type, pattern } of this.phasePatterns) {
        if (pattern.test(settingName)) return type;
      }
      return '';
    },

    _getDTSuffix (settingName) {
      for (const { pattern, desc } of this.DTSuffix) {
        const match = settingName.match(pattern);
        if (!match) continue;

        if (match[1] === 'ENABLE') return [desc, ''];

        if (match[2]) {
          const base = match[1];
          const stage = match[2].length;
          return [this.phaseText[base] ?? base, `Stage ${stage} ${desc}`.trim()];
        }
      }
      return ['', ''];
    },
  };

  /*
   * SEL Relay Setting Decoder (optimized with cached patterns)
   * Converts SEL setting codes to human-readable descriptions
   */
  const SELDecoder = {
    // Curve type mappings
    curves: Object.freeze({
      1: '(Moderately Inverse)', 2: '(Inverse)',
      3: '(Very Inverse)', 4: '(Extremely Inverse)',
    }),

    // Phase type mappings
    phases: Object.freeze({ G: 'GND', P: 'PHS', Q: 'NEG', N: 'GND', }),
    // Setting suffix mappings
    suffixes: Object.freeze({ P: 'Pick Up (A)', C: 'Curve', TD: 'Time Dial', TC: 'Torque Control', H: 'Pick Up (A)', }),
    // Decoding patterns and descriptions
    definiteTimePatterns: Object.freeze([
      { pattern: /^50(?:P[234]P|N?L)$/, desc: 'Definite Time Pick Up (A)' },
      { pattern: /^(?:67P[234]D|50LT|50NLT)$/, desc: 'Definite Time Delay (s)' },
    ]),
    liveLine: Object.freeze({ pattern: /^50[PG]5/, desc: '(Live Line)' }),
    tripEquation: Object.freeze({ pattern: /^SV\d?\w+/, desc: '_Trip Equation' }),
    autoReclose: Object.freeze({ pattern: /^79/, desc: '_Auto-Reclose Interval (s)' }),

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
        const definiteTime = this._decodeDefiniteTime(settingName, settingValue);
        if (definiteTime) return definiteTime;
        // Check overcurrent patterns
        const overCurrentType = this._getOverCurrentType(settingName);
        if (overCurrentType) {
          return this._decodeOverCurrent(settingName, overCurrentType, settingValue);
        }
        // Check special trip equation pattern
        if (this.tripEquation.pattern.test(settingName) || settingValue.split('+').length > 1) return [this.tripEquation.desc, settingValue];
        if (this.autoReclose.pattern.test(settingName)) return [this.autoReclose.desc, settingValue];
      } catch (error) {
        ErrorHandler.log('SELDecoder.decode', error);
      }
      return ['', ''];
    },

    /*
     * Validates input parameters
     * @private
     */
    _isValid (settingName, settingValue) {
      return !!(
        settingName && typeof settingName === 'string' &&
        settingValue !== undefined && settingValue !== null &&
        (typeof settingValue === 'string' || typeof settingValue === 'number')
      );
    },

    _decodeDefiniteTime (settingName, settingValue) {
      for (const { pattern, desc } of this.definiteTimePatterns) {
        if (!pattern.test(settingName)) continue;

        const base = this._getPhaseDescription(settingName);
        const stageMatch = /^(?:50P([234])P|67P([234])D)$/.exec(settingName);
        const stageNum = stageMatch ? stageMatch[1] ?? stageMatch[2] : '';
        const stageText = stageNum ? `Stage ${stageNum} ` : '';
        const description = `${base} ${stageText}${desc}`.replace(/\s+/g, ' ').trim();
        MyConsole.debug(description, settingName);
        return [description, settingValue];
      }
      return null;
    },

    _getOverCurrentType (settingName) {
      if (settingName.startsWith('50')) return 'Inst. Overcurrent';
      if (settingName.startsWith('51')) return 'Timed Overcurrent';
      return '';
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
      const isLiveLine = this.liveLine.pattern.test(settingName);

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
      const table = DOM.createElement('table', { className: CONFIG.classes.table });
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

      const thElements = headers.map((header, index) => {
        const displayHeader = this._changeHeader(header);
        const widthPercent = this._getColumnWidth(index, headers.length);
        return DOM.createElement('th', {
          style: `width: ${widthPercent !== 'fit-content' ? `${widthPercent}vw` : 'fit-content'}`,
          textContent: displayHeader,
        });
      });
      tr.append(...thElements);
      thead.appendChild(tr);
      return thead;
    },

    /*
     * Creates table body section
     * @private
     */
    _createBody (rows) {
      const tbody = DOM.createElement('tbody');

      const trElements = rows.map((row) => {
        const tr = DOM.createElement('tr');
        const rowData = Array.isArray(row) ? row : Object.values(row);

        const tdElements = rowData.map((cell) => {
          const content = typeof cell === 'object' ? cell.value : cell;
          const td = DOM.createElement('td', {
            textContent: content,
            classList: cell.merged ? 'aspen-cell merged' : 'aspen-cell',
          });

          if (typeof cell === 'object' && cell.rowspan > 1) {
            td.rowSpan = cell.rowspan;
          }
          return td;
        });
        tr.append(...tdElements);
        return tr;
      });
      tbody.append(...trElements);

      return tbody;
    },

    /*
     * Gets display header name (applies replacements)
     * @private
     */
    _changeHeader (header) {
      if (StateManager.get('relayType') === CONFIG.relayTypes.ELECTRO && header === 'ELEMENT') {
        return CONFIG.table.headerReplacements.ELEMENT;
      }
      return header;
    },

    /*
     * Calculates column width in viewport units
     * @private
     */
    _getColumnWidth (index, columnCount) {
      const widths = CONFIG.table.widthConfig[StateManager.get('relayModel')] ?? CONFIG.table.widthConfig[StateManager.get('relayType')];
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
      const grid = DOM.getElement(CONFIG.selectors.resultGrid, true);
      if (grid) grid.style.display = 'none';
      const gridClass = document.querySelector(`.${CONFIG.selectors.resultGridClass}`);
      if (gridClass) gridClass.style.display = 'none';
      const main = document.querySelector(`.${CONFIG.selectors.mainApp}`);
      if (main) main.setAttribute('style', 'min-height: auto');
    },

    /*
     * Adds download button to results
     * @private
     */
    setupDownloadButton (feederId) {
      const container = DOM.getElement(CONFIG.selectors.container, true);
      if (!container) return;

      const btn = DOM.createElement('button', {
        id: CONFIG.selectors.download,
        className: CONFIG.classes.download,
        textContent: CONFIG.messages.ui.downloadButton,
        onclick: () => {
          this._downloadAsHtml(feederId, StateManager.get('headerRow'), StateManager.get('tableRows'));
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

      const htmlContent =
        `<!DOCTYPE html>
        <html>
        <head>
          <meta charset='UTF-8'>
          <title>${filename}</title>
          <style>
            body { font-family: monospace; font-size: 0.9rem; padding: 20px; }
            h2 { margin-bottom: 20px; }
            table { border: 1px solid #999; border-collapse: collapse; font-size: 0.9rem; white-space: pre-wrap;  text-wrap-style: balance; }
            table th { background-color: #eee; font-weight: bold; font-size: 1rem; }
            table th, td { padding: 6px; text-align: left;border: 1px solid #999; }
            .merged { font-size: 1rem;}
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
      return DOM.getElement(CONFIG.selectors.container, true) ?? this._createContainer();
    },

    /*
     * Creates and appends table container element
     * @returns {HTMLElement}
     */
    _createContainer () {
      const container = DOM.createElement('div', {
        id: CONFIG.selectors.container,
        className: CONFIG.classes.container,
      });
      document.body.appendChild(container);
      DOM.cacheElement(CONFIG.selectors.container, container);
      return container;
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
    decodeAREVASettingName: (code, setting, ctPrimary = 0) => AREVADecoder.decode(code, setting, ctPrimary),

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

  SearchComponent.init().catch((err) => ErrorHandler.handle(err, 'Initialization', 'Failed to start — please reload the page.'));
})();
