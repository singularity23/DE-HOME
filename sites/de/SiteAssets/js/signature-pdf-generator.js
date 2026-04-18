/**
 * PDF Signature Generator Module for CheckForm.html
 * Handles generation of interactive signature PDFs
 * 
 * Usage: Add button to CheckForm.html and call this module
 */

class SignaturePDFGenerator {
  constructor() {
    this.pdfEndpoint = '/api/generate-signature-pdf';
    this.isGenerating = false;
  }

  /**
   * Validate required signature fields before PDF generation
   */
  validateSignatureFields() {
    const requiredFields = {
      workTitle: document.getElementById('workTitle')?.value,
      revision: document.getElementById('revision')?.value,
      engineer: document.getElementById('engineer')?.value || document.getElementById('sc_name')?.value,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key);

    if (missingFields.length > 0) {
      showPopup(`⚠️ Please fill in required fields: ${missingFields.join(', ')}`);
      return false;
    }

    return true;
  }

  /**
   * Collect form data for PDF generation
   */
  collectFormData() {
    return {
      workTitle: document.getElementById('workTitle')?.value || '',
      revision: document.getElementById('revision')?.value || '',
      engineer: document.getElementById('engineer')?.value || document.getElementById('sc_name')?.value || '',
      checker: document.getElementById('checker')?.value || document.getElementById('ch_name')?.value || '',
      scName: document.getElementById('sc_name')?.value || '',
      chName: document.getElementById('ch_name')?.value || '',
      prName: document.getElementById('pr_name')?.value || '',
      scDate: document.getElementById('sc_date')?.value || '',
      chDate: document.getElementById('ch_date')?.value || '',
      prDate: document.getElementById('pr_date')?.value || '',
    };
  }

  /**
   * Generate interactive signature PDF
   */
  async generateSignaturePDF() {
    if (this.isGenerating) {
      showPopup('⏳ PDF generation already in progress...');
      return;
    }

    // Validate fields
    if (!this.validateSignatureFields()) {
      return;
    }

    this.isGenerating = true;
    const button = document.getElementById('generateSignaturePdfBtn');
    const originalText = button?.textContent;
    if (button) {
      button.textContent = '⏳ Generating...';
      button.disabled = true;
    }

    try {
      const formData = this.collectFormData();

      // Call the PDF generation endpoint
      const response = await fetch(this.pdfEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Unknown error');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DE_Check_Form_Signatures_${formData.revision || 'v1'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showPopup('✅ Signature PDF generated and downloaded successfully!');
      console.log('📄 Signature PDF generated:', formData);

    } catch (error) {
      console.error('❌ PDF Generation Error:', error);
      showPopup(`❌ Error generating PDF: ${error.message}`);
    } finally {
      this.isGenerating = false;
      if (button) {
        button.textContent = originalText || '📄 Generate Signature PDF';
        button.disabled = false;
      }
    }
  }

  /**
   * Open generated PDF in new tab
   */
  async openSignaturePDFPreview() {
    if (!this.validateSignatureFields()) {
      return;
    }

    this.isGenerating = true;
    showPopup('⏳ Generating preview...');

    try {
      const formData = this.collectFormData();

      const response = await fetch(this.pdfEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      showPopup('✅ PDF preview opened in new tab');

    } catch (error) {
      console.error('❌ Preview Error:', error);
      showPopup(`❌ Error opening preview: ${error.message}`);
    } finally {
      this.isGenerating = false;
    }
  }
}

// Initialize globally
window.signaturePDFGenerator = new SignaturePDFGenerator();
