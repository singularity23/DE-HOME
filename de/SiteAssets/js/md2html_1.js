window.onload = function () {
	let fileList = [];
	let boxList = [];
	const input = document.getElementById("file-container").querySelector("input");

	const updateDisplay = function () {
		console.log(preview.firstChild);
		while (preview.firstChild) {
			preview.removeChild(preview.firstChild);
		}
		if (input) {
			const { files } = input;
			console.log(files);
			if (files.length === 0) {
				const para = document.createElement("p");
				para.textContent = "No files currently selected for upload";
				preview.appendChild(para);
			} else {
				const list = document.createElement("div");
				preview.appendChild(list);
				const para = document.createElement("span");
				let fileNames = [];
				fileList = [];
				for (let i = 0; i < files.length; i++) {
					console.log(files[i].name);
					fileNames.push(files[i].name);
					fileList.push(files[i]);
					//console.log(text);
					//console.log(input.value);
					//console.log(preview);
				}
				para.textContent = fileNames.join(", ");
				list.appendChild(para);
				list.files = files;
			}
		} else {
			console.log("input Error!");
		}
	};

	if (input) {
		input.style.opacity = 0;
		input.style.width = 0;
		input.addEventListener("change", updateDisplay);
	}

	const preview = document.querySelector(".preview");
	const loadDataButton = document.getElementById("loadData");
	const copyHTML = document.getElementById("copyHTML");
	const updateButton = document.getElementById("updateHTML");
	const saveButton = document.getElementById("saveMD");
	let htmlCode = document.getElementById("html-code");
	let htmlRender = document.getElementById("html-render");

	const convertToFileUrl = function (path) {
		// Replace backslashes with forward slashes
		let fileUrl = path.replace(/\\/g, "/");
		// Encode spaces and other special characters
		fileUrl = encodeURI(fileUrl);
		// Prepend the file URL scheme
		fileUrl = `file:///${fileUrl}`;

		return fileUrl;
	};

	// Function to validate URLs in the content
	const validateUrls = function (content) {
		// Regex to find URLs in markdown, supporting various schemes and Windows paths
		const urlRegex = /(?<=\]\()(.+)(?=\s\"|\))/gm;
		const urls = content.match(urlRegex);
		console.log(urls);
		if (urls) {
			for (let url of urls) {
				console.log(url);
				if (url.match(/[A-Za-z]:\\/)) {
					// Convert Windows path to file URL
					const fileUrl = convertToFileUrl(url);
					content = content.replace(url, fileUrl);
				}
			}
		}
		return content;
	};

	// Function to handle the file and parse it

	const handleFile = function (file, index) {
		const reader = new FileReader();
		reader.readAsText(file);
		reader.onload = function (e) {
			const content = e.target.result;
			const validatedContent = validateUrls(content);
			if (validatedContent) {
				const dataInfo = marked.parse(validatedContent);
				processData(dataInfo, index);
			} else {
				console.log("Parsing halted due to invalid URLs.");
			}
		};
	};

	const processData = function (data, index) {
		//console.log(data);
		RebuildHTML(data, index);
	};

	loadDataButton.addEventListener("click", function (evt) {
		console.log(evt);
		if (input) {
			evt.preventDefault();
			fileList.forEach(function (file, index) {
				handleFile(file, index);
			});
		}
	});

	const RebuildHTML = function (markdown, index) {
		// Convert Markdown to HTML
		const box = document.createElement("div");
		box.classList.add("box");
		box.innerHTML = markdown;
		const temp_box = (boxList[index] = document.createElement("div"));
		temp_box.appendChild(box);

		const ptag = box.querySelector("p");
		const dtag = document.createElement("div");
		dtag.classList.add("box-head");
		dtag.innerText = ptag.innerText;
		box.removeChild(ptag);
		box.prepend(dtag);
		const comment = document.createComment(`Start - Section: '${dtag.innerText}'`);
		temp_box.prepend("\n");
		temp_box.prepend(comment);
		const comment_1 = document.createComment(`End - Section: '${dtag.innerText}'`);
		temp_box.append("\n");
		temp_box.append(comment_1);
		temp_box.append("\n");

		RebuildABBR(box);
		updateHTML(boxList);
	};

	const RebuildABBR = function (boxElement) {
		const items = boxElement.querySelectorAll("a");

		items.forEach(function (item) {
			//const dfn = document.createElement('dfn');
			const abbr = document.createElement("abbr");
			const texts = item.title.split("-");
			//dfn.id = texts[1];
			abbr.title = texts[0];
			abbr.innerText = texts[1];
			//console.log(abbr.outerHTML);
			const info = item.innerText;
			const out = abbr.outerHTML;
			//dfn.appendChild(abbr);
			item.removeAttribute("title");
			item.innerHTML = item.innerHTML.replace(texts[1], out);
			//console.log(item.outerHTML);
		});
	};

	const updateHTML = function () {
		if (input.files) {
			htmlCode.value = "";
			console.log(boxList);
			for (let box of boxList) {
				htmlCode.value += box.innerHTML;
			}
			if (boxList.length == 9) {
				htmlCode.value = "<section>" + htmlCode.value + "</section>";
			}
			htmlRender.innerHTML = htmlCode.value;
			tagUpdate();
			htmlCode.value = htmlRender.innerHTML;
		} else {
			console.log("here");
			let txtvalue = htmlCode.value;
			htmlRender.innerHTML = txtvalue;
		}
	};

	updateButton.addEventListener("click", function (e) {
		let txtvalue = htmlCode.value;
		htmlRender.innerHTML = txtvalue;
		tagUpdate();
		htmlRender.innerHTML = txtvalue;
	});

	copyHTML &&
		copyHTML.addEventListener("click", function (e) {
			e.preventDefault();
			htmlCode.select();
			document.execCommand("copy");
			alert("HTML code copied to clipboard");
		});
	// Copy the generated HTML code to the clipboard

	const saveHtmlAsMarkdown = function (html, n, fileName) {
		// Convert HTML to Markdown using a library like Turndown
		const turndownService = new TurndownService();
		let markdown = turndownService.turndown(html);

		const regmd = /((?<=\[).*(?=\]))/g;
		const reghtml = /(?<=(<a).*(>))(.*)(?=(<\/a>))/g;
		let newhm = [];
		hmatch = html.match(reghtml);
		mmatch = markdown.match(regmd);
		console.log(newhm);
		console.log(mmatch);

		for (let i = 0; i < hmatch.length; i++) {
			if (hmatch[i] != "") {
				newhm.push(hmatch[i]);
			}
		}
		if (newhm.length == mmatch.length) {
			for (let n = 0; n < hmatch.length; n++) {
				if (newhm[n] != mmatch[n]) {
					markdown = markdown.replace(mmatch[n], newhm[n]);
					console.log(markdown);
					console.log(newhm[n]);
				} else {
					console.log(mmatch[n]);
				}
			}
		} else {
			console.log(newhm);
			console.log(mmatch);
		}
		console.log(markdown);
		// Create a Blob with the markdown data
		const blob = new Blob([markdown], { type: "text/markdown" });
		// Create a link element for downloading the file
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = `${n}_${fileName.trim()}.md`;
		console.log(decodeURI(link.download));
		// Trigger the download
		link.click();
	};

	saveButton.addEventListener("click", function (e) {
		const html = htmlRender.innerHTML;
		const boxelements = htmlRender.querySelectorAll(".box");
		console.log(boxelements);
		let n = 1;
		boxelements.forEach(function (boxelement) {
			const zerowidth = /([\u200B]+|[\u200C]+|[\u200D]+|[\u200E]+|[\u200F]+|[\uFEFF]+)/g;
			boxelement.innerHTML.replace(zerowidth, "");
			console.log(boxelement.innerHTML);
			const fileName = boxelement.firstChild.innerText.replace(zerowidth, "");
			console.log(fileName);
			saveHtmlAsMarkdown(boxelement.innerHTML, n, fileName);
			n++;
		});
	});
};
