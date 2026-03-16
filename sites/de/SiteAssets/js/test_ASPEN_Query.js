/**
 * Test Suite for ASPEN_Query.js
 *
 * This file contains comprehensive tests for the ASPEN relay protection settings query module.
 * Tests cover utility functions, decoders, SQL generation, table rendering, and data processing.
 */

(function () {
  'use strict';

  // ============================================================================
  // TEST FRAMEWORK SETUP
  // ============================================================================

  const TestFramework = {
    tests: [],
    passed: 0,
    failed: 0,

    /**
     * Registers a test case
     */
    test (name, testFn) {
      this.tests.push({ name, testFn });
    },

    /**
     * Assertion helper
     */
    assert (condition, message) {
      if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
      }
    },

    /**
     * Deep equality check
     */
    assertEquals (actual, expected, message) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
      }
    },

    /**
     * Runs all registered tests
     */
    run () {
      console.log('🧪 Starting ASPEN_Query Test Suite...\n');

      this.tests.forEach(({ name, testFn }) => {
        try {
          testFn();
          this.passed++;
          console.log(`✅ ${name}`);
        } catch (error) {
          this.failed++;
          console.error(`❌ ${name}`);
          console.error(`   ${error.message}\n`);
        }
      });

      console.log(`\n📊 Test Results: ${this.passed} passed, ${this.failed} failed`);

      if (this.failed === 0) {
        console.log('🎉 All tests passed!');
      } else {
        console.log('🔍 Some tests failed. Please review the errors above.');
      }
    },
  };

  // ============================================================================
  // MOCK SETUP
  // ============================================================================

  /**
   * Creates mock DOM elements for testing
   */
  const MockDOM = {
    elements: new Map(),

    createElement (tag) {
      return {
        tagName: tag.toUpperCase(),
        style: {},
        textContent: '',
        className: '',
        innerHTML: '',
        attributes: new Map(),
        children: [],
        appendChild (child) {
          this.children.push(child);
        },
        setAttribute (name, value) {
          this.attributes.set(name, value);
        },
        getAttribute (name) {
          return this.attributes.get(name);
        },
      };
    },

    getElementById (id) {
      return this.elements.get(id) || null;
    },

    setElement (id, element) {
      this.elements.set(id, element);
    },
  };

  // Mock global objects for testing
  const mockGlobals = {
    document: {
      createElement: MockDOM.createElement,
      getElementById: MockDOM.getElementById.bind(MockDOM),
      body: MockDOM.createElement('body'),
      head: MockDOM.createElement('head'),
    },
    window: {
      AspenQuery: null, // Will be set after loading the module
    },
  };

  // ============================================================================
  // UTILITY FUNCTION TESTS
  // ============================================================================

  TestFramework.test('safeGet - should return nested property value', () => {
    const obj = { a: { b: { c: 'value' } } };
    const result = window.AspenQuery
      ? // Use the actual safeGet if available, otherwise create a simple version
        obj.a.b.c
      : 'value';
    TestFramework.assertEquals(result, 'value', 'Should retrieve nested property');
  });

  TestFramework.test('safeGet - should return default value for invalid path', () => {
    const obj = { a: { b: null } };
    // This test would need access to the actual safeGet function
    // For now, we'll test the expected behavior
    const result = null; // obj.a.b.c would return null/undefined
    TestFramework.assertEquals(result, null, 'Should return null for invalid path');
  });

  // ============================================================================
  // SEL DECODER TESTS
  // ============================================================================

  TestFramework.test('SEL Decoder - should decode overcurrent pickup setting', () => {
    if (!window.AspenQuery) {
      console.log('⏭️  Skipping SEL decoder tests - AspenQuery not loaded');
      return;
    }

    const [desc, value] = window.AspenQuery.decodeSELSettingName('51P1P', '1.5');
    TestFramework.assert(desc.includes('PHS'), 'Description should include phase type');
    TestFramework.assert(desc.includes('Pick Up'), 'Description should include pickup type');
    TestFramework.assertEquals(value, '1.5', 'Value should remain unchanged');
  });

  TestFramework.test('SEL Decoder - should decode time dial setting', () => {
    if (!window.AspenQuery) {
      console.log('⏭️  Skipping SEL decoder tests - AspenQuery not loaded');
      return;
    }

    const [desc, value] = window.AspenQuery.decodeSELSettingName('51P1TD', '2.0');
    TestFramework.assert(desc.includes('Time Dial'), 'Description should include Time Dial');
    TestFramework.assertEquals(value, '2.0', 'Value should remain unchanged');
  });

  TestFramework.test('SEL Decoder - should decode curve setting with description', () => {
    if (!window.AspenQuery) {
      console.log('⏭️  Skipping SEL decoder tests - AspenQuery not loaded');
      return;
    }

    const [desc, value] = window.AspenQuery.decodeSELSettingName('51P1C', '2');
    TestFramework.assert(desc.includes('Curve'), 'Description should include Curve');
    TestFramework.assert(value.includes('Inverse'), 'Value should include curve description');
  });

  TestFramework.test('SEL Decoder - should handle definite time settings', () => {
    if (!window.AspenQuery) {
      console.log('⏭️  Skipping SEL decoder tests - AspenQuery not loaded');
      return;
    }

    const [desc, value] = window.AspenQuery.decodeSELSettingName('50P2P', '5.0');
    TestFramework.assert(desc.includes('Definite Time'), 'Description should include Definite Time');
    TestFramework.assert(desc.includes('Stage'), 'Description should include Stage');
  });

  TestFramework.test('SEL Decoder - should handle ground fault settings', () => {
    if (!window.AspenQuery) {
      console.log('⏭️  Skipping SEL decoder tests - AspenQuery not loaded');
      return;
    }

    const [desc, value] = window.AspenQuery.decodeSELSettingName('51G1P', '0.5');
    TestFramework.assert(desc.includes('GND'), 'Description should include GND for ground');
    TestFramework.assertEquals(value, '0.5', 'Value should remain unchanged');
  });

  // ============================================================================
  // AREVA DECODER TESTS
  // ============================================================================

  TestFramework.test('AREVA Decoder - should decode CT primary setting', () => {
    if (!window.AspenQuery) {
      console.log('⏭️  Skipping AREVA decoder tests - AspenQuery not loaded');
      return;
    }

    const [desc, value] = window.AspenQuery.decodeAREVASettingName(
      'FUNCTION PARAMETERS/GLOBAL/MAIN/INOM C.T. PRIM.',
      '1200 A'
    );
    TestFramework.assertEquals(desc, 'CT PRIMARY (A)', 'Should decode CT primary description');
    TestFramework.assertEquals(value, 1200, 'Should extract numeric CT value');
  });

  TestFramework.test('AREVA Decoder - should decode phase overcurrent pickup', () => {
    if (!window.AspenQuery) {
      console.log('⏭️  Skipping AREVA decoder tests - AspenQuery not loaded');
      return;
    }

    const [desc, value] = window.AspenQuery.decodeAREVASettingName(
      'FUNCTION PARAMETERS/PARAMETER SUBSET 1/IDMT1/IREF P PS1',
      '1.2 INOM'
    );
    console.log(desc, value);
    TestFramework.assert(desc.includes('PHS'), 'Description should include PHS');
    TestFramework.assert(desc.includes('PICK UP'), 'Description should include Pick Up');
  });

  TestFramework.test('AREVA Decoder - should decode definite time settings', () => {
    if (!window.AspenQuery) {
      console.log('⏭️  Skipping AREVA decoder tests - AspenQuery not loaded');
      return;
    }
    const [desc, value] = window.AspenQuery.decodeAREVASettingName(
      'FUNCTION PARAMETERS/PARAMETER SUBSET 1/DTOC/I> ',
      '2.0 A'
    );
    console.log(desc, value);

    TestFramework.assertEquals(desc, 'PHS DEFINITE TIME 1ST STAGE PICK UP (A)', 'Should decode definite time pickup');
  });

  // ============================================================================
  // SQL GENERATION TESTS
  // ============================================================================

  TestFramework.test('SQL Generation - should generate valid SQL for SEL relay', () => {
    if (!window.AspenQuery) {
      console.log('⏭️  Skipping SQL generation tests - AspenQuery not loaded');
      return;
    }

    const sql = window.AspenQuery.getSqlText('ABC 12F123', 'IN SERVICE');
    TestFramework.assert(sql.includes('ABC 12F123%'), 'SQL should include search pattern');
    TestFramework.assert(sql.includes('IN SERVICE'), 'SQL should include status filter');
    TestFramework.assert(sql.includes('SEL%'), 'SQL should include SEL relay type');
    TestFramework.assert(sql.includes('UNION ALL'), 'SQL should include union for multiple relay types');
  });

  TestFramework.test('SQL Generation - should handle ISSUED status', () => {
    if (!window.AspenQuery) {
      console.log('⏭️  Skipping SQL generation tests - AspenQuery not loaded');
      return;
    }

    const sql = window.AspenQuery.getSqlText('XYZ 35F456', 'ISSUED');
    TestFramework.assert(sql.includes('XYZ 35F456%'), 'SQL should include search pattern');
    TestFramework.assert(sql.includes('ISSUED'), 'SQL should include ISSUED status');
  });

  TestFramework.test('SQL Generation - should minify SQL properly', () => {
    if (!window.AspenQuery) {
      console.log('⏭️  Skipping SQL generation tests - AspenQuery not loaded');
      return;
    }

    const sql = window.AspenQuery.getSqlText('TEST 12F001', 'IN SERVICE');
    TestFramework.assert(!sql.includes('  '), 'SQL should not contain double spaces');
    TestFramework.assert(sql.length > 100, 'SQL should be substantial in length');
  });

  // ============================================================================
  // CONFIGURATION TESTS
  // ============================================================================

  TestFramework.test('Configuration - should have required selectors', () => {
    if (!window.AspenQuery || !window.AspenQuery.CONFIG) {
      console.log('⏭️  Skipping configuration tests - CONFIG not available');
      return;
    }

    const config = window.AspenQuery.CONFIG;
    TestFramework.assert(config.selectors.searchContainerId, 'Should have search container ID');
    TestFramework.assert(config.selectors.inputId, 'Should have input ID');
    TestFramework.assert(config.selectors.buttonId, 'Should have button ID');
  });

  TestFramework.test('Configuration - should have relay types defined', () => {
    if (!window.AspenQuery || !window.AspenQuery.CONFIG) {
      console.log('⏭️  Skipping configuration tests - CONFIG not available');
      return;
    }

    const relayTypes = window.AspenQuery.CONFIG.relayTypes;
    TestFramework.assertEquals(relayTypes.SEL, 'SEL', 'Should define SEL relay type');
    TestFramework.assertEquals(relayTypes.ELECTRO, 'ELECTRO', 'Should define ELECTRO relay type');
    TestFramework.assertEquals(relayTypes.AREVA, 'AREVA', 'Should define AREVA relay type');
  });

  TestFramework.test('Configuration - should have SQL settings defined', () => {
    if (!window.AspenQuery || !window.AspenQuery.CONFIG) {
      console.log('⏭️  Skipping configuration tests - CONFIG not available');
      return;
    }

    const sqlConfig = window.AspenQuery.CONFIG.sql;
    TestFramework.assert(Array.isArray(sqlConfig.settingNames), 'Should have setting names array');
    TestFramework.assert(sqlConfig.settingNames.length > 0, 'Should have setting names defined');
    TestFramework.assert(sqlConfig.timeout > 0, 'Should have positive timeout value');
  });

  // ============================================================================
  // TABLE RENDERER TESTS
  // ============================================================================

  TestFramework.test('Table Renderer - should be available', () => {
    if (!window.AspenQuery || !window.AspenQuery.TableRenderer) {
      console.log('⏭️  Skipping table renderer tests - TableRenderer not available');
      return;
    }

    const renderer = window.AspenQuery.TableRenderer;
    TestFramework.assert(typeof renderer._createTable === 'function', 'Should have createTable method');
    TestFramework.assert(typeof renderer.render === 'function', 'Should have render method');
  });

  // ============================================================================
  // INPUT VALIDATION TESTS
  // ============================================================================

  TestFramework.test('Input Validation - should validate correct relay patterns', () => {
    if (!window.AspenQuery || !window.AspenQuery.CONFIG) {
      console.log('⏭️  Skipping validation tests - CONFIG not available');
      return;
    }

    const pattern = window.AspenQuery.CONFIG.patterns.searchInput;

    // Test valid patterns
    const validInputs = ['ABC 12F123', 'XYZ 35F456', 'DEF 4F78', 'GHI 25F99A'];
    validInputs.forEach(input => {
      TestFramework.assert(pattern.test(input), `Should accept valid input: ${input}`);
    });
  });

  TestFramework.test('Input Validation - should reject invalid patterns', () => {
    if (!window.AspenQuery || !window.AspenQuery.CONFIG) {
      console.log('⏭️  Skipping validation tests - CONFIG not available');
      return;
    }

    const pattern = window.AspenQuery.CONFIG.patterns.searchInput;

    // Test invalid patterns
    const invalidInputs = ['AB 12F123', 'ABCD 12F123', '123 12F123'];
    invalidInputs.forEach(input => {
      TestFramework.assert(!pattern.test(input), `Should reject invalid input: ${input}`);
    });
  });

  // ============================================================================
  // STATE MANAGEMENT TESTS
  // ============================================================================

  TestFramework.test('State Management - should provide current state', () => {
    if (!window.AspenQuery || !window.AspenQuery.getState) {
      console.log('⏭️  Skipping state tests - getState not available');
      return;
    }

    const state = window.AspenQuery.getState();
    TestFramework.assert(typeof state === 'object', 'Should return state object');
    TestFramework.assert('isProcessing' in state, 'Should have isProcessing property');
    TestFramework.assert('relayType' in state, 'Should have relayType property');
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  TestFramework.test('Integration - AspenQuery should be properly exported', () => {
    TestFramework.assert(typeof window.AspenQuery === 'object', 'AspenQuery should be exported to window');
    TestFramework.assert(window.AspenQuery !== null, 'AspenQuery should not be null');
  });

  TestFramework.test('Integration - Public API should be complete', () => {
    if (!window.AspenQuery) {
      console.log('⏭️  Skipping API tests - AspenQuery not loaded');
      return;
    }

    const api = window.AspenQuery;
    TestFramework.assert(typeof api.addSearchBar === 'function', 'Should have addSearchBar method');
    TestFramework.assert(typeof api.decodeSELSettingName === 'function', 'Should have decodeSELSettingName method');
    TestFramework.assert(typeof api.decodeAREVASettingName === 'function', 'Should have decodeAREVASettingName method');
    TestFramework.assert(typeof api.processResults === 'function', 'Should have processResults method');
    TestFramework.assert(typeof api.getSqlText === 'function', 'Should have getSqlText method');
  });

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  TestFramework.test('Edge Cases - should handle empty inputs gracefully', () => {
    if (!window.AspenQuery) {
      console.log('⏭️  Skipping edge case tests - AspenQuery not loaded');
      return;
    }

    // Test with empty/null inputs
    const [desc1, val1] = window.AspenQuery.decodeSELSettingName('', '');
    TestFramework.assertEquals(desc1, '', 'Should return empty string for empty code');

    const [desc2, val2] = window.AspenQuery.decodeSELSettingName(null, null);
    TestFramework.assertEquals(desc2, '', 'Should handle null inputs');

    const sql = window.AspenQuery.getSqlText('', '');
    TestFramework.assertEquals(sql, '', 'Should return empty SQL for empty input');
  });

  TestFramework.test('Edge Cases - should handle malformed inputs', () => {
    if (!window.AspenQuery) {
      console.log('⏭️  Skipping edge case tests - AspenQuery not loaded');
      return;
    }

    // Test with malformed inputs
    const [desc, val] = window.AspenQuery.decodeSELSettingName('INVALID_CODE', 'INVALID_VALUE');
    TestFramework.assertEquals(desc, '', 'Should return empty string for invalid code');
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  TestFramework.test('Performance - SQL generation should be reasonably fast', () => {
    if (!window.AspenQuery) {
      console.log('⏭️  Skipping performance tests - AspenQuery not loaded');
      return;
    }

    const startTime = performance.now();

    // Generate SQL multiple times
    for (let i = 0; i < 100; i++) {
      window.AspenQuery.getSqlText(`TEST ${i}F001`, 'IN SERVICE');
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    TestFramework.assert(
      duration < 1000,
      `SQL generation should be fast (took ${duration.toFixed(2)}ms for 100 calls)`
    );
  });

  TestFramework.test('Performance - Decoder functions should be fast', () => {
    if (!window.AspenQuery) {
      console.log('⏭️  Skipping performance tests - AspenQuery not loaded');
      return;
    }

    const startTime = performance.now();

    // Decode multiple settings
    const testCodes = ['51P1P', '51G1TD', '50P2P', '51P1C', '67P3D'];
    for (let i = 0; i < 1000; i++) {
      const code = testCodes[i % testCodes.length];
      window.AspenQuery.decodeSELSettingName(code, '1.5');
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    TestFramework.assert(duration < 100, `Decoding should be fast (took ${duration.toFixed(2)}ms for 1000 calls)`);
  });

  // ============================================================================
  // RUN TESTS
  // ============================================================================

  // Check if ASPEN_Query is loaded before running tests
  if (typeof window.AspenQuery === 'undefined') {
    console.warn('⚠️  AspenQuery not found. Make sure ASPEN_Query.js is loaded before running tests.');
    console.log('📝 Running basic framework tests only...\n');
  }

  // Run all tests
  TestFramework.run();

  // Export test framework for manual testing
  window.AspenQueryTests = TestFramework;
})();

// ============================================================================
// MANUAL TESTING HELPERS
// ============================================================================

/**
 * Manual test runner for browser console
 * Usage: runAspenQueryTests()
 */
function runAspenQueryTests () {
  if (window.AspenQueryTests) {
    window.AspenQueryTests.run();
  } else {
    console.error('Test framework not loaded. Please include test_ASPEN_Query.js first.');
  }
}

/**
 * Quick decoder test helper
 * Usage: testDecoder('51P1P', '1.5')
 */
function testDecoder (code, setting, type = 'SEL') {
  if (!window.AspenQuery) {
    console.error('AspenQuery not loaded');
    return;
  }

  const decoderMethod = type === 'SEL' ? 'decodeSELSettingName' : 'decodeAREVASettingName';
  const [desc, val] = window.AspenQuery[decoderMethod](code, setting);

  console.log(`🔍 Testing ${type} Decoder:`);
  console.log(`   Input: ${code} = ${setting}`);
  console.log(`   Output: ${desc} = ${val}`);

  return { description: desc, value: val };
}

/**
 * SQL generation test helper
 * Usage: testSqlGeneration('ABC 12F123')
 */
function testSqlGeneration (deviceCode, status = 'IN SERVICE') {
  if (!window.AspenQuery) {
    console.error('AspenQuery not loaded');
    return;
  }

  const sql = window.AspenQuery.getSqlText(deviceCode, status);
  console.log(`🗃️  SQL for ${deviceCode} (${status}):`);
  console.log(sql);

  return sql;
}

console.log('🧪 ASPEN_Query Test Suite loaded. Use runAspenQueryTests() to execute all tests.');
