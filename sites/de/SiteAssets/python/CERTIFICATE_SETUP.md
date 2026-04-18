# Certificate-Based Digital Signature System

Complete implementation of X.509 certificate-based digital signatures for secure document signing with cryptographic verification.

## 📋 Overview

This system provides:

- **X.509 Certificate Support**: Load and validate PKCS#12 (.pfx, .p12) certificates
- **RSA-SHA256 Signing**: Cryptographically sign documents with 2048+ bit RSA keys
- **Document Hashing**: SHA-256 hashing ensures document integrity
- **PDF Generation**: Create professional signed PDF documents
- **Signature Verification**: Validate signatures using public keys
- **REST API**: Flask backend for integration with web applications
- **Interactive UI**: HTML form with certificate management and signing

## 🎯 Features

### Frontend (`CertificateBasedSignature.html`)

- **Certificate Upload**: PKCS#12 file upload with validation
- **Dual Signing Methods**: 
  - Certificate-based (cryptographic)
  - Handwritten (visual)
- **Document Preview**: See the document before signing
- **Hash Verification**: Display SHA-256 document hash
- **Responsive Design**: Works on all devices
- **Real-time Validation**: Instant feedback on certificate status

### Backend (`CertificateSignature.py`)

**Core Classes:**

1. **CertificateManager**
   - Load certificates from PKCS#12 and PEM formats
   - Extract certificate information
   - Validate certificate validity and expiry
   - Check key sizes and algorithms

2. **DocumentSigner**
   - Calculate SHA-256 document hashes
   - Sign hashes with RSA-SHA256
   - Verify signatures using public keys
   - Support for cryptographic validation

3. **SignedPDFGenerator**
   - Create professional PDF documents
   - Embed signature information
   - Include certificate details
   - Generate verification codes

4. **CertificateSignatureWorkflow**
   - Orchestrate complete signing workflow
   - Handle errors gracefully
   - Validate at each step
   - Return comprehensive results

### API Server (`certificate_signature_api.py`)

**Endpoints:**

```
POST /api/sign
  │
  ├─ Upload certificate and document
  ├─ Validate certificate
  ├─ Hash document content
  ├─ Sign document hash
  └─ Return signed PDF and metadata

POST /api/validate-cert
  │
  ├─ Validate certificate file
  ├─ Check expiry and validity
  ├─ Return certificate details
  └─ Show any warnings

POST /api/generate-test-cert
  │
  ├─ Generate self-signed test certificate
  ├─ Create PKCS#12 file
  └─ Return certificate for testing

GET /api/health
  └─ Service health check
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install cryptography PyPDF2 reportlab Flask flask-cors
```

### 2. Generate a Test Certificate

Use the API endpoint to generate a test certificate:

```bash
curl -X POST http://localhost:5000/api/generate-test-cert \
  -H "Content-Type: application/json" \
  -d '{
    "common_name": "John Doe",
    "organization": "BC Hydro",
    "country": "CA",
    "days_valid": 365,
    "password": "testpass123"
  }'
```

Or use OpenSSL:

```bash
# Generate private key
openssl genrsa -out private_key.pem 2048

# Create self-signed certificate
openssl req -new -x509 -key private_key.pem -out certificate.crt -days 365

# Convert to PKCS#12
openssl pkcs12 -export -in certificate.crt -inkey private_key.pem \
  -out certificate.pfx -name "My Certificate"
```

### 3. Start the API Server

```bash
python certificate_signature_api.py
```

Server runs on `http://localhost:5000`

### 4. Open the Frontend

Open `CertificateBasedSignature.html` in your browser and:

1. Upload your certificate (.pfx file)
2. Enter certificate password (if required)
3. Fill in document information
4. Choose signing method (certificate-based or handwritten)
5. Click "Sign & Download PDF"

## 📝 Usage Examples

### Python Usage

```python
from CertificateSignature import CertificateSignatureWorkflow

# Create workflow
workflow = CertificateSignatureWorkflow()

# Sign a document
result = workflow.sign_document(
    cert_path='path/to/certificate.pfx',
    cert_password='my_password',
    document_title='Service Agreement',
    document_number='DOC-2026-001',
    document_content='Terms and conditions...',
    signatory_name='John Doe',
    signatory_email='john@example.com',
    signatory_job='Manager',
    signatory_dept='Engineering',
    signatory_company='BC Hydro',
    output_pdf_path='signed_document.pdf'
)

# Check results
if result['success']:
    print(f"Document signed successfully!")
    print(f"Hash: {result['document_hash']}")
    print(f"Signature: {result['signature'][:50]}...")
    print(f"Verification Code: {result['verification_code']}")
else:
    print(f"Signing failed: {result['message']}")
    print(f"Errors: {result['errors']}")

# Save PDF
with open('output.pdf', 'wb') as f:
    f.write(result['pdf_data'])
```

### API Usage

```bash
# 1. Validate certificate
curl -X POST http://localhost:5000/api/validate-cert \
  -F "certificate_file=@certificate.pfx" \
  -F "password=testpass123"

# 2. Sign a document
curl -X POST http://localhost:5000/api/sign \
  -F "certificate_file=@certificate.pfx" \
  -F "password=testpass123" \
  -F "document_title=Sample Document" \
  -F "document_number=DOC-001" \
  -F "document_content=This is the document content" \
  -F "signatory_name=John Doe" \
  -F "signatory_email=john@example.com" \
  -F "signatory_job=Manager" \
  -F "signatory_dept=Engineering" \
  -F "signatory_company=BC Hydro" \
  > signed_document.pdf
```

## 🔐 Security Features

### Certificate Validation
- Check certificate validity dates
- Validate against not-before and not-after
- Warn if expiring soon (< 30 days)
- Check public key size (2048+ bits recommended)

### Document Integrity
- SHA-256 hashing prevents tampering
- RSA-SHA256 signature ensures authenticity
- Signature verification validates signing process
- Document hash included in PDF for audit trail

### Private Key Protection
- PKCS#12 password encryption
- Private key never transmitted
- Signing happens server-side
- Certificate details safely separated from secrets

### API Security
- CORS protection for cross-origin requests
- File upload validation
- Secure filename handling
- Request size limits (50MB default)

## 📊 Signature Verification

The signed PDF contains:
1. **Document Hash (SHA-256)** - Verify document hasn't changed
2. **Cryptographic Signature** - Prove document was signed with certificate
3. **Certificate Information** - Subject, issuer, serial number, validity
4. **Signatory Details** - Name, email, job title, department
5. **Verification Code** - Unique identifier for auditing

### Verify Signature

```python
from CertificateSignature import DocumentSigner, CertificateManager

manager = CertificateManager()
signer = DocumentSigner()

# Load certificate
cert, _ = manager.load_certificate_from_pem('certificate.pem')

# Verify signature
is_valid = signer.verify_signature(
    document_hash='abc123...',
    signature='base64_encoded_signature',
    public_key=cert.public_key()
)

print(f"Signature valid: {is_valid}")
```

## 🧪 Testing

### Run Unit Tests

```bash
python -m pytest test_certificate_signature.py -v
```

### Test Endpoints

```bash
# Health check
curl http://localhost:5000/api/health

# Generate test certificate
curl -X POST http://localhost:5000/api/generate-test-cert \
  -H "Content-Type: application/json" \
  -d '{"common_name": "Test User", "password": "test123"}'
```

## 📁 File Structure

```
DE-HOME/states/de/SiteAssets/
├── html/
│   └── CertificateBasedSignature.html  # Interactive frontend
├── python/
│   ├── CertificateSignature.py         # Core signing logic
│   ├── certificate_signature_api.py    # Flask API server
│   ├── test_certificate_signature.py   # Unit tests
│   └── certificates/                   # Sample certificates (for testing)
│       ├── test_cert.pfx
│       ├── test_cert_password.txt
│       └── README.md
└── docs/
    └── CERTIFICATE_SETUP.md            # This file
```

## 🔧 Configuration

### API Server Configuration

Edit `certificate_signature_api.py`:

```python
# Maximum file size
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB

# Allowed file extensions
app.config['ALLOWED_EXTENSIONS'] = {'pfx', 'p12'}

# Server port/host
app.run(host='0.0.0.0', port=5000)
```

### PDF Generation Configuration

Edit `CertificateSignature.py` in `SignedPDFGenerator`:

```python
# Page size (default: letter)
canvas.Canvas(buffer, pagesize=letter)

# Font sizes, colors, etc.
c.setFont("Helvetica-Bold", 16)
c.setFillColor((0, 0, 0))
```

## ⚠️ Important Notes

### For Production Use

1. **Use Real Certificates**: Replace test certificates with issued by trusted CA
2. **Store Keys Securely**: Use HSM (Hardware Security Module) for production
3. **Enable HTTPS**: Always use HTTPS in production
4. **Implement Audit Logging**: Log all signing operations
5. **Add Authentication**: Implement user authentication for API
6. **Set Up Timestamping**: Use TSA (Time Stamping Authority) for non-repudiation
7. **Backup Certificates**: Securely backup certificate files
8. **Monitor Expiry**: Set reminders for certificate renewal

### Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- IE11: Requires polyfills for crypto functions

### File Size Limits

- Default API limit: 50MB
- Browser upload limit: Depends on configuration
- PDF output: Typically 2-5MB per document

## 🐛 Troubleshooting

### Certificate Won't Load

```
Error: "Failed to load certificate: Invalid password"
```

**Solution**: Check if password is correct. PFX files encrypted with PKCS#8.

### Signature Verification Fails

```
Error: "Signature verification failed after signing"
```

**Solution**: Ensure document content hasn't changed. Check hash matches.

### PDF Generation Error

```
Error: "Failed to create PDF: Unicode decode error"
```

**Solution**: Ensure document content is UTF-8 encoded. Avoid special characters.

### API Connection Refused

```
Error: "Failed to connect to http://localhost:5000"
```

**Solution**: Start API server with `python certificate_signature_api.py`

## 📚 Additional Resources

- **OpenSSL Manual**: https://www.openssl.org/docs/
- **Cryptography Library**: https://cryptography.io/
- **X.509 Standard**: https://tools.ietf.org/html/rfc5280
- **RSA Signatures**: https://tools.ietf.org/html/rfc8017
- **PDF Specification**: https://www.adobe.io/content/dam/udp/assets/open/pdf/spec/PDF32000-1.7.pdf

## 📞 Support

For issues or questions:

1. Check the troubleshooting section above
2. Review API server logs
3. Validate certificate with: `openssl pkcs12 -in cert.pfx -noout`
4. Check browser console for JavaScript errors

## 📄 License

This implementation is part of the DE-HOME project. See project license for details.

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-16  
**Author**: Digital Signature Team
