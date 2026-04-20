fetch('https://api.pdf.co/v1/pdf/edit/add', {
  method: 'POST',
  headers: { 'x-api-key': 'YOUR_API_KEY', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    "url": "sites/de/SiteAssets/Document1.pdf", // Your base PDF
    "annotations": [{
      "annotationType": 13, // Signature field type
      "x": 50, "y": 100,
      "width": 150, "height": 50,
      "pages": "0-",
      "required": true
    }],
    "name": "signed-document.pdf"
  })
})
  .then(response => response.json())
  .then(data => console.log(data.url));