"""
Test Suite for Certificate-Based Digital Signature System
Comprehensive tests for certificate loading, signing, and verification.

Usage:
    python -m pytest test_certificate_signature.py -v
    OR
    python test_certificate_signature.py
"""

import unittest
import tempfile
import os
from datetime import datetime, timedelta
from io import BytesIO
from pathlib import Path

# Import modules to test
from CertificateSignature import (
    CertificateManager,
    DocumentSigner,
    SignedPDFGenerator,
    CertificateSignatureWorkflow,
    CertificateInfo
)

# For certificate generation
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives.serialization import pkcs12


class TestCertificateGeneration(unittest.TestCase):
    """Generate test certificates for use in other tests."""

    @classmethod
    def setUpClass(cls):
        """Generate test certificates for the entire test suite."""
        cls.temp_dir = tempfile.mkdtemp()
        cls.test_cert_path = os.path.join(cls.temp_dir, 'test_cert.pfx')
        cls.test_cert_password = 'test_password_123'
        cls.pem_cert_path = os.path.join(cls.temp_dir, 'test_cert.pem')
        cls.pem_key_path = os.path.join(cls.temp_dir, 'test_key.pem')

        # Generate RSA key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend()
        )

        # Create certificate
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, u"CA"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, u"BC"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"Test Organization"),
            x509.NameAttribute(NameOID.COMMON_NAME, u"Test User"),
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
            datetime.utcnow() + timedelta(days=365)
        ).add_extension(
            x509.BasicConstraints(ca=False, path_length=None),
            critical=True,
        ).sign(private_key, hashes.SHA256(), default_backend())

        # Save as PKCS#12
        pfx_data = pkcs12.serialize_key_and_certificates(
            name=b'test_cert',
            key=private_key,
            cert=cert,
            cas=None,
            encryption_algorithm=serialization.BestAvailableEncryption(
                cls.test_cert_password.encode()
            )
        )

        with open(cls.test_cert_path, 'wb') as f:
            f.write(pfx_data)

        # Save as PEM
        with open(cls.pem_cert_path, 'wb') as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))

        with open(cls.pem_key_path, 'wb') as f:
            f.write(private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ))

        cls.private_key = private_key
        cls.certificate = cert

    @classmethod
    def tearDownClass(cls):
        """Clean up temporary files."""
        import shutil
        if os.path.exists(cls.temp_dir):
            shutil.rmtree(cls.temp_dir)


class TestCertificateManager(TestCertificateGeneration):
    """Test CertificateManager class."""

    def setUp(self):
        self.manager = CertificateManager()

    def test_load_pfx_with_password(self):
        """Test loading PKCS#12 certificate with password."""
        cert, key, info = self.manager.load_certificate_from_pfx(
            self.test_cert_path,
            self.test_cert_password
        )

        self.assertIsNotNone(cert)
        self.assertIsNotNone(key)
        self.assertIsNotNone(info)
        self.assertEqual(info.subject, "Test User")
        self.assertEqual(info.public_key_size, 2048)

    def test_load_pfx_without_password(self):
        """Test loading PKCS#12 certificate without password (should fail)."""
        with self.assertRaises(ValueError):
            self.manager.load_certificate_from_pfx(
                self.test_cert_path,
                password=None
            )

    def test_load_pfx_wrong_password(self):
        """Test loading PKCS#12 with wrong password."""
        with self.assertRaises(ValueError):
            self.manager.load_certificate_from_pfx(
                self.test_cert_path,
                password='wrong_password'
            )

    def test_load_pem_certificate(self):
        """Test loading PEM certificate."""
        cert, info = self.manager.load_certificate_from_pem(self.pem_cert_path)

        self.assertIsNotNone(cert)
        self.assertIsNotNone(info)
        self.assertEqual(info.subject, "Test User")

    def test_extract_certificate_info(self):
        """Test extracting certificate information."""
        cert, _, info = self.manager.load_certificate_from_pfx(
            self.test_cert_path,
            self.test_cert_password
        )

        self.assertIsInstance(info, CertificateInfo)
        self.assertEqual(info.subject, "Test User")
        self.assertEqual(info.issuer, "Test User")
        self.assertTrue(info.is_valid)
        self.assertGreater(info.days_until_expiry, 0)
        self.assertGreater(info.public_key_size, 0)

    def test_validate_valid_certificate(self):
        """Test validating a valid certificate."""
        _, _, info = self.manager.load_certificate_from_pfx(
            self.test_cert_path,
            self.test_cert_password
        )

        validation = self.manager.validate_certificate(info)

        self.assertTrue(validation['is_valid'])
        self.assertEqual(len(validation['errors']), 0)

    def test_certificate_not_yet_valid(self):
        """Test certificate that is not yet valid (edge case)."""
        # This would require creating a certificate with future not_before date
        # For now, just test the validation structure
        cert_info = CertificateInfo(
            subject="Test",
            issuer="Test",
            serial_number="12345",
            not_before=datetime.utcnow() + timedelta(days=1),
            not_after=datetime.utcnow() + timedelta(days=365),
            is_valid=False,
            days_until_expiry=365,
            public_key_size=2048,
            signature_algorithm="sha256WithRSAEncryption"
        )

        validation = self.manager.validate_certificate(cert_info)

        self.assertFalse(validation['is_valid'])
        self.assertIn("not yet valid", str(validation['errors']))


class TestDocumentSigner(TestCertificateGeneration):
    """Test DocumentSigner class."""

    def setUp(self):
        self.signer = DocumentSigner()
        self.sample_content = "This is a test document for signing"

    def test_calculate_document_hash(self):
        """Test SHA-256 hash calculation."""
        hash1 = self.signer.get_document_hash(self.sample_content)
        hash2 = self.signer.get_document_hash(self.sample_content)

        # Same content should produce same hash
        self.assertEqual(hash1, hash2)
        # Hash should be hex string
        self.assertTrue(all(c in '0123456789abcdef' for c in hash1))
        # SHA-256 produces 64 character hash
        self.assertEqual(len(hash1), 64)

    def test_document_hash_changes_with_content(self):
        """Test that different content produces different hashes."""
        hash1 = self.signer.get_document_hash("Content 1")
        hash2 = self.signer.get_document_hash("Content 2")

        self.assertNotEqual(hash1, hash2)

    def test_sign_and_verify_document(self):
        """Test signing and verifying a document."""
        manager = CertificateManager()
        cert, key, _ = manager.load_certificate_from_pfx(
            self.test_cert_path,
            self.test_cert_password
        )

        # Get document hash
        doc_hash = self.signer.get_document_hash(self.sample_content)

        # Sign the hash
        signature = self.signer.sign_document_hash(doc_hash, key)

        # Verify the signature
        is_valid = self.signer.verify_signature(
            doc_hash,
            signature,
            cert.public_key()
        )

        self.assertTrue(is_valid)
        self.assertIsInstance(signature, str)
        self.assertGreater(len(signature), 100)  # Base64 encoded signature

    def test_verify_fails_with_wrong_hash(self):
        """Test that verification fails if hash is different."""
        manager = CertificateManager()
        cert, key, _ = manager.load_certificate_from_pfx(
            self.test_cert_path,
            self.test_cert_password
        )

        doc_hash = self.signer.get_document_hash(self.sample_content)
        signature = self.signer.sign_document_hash(doc_hash, key)

        # Try to verify with different hash
        wrong_hash = self.signer.get_document_hash("Different content")
        is_valid = self.signer.verify_signature(
            wrong_hash,
            signature,
            cert.public_key()
        )

        self.assertFalse(is_valid)

    def test_verify_fails_with_modified_signature(self):
        """Test that verification fails if signature is modified."""
        manager = CertificateManager()
        cert, key, _ = manager.load_certificate_from_pfx(
            self.test_cert_path,
            self.test_cert_password
        )

        doc_hash = self.signer.get_document_hash(self.sample_content)
        signature = self.signer.sign_document_hash(doc_hash, key)

        # Modify signature
        import base64
        sig_bytes = bytearray(base64.b64decode(signature))
        sig_bytes[0] ^= 0xFF  # Flip bits in first byte
        modified_sig = base64.b64encode(bytes(sig_bytes)).decode('utf-8')

        is_valid = self.signer.verify_signature(
            doc_hash,
            modified_sig,
            cert.public_key()
        )

        self.assertFalse(is_valid)


class TestSignedPDFGenerator(TestCertificateGeneration):
    """Test SignedPDFGenerator class."""

    def setUp(self):
        self.cert_manager = CertificateManager()
        self.doc_signer = DocumentSigner()
        self.pdf_generator = SignedPDFGenerator(
            self.cert_manager,
            self.doc_signer
        )

    def test_create_signed_pdf(self):
        """Test creating a signed PDF."""
        cert, key, cert_info = self.cert_manager.load_certificate_from_pfx(
            self.test_cert_path,
            self.test_cert_password
        )

        # Create test data
        content = "Test document content"
        doc_hash = self.doc_signer.get_document_hash(content)
        signature = self.doc_signer.sign_document_hash(doc_hash, key)

        # Generate PDF
        pdf_buffer = self.pdf_generator.create_signed_pdf(
            document_title="Test Document",
            document_number="DOC-001",
            document_content=content,
            signatory_name="Test User",
            signatory_email="test@example.com",
            signatory_job="Test Engineer",
            signatory_dept="Test Dept",
            signatory_company="Test Corp",
            cert_info=cert_info,
            signature=signature,
            document_hash=doc_hash
        )

        # Verify PDF was created
        self.assertIsNotNone(pdf_buffer)
        pdf_data = pdf_buffer.getvalue()
        self.assertGreater(len(pdf_data), 0)
        # Check PDF header
        self.assertTrue(pdf_data.startswith(b'%PDF'))

    def test_pdf_contains_signature_info(self):
        """Test that generated PDF contains signature information."""
        cert, key, cert_info = self.cert_manager.load_certificate_from_pfx(
            self.test_cert_path,
            self.test_cert_password
        )

        content = "Test document"
        doc_hash = self.doc_signer.get_document_hash(content)
        signature = self.doc_signer.sign_document_hash(doc_hash, key)

        pdf_buffer = self.pdf_generator.create_signed_pdf(
            document_title="Test Document",
            document_number="DOC-001",
            document_content=content,
            signatory_name="Test User",
            signatory_email="test@example.com",
            signatory_job="Engineer",
            signatory_dept="Dept",
            signatory_company="Corp",
            cert_info=cert_info,
            signature=signature,
            document_hash=doc_hash
        )

        pdf_text = pdf_buffer.getvalue().decode('latin-1', errors='ignore')

        # Check for expected content
        self.assertIn("Test Document", pdf_text)
        self.assertIn("Test User", pdf_text)
        self.assertIn("test@example.com", pdf_text)
        self.assertIn("Digital Signature", pdf_text)


class TestCertificateSignatureWorkflow(TestCertificateGeneration):
    """Test complete workflow."""

    def setUp(self):
        self.workflow = CertificateSignatureWorkflow()
        self.temp_output = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False)
        self.temp_output.close()

    def tearDown(self):
        """Clean up temporary files."""
        if os.path.exists(self.temp_output.name):
            os.remove(self.temp_output.name)

    def test_complete_signing_workflow(self):
        """Test complete document signing workflow."""
        result = self.workflow.sign_document(
            cert_path=self.test_cert_path,
            cert_password=self.test_cert_password,
            document_title="Service Agreement",
            document_number="SA-2026-001",
            document_content="Terms and conditions of service...",
            signatory_name="John Doe",
            signatory_email="john@example.com",
            signatory_job="Manager",
            signatory_dept="Engineering",
            signatory_company="BC Hydro",
            output_pdf_path=self.temp_output.name
        )

        # Check result
        self.assertTrue(result['success'])
        self.assertEqual(result['message'], 'Document signed successfully')
        self.assertIsNotNone(result['document_hash'])
        self.assertIsNotNone(result['signature'])
        self.assertIsNotNone(result['verification_code'])
        self.assertIsNotNone(result['cert_info'])
        self.assertIsNotNone(result['pdf_data'])

        # Check PDF file was created
        self.assertTrue(os.path.exists(self.temp_output.name))
        self.assertGreater(os.path.getsize(self.temp_output.name), 0)

    def test_signing_with_invalid_certificate(self):
        """Test signing with non-existent certificate."""
        result = self.workflow.sign_document(
            cert_path='/nonexistent/certificate.pfx',
            cert_password='password',
            document_title="Test",
            document_number="001",
            document_content="Content",
            signatory_name="User",
            signatory_email="user@example.com"
        )

        self.assertFalse(result['success'])
        self.assertGreater(len(result['errors']), 0)

    def test_signing_workflow_data_integrity(self):
        """Test that document hash remains constant."""
        content = "Test document for integrity check"

        # Sign twice with same content
        result1 = self.workflow.sign_document(
            cert_path=self.test_cert_path,
            cert_password=self.test_cert_password,
            document_title="Test",
            document_number="001",
            document_content=content,
            signatory_name="User",
            signatory_email="user@example.com"
        )

        result2 = self.workflow.sign_document(
            cert_path=self.test_cert_path,
            cert_password=self.test_cert_password,
            document_title="Test",
            document_number="001",
            document_content=content,
            signatory_name="User",
            signatory_email="user@example.com"
        )

        # Hashes should be identical
        self.assertEqual(result1['document_hash'], result2['document_hash'])


# Integration test
class TestIntegration(TestCertificateGeneration):
    """Integration tests combining multiple components."""

    def test_sign_verify_workflow(self):
        """Test complete sign and verify workflow."""
        manager = CertificateManager()
        signer = DocumentSigner()

        cert, key, _ = manager.load_certificate_from_pfx(
            self.test_cert_path,
            self.test_cert_password
        )

        # Step 1: Create document
        document = "This is a legally binding agreement"

        # Step 2: Calculate hash
        doc_hash = signer.get_document_hash(document)

        # Step 3: Sign
        signature = signer.sign_document_hash(doc_hash, key)

        # Step 4: Verify signature
        is_valid = signer.verify_signature(
            doc_hash,
            signature,
            cert.public_key()
        )

        # Step 5: Tamper with document
        tampered_doc = "This is a tampered agreement"
        tampered_hash = signer.get_document_hash(tampered_doc)

        # Try to verify with tampered content
        is_tampered_valid = signer.verify_signature(
            tampered_hash,
            signature,
            cert.public_key()
        )

        # Assertions
        self.assertTrue(is_valid)
        self.assertFalse(is_tampered_valid)


def run_tests():
    """Run all tests."""
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestCertificateManager))
    suite.addTests(loader.loadTestsFromTestCase(TestDocumentSigner))
    suite.addTests(loader.loadTestsFromTestCase(TestSignedPDFGenerator))
    suite.addTests(loader.loadTestsFromTestCase(TestCertificateSignatureWorkflow))
    suite.addTests(loader.loadTestsFromTestCase(TestIntegration))

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    exit(run_tests())
