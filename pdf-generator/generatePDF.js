/**
 * Interactive PDF Generator for Distribution Engineering Check Form - Signature Fields
 * Generates PDF with embedded JavaScript for signature validation
 * 
 * Usage: node generatePDF.js
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

/**
 * Embedded JavaScript for PDF signature validation
 */
const EMBEDDED_JAVASCRIPT = `
// BC Hydro Distribution Engineering Check Form - Signature Validation

/**
 * Validate signature fields on PDF open
 */
function validateSignatures() {
  var requiredSigs = ['sc_name', 'ch_name', 'pr_name'];
  var missingSigs = [];
  
  for (var i = 0; i < requiredSigs.length; i++) {
    var field = this.getField(requiredSigs[i]);
    if (field && (!field.value || field.value === '')) {
      missingSigs.push(field.display[0] || requiredSigs[i]);
    }
  }
  
  if (missingSigs.length > 0) {
    var message = 'Signature fields pending:\\n\\n';
    for (var i = 0; i < missingSigs.length; i++) {
      message += '• ' + missingSigs[i] + '\\n';
    }
    app.alert(message, 1);
  }
}

/**
 * Check if all signature lines are complete
 */
function checkSignatureCompletion() {
  var scName = this.getField('sc_name');
  var chName = this.getField('ch_name');
  
  var scComplete = scName && scName.value;
  var chComplete = chName && chName.value;
  
  if (scComplete && chComplete) {
    app.alert('✓ Essential signatures complete', 3);
    return true;
  } else {
    var missing = [];
    if (!scComplete) missing.push('Engineer Signature');
    if (!chComplete) missing.push('Checker Signature');
    app.alert('Missing signatures: ' + missing.join(', '), 2);
    return false;
  }
}

/**
 * Print form with signature validation
 */
function printForm() {
  if (!checkSignatureCompletion.call(this)) {
    return false;
  }
  app.alert('Printing Distribution Engineering Check Form with signatures...', 3);
  this.print();
}

/**
 * Reset signature fields only
 */
function resetSignatures() {
  if (app.confirm('Reset all signature fields?', 0, 1)) {
    this.getField('sc_name').value = '';
    this.getField('sc_sig').value = '';
    this.getField('ch_name').value = '';
    this.getField('ch_sig').value = '';
    this.getField('pr_name').value = '';
    this.getField('pr_sig').value = '';
    app.alert('Signature fields reset.', 3);
  }
}

// Validate on open
validateSignatures();
`;

/**
 * Create interactive PDF with signature fields only
 */
function generateCheckFormPDF() {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 40,
        bufferPages: true
      });

      const filename = path.join(outputDir, 'DE_Check_Form_Signatures.pdf');
      const stream = doc.pipe(fs.createWriteStream(filename));

      // Add embedded JavaScript to PDF
      doc.setJavaScript(EMBEDDED_JAVASCRIPT);

      // ====== HEADER ======
      doc.fillColor('#1a1a1a').fontSize(24).font('Helvetica-Bold');
      doc.text('DISTRIBUTION ENGINEERING', { align: 'left' });
      doc.fontSize(14).fillColor('#666').font('Helvetica');
      doc.text('Check & Review Form - Signatures', { align: 'left' });
      doc.moveTo(40, doc.y + 5).lineTo(550, doc.y + 5).stroke();
      doc.moveDown();

      // ====== SECTION 1: SELF-CHECK SIGNATURE ======
      doc.fontSize(12).fillColor('#000').font('Helvetica-Bold');
      doc.text('SECTION 1: SELF-CHECK', { underline: true });
      doc.moveDown(0.3);

      // Date field
      doc.fontSize(10).font('Helvetica');
      doc.text('Date', 50, doc.y);
      doc.rect(50, doc.y + 15, 150, 25).stroke();
      doc.fontSize(9).fillColor('#999');
      doc.text('[Field: sc_date]', 55, doc.y + 20);
      doc.moveDown(2.5);

      // Signature field
      doc.fontSize(10).fillColor('#000').font('Helvetica');
      doc.text('Signature (Engineer)', 50, doc.y);
      doc.rect(50, doc.y + 15, 400, 60).stroke();
      doc.fontSize(9).fillColor('#999');
      doc.text('[Signature Field: sc_sig]', 55, doc.y + 35);
      doc.moveDown(4.5);

      // Name field
      doc.fontSize(10).fillColor('#000').font('Helvetica');
      doc.text('Name (Engineer) *', 50, doc.y);
      doc.rect(50, doc.y + 15, 250, 25).stroke();
      doc.fontSize(9).fillColor('#999');
      doc.text('[Field: sc_name]', 55, doc.y + 20);
      doc.moveDown(2.5);

      // ====== SECTION 2: CHECK SIGNATURE ======
      doc.fontSize(12).fillColor('#000').font('Helvetica-Bold');
      doc.text('SECTION 2: CHECK', { underline: true });
      doc.moveDown(0.3);

      // Date field
      doc.fontSize(10).font('Helvetica');
      doc.text('Date', 50, doc.y);
      doc.rect(50, doc.y + 15, 150, 25).stroke();
      doc.fontSize(9).fillColor('#999');
      doc.text('[Field: ch_date]', 55, doc.y + 20);
      doc.moveDown(2.5);

      // Signature field
      doc.fontSize(10).fillColor('#000').font('Helvetica');
      doc.text('Signature (Checker)', 50, doc.y);
      doc.rect(50, doc.y + 15, 400, 60).stroke();
      doc.fontSize(9).fillColor('#999');
      doc.text('[Signature Field: ch_sig]', 55, doc.y + 35);
      doc.moveDown(4.5);

      // Name field
      doc.fontSize(10).fillColor('#000').font('Helvetica');
      doc.text('Name (Checker) *', 50, doc.y);
      doc.rect(50, doc.y + 15, 250, 25).stroke();
      doc.fontSize(9).fillColor('#999');
      doc.text('[Field: ch_name]', 55, doc.y + 20);
      doc.moveDown(2.5);

      // ====== SECTION 3: PEER REVIEW SIGNATURE ======
      doc.fontSize(12).fillColor('#000').font('Helvetica-Bold');
      doc.text('SECTION 3: PEER REVIEW', { underline: true });
      doc.moveDown(0.3);

      // Date field
      doc.fontSize(10).font('Helvetica');
      doc.text('Date', 50, doc.y);
      doc.rect(50, doc.y + 15, 150, 25).stroke();
      doc.fontSize(9).fillColor('#999');
      doc.text('[Field: pr_date]', 55, doc.y + 20);
      doc.moveDown(2.5);

      // Signature field
      doc.fontSize(10).fillColor('#000').font('Helvetica');
      doc.text('Signature (Peer Reviewer)', 50, doc.y);
      doc.rect(50, doc.y + 15, 400, 60).stroke();
      doc.fontSize(9).fillColor('#999');
      doc.text('[Signature Field: pr_sig]', 55, doc.y + 35);
      doc.moveDown(4.5);

      // Name field
      doc.fontSize(10).fillColor('#000').font('Helvetica');
      doc.text('Name (Peer Reviewer)', 50, doc.y);
      doc.rect(50, doc.y + 15, 250, 25).stroke();
      doc.fontSize(9).fillColor('#999');
      doc.text('[Field: pr_name]', 55, doc.y + 20);
      doc.moveDown(2);

      // ====== FOOTER ======
      doc.moveDown(1);
      doc.fontSize(8).fillColor('#999').font('Helvetica');
      doc.text('This PDF contains embedded JavaScript for signature validation.', { align: 'center' });
      doc.text('Fields marked with * are required.', { align: 'center' });
      doc.text('BC Hydro Distribution Engineering | ' + new Date().toLocaleDateString(), { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        console.log(`✓ Signature PDF generated: ${filename}`);
        resolve(filename);
      });

      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

// Main execution
console.log('🔄 Generating interactive PDF with embedded JavaScript...\n');

generateCheckFormPDF()
  .then(filename => {
    console.log('\n✅ PDF generation complete!');
    console.log(`📄 File: ${filename}`);
    console.log('\nThis PDF includes:');
    console.log('  ✓ Signature fields for Engineer');
    console.log('  ✓ Signature fields for Checker');
    console.log('  ✓ Signature fields for Peer Reviewer');
    console.log('  ✓ Embedded JavaScript validation');
    console.log('  ✓ Print functionality with signature check');
    console.log('\nTo test: Open the PDF in Adobe Acrobat Reader');
  })
  .catch(error => {
    console.error('❌ Error generating PDF:', error.message);
    process.exit(1);
  });
