function changeLayout() {
	const mainBodies = document.querySelectorAll('td[valign="top"][width="70%"]');
	mainBodies.forEach((td) => (td.style.width = "85%"));
	const sideBars = document.querySelectorAll('td[valign="top"][width="30%"]');
	sideBars.forEach((td) => (td.style.width = "15%"));
	const hds = document.getElementById("s4-titlerow");
	hds && (hds.style.minHeight = "45px");
	const icon = document.getElementById("favicon");
	icon && (icon.href = "https://hydroshare.bchydro.bc.ca/sites/de/SiteAssets/img/favicon.ico");
}

function removeZerowidth() {
	document.querySelectorAll(".ms-rtestate-field").forEach((ele) => {
		ele.querySelectorAll("br").forEach((br) => br.remove());
	});
}

function showPopup(msg) {
	const popup = document.querySelector(".popup");
	popup.querySelector(".popup-content").innerHTML = msg;
	popup.classList.add("show");

	setTimeout(() => {
		popup.classList.remove("show");
	}, 4000); // 3000 milliseconds = 3 seconds
}

function changeLogoTitle() {
	const logo = document.querySelector("#ctl00_onetidHeadbnnr2");
	logo && logo.setAttribute("src", "https://hw.bchydro.bc.ca/Documents/BC%20Hydro%204C%20logo.jpg");
	const title = document.querySelector("#DeltaPlaceHolderPageTitleInTitleArea");
	title && (title.textContent = title.textContent.trim());
	const content = document.querySelector("#ctl00_PlaceHolderMain_ctl01__ControlWrapper_RichHtmlField");
	content && content.firstChild && content.firstChild.remove();
}

function tagUpdate() {
	const updateDateString = new Date().setMonth(new Date().getMonth() + 3);
	document.querySelectorAll("new, update").forEach((tag) => {
		if (!tag.getAttribute("date")) {
			tag.textContent = tag.tagName.toLowerCase();
			tag.setAttribute("date", updateDateString);
		} else if (new Date() >= new Date(tag.getAttribute("date"))) {
			tag.remove();
		} else if (new Date() < new Date(tag.getAttribute("date"))) {
			tag.textContent = tag.tagName.toLowerCase();
		}
	});
}

function handleLinks() {
	document.querySelectorAll("div.box ul li a").forEach((link) => {
		link.addEventListener("click", (event) => {
			const linkUrl = link.href;
			if (linkUrl.startsWith("file:")) {
				event.preventDefault();
				const copiedText = decodeURI(linkUrl).replace(/\s/g, " ");
				navigator.clipboard.writeText(copiedText);
				const inHtml = `<div>"<strong>${copiedText}</strong>"</div>\n <div>has been copied to the clipboard.</div>`;
				console.log("The link is copied to clipboard: " + copiedText);
				showPopup(inHtml);
			} else {
				event.preventDefault();
				if (isValidUrl(linkUrl)) {
					window.open(linkUrl, "_blank");
				} else {
					console.error("Invalid URL: " + linkUrl);
				}
			}
		});
	});
}

function isValidUrl(url) {
	// Basic URL validation
	try {
		new URL(url);
		return true;
	} catch (_) {
		return false;
	}
}

function scrollHandler() {
	const hand = document.querySelector("#s4-workspace");
	if (!hand) {
		return;
	}
	hand.onscroll = debounce(() => {
		const totalHeight = Math.round(hand.scrollTop + hand.clientHeight) + 10;
		console.log(window.outerWidth);
		if (window.outerWidth < 1440) {
			const feedbackSection = document.querySelector(".right-section");
			feedbackSection.style.bottom = totalHeight >= hand.scrollHeight ? "160px" : "10px";
			refresh();
		}
	}, 100); // debounced to reduce the frequency of executions
}

function getCurrentYear() {
	const yearElement = document.querySelector("#year");
	if (yearElement) {
		const currentYear = new Date().getFullYear();
		yearElement.firstChild.textContent = currentYear;
	}
}

function removeBreadcrumb() {
	const breadcrumb = document.querySelector(".ms-breadcrumb-top");
	breadcrumb && breadcrumb.remove();
	const pagingLine = document.querySelector("td.ms-bottompagingline1");
	pagingLine && pagingLine.remove();
}

function resizeWindow() {
	window.addEventListener("resize", () => {
		let innerwidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
		let sideNav = document.querySelector("#sideNavBox");
		let contentBox = document.querySelector("#contentBox");
		if (innerwidth < 800 && sideNav && contentBox) {
			//sideNav.style.display = "none";
			contentBox.style.marginLeft = "0px";
			contentBox.style.width = innerwidth;
		} else {
			contentBox.style.width = innerwidth;
		}
	});
}

function firstListener() {
	const editButton = document.getElementById("Ribbon.EditingTools.CPEditTab.Markup.Html.Menu.Html.EditSource-Large");
	editButton && editButton.addEventListener("click", secondListener);
}

function secondListener() {
	const editor = document.querySelector("#PropertyEditor");
	if (editor) {
		editor.value = editor.value.replace(/(?<=\n\s)\s+/gm, "");
	}
}

const webpart = document.getElementById("MSOZoneCell_WebPartWPQ6");
webpart && webpart.addEventListener("click", () => setTimeout(firstListener, 500));

function debounce(func, wait) {
	let timeout;
	return (...args) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), wait);
	};
}

function refresh() {
	changeLogoTitle();
	removeZerowidth();
	changeLayout();
	tagUpdate();
	handleLinks();
	scrollHandler();
	getCurrentYear();
	removeBreadcrumb();
	resizeWindow();
}

document.addEventListener("DOMContentLoaded", () => {
	refresh();
});
