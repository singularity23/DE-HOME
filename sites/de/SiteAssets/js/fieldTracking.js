const folderCorrection = () => {
  const el = document.querySelector('input[title="Filing Folder"]');
  if (!el || !el.value) return;
  if (!el.value.startsWith('file://')) {
    el.value = `file:///${el.value.replace(/^\/+/, '')}`;
  }
};
document.addEventListener('DOMContentLoaded', folderCorrection);

const fields = document.querySelectorAll("td.ms-vb2");
fields.forEach((field) => {
  if (field.innerText.startsWith("file:")) {
    var urlfield = field.createElement("a");
    console.log(urlfield);
    urlfield.href = field.innerText;
    urlfield.textContent = "EGBC Filing";
    field.innerText = "";
    field.appendChild(urlfield);
  }

});

const table = document.getElementById('script');
const rows = Array.from(table.querySelectorAll('tr')).slice(1, -1);
console.log(rows);
for (const row of rows) {
  const folderCell = row.cells?.[6];
  console.log(folderCell);
  const link = folderCell?.querySelector('a');
  const url = folderCell?.innerText ? `${link?.href}${folderCell?.innerText?.trim()}` : link?.href;
  const urlfield = document.createElement("a");

  if (!link) continue;
  if (!link.href.startsWith('file://')) {
    folderCell.innerText = '';
    urlfield.href = encodeURI(`file:///${link.href.replace(/^\/+/, '')}`);

    urlfield.textContent = 'EGBC Filing';
  } else {
    urlfield.href = url;
    urlfield.textContent = 'EGBC Filing';
  }
  folderCell.appendChild(urlfield);

}