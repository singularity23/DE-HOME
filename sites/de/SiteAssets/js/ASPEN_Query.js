javascript: (function () {
  'use strict';

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
    debug: false,

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

    // FIX #6: derive `input` from `device` so the two patterns cannot drift
    patterns: Object.freeze({
      device: /^(?<prefix>[A-Z]{3})\s(?<type>4|12|25|35)F(?<number>\d{2,3})(?<suffix>[A-Z]?)$/i,
      get input () {
        // Strip anchors and named-group syntax for use as the HTML pattern attribute
        return new RegExp(
          this.device.source.replace(/\^|\$|<[^>]+>/g, ''),
          this.device.flags
        );
      },
    }),

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

    status: Object.freeze({
      IN_SERVICE: 'IN SERVICE',
      ISSUED: 'ISSUED',
    }),

    sql: Object.freeze({
      settingNames: Object.freeze([
        '51P1P', '51P1TD', '51P1C', '50P1P', '50P2P', '50P3P', '50P4P', '50P5P',
        '67P2D', '67P3D', '67P4D', '51G1P', '51G1TD', '51G1C', '50G1P', '50G5P',
        '51PP', '51PTD', '51PC', '51GP', '51GTD', '51GC',
        '51P', '51TD', '51C', '50L', '50LT', '50H',
        '51NP', '51NTD', '51NC', '50NL', '50NLT', '50NH',
        '51QP', '51QTD', '51QC', '79OI1',
      ]),

      timing: Object.freeze({
        queryDelay: 2500,
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
        noInServiceResults: 'No IN SERVICE Settings - Looking for ISSUED Settings instead.',
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

    relayTypes: Object.freeze({
      SEL: 'SEL',
      ELECTRO: 'ELECTRO',
      AREVA: 'AREVA',
      UNKNOWN: 'UNKNOWN',
    }),

    performance: Object.freeze({
      maxCacheSize: 50,
      debounceDelay: 300,
      throttleLimit: 1000,
      maxRetries: 3,
      cacheIdleClearMs: 5 * 60 * 1000,
    }),
  });

  // ============================================================================
  // STATE MANAGEMENT  (defined early — used by _touchCacheIdleClear below)
  // ============================================================================

  let state = { ...INITIAL_STATE };

  // FIX #5: all internal state mutations go through StateManager;
  //          _touchCacheIdleClear is the one accepted exception because it
  //          manages a timer handle, not business state.
  const StateManager = {
    update (updates) {
      if (!updates || typeof updates !== 'object') {
        throw new Error('State updates must be an object');
      }
      const previousState = { ...state };
      Object.assign(state, updates);
      myConsole.debug('State updated:', { previous: previousState, current: state, changes: updates });
    },

    reset () {
      Object.assign(state, { ...INITIAL_STATE });
      myConsole.debug('State reset to initial values');
    },

    // Convenience getter so callers don't read `state` directly
    get (key) {
      return state[key];
    },
  };

  /*
   * Resets the idle timer; after cacheIdleClearMs of inactivity the SQL and
   * DOM caches are cleared.  Writes state.cacheIdleTimer directly — this is
   * intentional (timer handle management, not business state).
   */
  const _touchCacheIdleClear = () => {
    const delay = CONFIG.performance.cacheIdleClearMs;
    if (!delay || delay <= 0) return;

    clearTimeout(state.cacheIdleTimer);
    state.cacheIdleTimer = setTimeout(() => {
      state.cacheIdleTimer = null;
      SQL.clearCache();
      DOM.clearCache();
      myConsole.debug('SQL and DOM caches auto-cleared after idle period');
    }, delay);
  };

  // ============================================================================
  // LOGGING & ERROR HANDLING
  // ============================================================================

  // FIX #1: removed the `silent` field that was unconditionally overwritten on
  //          every log() call, making the initial `true` value meaningless.
  //          debug() is the correct gate for development-only output.
  const myConsole = {
    log (...args) {
      if (CONFIG.debug) {
        console.log(`[ASPEN ${new Date().toISOString()}]:`, ...args);
      }
    },
    debug (...args) {
      if (CONFIG.debug) {
        console.log(`[ASPEN ${new Date().toISOString()}]:`, ...args);
      }
    },
    table (...args) {
      if (CONFIG.debug) {
        console.table(...args);
      }
    },
  };

  const errorHandler = {
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
    _cache: new Map(),
    _componentCache: new Map(),
    _stats: { hits: 0, misses: 0, generated: 0 },

    _regexPatterns: Object.freeze({
      lineComments: /--.*$/gm,
      blockComments: /\/\*[\s\S]*?\*\//g,
      multipleSpaces: /\s+/g,
      leadingSpaces: /^\s+/gm,
      trailingSpaces: /\s+$/gm,
    }),

    _validateInput (inputCode) {
      if (!inputCode || typeof inputCode !== 'string') {
        throw new Error('Input code must be a non-empty string');
      }
      const trimmed = inputCode.trim().toUpperCase();
      if (!CONFIG.patterns.device.test(trimmed)) {
        throw new Error(`Invalid device code format: ${inputCode}`);
      }
      return trimmed;
    },

    _validateStatus (status) {
      const validStatuses = [CONFIG.status.IN_SERVICE, CONFIG.status.ISSUED];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
      }
      return status;
    },

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
        errorHandler.log('SQL minification failed:', error);
        return sql.trim();
      }
    },

    generate (inputCode, status = CONFIG.status.IN_SERVICE) {
      try {
        const validatedCode = this._validateInput(inputCode);
        const validatedStatus = this._validateStatus(status);

        const cacheKey = `${validatedCode}|${validatedStatus}`;
        if (this._cache.has(cacheKey)) {
          this._stats.hits++;
          myConsole.debug(`SQL cache hit for: ${cacheKey}`);
          return this._cache.get(cacheKey);
        }

        this._stats.misses++;
        const sql = this._buildSQL(validatedCode, validatedStatus);
        const minifiedSql = this._minify(sql);

        this._cacheWithLimit(cacheKey, minifiedSql);
        this._stats.generated++;

        myConsole.debug(`SQL generated for: ${cacheKey}`);
        return minifiedSql;
      } catch (error) {
        errorHandler.log('SQL generation failed:', error);
        throw error;
      } finally {
        _touchCacheIdleClear();
      }
    },

    _cacheWithLimit (key, value) {
      if (this._cache.size >= CONFIG.performance.maxCacheSize) {
        const firstKey = this._cache.keys().next().value;
        this._cache.delete(firstKey);
      }
      this._cache.set(key, value);
    },

    _getCachedList (key, array) {
      if (!Array.isArray(array)) {
        throw new Error(`Expected array for key '${key}', got ${typeof array}`);
      }
      if (!this._componentCache.has(key)) {
        this._componentCache.set(key, this._formatSqlList(array));
      }
      _touchCacheIdleClear();
      return this._componentCache.get(key);
    },

    _formatSqlList (array) {
      return array
        .filter(item => item != null)   // skip null/undefined entries
        .map(item => `'${String(item).replace(/'/g, `''`)}'`)
        .join(', ');
    },

    // FIX #8: the two correlated scalar subqueries for CTR and TR are lifted
    //          into WITH-clause CTEs so Oracle executes them once rather than
    //          once per outer row.
    _buildSQL (inputCode, status) {
      try {
        const settingsList = this._getCachedList('settings', CONFIG.sql.settingNames);
        const { dbmsLobLength: lobLen } = CONFIG.sql;

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
        AND UPPER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLen}, 1)) != 'BLOCKED'
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
        AND TE.RELAYTYPE = QE.RELAYTYPE
        INNER JOIN TRELAY RE ON RE.ID = QE.RELAYID
    WHERE
        SE.GROUPNAME = 'PARAMETERS'
        AND TE.SETTINGNAME LIKE '%SUBSET _/F<>/ENABLE%'
        AND RE.S01 LIKE '${inputCode}%'
        AND RE.RELAYTYPE LIKE 'AREVA%'
        AND UPPER(QE.S02) = '${status}'
),
-- FIX #8: lift correlated subqueries into CTEs so they execute once only
sel_ctr AS (
    SELECT TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLen})) AS val
    FROM TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q
    WHERE R.S01 LIKE '${inputCode}%'
      AND R.RELAYTYPE LIKE 'SEL%'
      AND R.ID = Q.RELAYID
      AND Q.ID = S.REQUESTID
      AND T.RELAYTYPE = Q.RELAYTYPE
      AND T.ROWNUMBER = S.ROWNUMBER
      AND S.GROUPNAME = '1'
      AND T.SETTINGNAME = 'CTR'
      AND UPPER(Q.S02) = '${status}'
),
sel_tr AS (
    SELECT S.SETTING AS val
    FROM TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q
    WHERE R.S01 LIKE '${inputCode}%'
      AND R.RELAYTYPE LIKE 'SEL%'
      AND R.ID = Q.RELAYID
      AND Q.ID = S.REQUESTID
      AND T.RELAYTYPE = Q.RELAYTYPE
      AND T.ROWNUMBER = S.ROWNUMBER
      AND S.GROUPNAME = 'L1'
      AND T.SETTINGNAME = 'TR'
      AND UPPER(Q.S02) = '${status}'
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
        AND DBMS_LOB.SUBSTR(S.SETTING, ${lobLen}) <> 'OFF'
            -- FIX #8: reference CTE instead of correlated subquery
            THEN UPPER(TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLen})) * (SELECT val FROM sel_ctr))
        WHEN (
            (T.SETTINGNAME LIKE '%OI%')
            OR (
                (T.SETTINGNAME LIKE '67%D' OR T.SETTINGNAME LIKE '%LT')
                AND S.GROUPNAME = '1'
            )
        )
        AND DBMS_LOB.SUBSTR(S.SETTING, ${lobLen}) <> 'OFF'
            THEN UPPER(TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, ${lobLen})) / 60)
        ELSE DBMS_LOB.SUBSTR(S.SETTING, ${lobLen})
    END AS SETTING,
    Q.M01 AS MEMO
FROM
    TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q
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
                -- FIX #8: reference CTE instead of correlated subquery
                T.SETTINGNAME LIKE (SELECT val FROM sel_tr)
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
    AND UPPER(Q.S02) = '${status}'`;
      } catch (error) {
        errorHandler.log('SQL building failed:', error);
        throw new Error(`Failed to build SQL query: ${error.message}`, { cause: error });
      }
    },

    clearCache () {
      this._cache.clear();
      this._componentCache.clear();
      this._stats = { hits: 0, misses: 0, generated: 0 };
      myConsole.debug('SQL caches cleared');
    },

    getStats () {
      return {
        ...this._stats,
        cacheSize: this._cache.size,
        componentCacheSize: this._componentCache.size,
        hitRatio:
          this._stats.hits > 0
            ? (this._stats.hits / (this._stats.hits + this._stats.misses)).toFixed(3)
            : '0.000',
        memoryUsage: this._estimateMemoryUsage(),
      };
    },

    _estimateMemoryUsage () {
      try {
        const cacheEntries = Array.from(this._cache.values()).join('');
        const componentEntries = Array.from(this._componentCache.values()).join('');
        const totalChars = cacheEntries.length + componentEntries.length;
        return `~${Math.round((totalChars * 2) / 1024)}KB`;
      } catch {
        return 'Unknown';
      }
    },
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const Utils = {
    safeGet (obj, path, defaultValue = null) {
      if (!obj || typeof obj !== 'object' || !path) return defaultValue;
      try {
        return (
          path.split('.').reduce((current, key) => {
            return current && typeof current === 'object' && key in current ? current[key] : undefined;
          }, obj) ?? defaultValue
        );
      } catch (error) {
        myConsole.debug('SafeGet error:', error);
        return defaultValue;
      }
    },

    toArray (value) {
      if (value === null || value === undefined) return [];
      if (Array.isArray(value)) return [...value];
      if (typeof value === 'object' && typeof value.length === 'number') {
        try { return Array.from(value); } catch { return []; }
      }
      if (typeof value === 'object') return Object.values(value);
      return [value];
    },

    hasElements (value) {
      return Array.isArray(value) && value.length > 0;
    },

    validatePattern (pattern, value) {
      if (!(pattern instanceof RegExp)) {
        myConsole.debug('Invalid regex pattern provided');
        return false;
      }
      try {
        return pattern.test(String(value.trim() || ''));
      } catch (error) {
        myConsole.debug('Pattern validation error:', error);
        return false;
      }
    },

    debounce (func, delay = CONFIG.performance.debounceDelay) {
      let timeoutId;
      return function debounced (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
      };
    },

    throttle (func, limit = CONFIG.performance.throttleLimit) {
      let inThrottle;
      return function throttled (...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => (inThrottle = false), limit);
        }
      };
    },

    isValidDeviceCode (code) {
      return this.validatePattern(CONFIG.patterns.device, code);
    },

    formatDeviceCode (code) {
      return String(code || '').toUpperCase();
    },

    withRetry (asyncFn, maxRetries = CONFIG.performance.maxRetries, delay = 1000) {
      return async function retryWrapper (...args) {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            return await asyncFn.apply(this, args);
          } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
              myConsole.debug(`Retry attempt ${attempt + 1}/${maxRetries} after error:`, error.message);
              await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
            }
          }
        }
        throw lastError;
      };
    },

    startTiming (label) {
      const startTime = performance.now();
      return function endTiming () {
        const duration = performance.now() - startTime;
        myConsole.log(`${label}: ${duration.toFixed(2)}ms`);
        return duration;
      };
    },
  };

  // ============================================================================
  // DOM UTILITIES
  // ============================================================================

  const DOM = {
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
            setter(element, value);
          } else if (key.startsWith('data-') || key.startsWith('aria-')) {
            element.setAttribute(key, String(value));
          } else {
            try { element[key] = value; }
            catch { element.setAttribute(key, String(value)); }
          }
        });
        return element;
      } catch (error) {
        errorHandler.log('Element creation failed:', error);
        throw new Error(`Failed to create ${tag} element: ${error.message}`, { cause: error });
      }
    },

    getElement (id, silent = false) {
      if (!id || typeof id !== 'string') {
        if (!silent) myConsole.debug('Invalid element ID provided:', id);
        return null;
      }
      try {
        if (this._elementCache.has(id)) {
          const element = this._elementCache.get(id);
          if (document.contains(element)) return element;
          this._elementCache.delete(id);
        }
        const element = document.getElementById(id);
        if (!element && !silent) myConsole.debug(`Element with id '${id}' not found in DOM`);
        if (element) this._elementCache.set(id, element);
        return element;
      } catch (error) {
        if (!silent) errorHandler.log('Element lookup failed:', error);
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

    showWarning (message, type = 'warning') {
      const warningEl = this.getElement(CONFIG.selectors.warning, true);
      if (!warningEl) return;
      try {
        warningEl.textContent = String(message || '');
        warningEl.className = `${CONFIG.classes.warning} ${type}`;
      } catch (error) {
        errorHandler.log('Warning display failed:', error);
      }
    },

    showSuccess (message) { this.showWarning(message, 'success'); },
    showError (message) { this.showWarning(message, 'error'); },
    showInfo (message) { this.showWarning(message, 'info'); },

    resetState () { StateManager.reset(); },

    clearAll () {
      try {
        this.showWarning('');
        const container = this.getElement(CONFIG.selectors.container, true);
        container?.remove();
        const sqlEditor = this.getElement(CONFIG.selectors.sqlEditor, true);
        if (sqlEditor) sqlEditor.textContent = '';
        this.resetState();
        this._clearStaleCache();
      } catch (error) {
        errorHandler.log('Clear all failed:', error);
      }
    },

    _clearStaleCache () {
      for (const [id, element] of this._elementCache.entries()) {
        if (!document.contains(element)) this._elementCache.delete(id);
      }
    },

    injectStyles () {
      if (this.getElement(CONFIG.selectors.style, true)) return;
      const style = this.createElement('style', { id: CONFIG.selectors.style });
      style.textContent = `
        input:valid { background-color: #dcf1da; }
        input:invalid { background-color: #fedad0; }
        .aspen-search-wrapper {padding: 10px;box-shadow: rgba(23, 43, 77, 0.1) 0px 2px 2px, rgba(23, 43, 77, 0.1) 2px 2px 2px; justify-content: center; display: grid;grid-template-columns: minmax(150px, 13%) minmax(150px, 7%);grid-template-rows: 1fr 1fr;grid-column-gap: 10px; z-index: 1000;}
        .aspen-warning { color: #fa4616; font-size: 0.9rem; margin: auto 5px; font-weight: bold; grid-column: 1 / span 2; grid-row: 2; }
        .aspen-table { border-collapse: collapse; max-width: 100%; font-family: monospace; font-size: 0.9rem; border: 1px solid #bbb; box-shadow: rgba(23, 43, 77, 0.1) 0px 2px 2px, rgba(23, 43, 77, 0.1) 2px 2px 2pxs; text-wrap-style: balance; }
        .aspen-table th { padding: 8px;  text-align: left; background-color: #eee; font-weight: bold; border: 1px solid #bbb;}
        .aspen-table td { padding: 6px;  vertical-align: middle; white-space: pre-wrap; border: 1px solid #bbb; }
        .aspen-container { margin: 20px 0; padding: 10px; border: 1px solid #ccc; }
        #aspen-search-status-menu { position: absolute; transform: translate3d(0px, 33px, 0px); top: 0; left: 0; will-change: transform; }
        #searchInput { grid-column: 1 / 2; grid-row: 1; }
        #searchButton { grid-column: 2 / 3; grid-row: 1;  } #searchButton:focus-visible { outline: none; }
        .dropdown:focus-within .dropdown-menu { display: block; }
      `;
      document.head.appendChild(style);
    },

    attachEventListener (element, event, handler, options = {}) {
      if (!element || typeof handler !== 'function') {
        throw new Error('Invalid element or handler for addEventListener');
      }
      try {
        const wrappedHandler = e => {
          try { return handler(e); }
          catch (error) { errorHandler.log(`Event handler error for ${event}:`, error); }
        };
        element.addEventListener(event, wrappedHandler, options);
        return () => element.removeEventListener(event, wrappedHandler, options);
      } catch (error) {
        errorHandler.log('Failed to attach event listener:', error);
        return () => { };
      }
    },

    getCacheStats () {
      return {
        size: this._elementCache.size,
        keys: Array.from(this._elementCache.keys()),
        memoryEstimate: `~${this._elementCache.size * 50}B`,
      };
    },

    clearCache () {
      this._elementCache.clear();
      myConsole.debug('DOM cache cleared');
    },
  };

  // ============================================================================
  // SEARCH COMPONENT
  // ============================================================================

  const SearchComponent = {
    _initialized: false,
    _eventHandlers: new Map(),

    // FIX #7: honour _cleanupEventHandlers on re-init so listeners don't
    //          accumulate if init() is ever called again after a reset.
    async init () {
      if (this._initialized) {
        myConsole.debug('Re-initialising search component — cleaning up previous handlers');
        this._cleanupEventHandlers();
        this._initialized = false;
      }

      const endInitTiming = Utils.startTiming('SearchComponent.init');
      try {
        await this._createSearchUI();
        this._switchQueryEditor();
        this._attachEventHandlers();
        this._initialized = true;
        myConsole.debug('Search component initialized successfully');
      } catch (error) {
        errorHandler.log('Search component initialization failed:', error);
        DOM.showError('Failed to initialize search interface');
        throw error;
      } finally {
        endInitTiming();
      }
    },

    _switchQueryEditor () {
      try {
        if (typeof window.editorReady === 'function') {
          window.editorReady('SQLEditor');
          myConsole.debug('SQL editor initialized');
        }
        if (window.editorType === 'Wizard' && typeof window.switchEditor === 'function') {
          window.switchEditor();
          myConsole.debug('Query editor switched to Wizard mode');
        }
      } catch (error) {
        myConsole.debug('Query editor switch failed:', error);
      }
    },

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
        errorHandler.log('Failed to create search UI:', error);
        throw new Error('Search interface creation failed', { cause: error });
      }
    },

    _attachEventHandlers () {
      const button = DOM.getElement(CONFIG.selectors.button);
      const input = DOM.getElement(CONFIG.selectors.input);
      const inService = DOM.getElement(CONFIG.selectors.inService);
      const issued = DOM.getElement(CONFIG.selectors.issued);
      const statusMenu = DOM.getElement(CONFIG.selectors.statusMenu);

      if (!button || !input || !inService || !issued || !statusMenu) {
        throw new Error('Required UI elements not found for event attachment');
      }

      try {
        const inServiceHandler = event => {
          event.preventDefault();
          this._handleSearch(input, CONFIG.status.IN_SERVICE);
          DOM.showInfo(CONFIG.messages.info.searching);
        };
        this._eventHandlers.set('in-service-click',
          DOM.attachEventListener(inService, 'click', inServiceHandler));

        const issuedHandler = event => {
          event.preventDefault();
          this._handleSearch(input, CONFIG.status.ISSUED);
          DOM.showInfo(CONFIG.messages.info.searching);
        };
        this._eventHandlers.set('issued-click',
          DOM.attachEventListener(issued, 'click', issuedHandler));

        const keyHandler = Utils.debounce(() => {
          if (event.key === 'Enter') {
            event.preventDefault();
            this._handleSearch(input);
            DOM.showInfo(CONFIG.messages.info.searching);
          }
        }, 150);
        this._eventHandlers.set('input-keydown',
          DOM.attachEventListener(input, 'keydown', keyHandler));

        const inputHandler = Utils.throttle(() => {
          const formatted = Utils.formatDeviceCode(input.value);
          if (input.value !== formatted) input.value = formatted;
          this._validateInputRealtime(input);
        }, 150);
        this._eventHandlers.set('input-change',
          DOM.attachEventListener(input, 'input', inputHandler));

        const focusHandler = () => { DOM.showWarning(''); };
        this._eventHandlers.set('input-focusin',
          DOM.attachEventListener(input, 'focusin', focusHandler));

        myConsole.debug('Event handlers attached successfully');
      } catch (error) {
        errorHandler.log('Failed to attach event handlers:', error);
        throw error;
      }
    },

    // FIX #7: this method is now called on re-init (see init() above)
    _cleanupEventHandlers () {
      for (const [, cleanup] of this._eventHandlers.entries()) {
        if (typeof cleanup === 'function') cleanup();
      }
      this._eventHandlers.clear();
    },

    _validateInputRealtime (input) {
      const value = input.value;
      const isValid = Utils.isValidDeviceCode(value);

      input.classList.toggle('valid', isValid && value.length > 0);
      input.classList.toggle('invalid', !isValid && value.length > 0);

      // FIX #10: explicit boolean expression — intent is clear even without
      //           the short-circuit used previously
      const button = DOM.getElement(CONFIG.selectors.button, true);
      if (button) button.disabled = value.length > 0 && !isValid;
    },

    async _handleSearch (inputEl, status = null) {
      if (state.isProcessing) {
        myConsole.debug('Search already in progress, ignoring request');
        return;
      }

      try {
        DOM.clearAll();
        const searchValue = Utils.formatDeviceCode(inputEl.value);
        StateManager.update({ startTime: performance.now() });

        if (!searchValue) throw new Error('Search value cannot be empty');
        if (!Utils.isValidDeviceCode(searchValue)) {
          throw new Error(CONFIG.messages.validation.invalidFormat);
        }

        StateManager.update({
          isProcessing: true,
          lastQuery: searchValue,
          queryCount: state.queryCount + 1,
        });

        await this._executeSearch(searchValue, status);
      } catch (error) {
        errorHandler.log('Search execution failed:', error);
        if (error.message === CONFIG.messages.validation.invalidFormat) {
          DOM.showWarning(error.message, 'warning');
        } else {
          DOM.showError(error.message || CONFIG.messages.error.general);
        }
      } finally {
        StateManager.update({ isProcessing: false });
      }
    },

    async _executeSearch (searchValue, status = null) {
      const endSearchTiming = Utils.startTiming('Search Execution');
      try {
        myConsole.debug(`Executing search for: ${searchValue}`);
        if (status !== CONFIG.status.ISSUED) {
          const inServiceSuccess = await this._executeStatusSearch(searchValue, CONFIG.status.IN_SERVICE);
          if (inServiceSuccess) {
            myConsole.debug('IN SERVICE results found and processed');
            DOM.showSuccess(CONFIG.messages.success.inService);
            return;
          }
          myConsole.debug('No IN SERVICE results found, trying ISSUED settings');
          DOM.showInfo(CONFIG.messages.info.noInServiceResults);
        }

        if (status !== CONFIG.status.IN_SERVICE) {
          const issuedSuccess = await this._executeStatusSearch(searchValue, CONFIG.status.ISSUED);
          if (issuedSuccess) {
            DOM.showSuccess(CONFIG.messages.success.issued);
            return;
          }
        }

        myConsole.debug('No results found for either status');
        DOM.showWarning(CONFIG.messages.info.noResults, 'warning');
      } catch (error) {
        errorHandler.log('Search execution failed:', error);
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

    async _executeStatusSearch (searchValue, status) {
      myConsole.debug(`Starting ${status} search for: ${searchValue}`);
      try {
        const [fingerPrint, startTime] = this._runQuery(searchValue, status);
        myConsole.debug(`Query initiated for ${status}, waiting for results...`);
        const getQueryResultsWithRetry = Utils.withRetry(
          () => DataProcessor.getQueryResults(fingerPrint, startTime, status),
          1, 300
        );
        await getQueryResultsWithRetry();
        const success = await DataProcessor.processResults();
        myConsole.debug(`${status} search completed with success: ${success}`);
        return success;
      } catch (error) {
        errorHandler.log(`${status} search failed:`, error);
        // FIX #9: preserve original stack with { cause }
        throw new Error(`${status} query failed: ${error.message}`, { cause: error });
      }
    },

    _runQuery (searchValue, status) {
      try {
        const sql = SQL.generate(searchValue, status);
        myConsole.debug(`Generated SQL for ${status}:`, sql);
        this._displaySql(sql);

        const queryResult = window._C1MVCCtrl5;
        if (!queryResult) throw new Error('Query system controller not available');
        if (typeof queryResult._src === 'undefined') {
          throw new Error('Query fingerprint system not initialized');
        }

        const fingerPrint = queryResult._src;
        const startTime = Date.now();

        if (typeof window.runQuery !== 'function') {
          throw new Error('Query execution function not available');
        }
        window.runQuery();

        myConsole.debug('fingerprint:', fingerPrint);
        return [fingerPrint, startTime];
      } catch (error) {
        errorHandler.log('Query execution setup failed:', error);
        // FIX #9: preserve original stack with { cause }
        throw new Error(`Query setup failed: ${error.message}`, { cause: error });
      }
    },

    _displaySql (sql) {
      const editor = DOM.getElement(CONFIG.selectors.sqlEditor, true);
      if (!editor) { myConsole.debug('SQL editor not available for display'); return; }
      try {
        editor.textContent = sql;
        editor.setAttribute('aria-label', 'Generated SQL Query');
        editor.setAttribute('role', 'textbox');
        editor.setAttribute('aria-readonly', 'true');
        myConsole.debug('SQL query displayed in editor');
      } catch (error) {
        errorHandler.log('Failed to display SQL:', error);
      }
    },
  };

  // ============================================================================
  // DATA PROCESSOR
  // ============================================================================

  const DataProcessor = {
    async processResults () {
      const endProcessingTiming = Utils.startTiming('DataProcessor.processResults');
      try {
        DOM.showInfo(CONFIG.messages.info.processing);
        myConsole.debug('Starting comprehensive results processing pipeline');

        if (!this._prepareTableData()) {
          myConsole.debug('No table data available - query returned empty results');
          return false;
        }
        myConsole.debug('✓ Table data prepared and validated');

        this._detectFeederRelay();
        myConsole.debug(`✓ Relay type detected: ${state.relayType} ${state.relayModel ? `(${state.relayModel})` : ''}`);

        this._rearrangeTableData();
        const validation = this.validateData();
        if (!validation.isValid) myConsole.debug('Data validation issues detected:', validation.issues);
        myConsole.debug('✓ Table data rearranged');

        const feederId = state.feederId;
        this._renderResults();
        myConsole.debug(`✓ Results rendered for feeder: ${feederId}`);

        TableRenderer.setupDownloadButton(feederId);
        TableRenderer.hideOriginalResults();
        myConsole.debug('✓ UI enhancements completed');

        this._logExecutionTime(state.startTime);
        return true;
      } catch (error) {
        errorHandler.log('Results processing pipeline failed:', error);
        DOM.showError('Failed to process query results');
        try { this._handleProcessingFailure(error); }
        catch (fallbackError) { errorHandler.log('Fallback processing also failed:', fallbackError); }
        return false;
      } finally {
        endProcessingTiming();
      }
    },

    _handleProcessingFailure (originalError) {
      myConsole.debug('Attempting graceful degradation after processing failure');
      if (Utils.hasElements(state.tableRows) && Utils.hasElements(state.headerRow)) {
        myConsole.debug('Rendering raw data as fallback');
        const container = TableRenderer.ensureContainer();
        TableRenderer.render(container, state.headerRow, state.tableRows);
        DOM.showWarning('Results displayed with limited processing due to an error', 'warning');
      }
    },

    async getQueryResults (fingerPrint, startTime, status) {
      return new Promise((resolve, reject) => {
        if (typeof startTime !== 'number' || startTime <= 0) {
          reject(new Error(`Invalid query start time for '${status}': ${startTime}`));
          return;
        }
        if (!fingerPrint) {
          reject(new Error(`Invalid fingerprint for '${status}': ${fingerPrint}`));
          return;
        }

        myConsole.debug(`Monitoring query completion for ${status}`, { fingerPrint, startTime });

        let pollCount = 0;
        const maxPolls = Math.ceil(CONFIG.sql.timing.timeout / CONFIG.sql.timing.pollInterval);

        const poll = () => {
          try {
            pollCount++;
            const elapsed = Date.now() - startTime;

            if (elapsed > CONFIG.sql.timing.timeout) {
              reject(new Error(`Query timed out after ${elapsed}ms for '${status}'`));
              return;
            }

            const queryResult = window._C1MVCCtrl5;
            if (!queryResult || typeof queryResult._src === 'undefined') {
              reject(new Error(`Query system became unavailable during '${status}' execution`));
              return;
            }

            const currentFingerprint = queryResult._src;
            const fingerprintChanged = currentFingerprint !== fingerPrint;
            const timeExceeded = elapsed > CONFIG.sql.timing.queryDelay;

            myConsole.debug(`Query poll ${pollCount}/${maxPolls}:`, {
              elapsed: `${elapsed}ms`,
              fingerprintChanged,
              timeExceeded,
              currentFingerprint,
            });

            if (fingerprintChanged) {
              myConsole.log(`✓ Query completed for '${status}' after ${elapsed}ms`);
              resolve();
              return;
            }

            if (timeExceeded) {
              myConsole.log(`Query for '${status}' - delay exceeded after ${elapsed}ms`);
              reject(new Error(`Query delay exceeded after ${elapsed}ms for '${status}'`));
              return;
            }

            if (pollCount < maxPolls) {
              setTimeout(poll, CONFIG.sql.timing.pollInterval);
            } else {
              reject(new Error(`Maximum polling attempts exceeded for '${status}'`));
            }
          } catch (error) {
            reject(new Error(`Query monitoring failed for '${status}': ${error.message}`, { cause: error }));
          }
        };

        setTimeout(poll, CONFIG.sql.timing.startDelay);
      });
    },

    _prepareTableData () {
      try {
        const resultGrid = window.resultGrid;
        if (!resultGrid) { myConsole.debug('No resultGrid found in window object'); return false; }

        const rawHeaders = Utils.safeGet(resultGrid, '_cols', []);
        const headerRow = Utils.toArray(rawHeaders).map(col => Utils.safeGet(col, '_hdr', col) || 'Unknown Column');

        const rawRows = Utils.safeGet(resultGrid, '_rows', []);
        const tableRows = Utils.toArray(rawRows).map(row => Utils.safeGet(row, '_data', row));

        if (!Utils.hasElements(headerRow)) { myConsole.debug('No valid header data found'); return false; }
        if (!Utils.hasElements(tableRows)) { myConsole.debug('No valid row data found'); return false; }

        const expectedColumns = headerRow.length;
        const invalidRows = tableRows.filter(row => row.length !== expectedColumns);
        if (invalidRows.length > 0) {
          myConsole.debug(`Warning: ${invalidRows.length} rows have inconsistent column count`);
        }

        myConsole.debug('_prepareTableData:');
        myConsole.table(headerRow);
        myConsole.table(tableRows);

        StateManager.update({ headerRow, tableRows });
        return true;
      } catch (error) {
        errorHandler.log('Table data preparation failed:', error);
        StateManager.update({ headerRow: [], tableRows: [] });
        return false;
      }
    },

    _detectFeederRelay () {
      try {
        const firstRow = state.tableRows[0];
        const relayCell = firstRow[1];
        const relayText = String(relayCell || '').trim().toUpperCase();
        const feederCell = firstRow[0];
        const feederText = String(feederCell || '').trim().toUpperCase();

        if (!relayText || !feederText) {
          myConsole.debug('No relay or feeder information found in data');
          StateManager.update({ relayType: CONFIG.relayTypes.UNKNOWN, relayModel: '' });
          return;
        }

        myConsole.debug('Analyzing relay text:', relayText);

        let detectedModel = '';
        if (relayText === 'SEL-151' || relayText.includes('SEL-151')) detectedModel = 'SEL-151';

        let detectedType = CONFIG.relayTypes.UNKNOWN;
        for (const [, value] of Object.entries(CONFIG.relayTypes)) {
          if (value !== CONFIG.relayTypes.UNKNOWN && relayText.includes(value)) {
            detectedType = value;
            break;
          }
        }

        myConsole.debug('Analyzing feeder text:', feederText);
        const parts = feederText.split(/\s+/).filter(part => part.length > 0);
        const feederId = parts.slice(0, 2).join(' ') || feederText;
        myConsole.debug(`Extracted feeder ID: '${feederId}' from cell: '${feederText}'`);

        StateManager.update({ relayType: detectedType, relayModel: detectedModel, feederId });
        myConsole.debug('Relay detection completed:', { detectedType, detectedModel, originalText: relayText, feederId });
      } catch (error) {
        errorHandler.log('Relay type detection failed:', error);
        StateManager.update({ relayType: CONFIG.relayTypes.UNKNOWN, relayModel: '', feederId: '' });
      }
    },

    // FIX #3: ctPrimary is now threaded through the decode call chain
    //          rather than mutated as shared state on AREVADecoder.
    _rearrangeTableData () {
      let headerRow = [...state.headerRow];
      let tableRows = [...state.tableRows];

      if (state.relayType === CONFIG.relayTypes.SEL) {
        headerRow.push('PN ELEMENT DESC');
        this._swapColumns(headerRow, 4, 5);
      }

      // First pass: extract ctPrimary for AREVA (preDecode); also normalize
      let ctPrimary = 0;
      tableRows = tableRows.map(row => {
        const rowArray = Utils.toArray(row);
        if (state.relayType === CONFIG.relayTypes.AREVA) {
          const result = AREVADecoder.preDecode(rowArray[2], rowArray[3]);
          if (result.ctPrimary != null) ctPrimary = result.ctPrimary;
          rowArray[2] = result.element;
          rowArray[3] = result.value;
        }
        return rowArray;
      });

      // Second pass: full decode (AREVA receives ctPrimary explicitly)
      tableRows = tableRows.map(row => {
        if (state.relayType === CONFIG.relayTypes.SEL) {
          const [desc, val] = SELDecoder.decode(row[2], row[3]);
          row[5] = desc;
          row[3] = val;
          this._swapColumns(row, 4, 5);
        }

        if (state.relayType === CONFIG.relayTypes.AREVA) {
          [row[2], row[3]] = AREVADecoder.decode(row[2], row[3], ctPrimary);
        }

        return row;
      });

      myConsole.debug('_rearrangeTableData:');
      myConsole.table(headerRow);
      myConsole.table(tableRows);

      StateManager.update({ headerRow, tableRows });
      this._sortResults();
    },

    _mergeConsecutiveCells (rows) {
      try {
        if (!Array.isArray(rows) || rows.length === 0) {
          myConsole.debug('No rows provided for cell merging');
          return rows;
        }

        const mergeColumns = CONFIG.table.mergeColumns[state.relayType];
        if (!Array.isArray(mergeColumns) || mergeColumns.length === 0) {
          myConsole.debug(`No merge configuration for relay type: ${state.relayType}`);
          return rows;
        }

        myConsole.debug(`Merging cells for columns: [${mergeColumns.join(', ')}]`);

        const rowCount = rows.length;
        const colCount = rows[0]?.length || 0;
        if (colCount === 0) { myConsole.debug('No columns found in first row'); return rows; }

        const mergeColSet = new Set(mergeColumns.filter(col => col < colCount));
        const rowspanMap = new Map();

        for (const col of mergeColSet) {
          let currentRow = 0;
          while (currentRow < rowCount) {
            const startRow = currentRow;
            const cellValue = rows[startRow]?.[col];
            while (
              currentRow + 1 < rowCount &&
              rows[currentRow + 1]?.[col] === cellValue &&
              cellValue != null && cellValue !== ''
            ) { currentRow++; }
            const spanLength = currentRow - startRow + 1;
            if (spanLength > 1) rowspanMap.set(`${startRow}-${col}`, spanLength);
            currentRow++;
          }
        }

        myConsole.debug(`Generated ${rowspanMap.size} rowspan mappings`);

        const mergedRows = rows.map((row, rowIndex) => {
          if (!Array.isArray(row)) {
            myConsole.debug(`Row ${rowIndex} is not an array, skipping merge`);
            return Utils.toArray(row);
          }
          return row
            .map((cell, colIndex) => {
              if (mergeColSet.has(colIndex) && rowIndex > 0) {
                const currentValue = rows[rowIndex]?.[colIndex];
                const previousValue = rows[rowIndex - 1]?.[colIndex];
                if (currentValue === previousValue && currentValue != null && currentValue !== '') return null;
              }
              const rowspan = rowspanMap.get(`${rowIndex}-${colIndex}`) || 1;
              return { value: cell, rowspan, colspan: 1, originalIndex: colIndex, merged: rowspan > 1 };
            })
            .filter(cellData => cellData !== null);
        });

        myConsole.debug(`Cell merging completed: ${mergedRows.length} rows processed`);
        myConsole.table(mergedRows.map(row => row.map(cell => cell.value)));
        return mergedRows;
      } catch (error) {
        errorHandler.log('Cell merging failed:', error);
        myConsole.debug('Returning original rows without merging');
        return rows;
      }
    },

    _swapColumns (array, index1, index2) {
      if (!Array.isArray(array)) { myConsole.debug('Cannot swap columns: not an array'); return; }
      if (index1 < 0 || index1 >= array.length || index2 < 0 || index2 >= array.length) {
        myConsole.debug(`Cannot swap columns: indices out of bounds (${index1}, ${index2}) for array length ${array.length}`);
        return;
      }
      try {
        [array[index1], array[index2]] = [array[index2], array[index1]];
        if (array[index1]?.Key && array[index2]?.Key) {
          [array[index1].Key, array[index2].Key] = [array[index2].Key, array[index1].Key];
        }
      } catch (error) {
        myConsole.debug('Column swap failed:', error);
      }
    },

    _sortResults () {
      try {
        const sortIdx = CONFIG.table.sortColumnIndex[state.relayType];
        if (typeof sortIdx !== 'number') {
          myConsole.debug(`No sort configuration for relay type: ${state.relayType}`);
          return;
        }

        let tableRows = [...state.tableRows];
        if (!Utils.hasElements(tableRows)) { myConsole.debug('No rows to sort'); return; }

        const firstRowLength = tableRows[0]?.length || 0;
        if (sortIdx >= firstRowLength) {
          myConsole.debug(`Sort index ${sortIdx} exceeds row length ${firstRowLength}`);
          return;
        }

        const originalRowCount = tableRows.length;
        tableRows.sort((a, b) => {
          try {
            return String(a?.[sortIdx] || '').localeCompare(String(b?.[sortIdx] || ''), undefined, {
              numeric: true, sensitivity: 'base',
            });
          } catch { return 0; }
        });

        myConsole.debug('Results sorted');
        myConsole.table(tableRows);
        StateManager.update({ tableRows });
        myConsole.debug(`Results sorted by column ${sortIdx}: ${originalRowCount} rows`);
      } catch (error) {
        errorHandler.log('Result sorting failed:', error);
        myConsole.debug('Continuing with unsorted results');
      }
    },

    _renderResults () {
      try {
        myConsole.debug('Starting result rendering process');

        const mergingTypes = [CONFIG.relayTypes.SEL, CONFIG.relayTypes.AREVA];
        if (mergingTypes.includes(state.relayType)) {
          myConsole.debug(`Applying cell merging for ${state.relayType} relay type`);
          const mergedRows = this._mergeConsecutiveCells(state.tableRows);
          StateManager.update({ tableRows: mergedRows });
        }

        if (!Utils.hasElements(state.headerRow) || !Utils.hasElements(state.tableRows)) {
          throw new Error('No valid data available for rendering');
        }

        const container = TableRenderer.ensureContainer();
        if (!container) throw new Error('Failed to create or find table container');

        TableRenderer.render(container, state.headerRow, state.tableRows);
        myConsole.debug(`Results rendered successfully: ${state.tableRows.length} rows, ${state.headerRow.length} columns`);
      } catch (error) {
        errorHandler.log('Result rendering failed:', error);
        DOM.showError('Failed to display query results');
        throw error;
      }
    },

    getStats () {
      return {
        tableRows: state.tableRows?.length || 0,
        headerColumns: state.headerRow?.length || 0,
        relayType: state.relayType,
        relayModel: state.relayModel,
        lastQuery: state.lastQuery,
        queryCount: state.queryCount,
        processing: state.isProcessing,
        lastError: state.lastError?.message || null,
      };
    },

    _logExecutionTime (startTime, context = 'Query') {
      try {
        const duration = ((performance.now() - startTime) / 1000).toFixed(2);
        const sqlStats = SQL.getStats();
        const domStats = DOM.getCacheStats();

        myConsole.debug(`${context} Performance Metrics:`, {
          duration: `${duration}s`,
          sqlCacheHitRatio: sqlStats.hitRatio,
          sqlCacheSize: sqlStats.cacheSize,
          domCacheSize: domStats.size,
          totalQueries: state.queryCount,
          memoryUsage: performance.memory
            ? {
              used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
              total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
            }
            : 'Not available',
        });
      } catch (error) {
        myConsole.debug('Performance logging failed:', error);
      }
    },

    validateData () {
      const issues = [];
      if (!Utils.hasElements(state.headerRow)) issues.push('No header row data');
      if (!Utils.hasElements(state.tableRows)) issues.push('No table row data');

      if (state.headerRow && state.tableRows) {
        const expectedColumns = state.headerRow.length;
        const inconsistentRows = state.tableRows.filter(row => Utils.toArray(row).length !== expectedColumns).length;
        if (inconsistentRows > 0) issues.push(`${inconsistentRows} rows have inconsistent column count`);
      }

      return { isValid: issues.length === 0, issues };
    },
  };

  // ============================================================================
  // SETTING DECODERS
  // ============================================================================

  const AREVADecoder = {
    phasePatterns: Object.freeze([
      { type: 'PHS', pattern: /P(\.|\s|\.?\s)?PS1$/ },
      { type: 'GND', pattern: /N(\.|\s|\.?\s)?PS1$/ },
      { type: 'NEG', pattern: /NEG(\.|\s|\.?\s)?PS1$/ },
    ]),
    phaseText: Object.freeze({ I: 'PHS', IN: 'GND', INEG: 'NEG' }),

    OCSuffix: Object.freeze([
      { text: 'IREF', desc: 'Pick Up (A)' },
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

    overCurrentType: 'Timed Overcurrent',
    definiteTimeType: 'Definite Time',

    // FIX #3: preDecode no longer mutates a shared ctPrimary property.
    //          It returns the extracted value so the caller can thread it
    //          through explicitly.
    preDecode (settingName, settingValue) {
      if (typeof settingName !== 'string' || !settingName.includes('INOM')) {
        return { element: settingName, value: settingValue, ctPrimary: null };
      }
      const ctPrimary = this._parseLeadingNumber(settingValue);
      myConsole.debug('CT PRIMARY:', ctPrimary);
      return { element: '_CT PRIMARY (A)', value: ctPrimary, ctPrimary };
    },

    // FIX #3: ctPrimary is now a parameter, not read from shared state.
    decode (settingName, settingValue, ctPrimary = 0) {
      if (!this._isValid(settingName, settingValue)) return ['', ''];
      try {
        if (settingName === '_CT PRIMARY (A)') return [settingName, settingValue];

        if (settingName.includes('IDMT1')) {
          return this._decodeOverCurrent(settingName, settingValue, ctPrimary);
        }
        if (settingName.includes('DTOC')) {
          return this._decodeDefiniteTime(settingName, settingValue, ctPrimary);
        }
      } catch (error) {
        errorHandler.log('AREVADecoder.decode', error);
      }
      return ['', ''];
    },

    _isValid (settingName, settingValue) {
      return !!(settingName && typeof settingName === 'string' && settingValue !== undefined);
    },

    _parseLeadingNumber (settingValue) {
      const raw = String(settingValue ?? '').trim();
      const [head = '0'] = raw.split(/\s+/, 1);
      const parsed = Number(head);
      return Number.isFinite(parsed) ? parsed : 0;
    },

    // FIX #3: accepts ctPrimary as a parameter
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

    _decodeOverCurrent (settingName, settingValue, ctPrimary) {
      let phase = this._getOCPhase(settingName);
      let suffix = this._getOCSuffix(settingName);

      if (suffix === '_Enabled') { phase = suffix; suffix = ''; }

      const description = [phase, this.overCurrentType, suffix].filter(Boolean).join(' ').toUpperCase();
      const value = this._parseSettingValue(settingValue, ctPrimary);
      return [description, value];
    },

    _decodeDefiniteTime (settingName, settingValue, ctPrimary) {
      const dtDesc = this._getDTSuffix(settingName);
      const phase = dtDesc[0];
      const suffix = dtDesc[1];
      const description = [phase, this.definiteTimeType, suffix].filter(Boolean).join(' ').toUpperCase();
      const value = this._parseSettingValue(settingValue, ctPrimary);
      return [description, value];
    },

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

  const SELDecoder = {
    curves: Object.freeze({
      1: '(Moderately Inverse)', 2: '(Inverse)',
      3: '(Very Inverse)', 4: '(Extremely Inverse)',
    }),

    phases: Object.freeze({ G: 'GND', P: 'PHS', Q: 'NEG', N: 'GND' }),

    suffixes: Object.freeze({ P: 'Pick Up (A)', C: 'Curve', TD: 'Time Dial', TC: 'Torque Control', H: 'Pick Up (A)' }),

    definiteTimePatterns: Object.freeze([
      { pattern: /^50(?:P[234]P|N?L)$/, desc: 'Definite Time Pick Up (A)' },
      { pattern: /^(?:67P[234]D|50LT|50NLT)$/, desc: 'Definite Time Delay (s)' },
    ]),
    liveLine: Object.freeze({ pattern: /^50[PG]5/, desc: '(Live Line)' }),
    tripEquation: Object.freeze({ pattern: /^SV\d?\w+/, desc: '_Trip Equation' }),
    autoReclose: Object.freeze({ pattern: /^79/, desc: '_Auto-Reclose Interval (s)' }),

    decode (settingName, settingValue) {
      if (!this._isValid(settingName, settingValue)) return ['', ''];
      try {
        const definiteTime = this._decodeDefiniteTime(settingName, settingValue);
        if (definiteTime) return definiteTime;

        const overCurrentType = this._getOverCurrentType(settingName);
        if (overCurrentType) return this._decodeOverCurrent(settingName, overCurrentType, settingValue);

        if (this.tripEquation.pattern.test(settingName)) return [this.tripEquation.desc, settingValue];
        if (this.autoReclose.pattern.test(settingName)) return [this.autoReclose.desc, settingValue];
      } catch (error) {
        errorHandler.log('SELDecoder.decode', error);
      }
      return ['', ''];
    },

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
        myConsole.debug(description, settingName);
        return [description, settingValue];
      }
      return null;
    },

    _getOverCurrentType (settingName) {
      if (settingName.startsWith('50')) return 'Inst. Overcurrent';
      if (settingName.startsWith('51')) return 'Timed Overcurrent';
      return '';
    },

    _getPhaseDescription (settingName) {
      return this.phases[settingName.charAt(2)] ?? 'PHS';
    },

    _getOCSuffix (settingName) {
      const last2 = settingName.slice(-2);
      const last1 = settingName.slice(-1);
      return this.suffixes[last2] ?? this.suffixes[last1] ?? '';
    },

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
    _createTable (headers, rows) {
      const table = DOM.createElement('table', { className: CONFIG.classes.table });
      table.appendChild(this._createHead(headers));
      table.appendChild(this._createBody(rows));
      return table;
    },

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

    // FIX #2: use `className` (mapped by _propertySetters) instead of `class`
    //          (which was silently set as a non-standard JS property and never
    //          applied to the element's classList).
    _createBody (rows) {
      const tbody = DOM.createElement('tbody');

      rows.forEach(row => {
        const tr = DOM.createElement('tr');
        const rowData = Array.isArray(row) ? row : Object.values(row);

        rowData.forEach(cell => {
          const content = typeof cell === 'object' ? cell.value : cell;
          const td = DOM.createElement('td', {
            textContent: content,
            className: 'aspen-cell',   // FIX #2: was `class:` — silently dropped
          });

          if (typeof cell === 'object' && cell.rowspan > 1) td.rowSpan = cell.rowspan;
          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });

      return tbody;
    },

    _changeHeader (header) {
      if (state.relayType === CONFIG.relayTypes.ELECTRO && header === 'ELEMENT') {
        return CONFIG.table.headerReplacements.ELEMENT;
      }
      return header;
    },

    _getColumnWidth (index, columnCount) {
      const widths = CONFIG.table.widthConfig[state.relayModel] ?? CONFIG.table.widthConfig[state.relayType];
      return widths?.[index] ?? 100 / columnCount;
    },

    render (container, headers, rows) {
      if (!container) return;
      const table = this._createTable(headers, rows);
      container.innerHTML = '';
      container.appendChild(table);
    },

    hideOriginalResults () {
      const resultGridById = DOM.getElement(CONFIG.selectors.resultGrid, true);
      if (resultGridById) resultGridById.style.display = 'none';

      const resultGridByClass = document.querySelector(`.${CONFIG.selectors.resultGridClass}`);
      if (resultGridByClass) resultGridByClass.style.display = 'none';

      const main = document.querySelector(`.${CONFIG.selectors.mainApp}`);
      if (main) main.setAttribute('style', 'min-height: auto');
    },

    setupDownloadButton (feederId) {
      const container = DOM.getElement(CONFIG.selectors.container, true);
      if (!container) return;

      const btn = DOM.createElement('button', {
        id: CONFIG.selectors.download,
        className: CONFIG.classes.download,
        textContent: CONFIG.messages.ui.downloadButton,
        onclick: () => { this._downloadAsHtml(feederId, state.headerRow, state.tableRows); },
      });

      container.insertBefore(DOM.createElement('p'), container.firstChild);
      container.insertBefore(btn, container.firstChild);
    },

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
    table { border: 1px solid #999; border-collapse: collapse; font-size: 0.9rem; white-space: pre-wrap; text-wrap-style: balance; }
    table th { background-color: #eee; font-weight: bold; }
    table th, td { padding: 6px; text-align: left; border: 1px solid #999; }
  </style>
</head>
<body>
  <h2>Protection Settings - ${filename} - ${currentDate}</h2>
  ${tableHtml}
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = DOM.createElement('a', { href: url, download: `${filename}.html` });

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },

    ensureContainer () {
      return DOM.getElement(CONFIG.selectors.container, true) ?? this._createContainer();
    },

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

  window.AspenQuery = Object.freeze({
    addSearchBar: () => SearchComponent.init(),
    decodeSELSettingName: (code, setting) => SELDecoder.decode(code, setting),
    decodeAREVASettingName: (code, setting, ctPrimary) => AREVADecoder.decode(code, setting, ctPrimary),
    processResults: () => DataProcessor.processResults(),
    getSqlText: (code, status) => SQL.generate(code, status),
    TableRenderer,
    getState: () => ({ ...state }),
    CONFIG,
  });

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  // FIX #4: attach a .catch() so async failures surface instead of being
  //          swallowed silently by the unhandled-rejection queue.
  SearchComponent.init().catch(err =>
    errorHandler.handle(err, 'Initialization', 'Failed to start — please reload the page.')
  );
})();
