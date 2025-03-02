const searchBar_html =
  '<div class="input-group" style="padding:10px;box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);justify-content: center;z-index: 1000;">\n <input type="text" id="searchInput" placeholder="e.g. CSQ 12F411" class="app-search app-wj-search wj-control wj-content mr-2 pl-3">\n <button id="searchButton" type="button" class="btn app-btn app-btn-outline-primary mr-2 ">Search</button>\n </div>\n'

typeof switchEditor === 'function' && switchEditor()
const searchBar = document.createElement('div')
searchBar.innerHTML = searchBar_html
document.body.insertBefore(searchBar, document.body.firstChild)

document.head.innerHTML += '<meta http-equiv="Content-Security-Policy" content="default-src *; style-src \'self\' *.bchydro.bc.ca/* \'unsafe-inline\'; script-src \'self\' *.bchydro.bc.ca/* \'unsafe-inline\' \'unsafe-eval\'"></meta>'
