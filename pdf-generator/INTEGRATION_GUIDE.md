# PDF Signature Generator Integration Guide

## Overview
This integrates an interactive PDF signature generator with your CheckForm.html. Users can generate a PDF with embedded JavaScript validation for signature fields.

## Architecture

```
CheckForm.html
    ↓
signature-pdf-generator.js (client-side)
    ↓
POST /api/generate-signature-pdf
    ↓
server.js (Node.js Express)
    ↓
generatePDF.js (PDFKit)
    ↓
DE_Check_Form_Signatures.pdf
```

## Installation Steps

### 1. Install Dependencies
```bash
cd pdf-generator
npm install pdfkit express
```

### 2. Add Script to CheckForm.html

In the `<head>` section, add:
```html
<script src="/SiteAssets/js/signature-pdf-generator.js"></script>
```

### 3. Add Button to CheckForm.html

Find the work information section header (around line 1395):
```html
<div class="sec-head open" id="sec-info-head" ...>
  <div class="sec-right">
    <button class="btn-clear no-print" type="button" id="clearWorkInfoBtn">Clear</button>
```

Add this button after the Clear button:
```html
<button class="btn-action no-print" type="button" id="generateSignaturePdfBtn" 
  onclick="window.signaturePDFGenerator.generateSignaturePDF()"
  title="Generate interactive PDF with signature fields">
  📄 Generate Signature PDF
</button>
```

### 4. Add CSS Styling

Add to your CSS file (e.g., default.css):
```css
/* PDF Generator Button */
.btn-action {
  padding: 8px 16px;
  background: #0074a4;
  color: white;
  border: 1px solid #0074a4;
  border-radius: 2px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  font-family: 'Roboto', sans-serif;
  transition: all 0.2s ease;
  margin-left: 8px;
}

.btn-action:hover:not(:disabled) {
  background: #005a82;
  border-color: #005a82;
}

.btn-action:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

## Running the Server

### Development Mode
```bash
cd pdf-generator
node server.js
```

Server runs on: `http://localhost:3000`

### Production Mode (with PM2)
```bash
npm install -g pm2
cd pdf-generator
pm2 start server.js --name "pdf-generator"
pm2 save
```

## API Endpoint

### POST /api/generate-signature-pdf

**Request Body:**
```json
{
  "workTitle": "String",
  "revision": "String",
  "engineer": "String",
  "checker": "String",
  "scName": "String",
  "chName": "String",
  "prName": "String",
  "scDate": "YYYY-MM-DD",
  "chDate": "YYYY-MM-DD",
  "prDate": "YYYY-MM-DD"
}
```

**Response:** PDF file download

**Error Response:**
```json
{
  "error": "Error message",
  "details": "Additional details"
}
```

## Features Included

✅ **Signature Fields for:**
- Self-Check (Engineer)
- Check (Checker)
- Peer Review (Reviewer)

✅ **Embedded JavaScript:**
- Auto-validation on PDF open
- Print with signature check
- Reset signature fields
- Export form data

✅ **Required Fields Check:**
- Validates work title
- Validates revision
- Validates engineer name
- Shows warnings for missing signatures

## Testing

### 1. Open CheckForm.html in browser
```
http://localhost:8084/sites/de/SiteAssets/html/CheckForm.html
(or your actual SharePoint path)
```

### 2. Fill in form fields:
- Work Title: "Sample Check Form"
- Revision: "1.0"
- Engineer Name: "John Smith"

### 3. Click "Generate Signature PDF" button

### 4. PDF downloads automatically

### 5. Open PDF in Adobe Acrobat Reader to see embedded JavaScript

## Troubleshooting

### PDF Not Downloading
- Check browser console for errors
- Verify server is running on port 3000
- Check proxy/firewall settings

### JavaScript Not Running in PDF
- Use Adobe Acrobat Reader (free version works)
- Ensure PDF security settings allow JavaScript
- Some browsers may block PDF JavaScript

### CORS Errors
- Update server.js to add CORS headers if serving from different domain:
```javascript
const cors = require('cors');
app.use(cors());
```

### Port Already in Use
- Change PORT in server.js
- Or kill process: `lsof -i :3000`

## File Structure

```
DE-HOME/
├── pdf-generator/
│   ├── generatePDF.js .......... PDF creation logic
│   ├── server.js .............. Express server
│   ├── package.json
│   ├── output/ ................ Generated PDFs
│   └── node_modules/
└── sites/de/SiteAssets/
    ├── html/
    │   └── CheckForm.html ...... Main form (add button here)
    └── js/
        └── signature-pdf-generator.js .. Integration module
```

## Notes

- PDFs are generated server-side for security
- Signature fields are visual placeholders (users can sign digitally)
- Each PDF generation creates a new file in the `output/` directory
- Consider implementing cleanup routine for old PDFs
- All JavaScript is embedded in PDF and doesn't require server after download

## Future Enhancements

- [ ] Actual digital signature capture (via Canvas/Drawing)
- [ ] Email PDF directly from form
- [ ] Save form data to database before PDF generation
- [ ] Template customization per project
- [ ] Batch PDF generation for multiple forms
- [ ] OCR for handwritten signatures

