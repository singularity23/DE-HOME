import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

import unittest
import test_LoadBalancing as tb

loader = unittest.TestLoader()
suite = unittest.TestSuite()
suite.addTests(loader.loadTestsFromTestCase(tb.TestUtilityFunctions))
suite.addTests(loader.loadTestsFromTestCase(tb.TestLoadBalancingPickSections))

runner = unittest.TextTestRunner(verbosity=2)
result = runner.run(suite)

# Generate reports
import json
from datetime import datetime

with open("test_results.json", "w") as f:
    json.dump(
        {
            "timestamp": datetime.now().isoformat(),
            "tests_run": result.testsRun,
            "successes": result.testsRun - len(result.failures) - len(result.errors),
            "failures": len(result.failures),
            "errors": len(result.errors),
            "success": result.wasSuccessful(),
        },
        f,
        indent=2,
    )

print("\n✓ Reports saved:")
print("  - test_results.json")
print("  - test_results.txt (created by main test file)")
