//-------------------------------------------------------------
//-----------------Do not edit the XML tags--------------------
//-------------------------------------------------------------

//<Document-Level>
//<ACRO_source>ClearFieldsScript</ACRO_source>
//<ACRO_script>
/*********** belongs to: Document-Level:ClearFieldsScript ***********/

// Field groupings - using const for immutable arrays
const FIELD_GROUPS = {
    SC: ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10', '1.11', '1.12'],
    DS: ['2.1', '2.2', '2.3', '2.4', '2.5'],
    C: ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9', '3.10', '3.11'],
    PR: ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8', '4.9', '4.10'],
};

// Field references
const FORM_FIELDS = ['Dropdown.risk', 'Risk', 'Reset2', 'blocker'];

const SIGNATURE_FIELDS = [
    'Signature - TL',
    'Signature - Checker',
    'Signature - Peer Reviewer',
    'Date - TL_af_date',
    'Date - Checker_af_date',
    'Date - Peer Reviewer_af_date',
    'Checker1',
    'Assigned Type 1 Reviewer Name',
    'Peer Reviewer Name',
    'Structural Warning',
    'Not Low Risk Warning',
    'Risk - Low',
    'Risk - Medium',
    'Risk - High',
    'High Risk Warning',
];

// Create field names array using modern spread syntax
const ALL_FIELD_NAMES = [
    ...FIELD_GROUPS.PR,
    ...FIELD_GROUPS.C,
    ...FIELD_GROUPS.SC,
    ...FIELD_GROUPS.DS,
    ...FORM_FIELDS,
    ...SIGNATURE_FIELDS,
];

// Cache field references for better performance
const fields = {};
ALL_FIELD_NAMES.forEach(fieldName => {
    const field = this.getField(fieldName);
    if (field) {
        fields[fieldName] = field;
    }
});

// Field mapping for visibility control
const FIELD_MAP = {
    signatureC: 'Signature - Checker',
    dateC: 'Date - Checker_af_date',
    C: 'Checker1',
    signatureTL: 'Signature - TL',
    dateTL: 'Date - TL_af_date',
    R: 'Assigned Type 1 Reviewer Name',
    signaturePR: 'Signature - Peer Reviewer',
    datePR: 'Date - Peer Reviewer_af_date',
    PR: 'Peer Reviewer Name',
    structwarning: 'Structural Warning',
    low: 'Risk - Low',
    medium: 'Risk - Medium',
    high: 'Risk - High',
    riskwarning: 'High Risk Warning',
};

// Keys that participate in visibility states
const VISIBILITY_KEYS = Object.keys(FIELD_MAP);

// Initialize visibility states with optimized structure
const VISIBILITY_STATE_COUNT = 7;
const visibilityStates = {};

VISIBILITY_KEYS.forEach(key => {
    visibilityStates[key] = new Array(VISIBILITY_STATE_COUNT).fill(0);
});

// Utility: clear fields with error handling
function clearFields (fieldArray) {
    if (!Array.isArray(fieldArray)) {
        console.warn('clearFields: fieldArray must be an array');
        return;
    }

    fieldArray.forEach(fieldName => {
        const field = fields[fieldName] || this.getField(fieldName);
        if (field) {
            try {
                field.value = '';
            } catch (error) {
                console.warn(`Failed to clear field ${fieldName}:`, error);
            }
        }
    });
}

// Utility: set multiple visibility states at index with validation
function setVisibility (keys, index, value) {
    if (index < 0 || index >= VISIBILITY_STATE_COUNT) {
        console.warn(`setVisibility: index ${index} out of range`);
        return;
    }

    if (!Array.isArray(keys)) {
        console.warn('setVisibility: keys must be an array');
        return;
    }

    keys.forEach(key => {
        if (visibilityStates.hasOwnProperty(key)) {
            visibilityStates[key][index] = value;
        } else {
            console.warn(`setVisibility: unknown key ${key}`);
        }
    });
}

// High-risk logic with improved readability
function highRisk () {
    const idx = 0;
    const field111 = fields['1.11'];
    if (!field111) {
        console.warn('highRisk: Field 1.11 not found');
        return;
    }

    const val = field111.value === 'No' ? 1 : 0;
    const affectedFields = ['signatureC', 'dateC', 'C', 'signatureTL', 'dateTL', 'R'];
    setVisibility(affectedFields, idx, val);
    updateFieldVisibility();
}

// 1.9 logic with field validation
function notlowrisk () {
    const idx = 1;
    const field19 = fields['1.9'];
    const field110 = fields['1.10'];

    if (!field19 || !field110) {
        console.warn('notlowrisk: Required fields 1.9 or 1.10 not found');
        return;
    }

    const val = field19.value === 'No' && field110.value === 'No' ? 1 : 0;
    setVisibility(['signatureC', 'dateC', 'C'], idx, val);
    updateFieldVisibility();
}

// Structural logic with field validation
function structural () {
    const idx = 2;
    const field110 = fields['1.10'];

    if (!field110) {
        console.warn('structural: Field 1.10 not found');
        return;
    }

    visibilityStates.structwarning[idx] = field110.value === 'No' ? 1 : 0;
    updateFieldVisibility();
}

// Risk warning logic with improved readability
function riskwarningfcn () {
    const idx = 3;
    const field111 = fields['1.11'];
    const riskField = fields['Risk'];

    if (!field111 || !riskField) {
        console.warn('riskwarningfcn: Required fields 1.11 or Risk not found');
        return;
    }

    const notHighRisk = field111.value;
    const risk = riskField.value;

    // Simplified logic: show warning if conditions don't match
    const shouldShowWarning = !(
        (notHighRisk === 'No' && risk === 'High') ||
        (notHighRisk === 'Yes' && risk !== 'High')
    );

    visibilityStates.riskwarning[idx] = shouldShowWarning ? 1 : 0;
    updateFieldVisibility();
}

// POR logic with improved field handling
function toggleVisibilityBasedOnPOR () {
    const idx = 4;
    const field112 = fields['1.12'];

    if (!field112) {
        console.warn('toggleVisibilityBasedOnPOR: Field 1.12 not found');
        return;
    }

    const POR = field112.value;
    const show = POR === 'No';

    // Update DS fields visibility
    FIELD_GROUPS.DS.forEach(fieldName => {
        const field = fields[fieldName] || this.getField(fieldName);
        if (field) {
            field.display = show ? display.visible : display.hidden;
        }
    });

    setVisibility(['signatureC', 'dateC', 'C'], idx, show ? 1 : 0);

    // Update special fields
    const resetField = fields['Reset2'];
    const blockerField = fields['blocker'];

    if (resetField) resetField.display = show ? display.visible : display.hidden;
    if (blockerField) blockerField.display = show ? display.hidden : display.visible;

    updateFieldVisibility();
}

// Risk dropdown logic with improved structure
function Risk () {
    const idx = 5;
    const riskField = fields['Risk'];

    if (!riskField) {
        console.warn('Risk: Risk field not found');
        return;
    }

    const val = riskField.value;
    const field19 = fields['1.9'];
    const field111 = fields['1.11'];

    // Risk level configurations
    const riskConfigs = {
        High: {
            show: ['signatureC', 'dateC', 'C', 'signatureTL', 'dateTL', 'R'],
            hide: ['low', 'medium'],
            setFields: { 1.9: 'No', 1.11: 'No' },
            visibilityKey: 'high',
        },
        Medium: {
            show: ['signatureC', 'dateC', 'C'],
            hide: ['signatureTL', 'dateTL', 'R', 'low', 'high'],
            setFields: { 1.9: 'No', 1.11: 'Yes' },
            visibilityKey: 'medium',
        },
        Low: {
            show: [],
            hide: ['signatureC', 'dateC', 'C', 'signatureTL', 'dateTL', 'R', 'medium', 'high'],
            setFields: { 1.9: 'Yes', 1.11: 'Yes' },
            visibilityKey: 'low',
        },
    };

    const config = riskConfigs[val];

    if (config) {
        // Set visibility for shown fields
        if (config.show.length > 0) {
            setVisibility(config.show, idx, 1);
        }

        // Set visibility for hidden fields
        if (config.hide.length > 0) {
            setVisibility(config.hide, idx, 0);
        }

        // Set field values
        Object.entries(config.setFields).forEach(([fieldName, value]) => {
            const field = fields[fieldName];
            if (field) field.value = value;
        });

        // Set visibility state for the risk level
        visibilityStates[config.visibilityKey][idx] = 1;
    } else {
        // Default case: hide all risk-related fields
        setVisibility(['signatureC', 'dateC', 'C', 'signatureTL', 'dateTL', 'R', 'low', 'medium', 'high'], idx, 0);
    }

    updateFieldVisibility();
}

// Radio button logic with improved field checking
function radioboxes () {
    const idx = 6;

    // Check if any PR field is selected
    const isAnyPR = FIELD_GROUPS.PR.some(name => {
        const field = fields[name] || this.getField(name);
        return field && field.value !== false;
    });

    setVisibility(['signaturePR', 'datePR', 'PR'], idx, isAnyPR ? 1 : 0);

    // Check if any C field is selected
    const isAnyC = FIELD_GROUPS.C.some(name => {
        const field = fields[name] || this.getField(name);
        return field && field.value !== false;
    });

    setVisibility(['signatureC', 'dateC', 'C'], idx, isAnyC ? 1 : 0);

    updateFieldVisibility();
}

// Central visibility update with optimized logic
function updateFieldVisibility () {
    Object.entries(FIELD_MAP).forEach(([key, fieldName]) => {
        const field = fields[fieldName];
        if (field) {
            // Check if any visibility state is active (value > 0)
            const isVisible = visibilityStates[key].some(v => v > 0);
            field.display = isVisible ? display.visible : display.hidden;
        }
    });

    printDebugInfo();
}

// Reset all visibility states with optimized approach
function recalculateVisibilityStates () {
    Object.keys(visibilityStates).forEach(key => {
        visibilityStates[key].fill(0);
    });
    updateFieldVisibility();
}

// Clear all form fields and reset visibility
function clearForm () {
    recalculateVisibilityStates();

    // Clear radio buttons for all field groups
    const allFieldGroups = [FIELD_GROUPS.PR, FIELD_GROUPS.C, FIELD_GROUPS.SC, FIELD_GROUPS.DS];
    clearRadioButtons(allFieldGroups);

    // Reset risk field
    const riskField = fields['Risk'];
    if (riskField) riskField.value = false;

    // Hide all visibility-controlled fields
    VISIBILITY_KEYS.forEach(key => {
        const fieldName = mapFieldName(key);
        const field = fields[fieldName] || fields[key];
        if (field) field.display = display.hidden;
    });

    // Show blocker field
    const blockerField = fields['blocker'];
    if (blockerField) blockerField.display = display.visible;

    hideDS();
    updateFieldVisibility();
    printDebugInfo();
}

// Helper to map short keys to field names
function mapFieldName (key) {
    return FIELD_MAP[key] || key;
}

// Clear radio buttons with improved error handling
function clearRadioButtons (fieldArrays) {
    if (!Array.isArray(fieldArrays)) {
        console.warn('clearRadioButtons: fieldArrays must be an array');
        return;
    }

    fieldArrays.forEach(fieldArray => {
        if (!Array.isArray(fieldArray)) {
            console.warn('clearRadioButtons: fieldArray must be an array');
            return;
        }

        fieldArray.forEach(name => {
            const radioButton = fields[name] || this.getField(name);
            if (radioButton) {
                try {
                    radioButton.value = false;
                } catch (error) {
                    console.warn(`Failed to clear radio button ${name}:`, error);
                }
            }
        });
    });
}

// Hide DS fields and block layer
function hideDS () {
    FIELD_GROUPS.DS.forEach(fieldName => {
        const field = fields[fieldName] || this.getField(fieldName);
        if (field) field.display = display.hidden;
    });

    const resetField = fields['Reset2'];
    if (resetField) resetField.display = display.hidden;
}

// Clear PR fields
function clearPRfields () {
    clearFields(FIELD_GROUPS.PR);
    setVisibility(['signaturePR', 'datePR', 'PR'], 5, 0);
    updateFieldVisibility();
}

// Clear C fields
function clearCfields () {
    clearFields(FIELD_GROUPS.C);
    setVisibility(['signatureC', 'dateC', 'C'], 5, 0);
    updateFieldVisibility();
}

// Clear DS fields
function clearDSfields () {
    clearFields(FIELD_GROUPS.DS);
    updateFieldVisibility();
}

// Clear SC fields with comprehensive reset
function clearSCfields () {
    clearFields(FIELD_GROUPS.SC);

    // Reset all related visibility states
    setVisibility(['signatureC', 'dateC', 'C'], 3, 0);
    visibilityStates.structwarning[2] = 0;
    setVisibility(['signatureC', 'dateC', 'C', 'signatureTL', 'dateTL', 'R'], 0, 0);
    setVisibility(['signatureC', 'dateC', 'C'], 1, 0);

    hideDS();

    const blockerField = fields['blocker'];
    if (blockerField) blockerField.display = display.visible;

    updateFieldVisibility();
}

// Debug info with improved formatting
function printDebugInfo () {
    const debugField = this.getField('DebugOutput');
    if (!debugField) return;

    let debugText = '=== VISIBILITY STATES ===\n';

    // Add visibility states
    Object.entries(visibilityStates).forEach(([key, states]) => {
        debugText += `${key}: [${states.join(', ')}]\n`;
    });

    debugText += '\n=== FIELD VALUES ===\n';

    // Add field values
    ALL_FIELD_NAMES.forEach(fieldName => {
        const field = fields[fieldName];
        if (field) {
            debugText += `${fieldName}: [${field.value}]\n`;
        }
    });

    try {
        debugField.value = debugText;
    } catch (error) {
        console.warn('Failed to update debug field:', error);
    }
}

// Document-level JavaScript (runs on file open)
function onOpen () {
    try {
        toggleVisibilityBasedOnPOR();
    } catch (error) {
        console.error('Error in onOpen:', error);
    }
}

// Add error handling wrapper for all functions
function safeExecute (fn, ...args) {
    try {
        return fn.apply(this, args);
    } catch (error) {
        console.error(`Error executing ${fn.name}:`, error);
    }
}
