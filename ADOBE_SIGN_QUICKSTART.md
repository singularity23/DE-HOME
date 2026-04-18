# Adobe Sign Integration - Quick Start Guide

**Get document signing working in 10 minutes!**

---

## 🚀 Quick Start (10 Minutes)

### Step 1: Get API Credentials (2 min)

1. Visit: https://www.adobesign.com
2. Sign up or log in to your account
3. Go to **Account** → **Integrations** → **OAuth Clients**
4. Create new OAuth application:
   - Name: `DE-HOME Sign`
   - Redirect: `http://localhost:5000/api/oauth/callback`
5. Copy **Client ID** and **Client Secret**

### Step 2: Create `.env` File (2 min)

Create file: `d:\VS Code\Projects\DE Home\DE-HOME\.env`

```
ADOBE_SIGN_CLIENT_ID=paste_your_client_id
ADOBE_SIGN_CLIENT_SECRET=paste_your_client_secret
ADOBE_SIGN_ACCESS_TOKEN=paste_your_access_token
ADOBE_SIGN_REDIRECT_URI=http://localhost:5000/api/oauth/callback
FLASK_PORT=5000
```

### Step 3: Install Dependencies (2 min)

```powershell
cd "d:\VS Code\Projects\DE Home\DE-HOME"
.venv\Scripts\Activate.ps1
pip install flask flask-cors requests reportlab pypdf2
```

### Step 4: Start Server (1 min)

```powershell
python sites/de/SiteAssets/python/adobe_sign_server.py
```

You should see:
```
Running on http://0.0.0.0:5000
Adobe Sign configured: True
```

### Step 5: Open Frontend (1 min)

Visit one of these URLs:
```
file:///d:/VS Code/Projects/DE Home/DE-HOME/sites/de/SiteAssets/html/AdobeSignIntegration.html

OR

http://localhost:5000/api/adobe-sign/send
```

### Step 6: Send Your First Document (2 min)

1. Fill in the form:
   - **Title**: "Test Agreement"
   - **Signer**: Your email address
   - **Content**: Sample text

2. Click **📤 Send for Signature**

3. Check your email for signing link!

---

## 💡 Common Tasks

### Send Document Programmatically

```javascript
// In console or JS file
AdobeSignModule.init({apiUrl: 'http://localhost:5000/api'});

AdobeSignModule.sendForSignature({
  title: 'My Agreement',
  content: 'Agreement text goes here',
  signers: [
    {name: 'John Doe', email: 'john@example.com'}
  ],
  daysToExpire: 7
})
.then(r => console.log('Sent:', r.agreementId))
.catch(e => console.error('Error:', e));
```

### Check Signing Status

```javascript
AdobeSignModule.getAgreementStatus('AGREEMENT_ID_HERE')
  .then(status => {
    console.log('Status:', status.status);
    console.log('Progress:', status.signingProgress);
  });
```

### Download Signed Document

```javascript
AdobeSignModule.downloadAgreement('AGREEMENT_ID_HERE');
```

### Show Status Widget

```html
<div id="my-status"></div>

<script>
  AdobeSignModule.createStatusWidget('my-status', 'AGREEMENT_ID_HERE');
</script>
```

---

## 🔧 API Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/adobe-sign/send` | POST | Send document for signature |
| `/api/adobe-sign/agreement/{id}` | GET | Get agreement details |
| `/api/adobe-sign/agreement/{id}/status` | GET | Get signing progress |
| `/api/adobe-sign/agreement/{id}/download` | GET | Download signed document |
| `/api/adobe-sign/agreement/{id}/audit-trail` | GET | Download audit trail |
| `/api/adobe-sign/agreements` | GET | List all agreements |
| `/api/adobe-sign/webhooks` | POST | Webhook receiver |
| `/api/health` | GET | Health check |

---

## 🐛 Quick Troubleshooting

### ❌ "API not configured"
- Check `.env` file exists
- Check `ADOBE_SIGN_ACCESS_TOKEN` is set
- Restart server

### ❌ "CORS error"
- Server running on http://localhost:5000?
- Check browser console for exact error
- Disable CORS in browser for testing

### ❌ "Signer didn't receive email"
- Verify email address in request
- Check spam folder
- Try different email address
- Check Adobe Sign email settings

### ❌ "Access token expired"
- Generate new token from Adobe Sign
- Update `.env` file
- Restart server

---

## 📚 File Locations

| File | Purpose |
|------|---------|
| `AdobeSignIntegration.html` | Main UI interface |
| `adobe_sign_server.py` | REST API server |
| `adobe_sign_api.py` | Adobe Sign API client |
| `adobe-sign-module.js` | JavaScript SDK |
| `ADOBE_SIGN_SETUP.md` | Full documentation |
| `.env` | Configuration (you create this) |

---

## ✅ Next Steps

1. **Verify API Works**:
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Create SharePoint List** (Optional):
   - Create "Signed Documents" list
   - Add columns: Agreement ID, Status, Signer

3. **Configure Webhooks** (Optional):
   - Adobe Sign → Integrations → Webhooks
   - URL: `http://your-domain:5000/api/adobe-sign/webhooks`
   - Subscribe to events

4. **Deploy to SharePoint** (Optional):
   - Upload .html file to SiteAssets
   - Create Web Part
   - Add to CheckForm.html

---

## 📞 Need Help?

1. Check **ADOBE_SIGN_SETUP.md** for detailed documentation
2. Review browser console for errors (F12)
3. Check Flask server logs
4. Verify `.env` configuration
5. Visit https://adobe.io/apis/documentservices for API help

---

**You're ready to go! 🎉**

Send your first document and watch the signing happen in real-time.
