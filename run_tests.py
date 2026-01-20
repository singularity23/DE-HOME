#!/usr/bin/env python
"""
Test runner with report generation for LoadBalancing tests
"""
import sys
import os

# Add the Python assets directory to path
python_dir = os.path.join(
    os.path.dirname(__file__), "sites", "de", "SiteAssets", "python"
)
sys.path.insert(0, python_dir)

# Now run the test module
os.chdir(python_dir)
import test_LoadBalancing
