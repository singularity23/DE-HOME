javascript: (function () {
	const queryParams = new URLSearchParams(window.location.search);
	let txtArea = document.querySelector("textarea");
	let trip = "";

	let table = document.querySelector("#OutputScroll table table:last-of-type");

	table && (table.id = "myTable");

	for (let row of table.rows) {
		if (row.innerText.trim() === "") {
			row.remove();
		} else {
			let cells = Array.from(row.cells);
			if (cells && cells[2].innerText.trim() == "TR") {
				trip = cells[3].innerText.trim();
			}
			console.log(trip);
		}
	}

	let tRows = table.querySelectorAll("tr:has(td)");
	let rowCells = table.querySelectorAll("td[nowrap]");
	let firstCellText = rowCells[0].textContent.split(" ");
	let feeder_id = `${firstCellText[0]} ${firstCellText[1]}` || queryParams.get("feeder");

	txtArea.value = `SELECT R.S01 AS DEVICE,Q.RELAYTYPE AS RELAY,T.SETTINGNAME AS ELEMENT,CASE WHEN T.SETTINGNAME NOT LIKE'%D'AND T.SETTINGNAME NOT LIKE'%C'AND S.GROUPNAME='1'AND S.SETTING<>'OFF'THEN UPPER(S.SETTING*(SELECT S.SETTING FROM TSETTING1 S,TSETTYPE1 T WHERE R.S01 LIKE'${feeder_id}%'AND R.RELAYTYPE LIKE'SEL%'AND R.ID=Q.RELAYID AND Q.ID=S.REQUESTID AND T.RELAYTYPE=Q.RELAYTYPE AND T.ROWNUMBER=S.ROWNUMBER AND S.GROUPNAME='1'AND T.SETTINGNAME='CTR'))WHEN T.SETTINGNAME LIKE'67%D'AND S.GROUPNAME='1'AND S.SETTING<>'OFF'THEN UPPER(S.SETTING/60)ELSE S.SETTING END AS SETTING,Q.M01 AS MEMO FROM TSETTING1 S,TSETTYPE1 T,TRELAY R,TREQUEST Q WHERE R.S01 LIKE'${feeder_id}%'AND R.RELAYTYPE LIKE'SEL%'AND R.ID=Q.RELAYID AND Q.ID=S.REQUESTID AND T.RELAYTYPE=Q.RELAYTYPE AND T.ROWNUMBER=S.ROWNUMBER AND UPPER(Q.S02)='IN SERVICE'AND((S.GROUPNAME='1'AND T.SETTINGNAME IN('51P1P','51P1TD','51P1C','51P1TC','50P1P','50P2P','50P3P','50P4P','50P5P','67P2D','67P3D','67P4D','51G1P','51G1TD','51G1C','50G1P','50G5P','51PP','51PTD','51PC','51PTC','51GP','51GTD','51GC','51P','51TD','51C','50L','50H','51NP','51NTD','51NC','50NL','50NH','51QP','51QTD','51QC','50Q','51AP','51BP','51CP'))OR(S.GROUPNAME='L1'AND (T.SETTINGNAME LIKE 'SV%'OR T.SETTINGNAME ='TR')))UNION ALL SELECT R.S01 AS DEVICE,R.S04 AS RELAY,R.S06 AS VENDER,Q.RELAYTYPE,Q.M01 AS MEMO FROM TRELAY R,TREQUEST Q WHERE R.S01 LIKE'${feeder_id}%'AND UPPER(R.RELAYTYPE)LIKE'ELECTRO%'AND R.ID=Q.RELAYID AND UPPER(Q.S02)='IN SERVICE'`;

	executeSQL();
})();
