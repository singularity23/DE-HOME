function changeLayout() {
	const tds = document.querySelectorAll('td[valign="top"][width="70%"]');
	tds.forEach(function (td) {
		console.log("Main body 85%");
		td.style.width = "85%";
	});
	const tds1 = document.querySelectorAll('td[valign="top"][width="30%"]');
	tds1.forEach(function (td1) {
		console.log("Side bar 15%");
		td1.style.width = "15%";
	});

	const hds = document.getElementById("s4-titlerow");
	try {
		hds.style.minHeight = "45px";
		console.log("Title min-height changed");
	} catch (err) {
		console.log(err.message);
	}

	const icon = document.getElementById("favicon");
	if (icon) {
		icon.href = "https://hydroshare.bchydro.bc.ca/sites/de/SiteAssets/img/favicon.ico";
		console.log("favicon has been changed");
	}
}

function removeZerowidth() {
	const eles = document.querySelectorAll(".ms-rtestate-field");
	eles.forEach(function (ele) {
		let brs = ele.querySelectorAll("br");
		brs.forEach(function (br) {
			br.parentNode.removeChild(br);
			console.log("zero width space removed");
		});
	});
}
function hideBreadcrumb() {
	let currentURL = window.location.href;
	const targetURL = "https://hydroshare.bchydro.bc.ca/sites/de/default.aspx";
	if (currentURL === targetURL) {
		let styleElement = document.querySelector("style");
		if (styleElement) {
			styleElement.innerHTML += ".ms-Breadcrumb { display: none !important; }";
			//styleElement.innerHTML += '#sideNavBox { display: none !important; width: 30px}';
			//styleElement.innerHTML += '#contentBox { margin-left: 30px}';
			console.log("Home tap modified");
		} else {
			let newStyleElement = document.createElement("style");
			newStyleElement.type = "text/css";
			newStyleElement.innerHTML = ".ms-Breadcrumb { display: none !important; }";
			//newStyleElement.innerHTML += '#sideNavBox { display: none !important; }';
			//newStyleElement.innerHTML += '#contentBox { margin-left: 30px}';
			document.getElementsByTagName("head")[0].appendChild(newStyleElement);
			console.log("Empty Home tap added");
		}
	}
}
function changeLogoTitle() {
	const imgelement = document.querySelector("#ctl00_onetidHeadbnnr2");
	if (imgelement) {
		imgelement.setAttribute("src", "https://hw.bchydro.bc.ca/Documents/BC%20Hydro%204C%20logo.jpg");
	}
	const webTitle = document.querySelector("#DeltaPlaceHolderPageTitleInTitleArea");
	if (webTitle) {
		webTitle.textContent = webTitle.textContent.trim();
	}
	const pagecontent = document.querySelector("#ctl00_PlaceHolderMain_ctl01__ControlWrapper_RichHtmlField");
	try {
		pagecontent.firstChild.remove();
	} catch (err) {
		console.log(err.message);
	}
}
function tagUpdate() {
	const newTags = document.querySelectorAll("new");
	const updateTags = document.querySelectorAll("update");
	let currentDate = new Date();
	currentDate.setMonth(currentDate.getMonth() + 3);
	let DateString = currentDate.toLocaleDateString("en-Ca");
	newTags.forEach(function (newTag) {
		const expiryDate = new Date(newTag.getAttribute("date"));
		//console.log(newTag.parentElement.tagName);
		if (newTag.parentElement.tagName != "CODE") {
			if (newTag.hasAttribute("date") == false) {
				newTag.textContent = "new";
				newTag.setAttribute("date", DateString);
			} else if (new Date() < expiryDate) {
				newTag.textContent = "new";
			} else {
				delete newTag;
			}
		}
		//console.log(newTag);
	});
	updateTags.forEach(function (updateTag) {
		const expiryDate = new Date(updateTag.getAttribute("date"));
		if (updateTag.hasAttribute("date") == false) {
			updateTag.textContent = "update";
			updateTag.setAttribute("date", DateString);
		} else if (new Date() < expiryDate) {
			updateTag.textContent = "update";
		} else {
			delete updateTag;
		}
		//console.log(updateTag);
	});
}

document.addEventListener("DOMContentLoaded", changeLogoTitle, { once: true });
document.addEventListener("DOMContentLoaded", removeZerowidth, { once: true });
document.addEventListener("DOMContentLoaded", changeLayout, { once: true });
document.addEventListener("DOMContentLoaded", hideBreadcrumb, { once: true });
document.addEventListener("DOMContentLoaded", tagUpdate, { once: true });
document.addEventListener("DOMContentLoaded", function () {
	const links = document.querySelectorAll("div.box ul li a");
	//console.log("Listener to copy link for local drive");
	links.forEach(function (link) {
		link.addEventListener("click", function (event) {
			//console.log("clicked copy link");
			if (link.href.startsWith("file:")) {
				event.preventDefault();
				const textArea = document.createElement("textarea");
				let decoded = decodeURI(link.href);
				let decodedClean = decoded.replaceAll(/\s/g, " ");
				textArea.value = decodedClean;
				document.body.appendChild(textArea);
				textArea.select();
				document.execCommand("copy");
				document.body.removeChild(textArea);
				alert("The link is copied to clipboard\n" + decodedClean);
			} else {
				event.preventDefault();
				window.open(link.href, "_blank");
			}
		});
	});
});

document.addEventListener("DOMContentLoaded", function () {
	const hand = document.querySelector("#s4-workspace");
	if (hand) {
		hand.onscroll = function (ev) {
			//console.log(ev);
			//console.log("scrollTop " + Math.round(hand.scrollTop));
			//console.log("clientHeight " + hand.clientHeight);
			//console.log("scrollHeight " + hand.scrollHeight);
			let totalHeight = Math.round(hand.scrollTop) + Math.round(hand.clientHeight) + 10;
			console.log(totalHeight);
			//console.log(window.outerWidth);
			if (window.outerWidth < 1440) {
				//console.log("<1440");
				const fixedEle = document.querySelector(".right-section");
				if (totalHeight >= hand.scrollHeight) {
					//console.log("feedback bottom bounced back");
					fixedEle.style.bottom = "160px";
				} else {
					fixedEle.style.bottom = "10px";
					//console.log("feedback bottom fixed to bottom");
				}
			}
		};
	}
});
//const edit = document.getElementById("ctl00_ctl39_g_ed4818e8_a50b_485c_a3f8_b535b97edbd2content");
const webpart = document.getElementById("MSOZoneCell_WebPartWPQ8");
webpart &&
	webpart.addEventListener("click", function () {
		const timeout = setTimeout(firstListener, 500);
	});

function firstListener() {
	//console.log(this);
	const editbutton = document.getElementById("Ribbon.EditingTools.CPEditTab.Markup").querySelector(".ms-cui-ctl-large");
	if (editbutton) {
		editbutton.addEventListener("click", secondListener);
		//console.log(editbutton);
	}
}

function secondListener() {
	const editor = document.querySelector("#PropertyEditor");
	//console.log(editor.value);
	let str = editor.value;
	str = str.replace(/(?<=\n\s)\s+/gm, "");
	//.split("\n")
	//.map((para) => `<p>${para}</p>`)
	//.join("")
	//.replace(/(?<=\n\s)\s+/gm, "");
	editor.value = str;
	//console.log(editor.value);
}

function getCurrentYear() {
	const yearSelector = document.querySelector("#year");
	//console.log(yearSelector);
	let currentYear = String(new Date().getFullYear());
	if (yearSelector) {
		yearSelector.firstChild.textContent = currentYear;
	}
	console.log("Current Year: " + currentYear);
}

document.addEventListener("DOMContentLoaded", getCurrentYear, { once: true });

function removeBreadcrumb() {
	const element = document.querySelector(".ms-breadcrumb-top");
	if (element) {
		element.parentNode.removeChild(element);
		console.log("breadcrumb removed");
	}
	const ele_2 = document.querySelector("td.ms-bottompagingline1");
	if (ele_2) {
		ele_2.parentNode.removeChild(ele_2);
		console.log("empty line removed");
	}
}

document.addEventListener("DOMContentLoaded", removeBreadcrumb, { once: true });

function resizeWindow() {
	let width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
	let ele = document.querySelector("#sideNavBox");
	let ele2 = document.querySelector("#contentBox");
	//console.log(width);
	if (width < 750) {
		ele.style.display = "none";
		ele2.style.marginLeft = "20px";
	}
}

document.addEventListener("DOMContentLoaded", resizeWindow, { once: true });
