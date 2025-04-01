const searchBar_html =
	'<div class="input-group" style="padding:10px;box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);justify-content: center;z-index: 1000;">\n <input type="text" id="searchInput" placeholder="e.g. CSQ 12F411" pattern="^w{3}s(4|12|25|35)(F)d{2,3}w?" required="" title="please follow the pattern " style="input:valid {background-color: #dcf1da;}" class="app-search app-wj-search wj-control wj-content mr-2 pl-3">\n <button id="searchButton" type="button" class="btn app-btn app-btn-outline-primary mr-2 ">Search</button>\n </div>\n';

typeof switchEditor === 'function' && switchEditor()
const searchBar = document.createElement('div')
searchBar.innerHTML = searchBar_html
document.body.insertBefore(searchBar, document.body.firstChild)
