document.getElementById('searchButton').addEventListener('click', () => {
  const E = document.getElementById('searchInput').value
  let T = `SELECT R.S01 AS DEVICE, Q.RELAYTYPE AS RELAY, T.SETTINGNAME AS ELEMENT, CASE WHEN T.SETTINGNAME NOT LIKE '%C' AND T.SETTINGNAME NOT LIKE '%D' AND S.GROUPNAME = '1' AND DBMS_LOB.SUBSTR(S.SETTING, 4000) <> 'OFF' THEN UPPER(TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, 4000)) * ( SELECT TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, 4000)) AS CTR FROM TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q WHERE R.S01 LIKE '\${E}%' AND R.RELAYTYPE LIKE 'SEL%' AND R.ID = Q.RELAYID AND Q.ID = S.REQUESTID AND T.RELAYTYPE = Q.RELAYTYPE AND T.ROWNUMBER = S.ROWNUMBER AND S.GROUPNAME = '1' AND T.SETTINGNAME = 'CTR' AND UPPER(Q.S02) = 'IN SERVICE')) WHEN T.SETTINGNAME LIKE '67%D' AND S.GROUPNAME = '1' AND DBMS_LOB.SUBSTR(S.SETTING, 4000) <> 'OFF' THEN UPPER(TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, 4000)) / 60) ELSE DBMS_LOB.SUBSTR(S.SETTING, 4000) END AS SETTING, Q.M01 AS MEMO FROM TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q WHERE R.S01 LIKE '\${E}%' AND R.RELAYTYPE LIKE 'SEL%' AND R.ID = Q.RELAYID AND Q.ID = S.REQUESTID AND T.RELAYTYPE = Q.RELAYTYPE AND T.ROWNUMBER = S.ROWNUMBER AND UPPER(Q.S02) = 'IN SERVICE' AND ( ( S.GROUPNAME = '1' AND T.SETTINGNAME IN ( '51P1P', '51P1TD', '51P1C', '50P1P', '50P2P', '50P3P', '50P4P', '50P5P', '67P2D', '67P3D', '67P4D', '51G1P', '51G1TD', '51G1C', '50G1P', '50G5P', '51PP', '51PTD', '51PC', '51GP', '51GTD', '51GC', '51P', '51TD', '51C', '50L', '50H', '51NP', '51NTD', '51NC', '50NL', '50NH', '51QP', '51QTD', '51QC', '50Q' ) ) OR ( S.GROUPNAME LIKE '*' AND ( (T.SETTINGNAME LIKE ( SELECT S.SETTING AS TR FROM TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q WHERE R.S01 LIKE '\${E}%' AND R.RELAYTYPE LIKE 'SEL%' AND R.ID = Q.RELAYID AND Q.ID = S.REQUESTID AND T.RELAYTYPE = Q.RELAYTYPE AND T.ROWNUMBER = S.ROWNUMBER AND S.GROUPNAME = 'L1' AND T.SETTINGNAME LIKE 'TR*' AND UPPER(Q.S02)='IN SERVICE')) OR T.SETTINGNAME IN('51P1TC', '51PTC') ) ) ) UNION ALL SELECT R.S01 AS DEVICE, R.S04 AS RELAY, R.S06 AS VENDER, Q.RELAYTYPE, Q.M01 AS MEMO FROM TRELAY R, TREQUEST Q WHERE R.S01 LIKE '\${E}%' AND UPPER(R.RELAYTYPE) LIKE 'ELECTRO%' AND R.ID = Q.RELAYID AND UPPER(Q.S02)= 'IN SERVICE'`
  document.getElementById('sql-editor').innerText = T
  document.getElementById('sql-editor-section')?.style.display !== 'none' &&
    runQuery()
  console.log('Run Query')
  setTimeout(() => {
    console.log('wait for 6s'), N()
  }, 6e3)
  const S = (E) => {
    let T = ''
    const S = { G: 'GND ', P: 'PHS ', Q: 'NEG ', N: 'NEU ' },
      N = E.charAt(2)
    if ((S[N] && (T += S[N]), /^50P[234]/.test(E)))
      T = 'Definite Time Pick Up(A)'
    else if (/^67P[234]/.test(E)) T = 'Definite Time Delay(s)'
    else {
      ;/^50/.test(E)
        ? (T += 'Inst. Overcurrent ')
        : /^51/.test(E) && (T += 'Timed Overcurrent ')
      const S = {
          P: 'Pick Up(A)',
          C: 'Curve',
          TD: 'Time Dial',
          TC: 'Torque Control',
          L: 'Low Set',
          H: 'High Set',
        },
        N = E.slice(-1),
        R = E.slice(-2)
      S[R] ? (T += S[R]) : S[N] && (T += S[N])
    }
    return (
      /^50[PG]5/.test(E) && (T += ' (Live Line)'),
      /^SV\\d?\\w+/.test(E) && (T = '_Trip Equation'),
      T
    )
  }
  N = () => {
    console.log('Start')
    const E = Array.from(_C1MVCCtrl5._ncc)
    const L = E.length
    if (L > 10) {
      for (let T = 0; T < L; T++) E[T][4] = S(E[T][2])
    } else {
      document.body.style.fontFamily = 'monospace'
    }
    alert('Query Completed')
  }
})
