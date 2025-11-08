// run with: node check-weblinks.js
const fs = require('fs');
const path = 'd:/VS Code/Projects/DE Home/DE-HOME/sites/de/SiteAssets/source/WebLinks.txt';
let data;
try {
  data = JSON.parse(fs.readFileSync(path, 'utf8'));
} catch (err) {
  console.error('Failed to read/parse JSON:', err.message);
  process.exit(1);
}

const urlMap = new Map();
const issues = { empty: [], placeholder: [], suspicious: [], encoding: [] };

function inspectLink (item, category, sub) {
  const name = item.name || '(no name)';
  const url = (item.url || '').trim();
  if (!url) issues.empty.push({ name, category, sub });
  if (url === '#') issues.placeholder.push({ name, category, sub });
  if (
    url &&
    (url.startsWith('file://') || url.startsWith('file:/') || url.startsWith('J:/') || url.startsWith('file:\\'))
  ) {
    issues.suspicious.push({ name, url, category, sub, reason: 'file/drive path' });
  }
  if (url && /bchap\/esd/i.test(url)) {
    issues.suspicious.push({ name, url, category, sub, reason: 'possible typo domain' });
  }
  if (name && /Â|â„¢|â®/i.test(name)) issues.encoding.push({ name, url, category, sub });
  if (url) {
    const list = urlMap.get(url) || [];
    list.push({ name, category, sub });
    urlMap.set(url, list);
  }
}

data.forEach(category => {
  const catName = category.name || '(no category)';
  (category.subheaders || []).forEach(sub => {
    const subTitle = sub.title || '(no subheader)';
    (sub.links || []).forEach(link => inspectLink(link, catName, subTitle));
  });
});

// duplicates
const duplicates = [];
for (const [url, items] of urlMap) {
  if (items.length > 1) duplicates.push({ url, items });
}

console.log('Duplicates:', duplicates.length);
duplicates.forEach(d => {
  console.log('-', d.url);
  d.items.forEach(i => console.log('   ', i.category, '->', i.sub, '->', i.name));
});

console.log('\nEmpty URLs:', issues.empty.length);
issues.empty.slice(0, 20).forEach(i => console.log(' -', i.category, '>', i.sub, '>', i.name));

console.log('\nPlaceholder (#) URLs:', issues.placeholder.length);
issues.placeholder.slice(0, 20).forEach(i => console.log(' -', i.category, '>', i.sub, '>', i.name));

console.log('\nSuspicious (file/typo) links:', issues.suspicious.length);
issues.suspicious.forEach(s => console.log(' -', s.reason, s.url, s.category, s.sub, s.name));

console.log('\nEncoding artifacts in names:', issues.encoding.length);
issues.encoding.forEach(e => console.log(' -', e.name, e.url, e.category, e.sub));
