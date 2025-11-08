const searchBar_html =
  '<div class="input-group" style="padding:10px;box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);justify-content: center;z-index: 1000;">\n <input type="text" id="searchInput" placeholder="e.g. CSQ 12F411" pattern="^w{3}s(4|12|25|35)(F)d{2,3}w?" required="" title="please follow the pattern " style="input:valid {background-color: #dcf1da;}" class="app-search app-wj-search wj-control wj-content mr-2 pl-3">\n <button id="searchButton" type="button" class="btn app-btn app-btn-outline-primary mr-2 ">Search</button>\n </div>\n';

typeof switchEditor === 'function' && switchEditor();
const searchBar = document.createElement('div');
searchBar.innerHTML = searchBar_html;
document.body.insertBefore(searchBar, document.body.firstChild);

const sqlFolder = '/sites/de/SiteAssets/sql';
const endFiles = `https://hydroshare.bchydro.bc.ca/sites/de/_api/web/GetFolderByServerRelativeUrl('${sqlFolder}')/Files`;
let sqlQueries = '';

const getFiles = async fileUrl => {
  const response = await fetch(fileUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json;odata=verbose',
    },
  });
  const data = await response.json();
  console.log(data);
  const txtFiles = data.d.results.filter(file => file.Name.endsWith('.txt'));
  console.log(txtFiles[0]);
  if (txtFiles.length == 1) {
    const results = await readTextFile(txtFiles[0]);
    return results;
    console.log(results);
  }
};

const readTextFile = async txtFile => {
  const fileResponse = await fetch(txtFile.ServerRelativeUrl, {
    method: 'GET',
    headers: {
      Accept: 'text/plain',
    },
  });
  const content = await fileResponse.text();
  console.log(content);
  sqlQueries = content;
};

const minifySqlManual = sql => {
  // Remove comments (single-line -- and multi-line /* */)
  let minified = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

  // Replace multiple whitespace characters with a single space
  minified = minified.replace(/\s+/g, ' ');

  // Trim leading/trailing spaces and newlines
  minified = minified.trim();

  return minified;
};

document.addEventListener('DOMContentLoaded', async () => {
  await getFile(endFiles);
});

const minifiedSql = minifySqlManual(sqlQueries);
console.log(minifiedSql);
