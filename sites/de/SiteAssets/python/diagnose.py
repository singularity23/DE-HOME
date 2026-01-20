#!/usr/bin/env python
import sys
import os

print("Python executable:", sys.executable)
print("Python version:", sys.version)
print("Current directory:", os.getcwd())
print("Script directory:", os.path.dirname(os.path.abspath(__file__)))
print()

try:
    print("Attempting to import test module...")
    import test_LoadBalancing as tb

    print("✓ test_LoadBalancing imported successfully")
    print(f"  - TestUtilityFunctions: {tb.TestUtilityFunctions}")
    print(f"  - TestLoadBalancingPickSections: {tb.TestLoadBalancingPickSections}")
except Exception as e:
    print(f"✗ Failed to import test_LoadBalancing: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)

try:
    print("\nAttempting to create test suite...")
    import unittest

    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(tb.TestUtilityFunctions))
    suite.addTests(loader.loadTestsFromTestCase(tb.TestLoadBalancingPickSections))
    print(f"✓ Test suite created with {suite.countTestCases()} tests")
except Exception as e:
    print(f"✗ Failed to create test suite: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)

try:
    print("\nRunning tests...")
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    print(
        f"\n✓ Tests complete: {result.testsRun} run, {len(result.failures)} failures, {len(result.errors)} errors"
    )
except Exception as e:
    print(f"✗ Test execution failed: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)

print("\n✓ All operations completed successfully")
