function readMarkdownAndRebuildHtml(markdown) {
	// Convert Markdown to HTML
	const container = document.querySelector("section");
	// Insert the HTML into the DOM (for testing, you can uncomment this)
	const box = document.createElement("div");
	box.classList.add("box");
	box.innerHTML = markdown;
	const ptag = box.querySelector("p");
	const dtag = document.createElement("div");
	dtag.classList.add("box-head");
	dtag.innerText = ptag.innerText;
	box.removeChild(ptag);
	box.prepend(dtag);

	const items = box.querySelectorAll("a[title]");

	items.forEach(function (item) {
		const abbr = document.createElement("abbr");
		const texts = item.title.split("-");

		abbr.title = texts[0];
		abbr.innerText = texts[1];
		console.log(abbr.outerHTML);
		const info = item.innerText;
		const out = abbr.outerHTML;
		item.removeAttribute("title");
		item.innerHTML = item.innerHTML.replace(texts[1], abbr.outerHTML);
		console.log(item.outerHTML);
	});

	container.appendChild(box);
}
function loadPage() {
	fetch("/sites/de/SiteAssets/source/1_Administrative.md")
		.then((response) => response.text())
		.then((data) => {
			const dataInfo = marked.parse(data);
			readMarkdownAndRebuildHtml(dataInfo);

			fetch("/sites/de/SiteAssets/source/2_Tools & Applications.md")
				.then((response) => response.text())
				.then((data) => {
					const dataInfo = marked.parse(data);
					readMarkdownAndRebuildHtml(dataInfo);
					fetch("/sites/de/SiteAssets/source/3_Useful Links.md")
						.then((response) => response.text())
						.then((data) => {
							const dataInfo = marked.parse(data);
							readMarkdownAndRebuildHtml(dataInfo);

							fetch("/sites/de/SiteAssets/source/4_Technical References.md")
								.then((response) => response.text())
								.then((data) => {
									const dataInfo = marked.parse(data);
									readMarkdownAndRebuildHtml(dataInfo);

									fetch("/sites/de/SiteAssets/source/5_Teams.md")
										.then((response) => response.text())
										.then((data) => {
											const dataInfo = marked.parse(data);
											readMarkdownAndRebuildHtml(dataInfo);
											fetch("/sites/de/SiteAssets/source/6_Procedures & Guidelines.md")
												.then((response) => response.text())
												.then((data) => {
													const dataInfo = marked.parse(data);
													readMarkdownAndRebuildHtml(dataInfo);

													fetch("/sites/de/SiteAssets/source/7_Professional Practice.md")
														.then((response) => response.text())
														.then((data) => {
															const dataInfo = marked.parse(data);
															readMarkdownAndRebuildHtml(dataInfo);
															fetch("/sites/de/SiteAssets/source/8_Health & Safety.md")
																.then((response) => response.text())
																.then((data) => {
																	const dataInfo = marked.parse(data);
																	readMarkdownAndRebuildHtml(dataInfo);

																	fetch("/sites/de/SiteAssets/source/9_Others.md")
																		.then((response) => response.text())
																		.then((data) => {
																			const dataInfo = marked.parse(data);
																			readMarkdownAndRebuildHtml(dataInfo);
																		});
																});
														});
												});
										});
								});
						});
				});
		});
}

const boxes = document.querySelectorAll(".box");

if (boxes != 0) {
	const box_heads = document.querySelectorAll(".box-head");

	if (box_heads != 0) {
		document.addEventListener("DOMContentLoaded", loadPage, { once: true });
	}
}

const saveDataButton = document.getElementById("saveData");
const abbrs = document.querySelectorAll("abbr");
abbrs.forEach(function (abbr) {
	abbr.parentElement.title = abbr.title + "-" + abbr.innerText;
});

var n = 0;
saveDataButton.addEventListener("click", function (e) {
	e.preventDefault();
	const box_html = document.querySelectorAll(".box");
	box_html.forEach(function (h) {
		saveHtmlAsMarkdown(h);
	});
});

function saveHtmlAsMarkdown(html) {
	n += 1;
	// Convert HTML to Markdown using Turndown
	const turndownService = new TurndownService();
	const markdown = turndownService.turndown(html.outerHTML);
	console.log(markdown);
	// Create a Blob with the markdown data
	const blob = new Blob([markdown], { type: "text/markdown" });
	const text = blob.text();
	console.log(text);
	const reg = /(?:\w{1}.+\w{1})/g;
	// Create a link element for downloading the file
	var title = html.querySelector(".box-head").textContent.trim();
	const found = title.match(reg);
	console.log(found);
	const link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = n + "_" + found + ".md";
	console.log(link.download);

	// Trigger the download
	link.click();
}

const loadDataButton = document.getElementById("loadData");

loadDataButton.addEventListener("click", function (e) {
	console.log("load");
	const fileInput = document.getElementById("fileInput");
	console.log(fileInput);
	const file = fileInput.files[0];
	const reader = new FileReader();
	reader.readAsText(file);

	reader.onload = function (e) {
		const content = e.target.result;
		console.log(content);
		const dataInfo = marked.parse(content);
		console.log(dataInfo);
		readMarkdownAndRebuildHtml(dataInfo);
	};
});
