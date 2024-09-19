javascript: (function () {
	let tRows = document.querySelectorAll("#OutputScroll table tbody tr:has(td)");
	let rowCells = tRows.querySelectorAll("td[nowrap]");
	let tables = document.querySelectorAll("table");
	const table = tables[tables.length - 1];
	table.id = "myTable";

	const newRows = table.rows;
	for (let i = 0; i < newRows.length; i++) {
		if (newRows[i].innerHTML == "\n") {
			newRows[i].remove();
		}
	}

	if (rowCells.length < 15) {
		let rows = table.querySelectorAll("tr:has(td)");
		rows.forEach(function (row) {
			let cells = row.cells;
			console.log(cells);
			for (let j = 0; j < cells.length; j++) {
				let nextTr = document.createElement("tr");
				let clone = cells[j].cloneNode(true);
				clone.style.whiteSpace = "break-spaces";
				nextTr.appendChild(clone);
				table.appendChild(nextTr);
			}
			row.remove();
		});
		let headrow = table.querySelector("tr:has(th)");
		headrow.remove();
		table.style.fontFamily = "monospace";
		const line = "-".repeat(140);
		const seperator = "\n" + line + "\n";
		const format = ["\n", "\n", "\n", "\n", seperator];
		let textInfo = seperator;
		const l = format.length;
		const firstCell = rowCells[0].textContent.split(" ");
		const fileName = firstCell[0] + " " + firstCell[1] + " PN Info.txt";

		for (let j = 0; j < rowCells.length; j++) {
			textInfo += rowCells[j].textContent + format[j % l];
		}
		const link = document.createElement("a");
		const file = new Blob([textInfo], { type: "text/plain" });
		link.href = URL.createObjectURL(file);
		link.download = fileName;
		link.click();
		URL.revokeObjectURL(link.href);
	} else if (rowCells.length > 15) {
		const elements = table.getElementsByTagName("*");
		for (let i = 0; i < elements.length; i++) {
			const element = elements[i];
			element.style.cssText = "";
			const attributes = element.attributes;
			while (attributes.length > 0) {
				element.removeAttribute(attributes[0].name);
			}
		}

		const rows = table.querySelectorAll("tr");
		let lastHeader = document.querySelector("table tbody tr th:last-of-type");
		let firstHeader = document.querySelector("table tbody tr th:first-of-type");

		for (let i = 0; i < rows.length; i++) {
			const cells = rows[i].querySelectorAll("td");
			if (cells.length < 5) continue;
			const element = cells[2].innerText.trim();
			let deviceNumber = "";
			const thirdLetter = element.charAt(2);
			if (thirdLetter === "G") {
				deviceNumber += "GND ";
			} else if (thirdLetter === "P") {
				deviceNumber += "PHS ";
			} else if (thirdLetter === "Q") {
				deviceNumber += "NEG ";
			}
			if (/^50P[234]/.test(element)) {
				deviceNumber = "Definite Time Pick Up";
			} else if (/^67P[234]/.test(element)) {
				deviceNumber = "Definite Time Delay";
			} else {
				if (element.startsWith("50")) {
					deviceNumber += "Inst. Overcurrent ";
				} else if (element.startsWith("51")) {
					deviceNumber += "Timed Overcurrent ";
				}
				const lastLetter = element.slice(-1);
				const lastTwoLetters = element.slice(-2);
				if (lastLetter === "P") {
					deviceNumber += "Pick Up";
				} else if (lastLetter === "C") {
					deviceNumber += "Curve";
				} else if (lastTwoLetters === "TD") {
					deviceNumber += "Time Dial";
				}
			}
			if (/^50[PG]5/.test(element)) {
				deviceNumber += " (Live Line)";
			}
			cells[4].innerText = deviceNumber.trim();
		}

		const tablerows = Array.from(table.querySelectorAll("tr:has(td)"));

		tablerows.sort((a, b) => {
			const aText = a.querySelector("td:last-of-type").innerText;
			const bText = b.querySelector("td:last-of-type").innerText;
			return aText.localeCompare(bText);
		});
		tablerows.forEach((row) => table.appendChild(row));

		const thirdRows = table.querySelectorAll("tr");
		for (let i = 2; i < thirdRows.length; i++) {
			let cells = thirdRows[i].querySelectorAll("td");
			if (cells[0] != undefined) {
				cells[0].remove();
				cells[1].remove();
			} else {
				thirdRows[i].remove();
			}
		}
		thirdRows[1].querySelectorAll("td")[0].rowSpan = thirdRows.length - 1;
		thirdRows[1].querySelectorAll("td")[1].rowSpan = thirdRows.length - 1;
		table.style.fontFamily = "monospace";
		lastHeader.textContent = "DEVICE NUMBER";
		firstHeader.textContent = "PROTECTION";
		let myTable = document.getElementById("myTable").outerHTML;
		myTable = myTable.replaceAll("\n", '<br style="mso-data-placement:same-cell;"/>').replaceAll("<td", '<td style="vertical-align: top;"');
		const location = "data:application/vnd.ms-excel;base64,";
		window.location.href = location + window.btoa(myTable);
	}
})();
