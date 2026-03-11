(function () {
  'use strict';

  /**
   * Configuration constants
   */
  const CONFIG = Object.freeze({
    selectors: {
      transformer: 'transformer',
      voltage: 'voltage',
      kva: 'kva',
      reset: 'reset',
      result: 'result',
      gridBody: '#grid tbody',
    },
    transformerTypes: {
      OH: 'OH',
      PMT: 'PMT',
      LPT: 'LPT',
      SDT: 'SDT',
    },
    voltageLabels: {
      OH: 'L-N',
      PMT: 'L-L',
      SDT: 'L-L',
      LPT: 'L-N',
    },
    placeholders: {
      default: '—',
      transformer: 'Select Transformer Type',
      voltage: 'Select Voltage',
      kva: 'Select kVA',
    },
    classes: {
      hidden: 'hidden',
      highlight: 'highlight',
      tableWrap: 'table-wrap',
      impedanceTable: 'impedance-table',
    },
    tableColumns: {
      ohHeaders: [
        { class: 'col-1', label: 'CAD ID' },
        { class: 'col-1', label: 'kVA' },
        { class: 'col-1', label: 'Primary (kV)' },
        { class: 'col-1', label: 'Secondary (V)' },
        { class: 'col-1', label: 'Min Z (%)' },
        { class: 'col-1', label: 'Max Z (%)' },
        { class: 'col-3', label: 'Bushing' },
        { class: 'col-1', label: 'Config' },
      ],
      ugHeaders: [
        { class: 'col-1-5', label: 'CAD ID' },
        { class: 'col-1', label: 'Type' },
        { class: 'col-1', label: 'kVA' },
        { class: 'col-2', label: 'Primary (kV)' },
        { class: 'col-2', label: 'Secondary (V)' },
        { class: 'col-1', label: 'Min Z (%)' },
        { class: 'col-1-5', label: 'Feed Type' },
      ],
    },
  });

  /**
   * Data processor - handles data transformation and filtering
   */
  const DataProcessor = {
    /**
     * Process fuse data from window object
     */
    processFuseData () {
      return (window.FUSE_DATA || [])
        .map(r => ({
          transformer: this.sanitize(r.transformer),
          voltage: this.sanitize(r.voltage),
          kva: Number(r.kva) || 0,
          bonFuse: this.sanitize(r.bonFuse),
          sourceFuse: this.sanitize(r.sourceFuse),
        }))
        .sort((a, b) => a.kva - b.kva);
    },

    /**
     * Process overhead transformer impedance data
     */
    processOHData () {
      return (window.OH_TX_DATA || []).map(r => ({
        transformer: 'OH',
        cadId: this.sanitize(r['CAD ID']),
        kva: Number(r.kVA) || 0,
        voltage: this.sanitize(r['Primary (kV)']),
        secondary: this.sanitize(r['Secondary (V)']),
        minImpedance: r['Minimum impedance (%)'] || 0,
        maxImpedance: r['Maximum impedance (%)'] || 0,
        bushing: this.sanitize(r.Bushing),
        configuration: this.sanitize(r.Configuration),
      }));
    },

    /**
     * Process underground transformer impedance data
     */
    processUGData () {
      return (window.UG_TX_DATA || []).map(r => ({
        transformer: this.sanitize(r['Transformer Type']),
        cadId: this.sanitize(r['CAD ID']),
        kva: Number(r.kVA) || 0,
        voltage: this.sanitize(r['Primary (kV)']),
        secondary: this.sanitize(r['Secondary (V)']),
        minImpedance: r['Minimum Impedance (%)'] || '—',
        feed: this.sanitize(r.Feed),
      }));
    },

    /**
     * Process fuse CAD ID mapping data
     */
    processFuseCADData () {
      return (window.FUSE_CADID_DATA || []).map(r => ({
        fuse: this.sanitize(r.Fuse),
        cadId: this.sanitize(r['CAD ID']),
      }));
    },

    /**
     * Sanitize string values
     */
    sanitize (value) {
      return (value || '').trim() || CONFIG.placeholders.default;
    },

    /**
     * Get unique sorted values from array
     */
    getUnique (list) {
      return [...new Set(list.filter(Boolean))].sort((a, b) => {
        return String(a).localeCompare(String(b), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      });
    },

    /**
     * Filter data based on selections
     */
    filterData (data, transformer, voltage, kva) {
      return data.filter(row => {
        const transformerMatch = !transformer || row.transformer === transformer;
        const voltageMatch = !voltage || row.voltage === voltage;
        const kvaMatch = !Number.isFinite(kva) || row.kva === kva;
        return transformerMatch && voltageMatch && kvaMatch;
      });
    },
  };

  /**
   * Impedance data handler
   */
  const ImpedanceHandler = {
    /**
     * Search impedance data based on selections
     */
    search (transformerType, voltage, kva, ohData, ugData) {
      if (transformerType === CONFIG.transformerTypes.OH) {
        return this.searchOH(voltage, kva, ohData);
      } else if (this.isUnderground(transformerType)) {
        return this.searchUG(transformerType, voltage, kva, ugData);
      }
      return [];
    },

    /**
     * Search overhead transformer data
     */
    searchOH (voltage, kva, ohData) {
      return ohData.filter(row => row.kva === kva && this.checkVoltageMatch(row.voltage, voltage));
    },

    /**
     * Search underground transformer data
     */
    searchUG (transformerType, voltage, kva, ugData) {
      return ugData.filter(
        row => row.transformer === transformerType && row.kva === kva && this.checkVoltageMatch(row.voltage, voltage)
      );
    },

    /**
     * Check if transformer type is underground
     */
    isUnderground (type) {
      return [CONFIG.transformerTypes.PMT, CONFIG.transformerTypes.LPT, CONFIG.transformerTypes.SDT].includes(type);
    },

    /**
     * Check if voltage values match
     */
    checkVoltageMatch (rowVoltage, selectedVoltage) {
      return rowVoltage === selectedVoltage || rowVoltage.includes(selectedVoltage);
    },

    /**
     * Render impedance table HTML
     */
    renderTable (rows) {
      if (!rows?.length) return '';

      const isOH = rows[0].transformer === CONFIG.transformerTypes.OH;
      const html = ['<h3>Transformer Details</h3>'];
      html.push(`<div class="${CONFIG.classes.tableWrap}">`);
      html.push(`<table class="${CONFIG.classes.impedanceTable}">`);

      if (isOH) {
        html.push(this.renderOHTable(rows));
      } else {
        html.push(this.renderUGTable(rows));
      }

      html.push('</table></div>');
      return html.join('');
    },

    /**
     * Render overhead transformer table
     */
    renderOHTable (rows) {
      const html = [];
      html.push('<thead><tr>');

      CONFIG.tableColumns.ohHeaders.forEach(h => {
        html.push(`<th class="${h.class}">${h.label}</th>`);
      });

      html.push('</tr></thead><tbody>');

      rows.forEach(r => {
        html.push(
          '<tr>',
          `<td>${this.escapeHtml(r.cadId)}</td>`,
          `<td>${r.kva}</td>`,
          `<td>${this.escapeHtml(r.voltage)}</td>`,
          `<td>${this.escapeHtml(r.secondary)}</td>`,
          `<td>${r.minImpedance}</td>`,
          `<td>${r.maxImpedance}</td>`,
          `<td>${this.escapeHtml(r.bushing)}</td>`,
          `<td>${this.escapeHtml(r.configuration)}</td>`,
          '</tr>'
        );
      });

      html.push('</tbody>');
      return html.join('');
    },

    /**
     * Render underground transformer table
     */
    renderUGTable (rows) {
      const html = [];
      html.push('<thead><tr>');

      CONFIG.tableColumns.ugHeaders.forEach(h => {
        html.push(`<th class="${h.class}">${h.label}</th>`);
      });

      html.push('</tr></thead><tbody>');

      rows.forEach(r => {
        html.push(
          '<tr>',
          `<td>${this.escapeHtml(r.cadId)}</td>`,
          `<td>${this.escapeHtml(r.transformer)}</td>`,
          `<td>${r.kva}</td>`,
          `<td>${this.escapeHtml(r.voltage)}</td>`,
          `<td>${this.escapeHtml(r.secondary)}</td>`,
          `<td>${r.minImpedance}</td>`,
          `<td>${this.escapeHtml(r.feed)}</td>`,
          '</tr>'
        );
      });

      html.push('</tbody>');
      return html.join('');
    },

    /**
     * Escape HTML special characters for security
     */
    escapeHtml (text) {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };
      return String(text || '').replace(/[&<>"']/g, m => map[m]);
    },
  };

  /**
   * DOM utilities for element manipulation
   */
  const DOM = {
    /**
     * Get all required elements
     */
    getElements () {
      const elements = {
        transformer: document.getElementById(CONFIG.selectors.transformer),
        voltage: document.getElementById(CONFIG.selectors.voltage),
        kva: document.getElementById(CONFIG.selectors.kva),
        reset: document.getElementById(CONFIG.selectors.reset),
        result: document.getElementById(CONFIG.selectors.result),
        gridBody: document.querySelector(CONFIG.selectors.gridBody),
      };

      // Validate all required elements exist
      const missing = Object.entries(elements)
        .filter(([_, el]) => !el)
        .map(([key, _]) => key);

      if (missing.length > 0) {
        console.error('Missing DOM elements:', missing.join(', '));
        return null;
      }

      return elements;
    },

    /**
     * Set element disabled state
     */
    setDisabled (element, disabled) {
      if (element) {
        element.disabled = disabled;
      }
    },

    /**
     * Reset select element
     */
    resetSelect (element, placeholder = CONFIG.placeholders.default) {
      if (element) {
        element.innerHTML = `<option value="">${placeholder}</option>`;
      }
    },

    /**
     * Reset select and disable element
     */
    resetAndDisable (element, placeholder = CONFIG.placeholders.default) {
      this.resetSelect(element, placeholder);
      this.setDisabled(element, true);
    },

    /**
     * Populate select with options
     */
    populateSelect (element, values, formatter = null) {
      if (!element) return;

      const fragment = document.createDocumentFragment();
      values.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = formatter ? formatter(value) : value;
        fragment.appendChild(option);
      });
      element.appendChild(fragment);
    },

    /**
     * Show element
     */
    show (element) {
      if (element) {
        element.classList.remove(CONFIG.classes.hidden);
      }
    },

    /**
     * Hide element
     */
    hide (element) {
      if (element) {
        element.classList.add(CONFIG.classes.hidden);
      }
    },

    /**
     * Clear element content
     */
    clear (element) {
      if (element) {
        element.innerHTML = '';
      }
    },
  };

  /**
   * UI Controller - manages user interface interactions
   */
  class UIController {
    constructor (elements, fuseData, ohData, ugData, fuseCadData) {
      this.els = elements;
      this.fuseData = fuseData;
      this.ohData = ohData;
      this.ugData = ugData;
      this.fuseCadData = fuseCadData;
      this.init();
    }

    /**
     * Initialize UI
     */
    init () {
      this.populateTransformers();
      this.attachEventListeners();
    }

    /**
     * Populate transformer select
     */
    populateTransformers () {
      DOM.resetSelect(this.els.transformer, CONFIG.placeholders.transformer);
      const types = DataProcessor.getUnique(this.fuseData.map(r => r.transformer));
      DOM.populateSelect(this.els.transformer, types);
      DOM.resetAndDisable(this.els.voltage, CONFIG.placeholders.voltage);
      DOM.resetAndDisable(this.els.kva, CONFIG.placeholders.kva);
      this.hideResult();
    }

    /**
     * Populate voltage select based on transformer selection
     */
    populateVoltages () {
      DOM.resetSelect(this.els.voltage, CONFIG.placeholders.voltage);
      const transformer = this.els.transformer.value;

      if (!transformer) {
        DOM.resetAndDisable(this.els.kva, CONFIG.placeholders.kva);
        DOM.setDisabled(this.els.voltage, true);
        return;
      }

      const subset = this.fuseData.filter(r => r.transformer === transformer);
      const voltages = DataProcessor.getUnique(subset.map(r => r.voltage));

      const voltageLabel = CONFIG.voltageLabels[transformer] || 'kV';
      DOM.populateSelect(this.els.voltage, voltages, v => `${v} kV ${voltageLabel}`);

      DOM.setDisabled(this.els.voltage, false);
      DOM.resetAndDisable(this.els.kva, CONFIG.placeholders.kva);
      this.hideResult();
    }

    /**
     * Populate kVA select based on voltage selection
     */
    populateKVA () {
      DOM.resetSelect(this.els.kva, CONFIG.placeholders.kva);
      const voltage = this.els.voltage.value;

      if (!voltage) {
        DOM.setDisabled(this.els.kva, true);
        return;
      }

      const transformer = this.els.transformer.value;
      const subset = this.fuseData.filter(r => r.voltage === voltage && r.transformer === transformer);

      const kvas = DataProcessor.getUnique(subset.map(r => r.kva));
      DOM.populateSelect(this.els.kva, kvas, k => `${k} kVA`);
      DOM.setDisabled(this.els.kva, false);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners () {
      this.els.transformer.addEventListener('change', () => {
        this.populateVoltages();
      });

      this.els.voltage.addEventListener('change', () => {
        this.populateKVA();
      });

      this.els.kva.addEventListener('change', () => {
        this.showResult();
      });

      this.els.reset.addEventListener('click', () => {
        this.reset();
      });
    }

    /**
     * Get current selections
     */
    getSelections () {
      return {
        transformer: this.els.transformer.value,
        voltage: this.els.voltage.value,
        kva: Number(this.els.kva.value),
      };
    }

    /**
     * Get fuse with CAD ID
     */
    getFuseCADId (fuse) {
      if (fuse === CONFIG.placeholders.default) return fuse;

      const match = this.fuseCadData.find(r => r.fuse === fuse);
      return match ? `${fuse} (${match.cadId})` : fuse;
    }

    /**
     * Show result
     */
    showResult () {
      const { transformer, voltage, kva } = this.getSelections();
      const matches = DataProcessor.filterData(this.fuseData, transformer, voltage, kva);

      DOM.show(this.els.result);
      DOM.clear(this.els.result);

      if (matches.length === 0) {
        this.renderNoMatch();
        return;
      }

      this.renderMatch(matches[0]);

      // Search and display impedance data
      if (transformer && voltage && kva) {
        const impedanceMatches = ImpedanceHandler.search(transformer, voltage, kva, this.ohData, this.ugData);

        if (impedanceMatches.length > 0) {
          const tableHTML = ImpedanceHandler.renderTable(impedanceMatches);
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = tableHTML;
          this.els.result.appendChild(tempDiv);
        }
      }
    }

    /**
     * Render no match message
     */
    renderNoMatch () {
      const msg = document.createElement('p');
      msg.textContent = 'No match found. Try adjusting filters.';
      this.els.result.appendChild(msg);
    }

    /**
     * Render match result
     */
    renderMatch (row) {
      if (!row) return;

      const h2 = document.createElement('h2');
      h2.textContent = 'Match Found';
      this.els.result.appendChild(h2);

      const ul = document.createElement('ul');
      const voltageLabel = CONFIG.voltageLabels[row.transformer] || 'kV';

      const fields = [
        ['Transformer', row.transformer],
        [`Operating kV (${voltageLabel})`, row.voltage],
        ['kVA', row.kva],
        [
          row.transformer === CONFIG.transformerTypes.OH ? 'Current Limiting Fuse' : 'BON Fuse',
          this.getFuseCADId(row.bonFuse),
          CONFIG.classes.highlight,
        ],
        ['Source-side Fuse', this.getFuseCADId(row.sourceFuse), CONFIG.classes.highlight],
      ];

      fields.forEach(([label, value, className]) => {
        const li = document.createElement('li');
        if (className && value !== CONFIG.placeholders.default) {
          li.className = className;
        }

        const strong = document.createElement('strong');
        strong.textContent = `${label}: `;
        li.appendChild(strong);
        li.appendChild(document.createTextNode(String(value)));
        ul.appendChild(li);
      });

      this.els.result.appendChild(ul);
    }

    /**
     * Hide result
     */
    hideResult () {
      DOM.hide(this.els.result);
      DOM.clear(this.els.result);
    }

    /**
     * Reset form
     */
    reset () {
      DOM.resetSelect(this.els.transformer, CONFIG.placeholders.transformer);
      DOM.resetAndDisable(this.els.voltage, CONFIG.placeholders.voltage);
      DOM.resetAndDisable(this.els.kva, CONFIG.placeholders.kva);
      this.hideResult();
    }
  }

  /**
   * Application initialization
   */
  function init () {
    try {
      // Get DOM elements
      const elements = DOM.getElements();
      if (!elements) {
        console.error('Failed to initialize: Required DOM elements not found');
        return;
      }

      // Process all data
      const fuseData = DataProcessor.processFuseData();
      const ohData = DataProcessor.processOHData();
      const ugData = DataProcessor.processUGData();
      const fuseCadData = DataProcessor.processFuseCADData();

      // Initialize UI controller
      new UIController(elements, fuseData, ohData, ugData, fuseCadData);

      console.log('Fuse Selector initialized successfully');
    } catch (err) {
      console.error('Failed to initialize Fuse Selector:', err);
    }
  }

  // Run initialization
  init();
})();
