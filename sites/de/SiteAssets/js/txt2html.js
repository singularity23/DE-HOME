window.onload = () => {
  const state = {
    fileList: [],
    boxList: []
  };

  const input = document.querySelector('#file-container input');
  const preview = document.querySelector('.preview');
  const loadDataButton = document.getElementById('loadData');
  const updateButton = document.getElementById('updateHTML');
  const htmlCode = document.getElementById('html-code');
  const htmlRender = document.getElementById('html-render');

  const updateDisplay = () => {
    preview.innerHTML = ''; // Clear preview
    const { files } = input;

    if (!files || files.length === 0) {
      preview.innerHTML = '<p>No files currently selected for upload</p>';
    } else {
      const fileNames = Array.from(files).map(file => file.name).sort();
      state.fileList = Array.from(files).sort();
      preview.innerHTML = `<div><span>${fileNames.join(', ')}</span></div>`;
    }
  };

  input.style.opacity = 0;
  input.style.width = 0;
  input.addEventListener('change', updateDisplay);

  const addMonths = (ymd, months) => {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(y, m - 1 + months, d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };

  const validateUrls = content => {
    const urlRegex = /(?<=\]\()(.+?)(?=\s\"|\))/gm;
    return content.replace(urlRegex, url => (url.match(/[A-Za-z]:\\/) ? convertToFileUrl(url) : url));
  };

  const convertToFileUrl = path => `file:///${encodeURI(path.replace(/\\/g, '/'))}`;

  const handleFile = (file, index) => {
    const reader = new FileReader();
    reader.onload = e => {
      const content = validateUrls(e.target.result);
      if (content) {
        const lines = content.split(/\r?\n/).filter(Boolean);
        const [head, ...records] = lines;
        const mdLines = [head, '', ...records.map(transformRecord)];
        const md = mdLines.join('\n');
        const dataInfo = marked.parse(validateUrls(md));
        renderHTML(file.name, dataInfo, index);
      }
    };
    reader.readAsText(file);
  };

  const renderHTML = (name, dataInfo, idx) => {
    const box = document.createElement('div');
    box.classList.add('box');
    box.innerHTML = dataInfo;

    const tempBox = (state.boxList[idx] = document.createElement('div'));
    const dtag = document.createElement('div');
    const ptag = box.querySelector('p');
    dtag.classList.add('box-head');
    dtag.innerText = ptag.innerText;
    box.prepend(dtag);
    ptag.remove();

    tempBox.innerHTML = `<!-- Start - Section: '${name}' -->\n${box.outerHTML}\n<!-- End - Section: '${name}' -->\n`;

    htmlCode.value = state.boxList.map(box => box.innerHTML).join('');
    if (state.boxList.length - 1 === idx) {
      htmlCode.value = `<section>${htmlCode.value}</section>`;
    }
    htmlRender.innerHTML = htmlCode.value;
    tagUpdate();
  };

  const transformRecord = line => {
    const parts = line.split(',').map(p => p.trim());
    const [idx, composite, type, dateOrig, link, logoText, logoSrc, logoLink] = parts;
    const dateUsed = dateOrig ? addMonths(dateOrig, 3) : '';
    const [code, desc, trailing] = parseComposite(composite);
    const indent = idx == 1 ? '*' : '  *';
    const openTag = type ? `<${type} date="${dateUsed}">` : '';
    const closeTag = type ? `</${type}>` : '';
    let md = link
      ? `${indent} [${desc ? `<abbr title="${desc}">${code}</abbr>` : code}${trailing || ''}${openTag}${closeTag}](${link})`
      : `${indent} ${desc ? `<abbr title="${desc}">${code}</abbr>` : code}${trailing || ''}${openTag}${closeTag}`;
    if (logoText && logoSrc && logoLink) {
      md += `[![${logoText}](${logoSrc})](${logoLink})`;
    }
    return md;
  };

  const parseComposite = composite => {
    const match = composite.match(/^([^(]+)\(([^)]+)\)(.*)$/);
    return match ? [match[1].trim(), match[2].trim(), match[3].trim()] : [composite, '', ''];
  };

  loadDataButton.addEventListener('click', evt => {
    evt.preventDefault();
    state.fileList.forEach((file, index) => handleFile(file, index));
  });

  updateButton.addEventListener('click', evt => {
    evt.preventDefault();
    fetchAndProcessData();
  });
};