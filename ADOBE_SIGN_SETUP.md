# Adobe Sign Integration - Complete Setup Guide

> Complete Adobe Sign integration for DE-HOME SharePoint with cloud-based document signing

## 📋 Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [API Reference](#api-reference)
- [Frontend Usage](#frontend-usage)
- [SharePoint Integration](#sharepoint-integration)
- [Webhook Configuration](#webhook-configuration)
- [Troubleshooting](#troubleshooting)

---

## Overview

This Adobe Sign integration provides:

- **Cloud-Based Document Signing** - Legally binding digital signatures powered by Adobe
- **Multi-Signer Support** - Send to multiple recipients with sequential or parallel signing
- **Real-time Status Tracking** - Monitor signing progress with live updates
- **Webhook Integration** - Automatic notifications when documents are signed, rejected, or expired
- **Audit Trail** - Complete signing history for compliance and legal requirements
- **SharePoint Integration** - Native SharePoint lists for document management
- **Professional Workflows** - Authentication options, reminders, and expiration controls

### Key Features

✅ Send documents for e-signature from SharePoint
✅ Track signing status in real-time
✅ Download signed documents and audit trails
✅ Cancel agreements before signing
✅ Multiple signer roles (Signer, Approver, Viewer)
✅ Configurable signing methods (Signature, Initials, Approve, Decline)
✅ Email reminders and expiration dates
✅ Webhook events for automation
✅ Complete audit trail for compliance
✅ Responsive web interface

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SharePoint Environment                    │
│  ┌──────────────────┐        ┌──────────────────────────┐  │
│  │ CheckForm.html   │        │ AdobeSignIntegration.html│  │
│  │ (Enhanced UI)    │◄──────►│ (Frontend Interface)     │  │
│  └──────────────────┘        └──────────────────────────┘  │
│            ▲                           ▲                     │
│            │                           │                     │
│  ┌────────┴──────────────────────────┴─────────┐           │
│  │ adobe-sign-module.js (JavaScript SDK)      │           │
│  │ - sendForSignature()                       │           │
│  │ - getAgreementStatus()                     │           │
│  │ - downloadAgreement()                      │           │
│  │ - saveToSharePoint()                       │           │
│  └────────┬──────────────────────────────────┴─────────┐  │
│           │              HTTP/HTTPS                     │  │
└───────────┼─────────────────────────────────────────────┘  │
            │                                                  
            ▼                                                  
┌─────────────────────────────────────────────────────────┐   
│          Flask REST API Server (Port 5000)              │   
│  adobe_sign_server.py                                   │   
│  ◄──────────────────────────────────────────────────►  │   
│  ┌──────────────────────────────────────────────────┐  │   
│  │ POST   /api/adobe-sign/send                     │  │   
│  │ GET    /api/adobe-sign/agreement/{id}           │  │   
│  │ GET    /api/adobe-sign/agreement/{id}/status    │  │   
│  │ GET    /api/adobe-sign/agreement/{id}/download  │  │   
│  │ POST   /api/adobe-sign/webhooks                 │  │   
│  │ GET    /api/adobe-sign/agreements               │  │   
│  └──────────────────────────────────────────────────┘  │   
└──────────────────┬──────────────────────────────────────┘   
                   │                                          
                   ▼                                          
        ┌──────────────────────────┐                         
        │  adobe_sign_api.py       │                         
        │  ◄──────────────────────►│                         
        │  Adobe Sign SDK          │                         
        │  - AdobeSignAPI class    │                         
        │  - OAuth handling        │                         
        │  - Document uploads      │                         
        │  - Agreement creation    │                         
        │  - Webhook validation    │                         
        └──────────────┬───────────┘                         
                       │                                     
                       ▼                                     
        ┌──────────────────────────────────┐               
        │   Adobe Sign Cloud Service       │               
        │   https://api.adobesign.com      │               
        │                                  │               
        │  - Document Storage              │               
        │  - Signing Workflows             │               
        │  - Email Notifications           │               
        │  - Audit Trail Generation        │               
        │  - Legal Compliance              │               
        └──────────────────────────────────┘               
```

---

## Prerequisites

### Required

1. **Adobe Sign Account**
   - Business or higher tier (free account has limited features)
   - Available at: https://www.adobesign.com

2. **Adobe Sign API Credentials**
   - Client ID (OAuth)
   - Client Secret (OAuth)
   - Access Token (for API authentication)
   - Webhook secret (for validating webhooks)

3. **Python 3.8+** with packages
   ```bash
   pip install flask flask-cors requests cryptography reportlab pypdf2
   ```

4. **SharePoint Online**
   - Site owner or admin access to DE-HOME site
   - Permission to create lists and web parts

### Optional

- OpenSSL (for certificate generation, if using password-protected import)
- Postman or similar tool for API testing

---

## Setup Instructions

### Step 1: Obtain Adobe Sign API Credentials

1. Log in to Adobe Sign admin console
2. Go to **Integrations** → **OAuth Clients**
3. Create new OAuth application:
   - Name: "DE-HOME Document Signing"
   - Redirect URLs: `http://localhost:5000/api/oauth/callback`
   - Scopes: 
     - `agreement_read` - Read agreement details
     - `agreement_write` - Create and manage agreements
     - `agreement_send` - Send agreements for signature
     - `library_read` - Read library documents
     - `library_write` - Create library documents

4. Copy your **Client ID** and **Client Secret**

5. Generate **Access Token**:
   ```bash
   curl -X POST "https://oauth.adobesign.com/oauth/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code&code=YOUR_CODE&client_id=YOUR_CLIENT_ID&client_secret=YOUR_SECRET&redirect_uri=YOUR_REDIRECT_URI"
   ```

### Step 2: Configure Environment Variables

Create `.env` file in project root:

```bash
# Adobe Sign API Configuration
ADOBE_SIGN_CLIENT_ID=your_client_id_here
ADOBE_SIGN_CLIENT_SECRET=your_client_secret_here
ADOBE_SIGN_ACCESS_TOKEN=your_access_token_here
ADOBE_SIGN_REDIRECT_URI=http://localhost:5000/api/oauth/callback
ADOBE_SIGN_WEBHOOK_SECRET=your_webhook_secret_here

# Flask Configuration
FLASK_PORT=5000
FLASK_DEBUG=False
```

### Step 3: Start Flask API Server

```bash
# Activate virtual environment
cd "d:\VS Code\Projects\DE Home\DE-HOME"
.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start server
python sites/de/SiteAssets/python/adobe_sign_server.py
```

Expected output:
```
 * Running on http://0.0.0.0:5000
Adobe Sign configured: True
```

### Step 4: Test API Connection

```bash
curl http://localhost:5000/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-04-16T10:30:45.123456",
  "adobe_sign_configured": true
}
```

### Step 5: Open Frontend Interface

1. Open in browser: `file:///d:/VS Code/Projects/DE Home/DE-HOME/sites/de/SiteAssets/html/AdobeSignIntegration.html`

2. Or deploy to SharePoint:
   - Upload to `SiteAssets` library
   - Create web part pointing to the file

### Step 6: Configure Adobe Sign Webhooks

1. Go to Adobe Sign admin console
2. **Integrations** → **Webhooks**
3. Create webhook:
   - Name: "DE-HOME Webhook"
   - URL: `http://your-domain.com/api/adobe-sign/webhooks`
   - Events:
     - ✓ Agreement all signed
     - ✓ Agreement rejected
     - ✓ Agreement expired
     - ✓ Delegate created
     - ✓ Delegate signed

4. See [Webhook Configuration](#webhook-configuration) section

---

## API Reference

### Send Document for Signature

**Endpoint**: `POST /api/adobe-sign/send`

**Request**:
```json
{
  "title": "Service Agreement",
  "content": "Agreement text...",
  "signers": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "role": "Signer"
    }
  ],
  "message": "Please review and sign",
  "daystoExpire": 7,
  "requireAuth": false,
  "signMethod": "SIGN"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "agreementId": "CBJCHBCAABAAkRaRpHBnBDVQZP7wz4YcJXhXDBzf8GAd",
  "signingUrl": "https://secure.adobesign.com/public/esignatures?...",
  "status": "OUT_FOR_SIGNATURE",
  "message": "Agreement sent successfully for signature"
}
```

### Get Agreement Status

**Endpoint**: `GET /api/adobe-sign/agreement/{agreementId}/status`

**Response**:
```json
{
  "success": true,
  "agreementId": "CBJCHBCAABAAkRaRpHBnBDVQZP7wz4YcJXhXDBzf8GAd",
  "status": "OUT_FOR_SIGNATURE",
  "name": "Service Agreement",
  "createdDate": "2024-04-16T10:30:45Z",
  "expirationDate": "2024-04-23T23:59:59Z",
  "signingProgress": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "status": "WAITING",
      "signedDate": null
    }
  ]
}
```

### Download Signed Document

**Endpoint**: `GET /api/adobe-sign/agreement/{agreementId}/download`

**Response**: PDF file

### Get Audit Trail

**Endpoint**: `GET /api/adobe-sign/agreement/{agreementId}/audit-trail`

**Response**: PDF audit trail document

### List All Agreements

**Endpoint**: `GET /api/adobe-sign/agreements`

**Query Parameters**:
- `status`: Filter by status (e.g., `OUT_FOR_SIGNATURE`, `SIGNED`)
- `limit`: Max results (default: 50)

**Response**:
```json
{
  "success": true,
  "agreements": [
    {
      "id": "CBJCHBCAABAAkRaRpHBnBDVQZP7wz4YcJXhXDBzf8GAd",
      "name": "Service Agreement",
      "status": "SIGNED",
      "createdDate": "2024-04-16T10:30:45Z"
    }
  ]
}
```

### Cancel Agreement

**Endpoint**: `POST /api/adobe-sign/agreement/{agreementId}/cancel`

**Request**:
```json
{
  "reason": "Changed mind about terms"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Agreement cancelled"
}
```

### Webhook Handler

**Endpoint**: `POST /api/adobe-sign/webhooks`

**Incoming Events**:
```json
{
  "webhookEvent": "AGREEMENT_ALL_SIGNED",
  "agreementId": "CBJCHBCAABAAkRaRpHBnBDVQZP7wz4YcJXhXDBzf8GAd",
  "agreementName": "Service Agreement",
  "participantName": "John Doe",
  "participantEmail": "john@example.com",
  "signatureStatus": "SIGNED"
}
```

---

## Frontend Usage

### Basic Usage

```html
<!-- Include Adobe Sign module -->
<script src="sites/de/SiteAssets/js/adobe-sign-module.js"></script>

<script>
  // Initialize
  AdobeSignModule.init({
    apiUrl: 'http://localhost:5000/api'
  });

  // Send document for signature
  AdobeSignModule.sendForSignature({
    title: 'Service Agreement',
    content: 'Agreement text...',
    signers: [
      {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Signer'
      }
    ],
    message: 'Please review and sign',
    daysToExpire: 7,
    requireAuth: false
  })
  .then(result => {
    console.log('Agreement sent:', result.agreementId);
    // Open signing URL
    window.open(result.signingUrl);
  })
  .catch(error => {
    console.error('Error:', error);
  });
</script>
```

### Get Agreement Status

```javascript
AdobeSignModule.getAgreementStatus('CBJCHBCAABAAkRaRpHBnBDVQZP7wz4YcJXhXDBzf8GAd')
  .then(status => {
    console.log('Status:', status.status);
    console.log('Signers Progress:', status.signingProgress);
  });
```

### Download Signed Document

```javascript
AdobeSignModule.downloadAgreement('CBJCHBCAABAAkRaRpHBnBDVQZP7wz4YcJXhXDBzf8GAd')
  .then(() => {
    console.log('Document downloaded');
  });
```

### Create Status Widget

```javascript
// Display agreement status in a DIV
AdobeSignModule.createStatusWidget('statusContainer', 'CBJCHBCAABAAkRaRpHBnBDVQZP7wz4YcJXhXDBzf8GAd');
```

### List All Agreements

```javascript
AdobeSignModule.listAgreements({
  status: 'SIGNED',
  limit: 10
})
.then(agreements => {
  console.log('Found', agreements.length, 'signed agreements');
});
```

### Save to SharePoint

```javascript
AdobeSignModule.saveToSharePoint(
  'CBJCHBCAABAAkRaRpHBnBDVQZP7wz4YcJXhXDBzf8GAd',
  'Signed Documents',
  {
    Department: 'Engineering',
    Project: 'Contract Management'
  }
)
.then(result => {
  console.log('Saved to SharePoint item:', result.itemId);
});
```

---

## SharePoint Integration

### Create Signed Documents List

**PowerShell Script**:

```powershell
# Connect to SharePoint
Connect-PnPOnline -Url "https://hydroshare.bchydro.bc.ca/sites/de" -UseWebLogin

# Create list
$list = New-PnPList -Title "Signed Documents" -Template GenericList

# Add columns
Add-PnPField -List "Signed Documents" -DisplayName "Agreement ID" -InternalName "AgreementId" -Type Text
Add-PnPField -List "Signed Documents" -DisplayName "Status" -InternalName "SigningStatus" -Type Choice -Choices @("OUT_FOR_SIGNATURE","SIGNED","REJECTED","EXPIRED")
Add-PnPField -List "Signed Documents" -DisplayName "Signers Progress" -InternalName "SignersProgress" -Type Note
Add-PnPField -List "Signed Documents" -DisplayName "Signing Date" -InternalName "SigningDate" -Type DateTime
Add-PnPField -List "Signed Documents" -DisplayName "Department" -InternalName "Department" -Type Text

# Set permissions
Set-PnPListItemPermission -List "Signed Documents" -Identity 1 -AddRole "Read"
```

### Add Web Part to CheckForm.html

```html
<!-- Adobe Sign Integration Panel -->
<div id="adobeSignPanel" style="border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 8px;">
  <h3>📝 Send to Adobe Sign</h3>
  
  <div id="agreementStatusContainer"></div>
  
  <button onclick="sendToAdobeSign()" style="padding: 8px 15px; background: #667eea; color: white; border: none; border-radius: 4px;">
    📤 Send for Signature
  </button>
</div>

<script>
  async function sendToAdobeSign() {
    const documentContent = document.getElementById('IssueContent').value;
    const issueTitle = document.getElementById('IssueTitle').value;
    
    const signers = [
      {
        name: _spPageContextInfo.userDisplayName,
        email: _spPageContextInfo.userEmail,
        role: 'Signer'
      }
    ];
    
    try {
      const result = await AdobeSignModule.sendForSignature({
        title: issueTitle,
        content: documentContent,
        signers: signers,
        message: 'Please review and sign this document'
      });
      
      // Create list item
      await AdobeSignModule.saveToSharePoint(
        result.agreementId,
        'Signed Documents',
        {
          Department: '=Distribution Engineering',
          Project: issueTitle
        }
      );
      
      showStatus('✓ Document sent for signature', 'success');
    } catch (error) {
      showStatus('✗ Error: ' + error.message, 'error');
    }
  }
</script>
```

### Power Automate Flow

**Trigger**: Adobe Sign webhook event
**Actions**:
1. Parse webhook JSON
2. Create SharePoint list item in "Signed Documents"
3. Send email notification to stakeholders
4. Create calendar event when signed

---

## Webhook Configuration

### Setup in Adobe Sign Admin

1. Go to **Integrations** → **Webhooks**
2. Click **New Webhook**
3. Configuration:

| Setting | Value |
|---------|-------|
| Name | DE-HOME Signature Events |
| URL | `http://your-server.com/api/adobe-sign/webhooks` |
| Events | All signature-related events |
| Status | Active |

### Events Handled

- `AGREEMENT_ALL_SIGNED` - All signers completed
- `AGREEMENT_REJECTED` - Signer declined to sign
- `AGREEMENT_EXPIRED` - Agreement expired
- `DELEGATE_CREATED` - Delegate signed
- `DELEGATION_PERFORMED` - Delegation activated

### Example Webhook Events

```json
{
  "webhookEvent": "AGREEMENT_ALL_SIGNED",
  "agreementId": "CBJCHBCAABAAkRaRpHBnBDVQZP7wz4YcJXhX...",
  "agreementName": "Service Agreement",
  "dateTime": "2024-04-16T14:30:45Z",
  "documentHidden": false,
  "parentAgreementId": "",
  "participantEmail": "john@example.com",
  "participantName": "John Doe",
  "participantRole": "SIGNER",
  "signatureStatus": "SIGNED",
  "webhookId": "webhook-id-123",
  "webhookNotificationId": "notification-id-123",
  "userEmail": "admin@example.com",
  "userId": "AAAA4..."
}
```

---

## Troubleshooting

### Problem: "Adobe Sign API not configured"

**Solution**:
1. Check environment variables are set
2. Verify `ADOBE_SIGN_ACCESS_TOKEN` is valid
3. Restart Flask server after setting variables

```bash
# Test configuration
$env:ADOBE_SIGN_ACCESS_TOKEN = "your_token"
python adobe_sign_server.py
```

### Problem: "Failed to create agreement"

**Causes & Solutions**:
- Invalid signer email: Verify email addresses are correct
- Document too large: Max document size is 50MB
- API rate limit: Wait a moment and retry
- Expired token: Refresh access token

### Problem: "CORS error on API calls"

**Solution**: Ensure Flask server allows CORS:
```python
from flask_cors import CORS
CORS(app)  # Already in adobe_sign_server.py
```

### Problem: Webhook events not received

**Solution**:
1. Verify webhook URL is publicly accessible
2. Check SSL/TLS certificate if using HTTPS
3. Review webhook logs: `GET /api/webhook-logs`
4. Test webhook manually:
```bash
curl -X POST http://localhost:5000/api/adobe-sign/webhooks \
  -H "Content-Type: application/json" \
  -d '{"webhookEvent":"TEST","agreementId":"test-123"}'
```

### Problem: Signers not receiving emails

**Cause**: Common issues:
- Email addresses are invalid
- Adobe Sign email settings disabled
- Firewall/spam filter blocking emails

**Solution**:
1. Check signer email in response
2. Enable email notifications in Adobe Sign settings
3. Test with known email address

### Problem: Access token expired

**Solution**: Refresh token:
```python
from adobe_sign_api import AdobeSignAPI

api = AdobeSignAPI(config)
api.refresh_access_token(refresh_token)
```

---

## Best Practices

1. **Always validate signer emails** before sending
2. **Use HTTPS** in production for security
3. **Implement proper error handling** in frontend
4. **Monitor webhook events** for agreement status changes
5. **Store agreement IDs** in SharePoint for auditing
6. **Download signed documents** immediately after signing
7. **Implement timeout handling** for API calls
8. **Use logging** for debugging and compliance

---

## File Structure

```
Adobe Sign Integration
├── AdobeSignIntegration.html       # Frontend UI
├── adobe_sign_api.py               # Adobe Sign API client
├── adobe_sign_server.py            # Flask REST API server
├── adobe-sign-module.js            # JavaScript SDK
├── ADOBE_SIGN_SETUP.md             # This documentation
└── adobe_sign_uploads/
    └── webhook_events.jsonl        # Webhook event log
```

---

## Support & Resources

- Adobe Sign API Documentation: https://opensource.adobe.com/acrobat-sign/developer/
- REST API Reference: https://adobe.io/apis/documentservices
- Community Forum: https://adobe.com/community/adobe-sign-api
- Support: https://adobesign.com/support

---

**Last Updated**: April 2026
**Version**: 1.0
**Status**: Production Ready
