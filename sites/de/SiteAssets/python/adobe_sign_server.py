"""
Adobe Sign Integration Server
Flask REST API for handling document signing requests and Adobe Sign webhooks
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import logging
from typing import Dict, Any
from datetime import datetime
import json
import io

# Import Adobe Sign API
from adobe_sign_api import AdobeSignAPI, AdobeSignConfig, AgreementStatus

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'adobe_sign_uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize Adobe Sign API
adobe_config = AdobeSignConfig.from_env()
adobe_api = None

if adobe_config.access_token:
    adobe_api = AdobeSignAPI(adobe_config)
else:
    logger.warning('Adobe Sign API not configured - set ADOBE_SIGN_ACCESS_TOKEN environment variable')


# ============================================================================
# HEALTH & STATUS ENDPOINTS
# ============================================================================

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'adobe_sign_configured': adobe_api is not None
    }), 200


# ============================================================================
# ADOBE SIGN AGREEMENT ENDPOINTS
# ============================================================================

@app.route('/api/adobe-sign/send', methods=['POST'])
def send_agreement():
    """
    Send a document for signature via Adobe Sign

    Request JSON:
    {
        "title": "Agreement Title",
        "content": "Document content",
        "signers": [
            {"name": "John Doe", "email": "john@example.com", "role": "Signer"}
        ],
        "message": "Please sign this agreement",
        "daystoExpire": 7
    }

    Returns:
        {
            "success": true,
            "agreementId": "xxx",
            "signingUrl": "https://...",
            "message": "Agreement sent"
        }
    """
    if not adobe_api:
        return jsonify({
            'success': False,
            'message': 'Adobe Sign API not configured'
        }), 503

    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['title', 'signers']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400

        # Generate PDF from content
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from io import BytesIO

        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        content = []

        # Add title
        content.append(Paragraph(f"<b>{data['title']}</b>", styles['Heading1']))
        content.append(Spacer(1, 12))

        # Add content
        agreement_text = data.get('content', '').replace('\n', '<br/>')
        content.append(Paragraph(agreement_text, styles['BodyText']))

        doc.build(content)
        pdf_buffer.seek(0)

        # Prepare signers
        signers = []
        for signer in data['signers']:
            signers.append({
                'email': signer.get('email'),
                'name': signer.get('name', ''),
                'role': signer.get('role', 'SIGNER')
            })

        # Send via Adobe Sign
        result = adobe_api.send_agreement(
            document_bytes=pdf_buffer.getvalue(),
            recipients_list=signers,
            agreement_title=data['title'],
            message=data.get('message', ''),
            days_to_expire=int(data.get('daystoExpire', 7)),
            require_auth=data.get('requireAuth', False),
            signing_order=None
        )

        if result['success']:
            # Get signing URL
            signing_url = adobe_api.get_signing_url(result['agreementId'])

            return jsonify({
                'success': True,
                'agreementId': result['agreementId'],
                'signingUrl': signing_url,
                'status': result.get('status'),
                'message': result.get('message')
            }), 201

        return jsonify(result), 400

    except Exception as e:
        logger.error(f'Error sending agreement: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


@app.route('/api/adobe-sign/agreement/<agreement_id>', methods=['GET'])
def get_agreement(agreement_id):
    """Get agreement details and signing status"""
    if not adobe_api:
        return jsonify({
            'success': False,
            'message': 'Adobe Sign API not configured'
        }), 503

    try:
        result = adobe_api.get_agreement(agreement_id)
        return jsonify(result), 200 if result['success'] else 404

    except Exception as e:
        logger.error(f'Error getting agreement: {str(e)}')
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


@app.route('/api/adobe-sign/agreement/<agreement_id>/status', methods=['GET'])
def get_agreement_status(agreement_id):
    """Get agreement signing status"""
    if not adobe_api:
        return jsonify({
            'success': False,
            'message': 'Adobe Sign API not configured'
        }), 503

    try:
        result = adobe_api.get_agreement(agreement_id)

        if result['success']:
            agreement = result['agreement']
            return jsonify({
                'success': True,
                'agreementId': agreement_id,
                'status': agreement.get('status'),
                'name': agreement.get('name'),
                'createdDate': agreement.get('createdDate'),
                'lastEventDate': agreement.get('lastEventDate'),
                'expirationDate': agreement.get('expirationDate'),
                'participantSets': agreement.get('participantSets', []),
                'signingProgress': _extract_signing_progress(agreement)
            }), 200

        return jsonify(result), 404

    except Exception as e:
        logger.error(f'Error getting status: {str(e)}')
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


@app.route('/api/adobe-sign/agreement/<agreement_id>/documents', methods=['GET'])
def get_agreement_documents(agreement_id):
    """Get documents list for an agreement"""
    if not adobe_api:
        return jsonify({
            'success': False,
            'message': 'Adobe Sign API not configured'
        }), 503

    try:
        result = adobe_api.get_agreement_documents(agreement_id)
        return jsonify(result), 200 if result['success'] else 404

    except Exception as e:
        logger.error(f'Error getting documents: {str(e)}')
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


@app.route('/api/adobe-sign/agreement/<agreement_id>/download', methods=['GET'])
def download_agreement(agreement_id):
    """Download signed agreement document"""
    if not adobe_api:
        return jsonify({
            'success': False,
            'message': 'Adobe Sign API not configured'
        }), 503

    try:
        result = adobe_api.download_agreement(agreement_id)

        if result['success']:
            return send_file(
                io.BytesIO(result['document']),
                mimetype='application/pdf',
                as_attachment=True,
                download_name=result.get('filename', f'{agreement_id}.pdf')
            ), 200

        return jsonify(result), 404

    except Exception as e:
        logger.error(f'Error downloading: {str(e)}')
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


@app.route('/api/adobe-sign/agreement/<agreement_id>/audit-trail', methods=['GET'])
def get_audit_trail(agreement_id):
    """Get audit trail (signing history) for an agreement"""
    if not adobe_api:
        return jsonify({
            'success': False,
            'message': 'Adobe Sign API not configured'
        }), 503

    try:
        result = adobe_api.get_audit_trail(agreement_id)

        if result['success']:
            return send_file(
                io.BytesIO(result['audit_trail']),
                mimetype='application/pdf',
                as_attachment=True,
                download_name=f'audit-trail-{agreement_id}.pdf'
            ), 200

        return jsonify(result), 404

    except Exception as e:
        logger.error(f'Error getting audit trail: {str(e)}')
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


@app.route('/api/adobe-sign/agreement/<agreement_id>/cancel', methods=['POST'])
def cancel_agreement(agreement_id):
    """Cancel an agreement"""
    if not adobe_api:
        return jsonify({
            'success': False,
            'message': 'Adobe Sign API not configured'
        }), 503

    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'No reason provided')

        result = adobe_api.cancel_agreement(agreement_id, reason)
        return jsonify(result), 200 if result['success'] else 400

    except Exception as e:
        logger.error(f'Error cancelling agreement: {str(e)}')
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


@app.route('/api/adobe-sign/agreements', methods=['GET'])
def list_agreements():
    """List user's agreements with optional filtering"""
    if not adobe_api:
        return jsonify({
            'success': False,
            'agreements': []
        }), 503

    try:
        status_filter = request.args.get('status')
        limit = int(request.args.get('limit', 50))

        result = adobe_api.list_agreements(status_filter, limit)
        return jsonify(result), 200

    except Exception as e:
        logger.error(f'Error listing agreements: {str(e)}')
        return jsonify({
            'success': False,
            'agreements': []
        }), 500


# ============================================================================
# WEBHOOK ENDPOINTS
# ============================================================================

@app.route('/api/adobe-sign/webhooks', methods=['POST'])
def handle_webhook():
    """
    Handle incoming Adobe Sign webhooks

    Adobe Sign sends state changes here (signed, expired, rejected, etc.)
    """
    if not adobe_api:
        return jsonify({'status': 'error', 'message': 'Not configured'}), 503

    try:
        data = request.get_json()

        # Log webhook event
        logger.info(f'Received webhook: {data.get("webhookEvent")} for agreement {data.get("agreementId")}')

        # Validate webhook (in production, check signature)
        # webhook_secret = os.getenv('ADOBE_SIGN_WEBHOOK_SECRET', '')
        # if not adobe_api.validate_webhook_payload(data, webhook_secret):
        #     return jsonify({'status': 'error', 'message': 'Invalid signature'}), 401

        # Process the webhook event
        result = adobe_api.handle_webhook_event(data)

        # Store in database or file for auditing
        _log_webhook_event(data)

        # Return success to Adobe Sign
        return jsonify({
            'status': 'success',
            'message': result.get('message')
        }), 200

    except Exception as e:
        logger.error(f'Error handling webhook: {str(e)}', exc_info=True)
        return jsonify({
            'status': 'error',
            'message': f'Error: {str(e)}'
        }), 500


def _log_webhook_event(event_data: Dict[str, Any]) -> None:
    """Log webhook events for auditing"""
    try:
        log_file = os.path.join(UPLOAD_FOLDER, 'webhook_events.jsonl')
        with open(log_file, 'a') as f:
            log_entry = {
                'timestamp': datetime.now().isoformat(),
                'event': event_data
            }
            f.write(json.dumps(log_entry) + '\n')
    except Exception as e:
        logger.error(f'Error logging webhook: {str(e)}')


# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.route('/api/oauth/callback', methods=['GET'])
def oauth_callback():
    """OAuth callback for Adobe Sign authentication"""
    try:
        code = request.args.get('code')
        state = request.args.get('state')

        if not code:
            return 'Authorization failed: No code received', 400

        # Exchange code for access token (in production, do this securely)
        logger.info(f'OAuth callback received with code and state: {state}')

        return jsonify({
            'success': True,
            'message': 'Authorization successful',
            'code': code
        }), 200

    except Exception as e:
        logger.error(f'Error in OAuth callback: {str(e)}')
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


# ============================================================================
# UTILITY & ADMIN ENDPOINTS
# ============================================================================

@app.route('/api/config', methods=['GET'])
def get_config():
    """Get current API configuration (non-sensitive)"""
    return jsonify({
        'base_url': adobe_config.base_url if adobe_config else 'Not configured',
        'client_id': adobe_config.client_id[:10] + '...' if adobe_config and adobe_config.client_id else 'Not set',
        'configured': adobe_api is not None,
        'api_version': 'v6'
    }), 200


@app.route('/api/test', methods=['POST'])
def test_api():
    """Test Adobe Sign API connection"""
    if not adobe_api:
        return jsonify({
            'success': False,
            'message': 'Adobe Sign API not configured'
        }), 503

    try:
        # Try to list agreements (simple API call to test connectivity)
        result = adobe_api.list_agreements(limit=1)

        return jsonify({
            'success': True,
            'message': 'Adobe Sign API is working correctly',
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'API test failed: {str(e)}'
        }), 500


@app.route('/api/webhook-logs', methods=['GET'])
def get_webhook_logs():
    """Retrieve webhook event logs"""
    try:
        log_file = os.path.join(UPLOAD_FOLDER, 'webhook_events.jsonl')

        if not os.path.exists(log_file):
            return jsonify({
                'success': True,
                'events': []
            }), 200

        events = []
        with open(log_file, 'r') as f:
            for line in f:
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

        # Return last 50 events
        return jsonify({
            'success': True,
            'events': events[-50:]
        }), 200

    except Exception as e:
        logger.error(f'Error reading logs: {str(e)}')
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file too large error"""
    return jsonify({
        'success': False,
        'message': 'File too large (max 50MB)'
    }), 413


@app.errorhandler(404)
def not_found(error):
    """Handle 404 Not Found"""
    return jsonify({
        'success': False,
        'message': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 Internal Server Error"""
    logger.error(f'Internal error: {str(error)}', exc_info=True)
    return jsonify({
        'success': False,
        'message': 'Internal server error'
    }), 500


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _extract_signing_progress(agreement: Dict[str, Any]) -> list:
    """Extract signing progress from agreement"""
    progress = []
    try:
        for participant_set in agreement.get('participantSets', []):
            for participant in participant_set.get('participants', []):
                progress.append({
                    'name': participant.get('name', participant.get('email', 'Unknown')),
                    'email': participant.get('email'),
                    'status': participant.get('status', 'WAITING'),
                    'signedDate': participant.get('signedDate')
                })
    except Exception as e:
        logger.error(f'Error extracting progress: {str(e)}')
    return progress


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'

    logger.info(f'Starting Adobe Sign Integration Server on port {port}')
    logger.info(f'Adobe Sign configured: {adobe_api is not None}')

    app.run(host='0.0.0.0', port=port, debug=debug)
