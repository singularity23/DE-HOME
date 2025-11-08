const path = '/sites/de/SiteAssets/js/ASPEN_Query.js';
let fileContent;
let data;
try {
  // Read file content into text variable
  fileContent = fetch(path)
    .then(response => response.text())
    .then(text => text);

  data = await fileContent;
  // Parse the content if it's JSON
  // Now you can use either fileContent (raw text) or parsedData (parsed JSON)
  console.log('Raw content:', fileContent);
} catch (err) {
  console.error('Failed to read/parse file:', err.message);
  process.exit(1);
}
