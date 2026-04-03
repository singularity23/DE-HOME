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
      LPT: 'LPT',
      PMT: 'PMT',
      SDT: 'SDT',
      SUBMERSIBLE_1: 'SUBMERSIBLE 1P',
      SUBMERSIBLE_3: 'SUBMERSIBLE 3P',
    },
    voltageLabels: {
      'OH': 'L-N',
      'PMT': 'L-L',
      'SDT': 'L-L',
      'LPT': 'L-N',
      'SUBMERSIBLE 1P': { '2.4 x 7.2': 'L-N', '12 x 25': 'L-L' },
      'SUBMERSIBLE 3P': 'L-L',
    },
    placeholders: {
      default: '—',
      transformer: 'Select Transformer Type',
      voltage: 'Select Voltage',
      kva: 'Select Size',
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
      if (value === null || value === undefined) return CONFIG.placeholders.default;
      return String(value).trim() || CONFIG.placeholders.default;
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
      const hasKVA = Number.isFinite(kva);
      return ohData.filter(row => this.checkVoltageMatch(row.voltage, voltage) && (!hasKVA || row.kva === kva));
    },

    /**
     * Search underground transformer data
     */
    searchUG (transformerType, voltage, kva, ugData) {
      const hasKVA = Number.isFinite(kva);
      return ugData.filter(
        row =>
          row.transformer === transformerType &&
          this.checkVoltageMatch(row.voltage, voltage) &&
          (!hasKVA || row.kva === kva)
      );
    },

    /**
     * Check if transformer type is underground
     */
    isUnderground (type) {
      return [CONFIG.transformerTypes.PMT, CONFIG.transformerTypes.LPT, CONFIG.transformerTypes.SDT, CONFIG.transformerTypes.SUBMERSIBLE_1, CONFIG.transformerTypes.SUBMERSIBLE_3].includes(type);
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
   * Custom select UI layer
   */
  const CustomSelect = {
    _instances: new WeakMap(),
    _docListenerAttached: false,

    init (select) {
      if (!select || this._instances.has(select)) return;

      select.classList.add('native-select-hidden');

      const root = document.createElement('div');
      root.className = 'custom-select';

      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'custom-select__trigger';
      trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', 'false');

      const label = document.createElement('span');
      label.className = 'custom-select__label';
      trigger.appendChild(label);

      const chevron = document.createElement('span');
      chevron.className = 'custom-select__chevron';
      chevron.textContent = '⏷';
      trigger.appendChild(chevron);

      const menu = document.createElement('div');
      menu.className = 'custom-select__menu hidden';

      root.appendChild(trigger);
      root.appendChild(menu);
      select.insertAdjacentElement('afterend', root);

      const instance = { root, trigger, label, menu };
      this._instances.set(select, instance);

      trigger.addEventListener('click', e => {
        e.stopPropagation();
        if (select.disabled) return;
        const isOpen = !menu.classList.contains('hidden');
        this.closeAll(select);
        if (!isOpen) {
          menu.classList.remove('hidden');
          trigger.setAttribute('aria-expanded', 'true');
          root.classList.add('is-open');
        }
      });

      menu.addEventListener('click', e => {
        const optionButton = e.target.closest('[data-value]');
        if (!optionButton) return;
        const value = optionButton.getAttribute('data-value');
        if (select.value !== value) {
          select.value = value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          this.sync(select);
        }
        this.close(select);
      });

      if (!this._docListenerAttached) {
        document.addEventListener('click', () => this.closeAll());
        this._docListenerAttached = true;
      }

      select.addEventListener('change', () => this.sync(select));
      this.sync(select);
    },

    sync (select) {
      const instance = this._instances.get(select);
      if (!instance) return;

      const { root, trigger, label, menu } = instance;
      menu.innerHTML = '';

      for (const option of select.options) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'custom-select__option';
        if (option.selected) btn.classList.add('is-selected');
        const parts = this._splitVoltageLabel(option.textContent);
        if (parts) {
          const content = document.createElement('span');
          content.className = 'custom-select__option-content';

          const left = document.createElement('span');
          left.className = 'custom-select__option-left';
          left.textContent = parts.left;

          const right = document.createElement('span');
          right.className = 'custom-select__option-right';
          right.textContent = parts.right;

          content.appendChild(left);
          content.appendChild(right);
          btn.appendChild(content);
        } else {
          btn.textContent = option.textContent;
        }
        btn.setAttribute('data-value', option.value);
        menu.appendChild(btn);
      }

      const selectedOption = select.options[select.selectedIndex] || select.options[0];
      label.textContent = selectedOption ? selectedOption.textContent : '';

      root.classList.toggle('is-disabled', !!select.disabled);
      trigger.disabled = !!select.disabled;
    },

    _splitVoltageLabel (text) {
      const value = String(text || '').trim();
      const match = value.match(/^(.*)\s((kV\sL-[NL])|(kVA))$/);
      if (!match) return null;
      return { left: match[1], right: match[2] };
    },

    close (select) {
      const instance = this._instances.get(select);
      if (!instance) return;
      instance.menu.classList.add('hidden');
      instance.trigger.setAttribute('aria-expanded', 'false');
      instance.root.classList.remove('is-open');
    },

    closeAll (exceptSelect = null) {
      for (const select of [document.getElementById(CONFIG.selectors.transformer), document.getElementById(CONFIG.selectors.voltage), document.getElementById(CONFIG.selectors.kva)]) {
        if (!select || select === exceptSelect) continue;
        this.close(select);
      }
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

      // Attach custom dropdown layer to native selects
      CustomSelect.init(elements.transformer);
      CustomSelect.init(elements.voltage);
      CustomSelect.init(elements.kva);

      return elements;
    },

    /**
     * Set element disabled state
     */
    setDisabled (element, disabled) {
      if (element) {
        element.disabled = disabled;
        CustomSelect.sync(element);
      }
    },

    /**
     * Reset select element
     */
    resetSelect (element, placeholder = CONFIG.placeholders.default) {
      if (element) {
        element.innerHTML = `<option value="">${placeholder}</option>`;
        CustomSelect.sync(element);
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
      for (const value of Object.values(values)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = formatter ? formatter(value) : value;
        fragment.appendChild(option);
      };
      element.appendChild(fragment);
      CustomSelect.sync(element);
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
    constructor(elements, fuseData, ohData, ugData, fuseCadData) {
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
      const txTypesByFuse = this.fuseData.map(r => r.transformer);
      const txTypesByImpedance = [...this.ohData.map(r => r.transformer), ...this.ugData.map(r => r.transformer)];
      const availableTypes = DataProcessor.getUnique([...txTypesByFuse, ...txTypesByImpedance]);
      const availableSet = new Set(availableTypes);
      const preferredOrder = Object.values(CONFIG.transformerTypes);
      const orderedConfiguredTypes = preferredOrder.filter(type => availableSet.has(type));
      const otherTypes = availableTypes.filter(type => !preferredOrder.includes(type));
      const types = [...orderedConfiguredTypes, ...otherTypes];
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

      const VoltageByFuse = this.fuseData.filter(r => r.transformer === transformer).map(r => r.voltage);
      const dataRows = transformer === CONFIG.transformerTypes.OH
        ? this.ohData
        : this.ugData.filter(r => r.transformer === transformer);
      const voltagesByImpedance = dataRows.map(r => r.voltage);
      const voltages = DataProcessor.getUnique([...VoltageByFuse, ...voltagesByImpedance]);

      const voltageLabel = (v) => `kV ${transformer === CONFIG.transformerTypes.SUBMERSIBLE_1 ? CONFIG.voltageLabels[transformer][v] : CONFIG.voltageLabels[transformer]}`;
      DOM.populateSelect(this.els.voltage, voltages, v => `${v} ${voltageLabel(v)}`);

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
      const fuseKVAs = this.fuseData.filter(r => r.voltage === voltage && r.transformer === transformer).map(r => r.kva);
      const dataRows = transformer === CONFIG.transformerTypes.OH
        ? this.ohData
        : this.ugData.filter(r => r.transformer === transformer);
      const impedanceKVAs = dataRows
        .filter(r => ImpedanceHandler.checkVoltageMatch(r.voltage, voltage))
        .map(r => r.kva);
      const kvas = DataProcessor.getUnique([...fuseKVAs, ...impedanceKVAs]);
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
        this.showResult();
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
      const kvaValue = this.els.kva.value;
      return {
        transformer: this.els.transformer.value,
        voltage: this.els.voltage.value,
        kva: kvaValue === '' ? NaN : Number(kvaValue),
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
      const hasKVA = Number.isFinite(kva);

      DOM.show(this.els.result);
      DOM.clear(this.els.result);

      if (matches.length === 0 && hasKVA) {
        this.renderNoMatch();
      } else if (matches.length > 0 && hasKVA) {
        this.renderMatch(matches[0]);
      }

      // Search and display impedance data
      if (transformer && voltage) {
        const impedanceMatches = ImpedanceHandler.search(transformer, voltage, kva, this.ohData, this.ugData);
        if (impedanceMatches.length > 0) {
          const tableHTML = ImpedanceHandler.renderTable(impedanceMatches);
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = tableHTML;
          this.els.result.appendChild(tempDiv);
        }
        if (impedanceMatches.length === 0) {
          const msg = document.createElement('h3');
          msg.textContent = 'No Transformer Details Info.';
          this.els.result.appendChild(msg);
        }

      }

      if (matches.length === 0 && !hasKVA) {
        const msg = document.createElement('p');
        msg.textContent = 'Select kVA to see fuse recommendations.';
        this.els.result.appendChild(msg);
      }
    }

    /**
     * Render no match message
     */
    renderNoMatch () {
      const msg = document.createElement('h3');
      msg.textContent = 'No Fuse Information Found';
      this.els.result.appendChild(msg);
    }

    /**
     * Render match result
     */
    renderMatch (row) {
      if (!row) return;

      const h2 = document.createElement('h2');
      h2.textContent = 'Fuse Match Found';
      this.els.result.appendChild(h2);

      const ul = document.createElement('ul');
      const voltageLabel = CONFIG.voltageLabels[row.transformer] || 'kV';

      const fields = [
        ['Transformer', row.transformer],
        [`Operating kV (${voltageLabel})`, row.voltage],
        ['kVA', row.kva],
        [
          row.transformer === CONFIG.transformerTypes.OH ? 'Current Limiting Fuse' : 'BON Fuse',
          this.getFuseCADId(row.bonFuse) ? this.getFuseCADId(row.bonFuse) : 'Unknown',
          CONFIG.classes.highlight,
        ],
        ['Source-side Fuse', this.getFuseCADId(row.sourceFuse) ? this.getFuseCADId(row.sourceFuse) : 'Unknown', CONFIG.classes.highlight],
      ];

      fields.forEach(([label, value, className]) => {
        const li = document.createElement('li');
        if (className && value !== CONFIG.placeholders.default && value !== 'Unknown') {
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
      this.populateTransformers();
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
