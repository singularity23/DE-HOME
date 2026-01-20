#!/usr/bin/env python
"""Simple test runner with JSON output"""
import sys
import os

# Setup paths
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)

# Import and run tests
if __name__ == "__main__":
    import unittest
    import json
    from datetime import datetime

    # Import the test module (which sets up fake cympy)
    import test_LoadBalancing as tb

    # Create suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(tb.TestUtilityFunctions))
    suite.addTests(loader.loadTestsFromTestCase(tb.TestLoadBalancingPickSections))

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Generate reports
    reports = {
        "timestamp": datetime.now().isoformat(),
        "tests_run": result.testsRun,
        "successes": result.testsRun - len(result.failures) - len(result.errors),
        "failures": len(result.failures),
        "errors": len(result.errors),
        "success": result.wasSuccessful(),
        "failed_tests": [
            {"test": str(test), "error": str(error)}
            for test, error in result.failures + result.errors
        ],
    }

    # Save JSON
    with open("test_results.json", "w") as f:
        json.dump(reports, f, indent=2)
    print(f"\n✓ JSON report: test_results.json")

    # Save text
    with open("test_results.txt", "w") as f:
        f.write(f"Test Results - {datetime.now().isoformat()}\n")
        f.write("=" * 70 + "\n\n")
        f.write(f"Tests run: {result.testsRun}\n")
        f.write(
            f"Passed: {result.testsRun - len(result.failures) - len(result.errors)}\n"
        )
        f.write(f"Failed: {len(result.failures)}\n")
        f.write(f"Errors: {len(result.errors)}\n")
        f.write(f"Status: {'✓ PASS' if result.wasSuccessful() else '✗ FAIL'}\n")
    print(f"✓ Text report: test_results.txt\n")

    sys.exit(0 if result.wasSuccessful() else 1)
