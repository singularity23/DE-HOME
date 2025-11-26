javascript: (function () {
  (() => {
    'use strict';
    const n = 'aspen-search-container',
      e = 'searchInput',
      t = 'searchButton',
      E = 'warning',
      r = 'sql-editor',
      T = 'QueryResultGrid',
      o = /^\w{3}\s(4|12|25|35)F\d{2,3}\w?$/i,
      S = () => {
        try {
          'function' == typeof switchEditor && switchEditor();
          const r = document.createElement('div');
          (r.id = n),
            (r.className = 'input-group'),
            (r.style.cssText =
              'padding:10px;box-shadow:0 2px 5px rgba(0,0,0,0.2);justify-content:center;z-index:1000;');
          const T = document.createElement('input');
          (T.type = 'text'),
            (T.id = e),
            (T.placeholder = 'e.g. CSQ 12F411'),
            (T.className = 'app-search app-wj-search wj-control wj-content mr-2 pl-3'),
            T.setAttribute('pattern', '^\\w{3}\\s(4|12|25|35)(F)\\d{2,3}\\w?$'),
            (T.title = 'please follow the pattern'),
            r.appendChild(T);
          const o = document.createElement('button');
          (o.type = 'button'),
            (o.id = t),
            (o.className = 'btn app-btn app-btn-outline-primary mr-2'),
            (o.textContent = 'Search'),
            r.appendChild(o);
          const S = document.createElement('em');
          (S.id = E), (S.style.cssText = 'color:#fa4616;font-size:0.8rem;margin:auto 5px;'), r.appendChild(S);
          const c = 'aspen-search-style';
          if (!document.getElementById(c)) {
            const n = document.createElement('style');
            (n.id = c),
              (n.textContent = 'input:valid{background-color:#dcf1da;} input:invalid{background-color:#fedad0;}'),
              document.head.appendChild(n);
          }
          document.body.insertBefore(r, document.body.firstChild), a();
        } catch (n) {
          console.error('addSearchBar error:', n);
        }
      },
      c = n => {
        if (!n) return '';
        try {
          return n
            .replace(/--.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\s+/g, ' ')
            .trim();
        } catch (e) {
          return console.error('minifySqlManual error:', e), n;
        }
      },
      N = n => {
        if (!n) return '';
        try {
          let e = { G: 'GND ', P: 'PHS ', Q: 'NEG ', N: 'GND ' }[n.charAt(2)] || 'PHS ';
          if (/^50P[234]/.test(n)) return 'Definite Time Pick Up (A)';
          if (/^67P[234]/.test(n)) return 'Definite Time Delay (s)';
          /^50/.test(n) ? (e += 'Inst. Overcurrent ') : /^51/.test(n) && (e += 'Timed Overcurrent ');
          const t = {
              P: 'Pick Up (A)',
              C: 'Curve',
              TD: 'Time Dial',
              TC: 'Torque Control',
              L: 'Low Set',
              H: 'High Set',
            },
            E = n.slice(-1),
            r = n.slice(-2);
          return (
            t[r] ? (e += t[r]) : t[E] && (e += t[E]),
            /^50[PG]5/.test(n) && (e += ' (Live Line)'),
            /^SV\d?\w+/.test(n) && (e = '_Trip Equation'),
            e
          );
        } catch (n) {
          return console.error('decodeSettingName error:', n), '';
        }
      },
      R = () => {
        try {
          if ((console.log('Start processing results'), !window._C1MVCCtrl5 || !_C1MVCCtrl5._ncc))
            return (document.body.style.fontFamily = 'monospace'), void alert('Query Completed');
          const n = Array.from(_C1MVCCtrl5._ncc),
            e = n.length;
          if (e > 10)
            for (let t = 0; t < e; t++)
              try {
                n[t][4] = N(n[t][2]);
              } catch (n) {
                console.warn('row decode error', t, n);
              }
          else document.body.style.fontFamily = 'monospace';
          alert('Query Completed');
        } catch (n) {
          console.error('processResults error:', n), alert('Query Completed');
        }
      },
      s = n => {
        if (!n) return '';
        return `SELECT\n  R.S01 AS DEVICE,\n  Q.RELAYTYPE AS RELAY,\n  T.SETTINGNAME AS ELEMENT,\n  CASE\n    WHEN T.SETTINGNAME NOT LIKE '%C'\n    AND T.SETTINGNAME NOT LIKE '%D'\n    AND S.GROUPNAME = '1'\n    AND DBMS_LOB.SUBSTR (S.SETTING, 4000) <> 'OFF' THEN UPPER(\n      TO_NUMBER (DBMS_LOB.SUBSTR (S.SETTING, 4000)) * (\n        SELECT\n          TO_NUMBER (DBMS_LOB.SUBSTR (S.SETTING, 4000)) AS CTR\n        FROM\n          TSETTING1 S,\n          TSETTYPE1 T,\n          TRELAY R,\n          TREQUEST Q\n        WHERE\n          R.S01 LIKE '${n}%'\n          AND R.RELAYTYPE LIKE 'SEL%'\n          AND R.ID = Q.RELAYID\n          AND Q.ID = S.REQUESTID\n          AND T.RELAYTYPE = Q.RELAYTYPE\n          AND T.ROWNUMBER = S.ROWNUMBER\n          AND S.GROUPNAME = '1'\n          AND T.SETTINGNAME = 'CTR'\n          AND UPPER(Q.S02) = 'IN SERVICE'\n      )\n    )\n    WHEN T.SETTINGNAME LIKE '67%D'\n    AND S.GROUPNAME = '1'\n    AND DBMS_LOB.SUBSTR (S.SETTING, 4000) <> 'OFF' THEN UPPER(\n      TO_NUMBER (DBMS_LOB.SUBSTR (S.SETTING, 4000)) / 60\n    )\n    ELSE DBMS_LOB.SUBSTR (S.SETTING, 4000)\n  END AS SETTING,\n  Q.M01 AS MEMO\nFROM\n  TSETTING1 S,\n  TSETTYPE1 T,\n  TRELAY R,\n  TREQUEST Q\nWHERE\n  R.S01 LIKE '${n}%'\n  AND R.RELAYTYPE LIKE 'SEL%'\n  AND R.ID = Q.RELAYID\n  AND Q.ID = S.REQUESTID\n  AND T.RELAYTYPE = Q.RELAYTYPE\n  AND T.ROWNUMBER = S.ROWNUMBER\n  AND UPPER(Q.S02) = 'IN SERVICE'\n  AND (\n    (\n      S.GROUPNAME = '1'\n      AND T.SETTINGNAME IN (\n        '51P1P',\n        '51P1TD',\n        '51P1C',\n        '50P1P',\n        '50P2P',\n        '50P3P',\n        '50P4P',\n        '50P5P',\n        '67P2D',\n        '67P3D',\n        '67P4D',\n        '51G1P',\n        '51G1TD',\n        '51G1C',\n        '50G1P',\n        '50G5P',\n        '51PP',\n        '51PTD',\n        '51PC',\n        '51GP',\n        '51GTD',\n        '51GC',\n        '51P',\n        '51TD',\n        '51C',\n        '50L',\n        '50H',\n        '51NP',\n        '51NTD',\n        '51NC',\n        '50NL',\n        '50NH',\n        '51QP',\n        '51QTD',\n        '51QC',\n        '50Q'\n      )\n    )\n    OR (\n      S.GROUPNAME = 'L1'\n      AND (\n        (\n          T.SETTINGNAME LIKE (\n            SELECT\n              S.SETTING AS TR\n            FROM\n              TSETTING1 S,\n              TSETTYPE1 T,\n              TRELAY R,\n              TREQUEST Q\n            WHERE\n              R.S01 LIKE '${n}%'\n              AND R.RELAYTYPE LIKE 'SEL%'\n              AND R.ID = Q.RELAYID\n              AND Q.ID = S.REQUESTID\n              AND T.RELAYTYPE = Q.RELAYTYPE\n              AND T.ROWNUMBER = S.ROWNUMBER\n              AND S.GROUPNAME = 'L1'\n              AND T.SETTINGNAME = 'TR'\n              AND UPPER(Q.S02) = 'IN SERVICE'\n          )\n        )\n        OR T.SETTINGNAME IN ('51P1TC', '51PTC')\n      )\n    )\n  )\nUNION ALL\nSELECT\n  R.S01 AS DEVICE,\n  R.S04 AS RELAY,\n  R.S06 AS VENDER,\n  Q.RELAYTYPE,\n  Q.M01 AS MEMO\nFROM\n  TRELAY R,\n  TREQUEST Q\nWHERE\n  R.S01 LIKE '${n}%'\n  AND UPPER(R.RELAYTYPE) LIKE 'ELECTRO%'\n  AND R.ID = Q.RELAYID\n  AND UPPER(Q.S02) = 'IN SERVICE'`;
      },
      a = () => {
        const n = document.getElementById(t);
        n &&
          n.addEventListener('click', () => {
            const n = document.getElementById(E),
              t = document.getElementById(e);
            if (!t) return;
            n && (n.textContent = '');
            const S = t.value.trim();
            if (o.test(S))
              try {
                const n = c(s(S)),
                  e = document.getElementById(r);
                e && (e.innerText = n),
                  'function' == typeof runQuery && runQuery(),
                  setTimeout(() => {
                    R();
                  }, 6e3);
              } catch (n) {
                console.error('Search handler error:', n);
              }
            else {
              n && (n.textContent = 'Please use the correct format!'), console.warn('Invalid format:', S);
              const e = document.getElementById(r);
              e && (e.innerText = '');
              const t = document.getElementById(T);
              t && (t.style.display = 'none');
            }
          });
      };
    (window.AspenQuery = {
      addSearchBar: S,
      minifySqlManual: c,
      decodeSettingName: N,
      processResults: R,
      getSqlText: s,
    }),
      S();
  })();
})();
