javascript: (function () {
  const text_1 =
    '\n    <div style="position: relative; top: 0; left: 0; width: 100%; background: white; padding: 10px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2); display: flex; align-items: center; justify-content: center; z-index: 1000;">\n        <input type="text" id="searchInput" placeholder="Search..." style="padding: 8px; width: 250px; border: 1px solid #ccc; border-radius: 4px; margin-right: 10px;">\n        <button id="searchButton" style="padding: 8px 12px; border: none; background: blue; color: white; border-radius: 4px; cursor: pointer;">Search</button>\n    </div>\n'

  const text_2 = `document.getElementById("searchButton").addEventListener("click",(()=>{const F=document.getElementById("searchInput").value;document.getElementById("sql-editor").innerText="SELECT R.S01 AS DEVICE, Q.RELAYTYPE AS RELAY, T.SETTINGNAME AS ELEMENT, CASE WHEN T.SETTINGNAME NOT LIKE '%C' AND T.SETTINGNAME NOT LIKE '%D' AND S.GROUPNAME = '1' AND DBMS_LOB.SUBSTR(S.SETTING, 4000) <> 'OFF' THEN UPPER(TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, 4000)) * ( SELECT TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, 4000)) AS CTR FROM TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q WHERE R.S01 LIKE '\${F}%' AND R.RELAYTYPE LIKE 'SEL%' AND R.ID = Q.RELAYID AND Q.ID = S.REQUESTID AND T.RELAYTYPE = Q.RELAYTYPE AND T.ROWNUMBER = S.ROWNUMBER AND S.GROUPNAME = '1' AND T.SETTINGNAME = 'CTR' AND UPPER(Q.S02) = 'IN SERVICE')) WHEN T.SETTINGNAME LIKE '67%D' AND S.GROUPNAME = '1' AND DBMS_LOB.SUBSTR(S.SETTING, 4000) <> 'OFF' THEN UPPER(TO_NUMBER(DBMS_LOB.SUBSTR(S.SETTING, 4000)) / 60) ELSE DBMS_LOB.SUBSTR(S.SETTING, 4000) END AS SETTING, Q.M01 AS MEMO FROM TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q WHERE R.S01 LIKE '\${F}%' AND R.RELAYTYPE LIKE 'SEL%' AND R.ID = Q.RELAYID AND Q.ID = S.REQUESTID AND T.RELAYTYPE = Q.RELAYTYPE AND T.ROWNUMBER = S.ROWNUMBER AND UPPER(Q.S02) = 'IN SERVICE' AND ( ( S.GROUPNAME = '1' AND T.SETTINGNAME IN ( '51P1P', '51P1TD', '51P1C', '50P1P', '50P2P', '50P3P', '50P4P', '50P5P', '67P2D', '67P3D', '67P4D', '51G1P', '51G1TD', '51G1C', '50G1P', '50G5P', '51PP', '51PTD', '51PC', '51GP', '51GTD', '51GC', '51P', '51TD', '51C', '50L', '50H', '51NP', '51NTD', '51NC', '50NL', '50NH', '51QP', '51QTD', '51QC', '50Q' ) ) OR ( S.GROUPNAME = 'L1' AND ( (T.SETTINGNAME LIKE ( SELECT S.SETTING AS TR FROM TSETTING1 S, TSETTYPE1 T, TRELAY R, TREQUEST Q WHERE R.S01 LIKE '\${F}%' AND R.RELAYTYPE LIKE 'SEL%' AND R.ID = Q.RELAYID AND Q.ID = S.REQUESTID AND T.RELAYTYPE = Q.RELAYTYPE AND T.ROWNUMBER = S.ROWNUMBER AND S.GROUPNAME = 'L1' AND T.SETTINGNAME = 'TR' AND UPPER(Q.S02)='IN SERVICE')) OR T.SETTINGNAME IN('51P1TC', '51PTC') ) ) ) UNION ALL SELECT R.S01 AS DEVICE, R.S04 AS RELAY, R.S06 AS VENDER, Q.RELAYTYPE, Q.M01 AS MEMO FROM TRELAY R, TREQUEST Q WHERE R.S01 LIKE '\${F}%' AND UPPER(R.RELAYTYPE) LIKE 'ELECTRO%' AND R.ID = Q.RELAYID AND UPPER(Q.S02)= 'IN SERVICE'","none"!==document.getElementById("sql-editor-section")?.style.display&&runQuery(),setTimeout((()=>{N()}),6e3);const E=E=>{let T="";if(T+={G:"GND ",P:"PHS ",Q:"NEG ",N:"GND "}[E.charAt(2)]||"PHS ",/^50P[234]/.test(E))T="Definite Time Pick Up(A)";else if(/^67P[234]/.test(E))T="Definite Time Delay(s)";else{/^50/.test(E)?T+="Inst. Overcurrent ":/^51/.test(E)&&(T+="Timed Overcurrent ");const S={P:"Pick Up(A)",C:"Curve",TD:"Time Dial",TC:"Torque Control"},N=E.slice(-1),R=E.slice(-2);S[R]?T+=S[R]:S[N]&&(T+=S[N])}return/^50[PG]5/.test(E)&&(T+=" (Live Line)"),/^SV\\d?\\w+/.test(E)&&(T="_Trip Equation"),T};N=()=>{const T=Array.from(_C1MVCCtrl5._ncc),S=T.length;if(S>10)for(let N=0;N<S;N++)T[N][4]=E(T[N][2]);else document.body.style.fontFamily="monospace";alert("Query Completed")}}));`

  typeof switchEditor === 'function' && switchEditor()
  const searchBar = document.createElement('div')
  searchBar.innerHTML = text_1
  document.body.insertBefore(searchBar, document.body.firstChild)
  const script = document.createElement('script')
  script.textContent = text_2
  document.body.appendChild(script)
})()
