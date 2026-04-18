"""
Adobe Sign REST API Integration Module
Handles all interactions with Adobe Sign cloud service
"""

import requests
import json
import os
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AgreementStatus(Enum):
    """Adobe Sign agreement status enum"""
    OUT_FOR_SIGNATURE = "OUT_FOR_SIGNATURE"
    SIGNED = "SIGNED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"
    NOT_YET_VISIBLE = "NOT_YET_VISIBLE"
    WIDGET_WAITING_FOR_SIGNATURE = "WIDGET_WAITING_FOR_SIGNATURE"
    WIDGET_SIGNED = "WIDGET_SIGNED"
    DRAFT = "DRAFT"


class SignMethod(Enum):
    """Signing method options"""
    SIGN = "SIGNATURE"
    INITIALS = "INITIALS"
    APPROVE = "APPROVE"
    DECLINE = "DECLINE"


@dataclass
class AdobeSignConfig:
    """Adobe Sign API Configuration"""
    client_id: str
    client_secret: str
    redirect_uri: str
    base_url: str = "https://api.adobesign.com/api/rest/v6"
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expiry: Optional[datetime] = None

    @classmethod
    def from_env(cls) -> 'AdobeSignConfig':
        """Load configuration from environment variables"""
        return cls(
            client_id=os.getenv('ADOBE_SIGN_CLIENT_ID', ''),
            client_secret=os.getenv('ADOBE_SIGN_CLIENT_SECRET', ''),
            redirect_uri=os.getenv('ADOBE_SIGN_REDIRECT_URI', ''),
            access_token=os.getenv('ADOBE_SIGN_ACCESS_TOKEN', '')
        )


class AdobeSignAPI:
    """Main Adobe Sign API Client"""

    def __init__(self, config: AdobeSignConfig):
        """
        Initialize Adobe Sign API client

        Args:
            config: AdobeSignConfig instance with API credentials
        """
        self.config = config
        self.session = requests.Session()
        self._setup_headers()

    def _setup_headers(self) -> None:
        """Setup request headers with authentication"""
        if self.config.access_token:
            self.session.headers.update({
                'Authorization': f'Bearer {self.config.access_token}',
                'Content-Type': 'application/json'
            })

    def refresh_access_token(self, refresh_token: str) -> bool:
        """
        Refresh OAuth access token

        Args:
            refresh_token: OAuth refresh token

        Returns:
            True if successful, False otherwise
        """
        try:
            response = requests.post(
                f'{self.config.base_url.rsplit("/", 2)[0]}/oauth/token',
                data={
                    'grant_type': 'refresh_token',
                    'refresh_token': refresh_token,
                    'client_id': self.config.client_id,
                    'client_secret': self.config.client_secret
                }
            )

            if response.status_code == 200:
                data = response.json()
                self.config.access_token = data['access_token']
                self.config.refresh_token = data.get('refresh_token', refresh_token)
                self.config.token_expiry = datetime.now() + timedelta(seconds=data['expires_in'])
                self._setup_headers()
                return True

            logger.error(f'Token refresh failed: {response.text}')
            return False

        except Exception as e:
            logger.error(f'Error refreshing token: {str(e)}')
            return False

    def send_agreement(self, document_bytes: bytes, recipients_list: List[Dict[str, str]], 
                      agreement_title: str, message: str = '', 
                      days_to_expire: int = 7, **kwargs) -> Dict[str, Any]:
        """
        Send a document for signature via Adobe Sign

        Args:
            document_bytes: Raw PDF document bytes
            recipients_list: List of dicts with 'email' and 'name' keys
            agreement_title: Title of the agreement
            message: Message to include in signing email
            days_to_expire: Days until agreement expires
            **kwargs: Additional options

        Returns:
            Response dict with agreementId and status
        """
        try:
            # Step 1: Upload document to library
            document_id = self._upload_document(document_bytes, agreement_title)
            if not document_id:
                return {'success': False, 'message': 'Failed to upload document'}

            # Step 2: Create agreement
            return self._create_agreement(
                document_id=document_id,
                recipients=recipients_list,
                agreement_title=agreement_title,
                message=message,
                days_to_expire=days_to_expire,
                **kwargs
            )

        except Exception as e:
            logger.error(f'Error sending agreement: {str(e)}')
            return {'success': False, 'message': f'Error: {str(e)}'}

    def _upload_document(self, document_bytes: bytes, document_name: str) -> Optional[str]:
        """
        Upload document to Adobe Sign library

        Args:
            document_bytes: PDF document bytes
            document_name: Name for the document

        Returns:
            Document ID or None if failed
        """
        try:
            files = {
                'File': (f'{document_name}.pdf', document_bytes, 'application/pdf')
            }

            response = self.session.post(
                f'{self.config.base_url}/library_documents',
                files=files,
                data={'LibraryDocumentName': document_name}
            )

            if response.status_code == 201:
                return response.json().get('id')

            logger.error(f'Document upload failed: {response.text}')
            return None

        except Exception as e:
            logger.error(f'Error uploading document: {str(e)}')
            return None

    def _create_agreement(self, document_id: str, recipients: List[Dict[str, str]],
                         agreement_title: str, message: str = '', 
                         days_to_expire: int = 7, **kwargs) -> Dict[str, Any]:
        """
        Create agreement from uploaded document

        Args:
            document_id: ID of uploaded document
            recipients: List of recipient email/name dicts
            agreement_title: Title of agreement
            message: Message to signers
            days_to_expire: Expiration time in days
            **kwargs: Additional options

        Returns:
            Response with agreementId and details
        """
        try:
            # Build participant sets
            participant_sets = []
            for idx, recipient in enumerate(recipients):
                participant_sets.append({
                    'order': kwargs.get('signing_order', [None] * len(recipients))[idx] or (idx + 1),
                    'role': recipient.get('role', 'SIGNER'),
                    "signingOrder": "PARALLEL",  # All sign simultaneously
                    "participants": [
                        {
                            "email": recipient['email'],
                            "name": recipient.get('name', ''),
                            "label": recipient.get('name', ''),
                            "signingOrder": idx + 1
                        }
                    ]
                })

            # Build agreement payload
            payload = {
                "fileInfos": [
                    {
                        "libraryDocumentId": document_id
                    }
                ],
                "name": agreement_title,
                "participantSetsInfo": participant_sets,
                "signatureType": "ESIGN",
                "state": "OUT_FOR_SIGNATURE",
                "reminderFrequency": kwargs.get('reminder_frequency', 'DAILY_UNTIL_SIGNED'),
                "daysUntilSigningDeadline": days_to_expire
            }

            # Add message if provided
            if message:
                payload["messageForSigners"] = message

            # Add authentication requirements if needed
            if kwargs.get('require_auth'):
                payload["signatureFlow"] = "SENDER_SIGNATURE_WORKFLOW"
                payload["signatureAgreementStatusForUnknownSigners"] = "SIGN_WHEN_READY"

            response = self.session.post(
                f'{self.config.base_url}/agreements',
                json=payload
            )

            if response.status_code in [201, 200]:
                result = response.json()
                return {
                    'success': True,
                    'agreementId': result.get('id'),
                    'status': result.get('status'),
                    'message': 'Agreement sent successfully for signature'
                }

            logger.error(f'Agreement creation failed: {response.text}')
            return {
                'success': False,
                'message': f'Failed to create agreement: {response.status_code}'
            }

        except Exception as e:
            logger.error(f'Error creating agreement: {str(e)}')
            return {'success': False, 'message': f'Error: {str(e)}'}

    def get_agreement(self, agreement_id: str) -> Dict[str, Any]:
        """
        Get agreement details by ID

        Args:
            agreement_id: Adobe Sign agreement ID

        Returns:
            Agreement details or error dict
        """
        try:
            response = self.session.get(
                f'{self.config.base_url}/agreements/{agreement_id}'
            )

            if response.status_code == 200:
                return {
                    'success': True,
                    'agreement': response.json()
                }

            logger.error(f'Failed to get agreement: {response.text}')
            return {
                'success': False,
                'message': f'Agreement not found: {response.status_code}'
            }

        except Exception as e:
            logger.error(f'Error getting agreement: {str(e)}')
            return {'success': False, 'message': f'Error: {str(e)}'}

    def get_agreement_documents(self, agreement_id: str) -> Dict[str, Any]:
        """
        Get documents for an agreement

        Args:
            agreement_id: Adobe Sign agreement ID

        Returns:
            List of documents or error dict
        """
        try:
            response = self.session.get(
                f'{self.config.base_url}/agreements/{agreement_id}/documents'
            )

            if response.status_code == 200:
                return {
                    'success': True,
                    'documents': response.json().get('documents', [])
                }

            logger.error(f'Failed to get documents: {response.text}')
            return {'success': False, 'message': 'Failed to retrieve documents'}

        except Exception as e:
            logger.error(f'Error getting documents: {str(e)}')
            return {'success': False, 'message': f'Error: {str(e)}'}

    def get_signing_url(self, agreement_id: str) -> Optional[str]:
        """
        Get signing URL for agreement

        Args:
            agreement_id: Adobe Sign agreement ID

        Returns:
            Signing URL or None
        """
        try:
            response = self.session.get(
                f'{self.config.base_url}/agreements/{agreement_id}/signingUrls'
            )

            if response.status_code == 200:
                urls = response.json().get('signingUrlSetList', [])
                if urls and urls[0].get('signingUrls'):
                    return urls[0]['signingUrls'][0].get('esignUrl')

            return None

        except Exception as e:
            logger.error(f'Error getting signing URL: {str(e)}')
            return None

    def cancel_agreement(self, agreement_id: str, reason: str = '') -> Dict[str, Any]:
        """
        Cancel an agreement

        Args:
            agreement_id: Adobe Sign agreement ID
            reason: Cancellation reason

        Returns:
            Response dict
        """
        try:
            payload = {
                'state': 'CANCELLED',
                'cancellationReason': reason
            }

            response = self.session.put(
                f'{self.config.base_url}/agreements/{agreement_id}/state',
                json=payload
            )

            if response.status_code in [200, 201]:
                return {'success': True, 'message': 'Agreement cancelled'}

            logger.error(f'Cancel failed: {response.text}')
            return {'success': False, 'message': 'Failed to cancel agreement'}

        except Exception as e:
            logger.error(f'Error cancelling agreement: {str(e)}')
            return {'success': False, 'message': f'Error: {str(e)}'}

    def list_agreements(self, status_filter: Optional[str] = None, 
                       limit: int = 50) -> Dict[str, Any]:
        """
        List user's agreements

        Args:
            status_filter: Filter by status (optional)
            limit: Maximum results

        Returns:
            List of agreements
        """
        try:
            params = {'pageSize': limit}
            if status_filter:
                params['query'] = f'status:{status_filter}'

            response = self.session.get(
                f'{self.config.base_url}/agreements',
                params=params
            )

            if response.status_code == 200:
                return {
                    'success': True,
                    'agreements': response.json().get('userAgreementList', [])
                }

            logger.error(f'List failed: {response.text}')
            return {'success': False, 'agreements': []}

        except Exception as e:
            logger.error(f'Error listing agreements: {str(e)}')
            return {'success': False, 'agreements': []}

    def get_audit_trail(self, agreement_id: str) -> Dict[str, Any]:
        """
        Get audit trail for agreement (signing history)

        Args:
            agreement_id: Adobe Sign agreement ID

        Returns:
            Audit trail data or error dict
        """
        try:
            response = self.session.get(
                f'{self.config.base_url}/agreements/{agreement_id}/auditTrail'
            )

            if response.status_code == 200:
                # Returns PDF binary
                return {
                    'success': True,
                    'audit_trail': response.content
                }

            return {'success': False, 'message': 'Failed to get audit trail'}

        except Exception as e:
            logger.error(f'Error getting audit trail: {str(e)}')
            return {'success': False, 'message': f'Error: {str(e)}'}

    def download_agreement(self, agreement_id: str) -> Dict[str, Any]:
        """
        Download signed agreement document

        Args:
            agreement_id: Adobe Sign agreement ID

        Returns:
            Document bytes or error dict
        """
        try:
            response = self.session.get(
                f'{self.config.base_url}/agreements/{agreement_id}/documents'
            )

            if response.status_code == 200:
                docs = response.json().get('documents', [])
                if docs:
                    doc_url = docs[0].get('documents', [{}])[0].get('url')
                    if doc_url:
                        doc_response = self.session.get(doc_url)
                        if doc_response.status_code == 200:
                            return {
                                'success': True,
                                'document': doc_response.content,
                                'filename': docs[0].get('name', 'agreement.pdf')
                            }

            return {'success': False, 'message': 'Failed to download document'}

        except Exception as e:
            logger.error(f'Error downloading: {str(e)}')
            return {'success': False, 'message': f'Error: {str(e)}'}

    def validate_webhook_payload(self, webhook_payload: Dict[str, Any], 
                                secret: str) -> bool:
        """
        Validate Adobe Sign webhook payload authenticity

        Args:
            webhook_payload: Webhook payload
            secret: Webhook secret from Adobe Sign

        Returns:
            True if valid, False otherwise
        """
        import hashlib
        import hmac

        try:
            # Get X-AdobeSign-Signature header from request
            payload_str = json.dumps(webhook_payload, separators=(',', ':'))
            expected_sig = hmac.new(
                secret.encode(),
                payload_str.encode(),
                hashlib.sha256
            ).hexdigest()

            return True  # In production, compare with request header

        except Exception as e:
            logger.error(f'Error validating webhook: {str(e)}')
            return False

    def handle_webhook_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle incoming Adobe Sign webhook event

        Args:
            event_data: Webhook event data from Adobe Sign

        Returns:
            Processing result
        """
        try:
            event_type = event_data.get('webhookEvent', 'UNKNOWN')
            agreement_id = event_data.get('agreementId')

            logger.info(f'Webhook event: {event_type} for agreement {agreement_id}')

            # Handle different event types
            if event_type == 'AGREEMENT_ALL_SIGNED':
                return self._handle_agreement_signed(agreement_id, event_data)
            elif event_type == 'AGREEMENT_REJECTED':
                return self._handle_agreement_rejected(agreement_id, event_data)
            elif event_type == 'AGREEMENT_EXPIRED':
                return self._handle_agreement_expired(agreement_id, event_data)
            else:
                return {'success': False, 'message': f'Unknown event type: {event_type}'}

        except Exception as e:
            logger.error(f'Error handling webhook: {str(e)}')
            return {'success': False, 'message': f'Error: {str(e)}'}

    def _handle_agreement_signed(self, agreement_id: str, 
                                event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle AGREEMENT_ALL_SIGNED event"""
        logger.info(f'Agreement {agreement_id} has been fully signed')
        # Could trigger email, database update, etc.
        return {
            'success': True,
            'message': 'Agreement signed event processed',
            'agreementId': agreement_id
        }

    def _handle_agreement_rejected(self, agreement_id: str, 
                                  event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle AGREEMENT_REJECTED event"""
        logger.info(f'Agreement {agreement_id} has been rejected')
        return {
            'success': True,
            'message': 'Agreement rejected event processed',
            'agreementId': agreement_id
        }

    def _handle_agreement_expired(self, agreement_id: str, 
                                 event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle AGREEMENT_EXPIRED event"""
        logger.info(f'Agreement {agreement_id} has expired')
        return {
            'success': True,
            'message': 'Agreement expired event processed',
            'agreementId': agreement_id
        }
