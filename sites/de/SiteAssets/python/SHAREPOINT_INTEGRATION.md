# Certificate-Based Digital Signature Integration Guide for DE-HOME

Complete integration guide for using certificate-based signatures in the DE-HOME SharePoint environment.

## 🎯 Overview

This guide explains how to integrate the certificate-based digital signature system into DE-HOME SharePoint pages, workflows, and document management.

---

## 📍 Integration Points

### 1. SharePoint Master Pages (`head.html`, `body.html`)

Add signature capability to SharePoint pages.

**In `head.html` - Add CSS and Scripts:**

```html
<!-- Digital Signature Styles -->
<link rel="stylesheet" href="/sites/de/SiteAssets/css/signature.css">

<!-- Signature Libraries -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.0/crypto-js.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/signature_pad/1.5.3/signature_pad.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
```

**In `body.html` - Add Signature Module Reference:**

```html
<!-- Digital Signature Module -->
<script src="/sites/de/SiteAssets/js/certificate_signature_module.js"></script>

<!-- Usage: -->
<button onclick="openSignatureForm()">Sign Document</button>
<div id="signature-modal" style="display:none;"></div>
```

### 2. SharePoint Lists & Libraries

Store signed documents and certificate information.

**Create List Structure:**

```
Signed Documents Library
├── Document (File)
├── Title (Text)
├── DocumentHash (Text) - SHA-256 hash
├── Signature (Text) - Base64-encoded signature
├── VerificationCode (Text) - Unique ID
├── CertificateSubject (Person/Group)
├── SignedDate (Date/Time)
├── SignatureMethod (Choice: Certificate-Based, Handwritten)
├── Status (Choice: Signed, Pending, Rejected)
└── AuditLog (Multi-line Text)
```

**PowerShell to Create List:**

```powershell
# Connect to SharePoint
Connect-PnPOnline -Url "https://hydroshare.bchydro.bc.ca/sites/de"

# Create list
New-PnPList -Title "Signed Documents" -Template GenericList

# Add columns
Add-PnPField -List "Signed Documents" -DisplayName "Document Hash" -InternalName "DocumentHash" -Type Text
Add-PnPField -List "Signed Documents" -DisplayName "Signature" -InternalName "SignatureData" -Type Text
Add-PnPField -List "Signed Documents" -DisplayName "Verification Code" -InternalName "VerificationCode" -Type Text
Add-PnPField -List "Signed Documents" -DisplayName "Certificate Subject" -InternalName "CertSubject" -Type Text
Add-PnPField -List "Signed Documents" -DisplayName "Signed Date" -InternalName "SignedDate" -Type DateTime
Add-PnPField -List "Signed Documents" -DisplayName "Signature Method" -InternalName "SignatureMethod" -Type Choice -Choices "Certificate-Based","Handwritten"
```

### 3. JavaScript Integration Module

Create wrapper module for SharePoint integration.

**File**: `js/certificate_signature_module.js`

```javascript
/**
 * Certificate Signature Module for DE-HOME SharePoint
 * Integrates certificate-based signing into SharePoint workflows
 */

const CertificateSignatureModule = {
    // Configuration
    config: {
        apiBaseUrl: 'https://hydroshare.bchydro.bc.ca/api',  // Your API server
        listName: 'Signed Documents',
        documentLibrary: 'Document Library'
    },

    // Initialize module
    init: function() {
        console.log('Certificate Signature Module Initialized');
        this.attachEventListeners();
    },

    // Attach event listeners to SharePoint elements
    attachEventListeners: function() {
        // Add "Sign Document" button to document library
        const docLibraryToolbar = qS('.ms-Toolbar');
        if (docLibraryToolbar) {
            const signBtn = document.createElement('button');
            signBtn.textContent = '🔐 Sign Document';
            signBtn.className = 'ms-Toolbar-button';
            signBtn.onclick = () => this.openSignatureForm();
            docLibraryToolbar.appendChild(signBtn);
        }
    },

    // Open signature form modal
    openSignatureForm: function() {
        const modal = document.createElement('div');
        modal.className = 'signature-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="CertificateSignatureModule.closeModal()">&times;</span>
                <h2>🔐 Sign Document</h2>
                <iframe src="/sites/de/SiteAssets/html/CertificateBasedSignature.html" 
                        style="width: 100%; height: 800px; border: none;"></iframe>
            </div>
        `;
        document.body.appendChild(modal);
    },

    closeModal: function() {
        const modal = qS('.signature-modal');
        if (modal) modal.remove();
    },

    // Sign document and save to SharePoint
    signAndSave: async function(documentUrl, certPath, certPassword, signatoryInfo) {
        try {
            // Step 1: Call API to sign document
            const formData = new FormData();
            formData.append('certificate_file', certPath);
            formData.append('password', certPassword);
            formData.append('document_title', signatoryInfo.title);
            formData.append('document_content', 'SharePoint Document');
            formData.append('signatory_name', signatoryInfo.name);
            formData.append('signatory_email', signatoryInfo.email);

            const response = await fetch(`${this.config.apiBaseUrl}/sign`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message);
            }

            // Step 2: Save signed PDF to SharePoint
            await this.saveSignedDocumentToSharePoint(
                documentUrl,
                result.pdf_base64,
                result.document_hash,
                result.signature,
                result.verification_code
            );

            // Step 3: Add entry to Signed Documents list
            await this.createSignaturRecord(result);

            showPopup(`✓ Document signed and saved successfully!`);
            return result;

        } catch (error) {
            showPopup(`✗ Signing failed: ${error.message}`);
            console.error('Signing error:', error);
            throw error;
        }
    },

    // Save signed PDF to SharePoint
    saveSignedDocumentToSharePoint: async function(
        documentUrl, pdfBase64, docHash, signature, verificationCode
    ) {
        try {
            // Convert base64 to blob
            const binary = atob(pdfBase64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'application/pdf' });

            // Prepare file name
            const timestamp = new Date().getTime();
            const fileName = `Signed_${timestamp}.pdf`;

            // Upload to SharePoint using _api/web/GetFolderByServerRelativeUrl
            const serverUrl = 'https://hydroshare.bchydro.bc.ca';
            const uploadUrl = `${serverUrl}/_api/web/GetFolderByServerRelativeUrl('/sites/de/Signed Documents')/Files/add(url='${fileName}',overwrite=true)`;

            const formData = new FormData();
            formData.append('file', blob);

            const response = await fetch(uploadUrl, {
                method: 'POST',
                body: blob,
                headers: {
                    'X-RequestDigest': document.getElementById('__REQUESTDIGEST').value,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const uploadResult = await response.json();
            console.log('File uploaded:', uploadResult);
            return uploadResult;

        } catch (error) {
            console.error('SharePoint upload error:', error);
            throw error;
        }
    },

    // Create record in Signed Documents list
    createSignaturRecord: async function(signatureData) {
        try {
            const listItem = {
                Title: signatureData.cert_info.subject,
                DocumentHash: signatureData.document_hash,
                SignatureData: signatureData.signature,
                VerificationCode: signatureData.verification_code,
                CertSubject: signatureData.cert_info.subject,
                SignedDate: new Date().toISOString().split('T')[0],
                SignatureMethod: 'Certificate-Based'
            };

            const serverUrl = 'https://hydroshare.bchydro.bc.ca';
            const listUrl = `${serverUrl}/_api/web/lists/GetByTitle('Signed Documents')/items`;

            const response = await fetch(listUrl, {
                method: 'POST',
                body: JSON.stringify(listItem),
                headers: {
                    'X-RequestDigest': document.getElementById('__REQUESTDIGEST').value,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`List item creation failed: ${response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            console.error('List creation error:', error);
            throw error;
        }
    },

    // Verify previously signed document
    verifySignature: async function(documentHash, signature, certificateInfo) {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/verify`, {
                method: 'POST',
                body: JSON.stringify({
                    document_hash: documentHash,
                    signature: signature,
                    cert_info: certificateInfo
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            return result.is_valid;

        } catch (error) {
            console.error('Verification error:', error);
            return false;
        }
    }
};

// Initialize when SharePoint page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        CertificateSignatureModule.init();
    });
} else {
    CertificateSignatureModule.init();
}
```

### 4. Power Automate / Flow Integration

Automate signing workflows using Power Automate.

**Flow: "Sign Document and Send for Approval"**

```
Trigger: When a file is created in SharePoint
    ↓
Action: Get file properties
    ↓
Action: HTTP Request to API
    ├─ Method: POST
    ├─ URI: https://yourdomain/api/sign
    ├─ Body: 
    │   {
    │     "document_title": "@{triggerOutputs()['body/DisplayName']}",
    │     "document_content": "@{body('Get_file_content')?['body']}",
    │     "certificate_file": "@{variables('CertPath')}",
    │     "signatory_name": "@{triggerOutputs()['body/Editor/DisplayName']}",
    │     "signatory_email": "@{triggerOutputs()['body/Editor/Email']}"
    │   }
    │
    └─ Response: signatureData
    ↓
Action: Create item in "Signed Documents" list
    ├─ Title: @{triggerOutputs()['body/DisplayName']}
    ├─ DocumentHash: @{body('HTTP_Request')['document_hash']}
    ├─ Signature: @{body('HTTP_Request')['signature']}
    ├─ VerificationCode: @{body('HTTP_Request')['verification_code']}
    └─ Status: "Signed"
    ↓
Action: Send email
    ├─ To: @{triggerOutputs()['body/Editor/Email']}
    ├─ Subject: Document Signed
    └─ Body: Your document has been digitally signed
```

---

## 🔗 Integration with DE-HOME Forms

### CheckForm.html Enhancement

Add signing capability to existing CheckForm:

```html
<!-- In CheckForm.html -->
<form id="checkForm">
    <!-- Existing form fields -->
    ...
    
    <!-- Signature Section -->
    <div class="form-section">
        <h3>Digital Signature</h3>
        <p>Sign this form with your digital certificate</p>
        <button type="button" onclick="openCertificateSignature()">
            🔐 Sign with Certificate
        </button>
        <div id="signaturePlaceholder"></div>
    </div>
    
    <!-- Certificate Info Display -->
    <div id="certInfoDisplay" style="display:none;">
        <h4>Signed By:</h4>
        <p id="certSubject"></p>
        <p id="certDate"></p>
    </div>
</form>

<script>
function openCertificateSignature() {
    // Get form data
    const formData = {
        title: document.getElementById('formTitle').value,
        content: new FormData(document.getElementById('checkForm')),
        signatory: {
            name: _spPageContextInfo.userDisplayName,
            email: _spPageContextInfo.userEmail
        }
    };
    
    // Open signature UI
    CertificateSignatureModule.signAndSave(
        window.location.href,
        null, // Certificate will be uploaded
        null, // Password will be entered
        formData.signatory
    ).then(result => {
        // Update form with signature info
        document.getElementById('certSubject').textContent = 
            `Subject: ${result.cert_info.subject}`;
        document.getElementById('certDate').textContent = 
            `Signed: ${new Date().toLocaleString()}`;
        document.getElementById('certInfoDisplay').style.display = 'block';
        
        // Save signed form as PDF
        savePDF(result);
    });
}

function savePDF(signatureData) {
    // Convert form + signature to PDF
    const pdfContent = document.getElementById('checkForm').innerHTML + 
        `<hr>
        <h3>Digital Signature</h3>
        <p>Signed: ${signatureData.cert_info.subject}</p>
        <p>Verification Code: ${signatureData.verification_code}</p>`;
    
    const opt = {
        margin: 10,
        filename: 'signed_form.pdf',
        image: { type: 'png', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4' }
    };
    
    html2pdf().set(opt).from(pdfContent).save();
}
</script>
```

---

## 🔐 Certificate Management in Sharepoint

### Create Certificate Repository

```powershell
# Create certificate list
New-PnPList -Title "Digital Certificates" -Template GenericList

# Add columns
Add-PnPField -List "Digital Certificates" -DisplayName "Certificate File" -InternalName "CertFile" -Type File
Add-PnPField -List "Digital Certificates" -DisplayName "Subject" -InternalName "CertSubject" -Type Text
Add-PnPField -List "Digital Certificates" -DisplayName "Issuer" -InternalName "CertIssuer" -Type Text
Add-PnPField -List "Digital Certificates" -DisplayName "Expiry Date" -InternalName "ExpiryDate" -Type DateTime
Add-PnPField -List "Digital Certificates" -DisplayName "Thumbprint" -InternalName "Thumbprint" -Type Text
Add-PnPField -List "Digital Certificates" -DisplayName "Active" -InternalName "IsActive" -Type Boolean
```

### Audit Trail

Store signature audit logs:

```powershell
# Create audit list
New-PnPList -Title "Signature Audit Log" -Template GenericList

# Add columns
Add-PnPField -List "Signature Audit Log" -DisplayName "Action" -InternalName "Action" -Type Text
Add-PnPField -List "Signature Audit Log" -DisplayName "Document" -InternalName "DocumentTitle" -Type Text
Add-PnPField -List "Signature Audit Log" -DisplayName "Signer" -InternalName "SignerName" -Type Person
Add-PnPField -List "Signature Audit Log" -DisplayName "Timestamp" -InternalName "AuditTimestamp" -Type DateTime
Add-PnPField -List "Signature Audit Log" -DisplayName "Verification Code" -InternalName "VerificationCode" -Type Text
Add-PnPField -List "Signature Audit Log" -DisplayName "IPAddress" -InternalName "IPAddress" -Type Text
Add-PnPField -List "Signature Audit Log" -DisplayName "Status" -InternalName "AuditStatus" -Type Choice -Choices "Success","Failed","Attempted"
```

---

## 📞 Support Integration with ASPEN

Link signed documents to ASPEN asset management:

```javascript
// In ASPEN_Query.js or integration script
function linkSignatureToASPEN(signatureData, aspenDeviceId) {
    // Create ASPEN link
    const query = `
        INSERT INTO DOCUMENT_SIGNATURES (Device_ID, Signature_Hash, Verification_Code, SignedDate)
        VALUES ('${aspenDeviceId}', '${signatureData.document_hash}', '${signatureData.verification_code}', GETDATE())
    `;
    
    // Execute via ASPEN API
    return fetch('/AspenAPI/query', {
        method: 'POST',
        body: JSON.stringify({ sql: query })
    });
}
```

---

## 🚀 Deployment Checklist

- [ ] Install dependencies (`pip install -r requirements.txt`)
- [ ] Generate/obtain digital certificates
- [ ] Configure API server for production
- [ ] Set up HTTPS with valid SSL certificate
- [ ] Create SharePoint lists for documents and audit
- [ ] Deploy JavaScript module to SharePoint
- [ ] Test signing workflow end-to-end
- [ ] Configure Power Automate flows
- [ ] Set up audit logging
- [ ] Train users on signature process
- [ ] Document certificate management procedures
- [ ] Set alerts for certificate expiry

---

## 📊 Key Metrics & Monitoring

Monitor signature operations:

```powershell
# Check signed documents
Get-PnPListItem -List "Signed Documents" | Measure-Object

# View recent signatures
Get-PnPListItem -List "Signature Audit Log" -PageSize 100 | 
    Sort-Object -Property AuditTimestamp -Descending | 
    Select-Object SignerName, DocumentTitle, AuditStatus

# Check certificate expiry
Get-PnPListItem -List "Digital Certificates" | 
    Where-Object { $_.ExpiryDate -lt (Get-Date).AddDays(30) }
```

---

## 📝 Additional Resources

- **SharePoint REST API**: https://docs.microsoft.com/en-us/sharepoint/dev/sp-add-ins/working-with-lists-and-list-items-with-rest
- **Power Automate**: https://make.powerautomate.com
- **ASPEN Documentation**: Contact ASPEN support team
- **Certificate Standards**: RFC 5280 (X.509), RFC 8017 (PKCS#1)

---

**Version**: 1.0.0  
**For DE-HOME**: SharePoint-Based Digital Workplace  
**Last Updated**: 2026-04-16
