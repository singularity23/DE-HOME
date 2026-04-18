"""
Certificate-Based Digital Signature API Server
Flask application that provides REST endpoints for signing documents with digital certificates.

Usage:
    python certificate_signature_api.py

Endpoints:
    POST /api/sign - Sign a document with a certificate
    GET /api/health - Health check
    POST /api/validate-cert - Validate a certificate file
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import json
from datetime import datetime
from io import BytesIO
import tempfile
from werkzeug.utils import secure_filename

# Import certificate signing modules
from CertificateSignature import (
    CertificateSignatureWorkflow,
    CertificateManager
)

# Configuration
app = Flask(__name__)
CORS(app)

app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
app.config['UPLOAD_FOLDER'] = tempfile.gettempdir()
app.config['ALLOWED_EXTENSIONS'] = {'pfx', 'p12'}

# Initialize workflow
workflow = CertificateSignatureWorkflow()
cert_manager = CertificateManager()


def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'Certificate-Based Digital Signature API'
    }), 200


@app.route('/api/validate-cert', methods=['POST'])
def validate_certificate():
    """
    Validate a certificate file.

    Request body:
        - certificate_file: File upload (PKCS#12 format)
        - password: Certificate password (optional)

    Response:
        - is_valid: Boolean indicating if certificate is valid
        - cert_info: Certificate details
        - warnings: List of warnings
        - errors: List of errors
    """
    try:
        # Check if certificate file is provided
        if 'certificate_file' not in request.files:
            return jsonify({
                'error': 'No certificate file provided',
                'is_valid': False
            }), 400

        cert_file = request.files['certificate_file']
        if cert_file.filename == '':
            return jsonify({
                'error': 'No file selected',
                'is_valid': False
            }), 400

        if not allowed_file(cert_file.filename):
            return jsonify({
                'error': f'File type not allowed. Supported: {", ".join(app.config["ALLOWED_EXTENSIONS"])}',
                'is_valid': False
            }), 400

        # Save temp file
        filename = secure_filename(cert_file.filename)
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        cert_file.save(temp_path)

        # Get password if provided
        password = request.form.get('password', None)

        try:
            # Load and validate certificate
            certificate, private_key, cert_info = cert_manager.load_certificate_from_pfx(
                temp_path,
                password
            )

            # Validate
            validation = cert_manager.validate_certificate(cert_info)

            response = {
                'is_valid': validation['is_valid'],
                'cert_info': {
                    'subject': cert_info.subject,
                    'issuer': cert_info.issuer,
                    'serial_number': cert_info.serial_number,
                    'not_before': cert_info.not_before.isoformat(),
                    'not_after': cert_info.not_after.isoformat(),
                    'is_valid': cert_info.is_valid,
                    'days_until_expiry': cert_info.days_until_expiry,
                    'public_key_size': cert_info.public_key_size,
                    'signature_algorithm': cert_info.signature_algorithm
                },
                'warnings': validation['warnings'],
                'errors': validation['errors']
            }

            return jsonify(response), 200

        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)

    except ValueError as e:
        return jsonify({
            'error': f'Certificate validation error: {str(e)}',
            'is_valid': False
        }), 400
    except Exception as e:
        return jsonify({
            'error': f'Server error: {str(e)}',
            'is_valid': False
        }), 500


@app.route('/api/sign', methods=['POST'])
def sign_document():
    """
    Sign a document with a digital certificate.

    Request body (multipart/form-data):
        - certificate_file: PKCS#12 certificate file
        - password: Certificate password (optional)
        - document_title: Title of the document
        - document_number: Document reference number
        - document_content: Main content of the document
        - signatory_name: Name of the person signing
        - signatory_email: Email of the signer
        - signatory_job: Job title (optional)
        - signatory_dept: Department (optional)
        - signatory_company: Company name (optional)

    Response:
        - success: Boolean indicating if signing was successful
        - message: Status message
        - pdf: Base64-encoded PDF for download (if successful)
        - document_hash: SHA-256 hash of the document
        - signature: RSA-SHA256 signature (base64-encoded)
        - verification_code: Unique verification code
        - cert_info: Certificate information used for signing
        - errors: List of errors (if any)
        - warnings: List of warnings (if any)
    """
    try:
        # Validate required fields
        required_fields = [
            'document_title',
            'signatory_name',
            'signatory_email'
        ]

        missing_fields = [f for f in required_fields if f not in request.form]
        if missing_fields:
            return jsonify({
                'success': False,
                'message': f'Missing required fields: {", ".join(missing_fields)}',
                'errors': [f'Missing field: {f}' for f in missing_fields]
            }), 400

        # Check certificate file
        if 'certificate_file' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No certificate file provided',
                'errors': ['Certificate file is required for signing']
            }), 400

        cert_file = request.files['certificate_file']
        if cert_file.filename == '' or not allowed_file(cert_file.filename):
            return jsonify({
                'success': False,
                'message': 'Invalid certificate file',
                'errors': ['Invalid or unsupported certificate file format']
            }), 400

        # Save certificate temp file
        cert_filename = secure_filename(cert_file.filename)
        cert_temp_path = os.path.join(app.config['UPLOAD_FOLDER'], cert_filename)
        cert_file.save(cert_temp_path)

        # Get form data
        password = request.form.get('password', None)
        document_title = request.form.get('document_title')
        document_number = request.form.get('document_number', '')
        document_content = request.form.get('document_content', '')
        signatory_name = request.form.get('signatory_name')
        signatory_email = request.form.get('signatory_email')
        signatory_job = request.form.get('signatory_job', '')
        signatory_dept = request.form.get('signatory_dept', '')
        signatory_company = request.form.get('signatory_company', '')

        try:
            # Create signed PDF output path
            pdf_filename = f"{document_title.replace(' ', '_')}_signed_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            pdf_temp_path = os.path.join(app.config['UPLOAD_FOLDER'], pdf_filename)

            # Sign the document
            result = workflow.sign_document(
                cert_path=cert_temp_path,
                cert_password=password,
                document_title=document_title,
                document_number=document_number,
                document_content=document_content,
                signatory_name=signatory_name,
                signatory_email=signatory_email,
                signatory_job=signatory_job,
                signatory_dept=signatory_dept,
                signatory_company=signatory_company,
                output_pdf_path=pdf_temp_path
            )

            # Prepare response
            response = {
                'success': result['success'],
                'message': result['message'],
                'errors': result['errors'],
                'warnings': result['warnings'],
                'document_hash': result['document_hash'],
                'verification_code': result['verification_code'],
                'cert_info': result['cert_info']
            }

            if result['success'] and result['pdf_data']:
                # Return PDF as download
                response['pdf_url'] = f'/api/download/{pdf_filename}'
                response['pdf_size'] = len(result['pdf_data'])
                # Optionally include base64 for direct download
                import base64
                response['pdf_base64'] = base64.b64encode(result['pdf_data']).decode('utf-8')

            status_code = 200 if result['success'] else 400

            return jsonify(response), status_code

        finally:
            # Clean up certificate temp file
            if os.path.exists(cert_temp_path):
                os.remove(cert_temp_path)

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}',
            'errors': [str(e)]
        }), 500


@app.route('/api/generate-test-cert', methods=['POST'])
def generate_test_certificate():
    """
    Generate a test self-signed certificate for development/testing.

    Request body:
        - common_name: Subject common name (e.g., 'John Doe')
        - organization: Organization name (optional)
        - country: Country code (optional, default 'CA')
        - days_valid: Days until expiry (optional, default 365)

    Response:
        - success: Boolean indicating if generation was successful
        - message: Status message
        - cert_download_url: URL to download the certificate
        - cert_info: Details about the generated certificate
    """
    try:
        from cryptography import x509
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.backends import default_backend
        from cryptography.x509.oid import NameOID
        import tempfile

        # Get request parameters
        common_name = request.json.get('common_name', 'Test User')
        organization = request.json.get('organization', 'Test Organization')
        country = request.json.get('country', 'CA')
        days_valid = request.json.get('days_valid', 365)
        password = request.json.get('password', 'testpassword')

        # Generate private key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend()
        )

        # Build certificate
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, country),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, organization),
            x509.NameAttribute(NameOID.COMMON_NAME, common_name),
        ])

        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            private_key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.utcnow()
        ).not_valid_after(
            datetime.utcnow() + __import__('datetime').timedelta(days=days_valid)
        ).add_extension(
            x509.BasicConstraints(ca=False, path_length=None),
            critical=True,
        ).sign(private_key, hashes.SHA256(), default_backend())

        # Create PKCS#12 file
        from cryptography.hazmat.primitives.serialization import pkcs12

        cert_bytes = pkcs12.serialize_key_and_certificates(
            name=b'test_cert',
            key=private_key,
            cert=cert,
            cas=None,
            encryption_algorithm=serialization.BestAvailableEncryption(password.encode())
        )

        # Save to temp file
        temp_filename = f"test_cert_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pfx"
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], temp_filename)

        with open(temp_path, 'wb') as f:
            f.write(cert_bytes)

        return jsonify({
            'success': True,
            'message': 'Test certificate generated successfully',
            'cert_download_url': f'/api/download/{temp_filename}',
            'cert_filename': temp_filename,
            'cert_password': password,
            'cert_info': {
                'subject': common_name,
                'organization': organization,
                'country': country,
                'valid_for_days': days_valid,
                'key_size': 2048,
                'algorithm': 'RSA-SHA256'
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to generate test certificate: {str(e)}',
            'error': str(e)
        }), 500


@app.route('/api/download/<filename>', methods=['GET'])
def download_file(filename):
    """Download a file (PDF or certificate)."""
    try:
        # Security: prevent directory traversal
        filename = secure_filename(filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        # Check if file exists and is in allowed folder
        if not os.path.exists(filepath) or not filepath.startswith(app.config['UPLOAD_FOLDER']):
            return jsonify({'error': 'File not found'}), 404

        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        return jsonify({'error': f'Download failed: {str(e)}'}), 500


@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file too large error."""
    return jsonify({
        'error': 'File too large',
        'message': f'Maximum file size is {app.config["MAX_CONTENT_LENGTH"] / (1024*1024):.0f}MB'
    }), 413


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({
        'error': 'Endpoint not found',
        'message': 'The requested endpoint does not exist',
        'available_endpoints': [
            'POST /api/sign',
            'POST /api/validate-cert',
            'POST /api/generate-test-cert',
            'GET /api/health'
        ]
    }), 404


if __name__ == '__main__':
    print("""
    ┌─────────────────────────────────────────────────────────────────┐
    │   Certificate-Based Digital Signature API Server                │
    │   Running on http://localhost:5000                              │
    │                                                                  │
    │   Endpoints:                                                    │
    │   - POST /api/sign              - Sign a document               │
    │   - POST /api/validate-cert     - Validate a certificate        │
    │   - POST /api/generate-test-cert - Generate test certificate    │
    │   - GET  /api/health            - Health check                  │
    │                                                                  │
    │   Documentation:                                                │
    │   See docstrings in this file for request/response details      │
    └─────────────────────────────────────────────────────────────────┘
    """)
    app.run(debug=True, host='0.0.0.0', port=5000)
