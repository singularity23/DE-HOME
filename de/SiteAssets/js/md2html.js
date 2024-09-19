window.onload = () => {
	let fileList = [];
	let boxList = [];
	const input = document.getElementById("file-container").querySelector("input");
	const preview = document.querySelector(".preview");
	const loadDataButton = document.getElementById("loadData");
	const copyHTML = document.getElementById("copyHTML");
	const updateButton = document.getElementById("updateHTML");
	const saveButton = document.getElementById("saveMD");
	let htmlCode = document.getElementById("html-code");
	let htmlRender = document.getElementById("html-render");

	const updateDisplay = () => {
		preview.innerHTML = ""; // Clear preview

		const { files } = input;

		if (!files || files.length === 0) {
			preview.innerHTML = "<p>No files currently selected for upload</p>";
		} else {
			const list = document.createElement("div");
			const fileNames = Array.from(files).map((file) => file.name);
			fileList = Array.from(files).sort();
			list.innerHTML = `<span>${fileNames.join(", ")}</span>`;
			preview.appendChild(list);
		}
	};

	input.style.opacity = 0;
	input.style.width = 0;
	input && input.addEventListener("change", updateDisplay);

	const convertToFileUrl = (path) => `file:///${encodeURI(path.replace(/\\/g, "/"))}`;

	const validateUrls = (content) => {
		const urlRegex = /(?<=\]\()(.+)(?=\s\"|\))/gm;
		const urls = content.match(urlRegex);

		urls &&
			urls.forEach((url) => {
				if (url.match(/[A-Za-z]:\\/)) {
					content = content.replace(url, convertToFileUrl(url));
				}
			});

		return content;
	};

	const handleFile = (file, index) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const content = validateUrls(e.target.result);
			if (content) {
				const dataInfo = marked.parse(content);
				processData(dataInfo, index);
			}
		};
		reader.readAsText(file);
	};

	const processData = (data, index) => RebuildHTML(data, index);

	loadDataButton.addEventListener("click", (evt) => {
		evt.preventDefault();
		fileList.forEach((file, index) => handleFile(file, index));
	});

	const RebuildHTML = (markdown, index) => {
		const box = document.createElement("div");
		box.classList.add("box");
		box.innerHTML = markdown;

		const temp_box = (boxList[index] = document.createElement("div"));
		const ptag = box.querySelector("p");
		const dtag = document.createElement("div");

		dtag.classList.add("box-head");
		dtag.innerText = ptag.innerText;
		box.prepend(dtag);
		box.removeChild(ptag);

		temp_box.innerHTML = `<!-- Start - Section: '${dtag.innerText}' -->\n${box.outerHTML}\n<!-- End - Section: '${dtag.innerText}' -->\n`;

		updateHTML();
	};

	const updateHTML = () => {
		htmlRender.innerHTML = "";
		if (input.files) {
			htmlCode.value = "";
			boxList.forEach((box) => {
				htmlCode.value += box.innerHTML;
			});

			if (boxList.length == 9) {
				htmlCode.value = "<section>" + htmlCode.value + "</section>";
			}

			htmlRender.innerHTML = htmlCode.value;
			tagUpdate();
			htmlCode.value = htmlRender.innerHTML;
		} else {
			let txtvalue = htmlCode.value;
			htmlRender.innerHTML = txtvalue;
		}
	};

	updateButton.addEventListener("click", () => {
		htmlRender.innerHTML = htmlCode.value;
		tagUpdate();
	});

	copyHTML &&
		copyHTML.addEventListener("click", (e) => {
			e.preventDefault();
			navigator.clipboard.writeText(htmlCode.value);

			//htmlCode.select();
			//document.execCommand("copy");
			alert("HTML code copied to clipboard");
		});

	const saveHtmlAsMarkdown = (html, n, fileName) => {
		const turndownService = new TurndownService();
		let markdown = turndownService.turndown(html);
		let textArea = document.createElement("textarea");
		textArea.innerHTML = html;
		let newHtml = textArea.value;
		const regmd = /((?<=\[).*(?=\]))/g;
		const reghtml = /(?<=(<a).*(>))(.*)(?=(<\/a>))/g;
		let htmlmatch = newHtml.match(reghtml) || [];
		let mmatch = markdown.match(regmd) || [];

		let hmatch = htmlmatch.filter((item) => item !== "");

		console.log(hmatch);
		console.log(mmatch);
		if (hmatch.length === mmatch.length) {
			hmatch.forEach((htmlText, i) => {
				if (htmlText !== mmatch[i]) {
					markdown = markdown.replace(mmatch[i], htmlText);
					console.log(htmlText);
				}
			});
		}

		const blob = new Blob([markdown], { type: "text/markdown" });
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = `${n + 1}_${fileName.trim()}.md`;
		link.click();
	};

	saveButton.addEventListener("click", () => {
		const boxelements = htmlRender.querySelectorAll(".box");

		boxelements.forEach((boxelement, i) => {
			const zerowidth = /([\u200B\u200C\u200D\u200E\u200F\uFEFF]+)/g;
			boxelement.innerHTML = boxelement.innerHTML.replace(zerowidth, "");
			const fileName = boxelement.firstChild.innerText.replace(zerowidth, "");
			saveHtmlAsMarkdown(boxelement.innerHTML, i, fileName);
		});
	});
};
