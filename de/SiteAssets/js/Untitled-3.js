javascript: (function () {
	let menu = document.querySelector(".menu-details");
	let content = menu.innerText;
	let list = content.split("\n");
	const id = list[list.length - 1].split(":")[1];
	const address = list[1];
	const reason = list[0];
	let filename = [id, address, reason];
	filename = filename.join("-");
	navigator.clipboard.writeText(filename);
	console.log(filename);
})();
