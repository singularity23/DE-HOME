/**
 * Client-Side PDF Signature Generator for CheckForm.html
 * No server required - runs entirely in the browser
 * Uses jsPDF 2.5.1 from CDN
 */

// Load jsPDF library
const jsPdfScript = document.createElement('script');
jsPdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
document.head.appendChild(jsPdfScript);


// Global PDF generation function
window.generateSignaturePDF = function() {
  // Check if jsPDF is loaded
  if (!window.jspdf?.jsPDF) {
    alert('⏳ Loading libraries... please try again in 2 seconds');
    console.log('Waiting for jsPDF...');
    return;
  }

  try {
    console.log('Starting PDF generation...');

    // Get form data
    const workTitle = document.getElementById('workTitle')?.value || '';
    const revision = document.getElementById('revision')?.value || '';
    const scName = document.getElementById('sc_name')?.value || '';
    const chName = document.getElementById('ch_name')?.value || '';
    const prName = document.getElementById('pr_name')?.value || '';
    const scDate = document.getElementById('sc_date')?.value || '';
    const chDate = document.getElementById('ch_date')?.value || '';
    const prDate = document.getElementById('pr_date')?.value || '';

    // Validate required fields
    if (!workTitle || !revision || !scName) {
      alert('❌ Please fill in: Work Title, Revision, and Engineer Name');
      return;
    }

    console.log('Data validated, creating PDF...');

    // Create PDF
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // HEADER
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(26, 26, 26);
    pdf.text('DISTRIBUTION ENGINEERING', 20, 20);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text('Check & Review Form - Signatures', 20, 28);

    // Divider
    pdf.setDrawColor(200, 200, 200);
    pdf.line(20, 32, 190, 32);

    let y = 42;

    // WORK INFORMATION
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('WORK INFORMATION', 20, y);
    y += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    pdf.text('Work Title: ' + workTitle, 20, y);
    y += 6;
    pdf.text('Revision: ' + revision, 20, y);
    y += 6;
    pdf.text('Generated: ' + new Date().toLocaleString(), 20, y);
    y += 12;

    // SECTION 1: SELF-CHECK
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('SECTION 1: SELF-CHECK', 20, y);
    y += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text('Date:', 20, y);
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.3);
    pdf.rect(20, y + 2, 60, 8);
    y += 12;

    pdf.text('Signature:', 20, y);
    pdf.rect(20, y + 2, 170, 25);
    y += 28;

    pdf.text('Engineer Name:* ' + scName, 20, y);
    pdf.rect(20, y + 2, 100, 8);
    y += 12;

    // SECTION 2: CHECK
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('SECTION 2: CHECK', 20, y);
    y += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text('Date:', 20, y);
    pdf.rect(20, y + 2, 60, 8);
    y += 12;

    pdf.text('Signature:', 20, y);
    pdf.rect(20, y + 2, 170, 25);
    y += 28;

    pdf.text('Checker Name:* ' + chName, 20, y);
    pdf.rect(20, y + 2, 100, 8);
    y += 12;

    // SECTION 3: PEER REVIEW
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('SECTION 3: PEER REVIEW', 20, y);
    y += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text('Date:', 20, y);
    pdf.rect(20, y + 2, 60, 8);
    y += 12;

    pdf.text('Signature:', 20, y);
    pdf.rect(20, y + 2, 170, 25);
    y += 28;

    pdf.text('Reviewer Name: ' + prName, 20, y);
    pdf.rect(20, y + 2, 100, 8);

    // FOOTER
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 150, 150);
    pdf.text('BC Hydro Distribution Engineering | ' + new Date().toLocaleDateString(), 105, 285, { align: 'center' });

    // Save PDF
    const filename = `DE_Check_Form_Signatures_Rev${revision}.pdf`;
    pdf.save(filename);

    console.log('✅ PDF saved:', filename);
    alert('✅ PDF generated and downloaded: ' + filename);

  } catch (error) {
    console.error('❌ PDF Generation Error:', error);
    alert('❌ Error: ' + error.message);
  }
};

console.log('✓ PDF Generator ready. Run: window.generateSignaturePDF()');
