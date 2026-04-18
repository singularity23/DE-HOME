/**
 * Express server for PDF generation endpoint
 * Serves the interactive signature PDF
 */

const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../sites/de/SiteAssets')));

/**
 * Generate PDF with form data
 */
app.post('/api/generate-signature-pdf', (req, res) => {
  try {
    const { workTitle, revision, engineer, checker } = req.body;

    // Run the PDF generator
    const scriptPath = path.join(__dirname, 'generatePDF.js');
    
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error('PDF Generation Error:', error);
        return res.status(500).json({ 
          error: 'Failed to generate PDF',
          details: stderr 
        });
      }

      // Return the PDF file
      const pdfPath = path.join(__dirname, 'output', 'DE_Check_Form_Signatures.pdf');
      
      if (fs.existsSync(pdfPath)) {
        res.download(pdfPath, 'DE_Check_Form_Signatures.pdf');
      } else {
        res.status(404).json({ error: 'PDF file not found' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'PDF Generator Service is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PDF Generator Server running on http://localhost:${PORT}`);
  console.log('📄 Endpoint: POST /api/generate-signature-pdf');
});
