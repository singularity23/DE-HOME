"""
Certificate-Based Digital Signature System
Handles digital certificate management, signing, and PDF generation with cryptographic verification.

Author: Digital Signature Team
Date: 2026-04-16
"""

import os
import json
import hashlib
import hmac
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
from dataclasses import dataclass
from cryptography import x509
from cryptography.x509.oid import NameOID, ExtensionOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
from PyPDF2 import PdfWriter, PdfReader
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from io import BytesIO
import base64


@dataclass
class CertificateInfo:
    """Represents extracted certificate information"""
    subject: str
    issuer: str
    serial_number: str
    not_before: datetime
    not_after: datetime
    is_valid: bool
    days_until_expiry: int
    public_key_size: int
    signature_algorithm: str


class CertificateManager:
    """
    Manages digital certificates - loading, validation, and extraction of certificate information.
    """

    def __init__(self):
        self.backend = default_backend()

    def load_certificate_from_pfx(
        self,
        pfx_path: str,
        password: Optional[str] = None
    ) -> Tuple[x509.Certificate, serialization.PrivateFormat, CertificateInfo]:
        """
        Load certificate from PKCS#12 (.pfx or .p12) file.

        Args:
            pfx_path: Path to the certificate file
            password: Password to unlock the certificate (if required)

        Returns:
            Tuple of (certificate, private_key, certificate_info)

        Raises:
            FileNotFoundError: If certificate file doesn't exist
            ValueError: If certificate is invalid or password is incorrect
        """
        if not os.path.exists(pfx_path):
            raise FileNotFoundError(f"Certificate file not found: {pfx_path}")

        try:
            with open(pfx_path, 'rb') as f:
                pfx_data = f.read()

            # Convert password to bytes if provided
            pwd = password.encode() if password else None

            # Load PKCS12
            from cryptography.hazmat.primitives.serialization import pkcs12
            private_key, certificate, additional_certs = pkcs12.load_key_and_certificates(
                pfx_data,
                pwd,
                backend=self.backend
            )

            cert_info = self._extract_certificate_info(certificate)

            return certificate, private_key, cert_info

        except Exception as e:
            raise ValueError(f"Failed to load certificate: {str(e)}")

    def load_certificate_from_pem(
        self,
        pem_path: str
    ) -> Tuple[x509.Certificate, CertificateInfo]:
        """
        Load certificate from PEM format file.

        Args:
            pem_path: Path to the PEM certificate file

        Returns:
            Tuple of (certificate, certificate_info)
        """
        if not os.path.exists(pem_path):
            raise FileNotFoundError(f"Certificate file not found: {pem_path}")

        with open(pem_path, 'rb') as f:
            cert_data = f.read()

        certificate = x509.load_pem_x509_certificate(cert_data, self.backend)
        cert_info = self._extract_certificate_info(certificate)

        return certificate, cert_info

    def _extract_certificate_info(self, certificate: x509.Certificate) -> CertificateInfo:
        """
        Extract readable information from an X.509 certificate.

        Args:
            certificate: The certificate to extract info from

        Returns:
            CertificateInfo object with extracted details
        """
        # Get subject common name
        subject_name = certificate.subject.get_attributes_for_oid(NameOID.COMMON_NAME)
        subject = subject_name[0].value if subject_name else "Unknown"

        # Get issuer common name
        issuer_name = certificate.issuer.get_attributes_for_oid(NameOID.COMMON_NAME)
        issuer = issuer_name[0].value if issuer_name else "Unknown"

        # Get certificate validity dates
        not_before = certificate.not_valid_before
        not_after = certificate.not_valid_after

        # Check if certificate is currently valid
        now = datetime.utcnow()
        is_valid = not_before <= now <= not_after

        # Calculate days until expiry
        days_until_expiry = (not_after - now).days

        # Get public key size
        public_key_size = 0
        if isinstance(certificate.public_key(), rsa.RSAPublicKey):
            public_key_size = certificate.public_key().key_size

        # Get signature algorithm
        signature_algorithm = certificate.signature_algorithm_oid._name

        return CertificateInfo(
            subject=subject,
            issuer=issuer,
            serial_number=format(certificate.serial_number, 'x'),
            not_before=not_before,
            not_after=not_after,
            is_valid=is_valid,
            days_until_expiry=days_until_expiry,
            public_key_size=public_key_size,
            signature_algorithm=signature_algorithm
        )

    def validate_certificate(self, cert_info: CertificateInfo) -> Dict[str, any]:
        """
        Validate certificate and return validation report.

        Args:
            cert_info: CertificateInfo object to validate

        Returns:
            Dictionary with validation results and warnings
        """
        validation_result = {
            'is_valid': cert_info.is_valid,
            'errors': [],
            'warnings': []
        }

        # Check if expired
        now = datetime.utcnow()
        if now > cert_info.not_after:
            validation_result['errors'].append('Certificate has expired')
            validation_result['is_valid'] = False

        # Check if not yet valid
        if now < cert_info.not_before:
            validation_result['errors'].append('Certificate is not yet valid')
            validation_result['is_valid'] = False

        # Check expiry warning
        if cert_info.days_until_expiry < 30 and cert_info.days_until_expiry > 0:
            validation_result['warnings'].append(
                f'Certificate will expire in {cert_info.days_until_expiry} days'
            )

        # Check key size
        if cert_info.public_key_size < 2048:
            validation_result['warnings'].append(
                f'Key size {cert_info.public_key_size} bits is below 2048-bit recommended minimum'
            )

        return validation_result


class DocumentSigner:
    """
    Signs documents with digital certificates using RSA-SHA256.
    """

    def __init__(self):
        self.backend = default_backend()

    def sign_document_hash(
        self,
        document_hash: str,
        private_key
    ) -> str:
        """
        Sign a document hash with the private key.

        Args:
            document_hash: SHA-256 hash of the document content (hex string)
            private_key: Private key from certificate

        Returns:
            Base64-encoded signature
        """
        try:
            # Convert hex hash to bytes
            hash_bytes = bytes.fromhex(document_hash)

            # Sign with RSA-SHA256
            signature = private_key.sign(
                hash_bytes,
                padding.PKCS1v15(),
                hashes.SHA256()
            )

            # Return as base64
            return base64.b64encode(signature).decode('utf-8')

        except Exception as e:
            raise ValueError(f"Failed to sign document: {str(e)}")

    def get_document_hash(self, content: str) -> str:
        """
        Calculate SHA-256 hash of document content.

        Args:
            content: Document content as string

        Returns:
            Hexadecimal representation of the hash
        """
        hash_object = hashlib.sha256(content.encode('utf-8'))
        return hash_object.hexdigest()

    def verify_signature(
        self,
        document_hash: str,
        signature: str,
        public_key
    ) -> bool:
        """
        Verify a document signature.

        Args:
            document_hash: SHA-256 hash of the document (hex string)
            signature: Base64-encoded signature
            public_key: Public key from certificate

        Returns:
            True if signature is valid, False otherwise
        """
        try:
            hash_bytes = bytes.fromhex(document_hash)
            signature_bytes = base64.b64decode(signature)

            public_key.verify(
                signature_bytes,
                hash_bytes,
                padding.PKCS1v15(),
                hashes.SHA256()
            )
            return True
        except Exception:
            return False


class SignedPDFGenerator:
    """
    Generates PDF documents with embedded digital signature information.
    """

    def __init__(self, cert_manager: CertificateManager, doc_signer: DocumentSigner):
        self.cert_manager = cert_manager
        self.doc_signer = doc_signer

    def create_signed_pdf(
        self,
        document_title: str,
        document_number: str,
        document_content: str,
        signatory_name: str,
        signatory_email: str,
        signatory_job: str,
        signatory_dept: str,
        signatory_company: str,
        cert_info: CertificateInfo,
        signature: str,
        document_hash: str,
        output_path: str = None
    ) -> BytesIO:
        """
        Create a PDF with digital signature information embedded.

        Args:
            document_title: Title of the document
            document_number: Document reference number
            document_content: Main content of the document
            signatory_name: Name of the person signing
            signatory_email: Email of the signer
            signatory_job: Job title of the signer
            signatory_dept: Department of the signer
            signatory_company: Company of the signer
            cert_info: Certificate information
            signature: Base64-encoded signature
            document_hash: SHA-256 hash of the document
            output_path: Optional path to save the PDF

        Returns:
            BytesIO object containing the PDF
        """
        buffer = BytesIO()

        # Create PDF using reportlab
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        # Page 1: Document content
        y = height - inch

        # Title
        c.setFont("Helvetica-Bold", 24)
        c.drawString(inch, y, document_title)
        y -= 0.5 * inch

        # Document Info
        c.setFont("Helvetica", 10)
        c.setFillColor((100, 100, 100))
        c.drawString(inch, y, f"Document Number: {document_number or 'N/A'}")
        y -= 0.25 * inch
        c.drawString(inch, y, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        y -= 0.5 * inch

        # Document hash
        c.setFont("Helvetica-Bold", 10)
        c.drawString(inch, y, "Document Hash (SHA-256):")
        y -= 0.25 * inch
        c.setFont("Courier", 8)
        c.setFillColor((102, 126, 234))

        # Break hash into multiple lines
        hash_lines = [document_hash[i:i+70] for i in range(0, len(document_hash), 70)]
        for line in hash_lines:
            c.drawString(inch, y, line)
            y -= 0.2 * inch

        y -= 0.3 * inch

        # Document content
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor((0, 0, 0))
        c.drawString(inch, y, "Document Content:")
        y -= 0.3 * inch

        c.setFont("Helvetica", 10)
        content_lines = document_content.split('\n')
        for line in content_lines:
            if y < inch:  # Create new page if running out of space
                c.showPage()
                y = height - inch
            c.drawString(inch, y, line[:80])  # Limit line width
            y -= 0.25 * inch

        # New page for signature information
        c.showPage()
        y = height - inch

        # Signature page
        c.setFont("Helvetica-Bold", 16)
        c.drawString(inch, y, "Digital Signature Information")
        y -= 0.5 * inch

        # Signature details
        c.setFont("Helvetica-Bold", 11)
        c.drawString(inch, y, "Signature Method: Certificate-Based (RSA-SHA256)")
        y -= 0.3 * inch

        c.setFont("Helvetica-Bold", 10)
        c.drawString(inch, y, "Signatory Information:")
        y -= 0.25 * inch

        c.setFont("Helvetica", 10)
        signatory_info = [
            f"Name: {signatory_name}",
            f"Email: {signatory_email}",
            f"Job Title: {signatory_job or 'N/A'}",
            f"Department: {signatory_dept or 'N/A'}",
            f"Company: {signatory_company or 'N/A'}",
            f"Signed Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}"
        ]

        for info in signatory_info:
            c.drawString(inch, y, info)
            y -= 0.25 * inch

        y -= 0.3 * inch

        # Certificate details
        c.setFont("Helvetica-Bold", 10)
        c.drawString(inch, y, "Certificate Information:")
        y -= 0.25 * inch

        c.setFont("Helvetica", 9)
        cert_details = [
            f"Subject: {cert_info.subject}",
            f"Issuer: {cert_info.issuer}",
            f"Serial Number: {cert_info.serial_number}",
            f"Valid From: {cert_info.not_before.strftime('%Y-%m-%d')}",
            f"Valid Until: {cert_info.not_after.strftime('%Y-%m-%d')}",
            f"Public Key Size: {cert_info.public_key_size} bits",
            f"Algorithm: {cert_info.signature_algorithm}"
        ]

        for detail in cert_details:
            if y < inch:
                c.showPage()
                y = height - inch
            c.drawString(inch, y, detail)
            y -= 0.2 * inch

        y -= 0.3 * inch

        # Signature (truncated for display)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(inch, y, "Cryptographic Signature (RSA-SHA256):")
        y -= 0.25 * inch

        c.setFont("Courier", 7)
        c.setFillColor((102, 126, 234))

        sig_lines = [signature[i:i+80] for i in range(0, len(signature), 80)]
        for line in sig_lines[:8]:  # Show first 8 lines
            c.drawString(inch, y, line)
            y -= 0.15 * inch

        if len(sig_lines) > 8:
            c.drawString(inch, y, f"... ({len(sig_lines) - 8} more lines)")

        # Footer
        y -= 0.3 * inch
        c.setFont("Helvetica", 8)
        c.setFillColor((150, 150, 150))
        c.drawString(
            inch, 0.5 * inch,
            f"Verification Code: {self._generate_verification_code()} | "
            f"Document is legally binding when signed with a valid certificate"
        )

        c.save()
        buffer.seek(0)

        # Optionally save to file
        if output_path:
            with open(output_path, 'wb') as f:
                f.write(buffer.getvalue())
            buffer.seek(0)

        return buffer

    def _generate_verification_code(self) -> str:
        """Generate a unique verification code for the document."""
        timestamp = datetime.now().isoformat()
        return 'CERT' + hashlib.sha256(timestamp.encode()).hexdigest()[:16].upper()


class CertificateSignatureWorkflow:
    """
    Complete workflow for certificate-based document signing.
    Orchestrates certificate loading, document hashing, signing, and PDF generation.
    """

    def __init__(self):
        self.cert_manager = CertificateManager()
        self.doc_signer = DocumentSigner()
        self.pdf_generator = SignedPDFGenerator(self.cert_manager, self.doc_signer)

    def sign_document(
        self,
        cert_path: str,
        cert_password: Optional[str],
        document_title: str,
        document_number: str,
        document_content: str,
        signatory_name: str,
        signatory_email: str,
        signatory_job: str = "",
        signatory_dept: str = "",
        signatory_company: str = "",
        output_pdf_path: str = None
    ) -> Dict:
        """
        Complete workflow to sign a document with a certificate.

        Args:
            cert_path: Path to the PKCS#12 certificate file
            cert_password: Password to unlock the certificate
            document_title: Title of the document
            document_number: Document reference number
            document_content: Main content of the document
            signatory_name: Name of the person signing
            signatory_email: Email of the signer
            signatory_job: Job title of the signer
            signatory_dept: Department of the signer
            signatory_company: Company of the signer
            output_pdf_path: Optional path to save the signed PDF

        Returns:
            Dictionary with signing results including PDF bytes and metadata
        """
        result = {
            'success': False,
            'message': '',
            'errors': [],
            'warnings': [],
            'pdf_data': None,
            'document_hash': None,
            'signature': None,
            'cert_info': None,
            'verification_code': None
        }

        try:
            # Step 1: Load and validate certificate
            certificate, private_key, cert_info = self.cert_manager.load_certificate_from_pfx(
                cert_path,
                cert_password
            )
            result['cert_info'] = {
                'subject': cert_info.subject,
                'issuer': cert_info.issuer,
                'serial_number': cert_info.serial_number,
                'not_before': cert_info.not_before.isoformat(),
                'not_after': cert_info.not_after.isoformat(),
                'is_valid': cert_info.is_valid,
                'days_until_expiry': cert_info.days_until_expiry,
                'public_key_size': cert_info.public_key_size
            }

            # Step 2: Validate certificate
            validation = self.cert_manager.validate_certificate(cert_info)
            if not validation['is_valid']:
                result['errors'].extend(validation['errors'])
                result['message'] = 'Certificate validation failed'
                return result

            result['warnings'].extend(validation['warnings'])

            # Step 3: Calculate document hash
            full_content = f"{document_title}\n{document_number}\n{document_content}"
            document_hash = self.doc_signer.get_document_hash(full_content)
            result['document_hash'] = document_hash

            # Step 4: Sign the document hash
            signature = self.doc_signer.sign_document_hash(document_hash, private_key)
            result['signature'] = signature

            # Step 5: Verify the signature (sanity check)
            is_valid = self.doc_signer.verify_signature(
                document_hash,
                signature,
                certificate.public_key()
            )
            if not is_valid:
                result['errors'].append('Signature verification failed after signing')
                result['message'] = 'Signature creation failed'
                return result

            # Step 6: Generate signed PDF
            pdf_buffer = self.pdf_generator.create_signed_pdf(
                document_title,
                document_number,
                document_content,
                signatory_name,
                signatory_email,
                signatory_job,
                signatory_dept,
                signatory_company,
                cert_info,
                signature,
                document_hash,
                output_pdf_path
            )

            result['pdf_data'] = pdf_buffer.getvalue()
            result['verification_code'] = self._generate_verification_code()
            result['success'] = True
            result['message'] = 'Document signed successfully'

        except FileNotFoundError as e:
            result['errors'].append(f'File not found: {str(e)}')
            result['message'] = 'Certificate file not found'
        except ValueError as e:
            result['errors'].append(f'Certificate error: {str(e)}')
            result['message'] = 'Certificate validation failed'
        except Exception as e:
            result['errors'].append(f'Unexpected error: {str(e)}')
            result['message'] = f'Error during signing: {str(e)}'

        return result

    def _generate_verification_code(self) -> str:
        """Generate a unique verification code."""
        timestamp = datetime.now().isoformat()
        return 'CERT' + hashlib.sha256(timestamp.encode()).hexdigest()[:16].upper()


# Example usage
if __name__ == '__main__':
    # Create workflow instance
    workflow = CertificateSignatureWorkflow()

    # Example: Sign a document
    # Note: You need to provide a valid certificate file
    result = workflow.sign_document(
        cert_path='path/to/certificate.pfx',
        cert_password='certificate_password',
        document_title='Service Agreement',
        document_number='DOC-2026-001',
        document_content='Terms and conditions of this agreement...',
        signatory_name='John Doe',
        signatory_email='john.doe@example.com',
        signatory_job='Manager',
        signatory_dept='Engineering',
        signatory_company='BC Hydro',
        output_pdf_path='signed_document.pdf'
    )

    print(json.dumps(result, indent=2, default=str))
