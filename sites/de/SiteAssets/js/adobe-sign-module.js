/**
 * Adobe Sign Integration Module for SharePoint
 * Provides utilities for sending documents to Adobe Sign from SharePoint
 * 
 * Usage:
 *   AdobeSignModule.init({apiUrl: 'http://localhost:5000/api'});
 *   AdobeSignModule.sendForSignature({...});
 */

const AdobeSignModule = (() => {
  'use strict';

  // Configuration
  let config = {
    apiUrl: 'http://localhost:5000/api',
    autoSave: true,
    storagePrefix: 'adobeSign_'
  };

  // State
  const state = {
    agreementsCache: [],
    currentAgreement: null,
    isLoading: false,
    lastUpdate: null
  };

  /**
   * Initialize Adobe Sign Module
   * @param {Object} options - Configuration options
   */
  function init(options = {}) {
    config = { ...config, ...options };
    console.log('[AdobeSign] Module initialized', config);
    loadCachedAgreements();
  }

  /**
   * Send document for signature
   * @param {Object} params - Document and signer parameters
   * @returns {Promise} Agreement ID and details
   */
  async function sendForSignature(params) {
    validateParams(params);

    const payload = {
      title: params.title,
      content: params.content || '',
      signers: formatSigners(params.signers),
      message: params.message || '',
      daystoExpire: params.daysToExpire || 7,
      requireAuth: params.requireAuth || false,
      signMethod: params.signMethod || 'SIGN'
    };

    try {
      _setLoading(true);

      const response = await fetch(`${config.apiUrl}/adobe-sign/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        // Cache agreement
        const cachedAgreement = {
          agreementId: result.agreementId,
          title: params.title,
          signers: params.signers,
          status: 'SENT',
          createdDate: new Date().toISOString(),
          signingUrl: result.signingUrl
        };

        cacheAgreement(cachedAgreement);
        state.currentAgreement = cachedAgreement;

        console.log('[AdobeSign] Agreement sent:', result.agreementId);
        return result;
      } else {
        throw new Error(result.message || 'Failed to send agreement');
      }
    } catch (error) {
      console.error('[AdobeSign] Error sending agreement:', error);
      throw error;
    } finally {
      _setLoading(false);
    }
  }

  /**
   * Get agreement status and signing progress
   * @param {string} agreementId - Adobe Sign agreement ID
   * @returns {Promise} Agreement status details
   */
  async function getAgreementStatus(agreementId) {
    try {
      _setLoading(true);

      const response = await fetch(
        `${config.apiUrl}/adobe-sign/agreement/${agreementId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          }
        }
      );

      const result = await response.json();

      if (result.success) {
        state.currentAgreement = result;
        return result;
      } else {
        throw new Error(result.message || 'Failed to get status');
      }
    } catch (error) {
      console.error('[AdobeSign] Error getting status:', error);
      throw error;
    } finally {
      _setLoading(false);
    }
  }

  /**
   * Download signed agreement
   * @param {string} agreementId - Adobe Sign agreement ID
   * @returns {Promise} Downloads file
   */
  async function downloadAgreement(agreementId) {
    try {
      _setLoading(true);

      const response = await fetch(
        `${config.apiUrl}/adobe-sign/agreement/${agreementId}/download`,
        {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          }
        }
      );

      if (response.ok) {
        // Get filename from header if available
        const contentDisposition = response.headers.get('content-disposition');
        let filename = 'agreement.pdf';
        if (contentDisposition) {
          const matches = contentDisposition.match(/filename="?([^"]*)"?/);
          if (matches) filename = matches[1];
        }

        // Download the file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        console.log('[AdobeSign] Agreement downloaded:', filename);
        return { success: true, filename };
      } else {
        throw new Error('Failed to download agreement');
      }
    } catch (error) {
      console.error('[AdobeSign] Error downloading:', error);
      throw error;
    } finally {
      _setLoading(false);
    }
  }

  /**
   * Get audit trail (signing history)
   * @param {string} agreementId - Adobe Sign agreement ID
   * @returns {Promise} Downloads audit trail PDF
   */
  async function downloadAuditTrail(agreementId) {
    try {
      _setLoading(true);

      const response = await fetch(
        `${config.apiUrl}/adobe-sign/agreement/${agreementId}/audit-trail`,
        {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          }
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-trail-${agreementId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        return { success: true };
      } else {
        throw new Error('Failed to download audit trail');
      }
    } catch (error) {
      console.error('[AdobeSign] Error downloading audit trail:', error);
      throw error;
    } finally {
      _setLoading(false);
    }
  }

  /**
   * List all user agreements
   * @param {Object} filters - Optional filters
   * @returns {Promise} List of agreements
   */
  async function listAgreements(filters = {}) {
    try {
      _setLoading(true);

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await fetch(
        `${config.apiUrl}/adobe-sign/agreements?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`
          }
        }
      );

      const result = await response.json();

      if (result.success) {
        state.agreementsCache = result.agreements;
        state.lastUpdate = new Date();
        if (config.autoSave) saveCache();
        return result.agreements;
      } else {
        return [];
      }
    } catch (error) {
      console.error('[AdobeSign] Error listing agreements:', error);
      return [];
    } finally {
      _setLoading(false);
    }
  }

  /**
   * Cancel an agreement
   * @param {string} agreementId - Agreement to cancel
   * @param {string} reason - Cancellation reason
   * @returns {Promise} Cancellation result
   */
  async function cancelAgreement(agreementId, reason = '') {
    try {
      _setLoading(true);

      const response = await fetch(
        `${config.apiUrl}/adobe-sign/agreement/${agreementId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
          },
          body: JSON.stringify({ reason })
        }
      );

      const result = await response.json();

      if (result.success) {
        console.log('[AdobeSign] Agreement cancelled:', agreementId);
        return result;
      } else {
        throw new Error(result.message || 'Failed to cancel');
      }
    } catch (error) {
      console.error('[AdobeSign] Error cancelling agreement:', error);
      throw error;
    } finally {
      _setLoading(false);
    }
  }

  /**
   * Save signed document to SharePoint
   * @param {string} agreementId - Adobe Sign agreement ID
   * @param {string} listName - SharePoint list name
   * @param {Object} metadata - Additional metadata to save
   * @returns {Promise} SharePoint item creation result
   */
  async function saveToSharePoint(agreementId, listName, metadata = {}) {
    try {
      // Get the signed document
      const status = await getAgreementStatus(agreementId);

      // Prepare item for SharePoint
      const item = {
        Title: status.name,
        AgreementId: agreementId,
        Status: status.status,
        SigningProgress: JSON.stringify(status.signingProgress),
        MetadataJSON: JSON.stringify(metadata),
        CreatedDate: status.createdDate,
        SignedDate: status.lastEventDate,
        ...metadata
      };

      // Call SharePoint REST API to create item
      // This assumes proper authentication is set up
      const response = await fetch(
        `/sites/de/_api/web/lists/getByTitle('${listName}')/items`,
        {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-RequestDigest': getFormDigest()
          },
          body: JSON.stringify(item)
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('[AdobeSign] Saved to SharePoint:', result.ID);
        return { success: true, itemId: result.ID };
      } else {
        throw new Error('Failed to save to SharePoint');
      }
    } catch (error) {
      console.error('[AdobeSign] Error saving to SharePoint:', error);
      throw error;
    }
  }

  /**
   * Create a widget for displaying agreement status
   * @param {string} containerId - DOM element ID
   * @param {string} agreementId - Agreement ID to display
   * @returns {Element} Widget DOM element
   */
  function createStatusWidget(containerId, agreementId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('[AdobeSign] Container not found:', containerId);
      return null;
    }

    // Create widget structure
    const widget = document.createElement('div');
    widget.className = 'adobe-sign-widget';
    widget.style.cssText = `
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      margin: 10px 0;
    `;

    const loadingHtml = `
      <div style="text-align: center; padding: 20px;">
        <div style="display: inline-block; width: 30px; height: 30px; border: 3px solid #f3f3f3;
                    border-top: 3px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <p style="margin-top: 10px; color: #666;">Loading agreement status...</p>
      </div>
    `;

    widget.innerHTML = loadingHtml;
    container.appendChild(widget);

    // Fetch agreement status
    getAgreementStatus(agreementId).then(status => {
      const statusColor = status.status === 'SIGNED' ? '#28a745' : '#ffc107';
      const statusText = status.status === 'SIGNED' ? '✓ All Signed' : '⏳ Waiting for Signatures';

      let signingProgressHtml = status.signingProgress
        .map(progress => `
          <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
            <p style="margin: 0; font-weight: 600;">${progress.name}</p>
            <p style="margin: 5px 0; color: #666; font-size: 0.9em;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; 
                           background: ${progress.status === 'SIGNED' ? '#28a745' : '#999'};"></span>
              ${progress.status === 'SIGNED' ? '✓ Signed' : '⏳ Waiting'}
              ${progress.signedDate ? ` (${new Date(progress.signedDate).toLocaleDateString()})` : ''}
            </p>
          </div>
        `)
        .join('');

      widget.innerHTML = `
        <div>
          <h3 style="margin: 0 0 15px 0; color: #333;">${status.name}</h3>
          <p style="margin: 0 0 15px 0;">
            <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; 
                         background: ${statusColor}; vertical-align: middle; margin-right: 8px;"></span>
            <strong>${statusText}</strong>
          </p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
            ${signingProgressHtml}
          </div>
          <div style="display: flex; gap: 10px;">
            <button onclick="AdobeSignModule.downloadAgreement('${agreementId}')" 
                    style="padding: 8px 15px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">
              📥 Download
            </button>
            <button onclick="AdobeSignModule.downloadAuditTrail('${agreementId}')" 
                    style="padding: 8px 15px; background: #f0f0f0; color: #333; border: none; border-radius: 4px; cursor: pointer;">
              📋 Audit Trail
            </button>
          </div>
        </div>
      `;
    }).catch(error => {
      widget.innerHTML = `
        <div style="color: #d32f2f; padding: 15px;">
          <p><strong>Error loading status</strong></p>
          <p style="font-size: 0.9em; margin: 10px 0 0 0;">${error.message}</p>
        </div>
      `;
    });

    return widget;
  }

  /**
   * Embed signing UI in page (placeholder - Adobe Sign SDK would be used here)
   * @param {string} containerId - DOM element ID
   * @param {string} agreementId - Agreement ID
   */
  function embedSigningUI(containerId, agreementId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('[AdobeSign] Container not found:', containerId);
      return;
    }

    container.innerHTML = `
      <div style="padding: 20px; background: #f5f5f5; border-radius: 8px;">
        <p style="color: #666; margin-bottom: 15px;">
          Adobe Sign embedded signing interface will load here.
        </p>
        <p>
          <a href="#" onclick="window.open('${state.currentAgreement?.signingUrl || '#'}', 'signing', 'width=800,height=600'); return false;"
             style="color: #667eea; text-decoration: none; font-weight: 600;">
            Open Signing Interface →
          </a>
        </p>
      </div>
    `;
  }

  // ==================== PRIVATE FUNCTIONS ====================

  function validateParams(params) {
    if (!params.title) throw new Error('Agreement title is required');
    if (!params.signers || params.signers.length === 0) {
      throw new Error('At least one signer is required');
    }
  }

  function formatSigners(signers) {
    return signers.map(s => ({
      name: s.name || s.email || '',
      email: s.email,
      role: s.role || 'Signer'
    }));
  }

  function cacheAgreement(agreement) {
    if (!config.autoSave) return;

    const existing = state.agreementsCache.findIndex(a => a.agreementId === agreement.agreementId);
    if (existing >= 0) {
      state.agreementsCache[existing] = agreement;
    } else {
      state.agreementsCache.unshift(agreement);
    }

    // Keep only last 50
    state.agreementsCache = state.agreementsCache.slice(0, 50);
    saveCache();
  }

  function loadCachedAgreements() {
    try {
      const cached = localStorage.getItem(`${config.storagePrefix}agreements`);
      if (cached) {
        state.agreementsCache = JSON.parse(cached);
      }
    } catch (e) {
      console.warn('[AdobeSign] Error loading cache:', e);
    }
  }

  function saveCache() {
    try {
      localStorage.setItem(
        `${config.storagePrefix}agreements`,
        JSON.stringify(state.agreementsCache)
      );
    } catch (e) {
      console.warn('[AdobeSign] Error saving cache:', e);
    }
  }

  function _setLoading(isLoading) {
    state.isLoading = isLoading;
    const event = new CustomEvent('adobeSign:loadingChanged', { detail: { isLoading } });
    document.dispatchEvent(event);
  }

  function getAuthToken() {
    // Get from session storage or cookie
    return sessionStorage.getItem('adobeSignToken') || '';
  }

  function getFormDigest() {
    // Get SharePoint form digest token for requests
    const elem = document.getElementById('__REQUESTDIGEST');
    return elem ? elem.value : '';
  }

  // ==================== PUBLIC API ====================

  return {
    init,
    sendForSignature,
    getAgreementStatus,
    downloadAgreement,
    downloadAuditTrail,
    listAgreements,
    cancelAgreement,
    saveToSharePoint,
    createStatusWidget,
    embedSigningUI,
    // Utilities
    getState: () => ({ ...state }),
    getConfig: () => ({ ...config }),
    clearCache: () => {
      state.agreementsCache = [];
      localStorage.removeItem(`${config.storagePrefix}agreements`);
    }
  };
})();

// Add CSS animation for loading spinner
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

console.log('[AdobeSign] Module loaded. Call AdobeSignModule.init() to initialize.');
