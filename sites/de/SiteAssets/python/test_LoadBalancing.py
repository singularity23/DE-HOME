import unittest
from unittest.mock import patch, MagicMock
import sys
import types


# ============================================================================
# Fake cympy Module Structure - Replaces actual cympy library for testing
# IMPORTANT: Must be set up BEFORE importing LoadBalancing


# Enums module with device types and phases
class FakeDeviceType:
    """Enumeration of device types in the power system"""

    Transformer = 32
    AllDevices = 0
    Fuse = 6
    Recloser = 5
    Switch = 4
    Breaker = 3
    SeriesReactor = 35
    SpotLoad = 22
    Underground = 10
    OverheadLine = 11


class FakePhase:
    """Phase enumeration: single phases and combinations"""

    A = "A"
    B = "B"
    C = "C"
    ABC = "ABC"
    AB = "AB"
    BC = "BC"
    AC = "AC"


class FakeIterationOption:
    """Network iteration direction options"""

    Downstream = 0
    Upstream = 1


class FakeEnums:
    """Fake cympy.enums module"""

    DeviceType = FakeDeviceType()
    Phase = FakePhase()
    IterationOption = FakeIterationOption()
    EquipmentType = MagicMock()
    LoadType = MagicMock()
    PhaseType = MagicMock()


# Simulation objects
class FakeLoadValue:
    """Represents a load value with magnitude and power factor"""

    def __init__(self, magnitude=0.0, pf=1.0):
        self.magnitude = magnitude
        self.pf = pf
        self.Value1 = magnitude


class FakeMeter:
    """Fake meter object for load tracking"""

    def __init__(self):
        self.DemandA = FakeLoadValue(10.0, 0.95)
        self.DemandB = FakeLoadValue(5.0, 0.95)
        self.DemandC = FakeLoadValue(15.0, 0.95)
        self.LoadValueType = 1

    def __repr__(self):
        return f"FakeMeter(A={self.DemandA.magnitude}, B={self.DemandB.magnitude}, C={self.DemandC.magnitude})"


class FakeLoadAllocation:
    """Fake load allocation simulator"""

    def __init__(self):
        self.method = "KVAMethod"

    def SetValue(self, value, property_path):
        """Set a property value"""
        setattr(self, property_path, value)
        self.method = value

    def GetValue(self, property_path):
        """Get a property value"""
        return getattr(self, property_path, None)

    def Run(self, network_ids):
        """Execute load allocation on specified networks"""
        pass


class FakeLoadFlow:
    """Fake load flow simulator"""

    def __init__(self):
        self.results = {}

    def Run(self, network_ids):
        """Execute load flow on specified networks"""
        pass


class FakeSection:
    """Fake section/line segment in the network"""

    def __init__(self, section_id="S1", phase="A"):
        self.ID = section_id
        self.phase = phase
        self.devices = []

    def GetValue(self, property_name):
        """Get section property"""
        if property_name == "Phase":
            return self.phase
        return None

    def SetValue(self, value, property_name):
        """Set section property"""
        if property_name == "Phase":
            self.phase = value

    def ListDevices(self):
        """List devices in this section"""
        return self.devices


class FakeDevice:
    """Fake device (breaker, transformer, etc.)"""

    def __init__(self, device_id="D1", device_type=3):
        self.DeviceNumber = device_id
        self.DeviceType = device_type
        self.EquipmentID = f"EQ_{device_id}"
        self.EquipmentType = device_type
        self.properties = {}

    def SetValue(self, value, property_path):
        """Set device property"""
        self.properties[property_path] = value

    def GetValue(self, property_path):
        """Get device property"""
        return self.properties.get(property_path, None)


class FakeNetworkIterator:
    """Fake network iterator for traversing the power system"""

    def __init__(self, start_node="ROOT", direction=0):
        self.start_node = start_node
        self.direction = direction
        self._visited = False
        self._section = FakeSection("S1", "A")
        self._phase = "A"
        self._from_phase = "ABC"
        self._devices = [FakeDevice("D1", FakeDeviceType.Fuse)]

    def Next(self):
        """Advance to next element in network"""
        if not self._visited:
            self._visited = True
            return True
        return False

    def GetSection(self):
        """Get current section"""
        return self._section

    def GetPhase(self):
        """Get current phase"""
        return self._phase

    def GetFromPhase(self):
        """Get upstream phase"""
        return self._from_phase

    def GetDevices(self):
        """Get devices in current section"""
        return self._devices


class FakeStudy:
    """Fake cympy.study module"""

    def __init__(self):
        self.nodes = {}
        self.devices = {}
        self.meters = {}

    def QueryInfoDevice(self, keyword, device_number, device_type):
        """Query device information"""
        queries = {
            "IAout": 10.0,
            "IBout": 5.0,
            "ICout": 15.0,
            "IsMeter": "Yes",
            "IsMainLine": "Yes",
            "PhaseCount": "3",
        }
        return queries.get(keyword, None)

    def QueryInfoNode(self, keyword, node_id):
        """Query node information"""
        queries = {
            "$NetworkId$": "TEST_NETWORK",
            "$UpstreamSourceNodeID$": "SOURCE",
            "KVLLBase": 12.47,
            "PhaseCount": 3,
            "UpstreamSourceID": "TEST_NETWORK",
        }
        return queries.get(keyword, node_id)

    def NetworkIterator(self, start_node, iteration_option):
        """Create a network iterator"""
        return FakeNetworkIterator(start_node, iteration_option)

    def ListNodes(self):
        """List all nodes in the network"""
        node1 = MagicMock()
        node1.ID = "STUDY_POINT1"
        return [node1]

    def ListDevices(self, device_type, network_id):
        """List devices of a specific type"""
        return []

    def ListNetworks(self):
        """List all networks"""
        return ["TEST_NETWORK"]

    def GetDevice(self, device_id, device_type):
        """Get a specific device"""
        return FakeDevice(device_id, device_type)

    def GetSection(self, section_id):
        """Get a specific section"""
        return FakeSection(section_id)

    def GetMeter(self, device_id, device_type):
        """Get meter for a device"""
        return FakeMeter()

    def AddMeter(self, device_number, device_type, meter, overwrite=True):
        """Add or update a meter"""
        self.meters[device_number] = meter

    def SetValueDevice(self, value, property_path, device_number, device_type):
        """Set device property"""
        pass

    def GetValueDevice(self, property_path, device_number, device_type):
        """Get device property"""
        return None

    def GetModificationsCount(self):
        """Get number of unsaved modifications"""
        return 0

    def ListModifications(self):
        """List all modifications"""
        return []

    def Undo(self):
        """Undo last modification"""
        pass


# Reporting module
class FakeCellFormat:
    """Fake cell formatting options"""

    def __init__(self):
        self.BackColor = None
        self.Bold = False


class FakeCell:
    """Base fake cell for reports"""

    def __init__(self, value):
        self.value = value


class FakeSectionCell(FakeCell):
    """Fake section identifier cell"""

    pass


class FakeFloatCell(FakeCell):
    """Fake floating point number cell"""

    def __init__(self, value, decimals=2):
        super().__init__(value)
        self.decimals = decimals


class FakeStringCell(FakeCell):
    """Fake string cell"""

    def __init__(self, value, cf=None):
        super().__init__(value)
        self.format = cf


class FakeNetworkCell(FakeCell):
    """Fake network identifier cell"""

    pass


class FakeCustomReport:
    """Fake custom report generator"""

    def __init__(self, report_id="report", headers=None):
        self.report_id = report_id
        self.headers = headers or []
        self.rows = []

    def AddRow(self, row_cells):
        """Add a row of cells to the report"""
        self.rows.append(row_cells)

    def addRow(self, row_cells):
        """Alternate method name for adding rows"""
        self.rows.append(row_cells)

    def Show(self):
        """Display the report"""
        pass


class FakeReportingModule:
    """Fake cympy.rm (reporting) module"""

    @staticmethod
    def SectionCell(section_id):
        return FakeSectionCell(section_id)

    @staticmethod
    def FloatCell(value, decimals=2):
        return FakeFloatCell(value, decimals)

    @staticmethod
    def StringCell(value, cf=None):
        return FakeStringCell(value, cf)

    @staticmethod
    def NetworkCell(network_id):
        return FakeNetworkCell(network_id)

    @staticmethod
    def CellFormat():
        return FakeCellFormat()

    @staticmethod
    def CustomReport(report_id="report", headers=None):
        return FakeCustomReport(report_id, headers)


# Application module
class FakeApp:
    """Fake cympy.app module"""

    @staticmethod
    def ActivateRefresh(enabled):
        """Enable or disable automatic refresh"""
        pass

    @staticmethod
    def GetKeyword(keyword):
        """Get system keyword information"""
        mock_keyword = MagicMock()
        mock_keyword.Unit = "m"
        return mock_keyword


class FakeGetInputParameter:
    """Fake input parameter handler"""

    _parameters = {
        "NetworkID": "TEST_NETWORK",
        "ImaxA": 10.0,
        "ImaxB": 5.0,
        "ImaxC": 15.0,
        "PFA": 95.0,
        "PFB": 90.0,
        "PFC": 85.0,
        "Report_Location": ".",
    }

    @staticmethod
    def __call__(param_name):
        """Get input parameter value"""
        return FakeGetInputParameter._parameters.get(param_name, None)


# Assemble the fake cympy module
cympy_mock = types.ModuleType("cympy")
cympy_mock.study = FakeStudy()
cympy_mock.enums = FakeEnums()
cympy_mock.sim = types.ModuleType("cympy.sim")
cympy_mock.sim.LoadAllocation = FakeLoadAllocation
cympy_mock.sim.LoadFlow = FakeLoadFlow
cympy_mock.sim.Meter = FakeMeter
cympy_mock.sim.LoadValue = FakeLoadValue
cympy_mock.rm = FakeReportingModule()
cympy_mock.app = FakeApp()
cympy_mock.GetInputParameter = FakeGetInputParameter()

sys.modules["cympy"] = cympy_mock

# Import the module under test AFTER cympy mock is registered
import LoadBalancing as lb_mod


def _write_print(file, content):
    """Helper to write print statements to a file-like object"""
    file.write(content + "\n")
    print(content)


class TestUtilityFunctions(unittest.TestCase):
    """Test core utility functions independent of cympy integration"""

    def test_CombineDicts_merges_common_keys(self):
        """Test basic dictionary merge for phase data"""
        d1 = {"A": {"x": 1}, "B": {"y": 2}}
        d2 = {"A": {"z": 3}, "B": {"w": 4}}
        result = lb_mod.CombineDicts(d1, d2)

        self.assertEqual(result["A"], {"x": 1, "z": 3})
        self.assertEqual(result["B"], {"y": 2, "w": 4})
        self.assertEqual(result, {"A": {"x": 1, "z": 3}, "B": {"y": 2, "w": 4}})

    def test_CombineDicts_empty_dicts(self):
        """Test merging with empty dictionaries"""
        d1 = {}
        d2 = {"A": {"z": 3}}
        result = lb_mod.CombineDicts(d1, d2)

        self.assertEqual(result, {"A": {"z": 3}})

    def test_ClosestSumOfSubset_exact_target(self):
        """Test finding subset that exactly matches target"""
        nums = [1.0, 2.0, 3.0, 4.0]
        target = 5.0
        closest_sum, indices = lb_mod.ClosestSumOfSubset(nums, target)
        print(closest_sum, indices)
        self.assertTrue(abs(closest_sum - 5.0) < 1e-6)
        self.assertTrue(sum(nums[i] for i in indices) == closest_sum)

    def test_ClosestSumOfSubset_approximate_target(self):
        """Test finding closest subset when exact match not possible"""
        nums = [10.0, 20.0, 30.0, 40.0]
        target = 45.0
        closest_sum, indices = lb_mod.ClosestSumOfSubset(nums, target)

        # Should find 50 (20+30) or 40 as closest
        self.assertTrue(closest_sum in [40.0, 50.0])

    def test_ClosestSumOfSubset_empty_input(self):
        """Test empty input handling"""
        closest_sum, indices = lb_mod.ClosestSumOfSubset([], 10.0)

        self.assertEqual(closest_sum, 0.0)
        self.assertEqual(indices, [])

    def test_ClosestSumOfSubset_invalid_values(self):
        """Test filtering of invalid numeric values"""
        nums = ["not_a_number", 5.0, None, 10.0]
        target = 15.0
        closest_sum, indices = lb_mod.ClosestSumOfSubset(nums, target)

        # Should only consider 5.0 and 10.0
        self.assertIn(closest_sum, [5.0, 10.0, 15.0])

    def test_ClosestSumOfSubset_with_max_elements(self):
        """Test subset size constraint"""
        nums = [1.0, 2.0, 3.0, 4.0, 5.0]
        target = 10.0
        closest_sum, indices = lb_mod.ClosestSumOfSubset(nums, target, max_elements=2)

        self.assertLessEqual(len(indices), 2)

    def test_GetTarget_returns_closest_sum(self):
        """Test GetTarget wrapper converts dict to list"""
        d = {"a": 1.0, "b": 2.0, "c": 3.0}
        target = 4.0
        result = lb_mod.GetTarget(d, target)

        values = [v for k, v in result]
        total = sum(values)
        # Result should be within 1 of target for phase imbalance
        self.assertTrue(abs(total - target) <= 1.0)

    def test_GetTarget_empty_dict(self):
        """Test GetTarget with empty input"""
        result = lb_mod.GetTarget({}, 10.0)
        self.assertEqual(result, [])

    def test_GetTarget_returns_tuples(self):
        """Test that GetTarget returns (key, value) tuples"""
        d = {"section1": 5.0, "section2": 10.0}
        result = lb_mod.GetTarget(d, 12.0)

        for item in result:
            self.assertIsInstance(item, tuple)
            self.assertEqual(len(item), 2)

    def test_QueryWithFallback_returns_float_or_original(self):
        """Test fallback mechanism for querying multiple keywords"""

        def fake_query(key, *args):
            if key == "float":
                return "3.14"
            else:
                raise ValueError()

        with patch("locale.atof", side_effect=lambda x: float(x)):
            result = lb_mod.QueryWithFallback(fake_query, ["float", "fail"])
            self.assertEqual(result[0], 3.14)
            self.assertIsNone(result[1])

    def test_QueryWithFallback_all_keywords_fail(self):
        """Test behavior when all keywords fail"""

        def fake_query(key, *args):
            raise ValueError(f"No value for {key}")

        with patch("locale.atof", side_effect=ValueError):
            result = lb_mod.QueryWithFallback(fake_query, ["key1", "key2"])
            self.assertTrue(all(item is None for item in result))


class TestLoadBalancingPickSections(unittest.TestCase):
    """Test suite for LoadBalancing section picking and phase balancing"""

    def setUp(self):
        """Initialize test fixtures with properly mocked cympy modules"""
        # Access the fake modules we created
        study = cympy_mock.study
        enums = cympy_mock.enums
        sim = cympy_mock.sim
        rm = cympy_mock.rm
        app = cympy_mock.app

        # Configure enums for the test
        study.nodes_dict = {}
        study.devices_dict = {}

        # Patch GetInputParameter with test values
        test_params = {
            "NetworkID": "TEST_NETWORK",
            "ImaxA": 10.0,
            "ImaxB": 5.0,
            "ImaxC": 15.0,
            "PFA": 95.0,
            "PFB": 90.0,
            "PFC": 85.0,
            "Report_Location": ".",
        }
        FakeGetInputParameter._parameters = test_params

        # Patch QueryDevices to return realistic phase currents
        self.patcher_qd = patch(
            "LoadBalancing.QueryDevices", return_value=[10.0, 0.0, 0.0]
        )
        self.mock_qd = self.patcher_qd.start()

        # Patch QueryNodes to return realistic node data
        self.patcher_qn = patch(
            "LoadBalancing.QueryNodes",
            return_value=[10.0, 5.0, 15.0, 0.0, 10.0, 95.0, 90.0, 85.0, 0.0, 0.0, 0.0],
        )
        self.mock_qn = self.patcher_qn.start()

        # Patch locale for decimal parsing
        self.patcher_locale = patch("locale.setlocale")
        self.mock_locale = self.patcher_locale.start()

    def tearDown(self):
        """Clean up patches after each test"""
        self.patcher_qd.stop()
        self.patcher_qn.stop()
        self.patcher_locale.stop()

    def test_PickSections_balances_sections(self):
        """Test that PickSections correctly balances loads across phases"""
        lb = lb_mod.LoadBalancing()
        sec_dict = {"A": {"S1": 10.0}, "B": {}, "C": {}}
        sol, updated = lb.PickSections(sec_dict, 10.0, 5.0, 15.0, 10.0)

        self.assertIsInstance(sol, dict)
        self.assertIsInstance(updated, dict)
        self.assertEqual(len(updated), 3)  # Three phases

    def test_PickSections_2_balances_sections(self):
        """Test iterative balancing method"""
        lb = lb_mod.LoadBalancing()
        sec_dict = {"A": {"S1": 10.0}, "B": {"S2": 5.0}, "C": {"S3": 15.0}}
        picks, updated = lb.PickSections_2(sec_dict, 10.0, 5.0, 15.0, 10.0)

        self.assertIsInstance(picks, dict)
        self.assertIsInstance(updated, dict)
        self.assertIn("A", updated)
        self.assertIn("B", updated)
        self.assertIn("C", updated)

    def test_GetSinglePhaseSections_returns_list(self):
        """Test that GetSinglePhaseSections returns proper structure"""
        lb = lb_mod.LoadBalancing()
        result = lb.GetSinglePhaseSections()

        self.assertIsInstance(result, list)
        for dict_item in result:
            self.assertIsInstance(dict_item, dict)
            self.assertTrue(all(key in dict_item for key in ["A", "B", "C"]))

    def test_RunCYMEIteration_returns_dict(self):
        """Test network iteration returns phase-keyed dictionary"""
        lb = lb_mod.LoadBalancing()
        result = lb.RunCYMEIteration("STUDY_POINT1")

        self.assertIsInstance(result, dict)
        self.assertIn("A", result)
        self.assertIn("B", result)
        self.assertIn("C", result)

    def test_TransferLoad_updates_devices(self):
        """Test load transfer updates device phases"""
        lb = lb_mod.LoadBalancing()
        fake_file = MagicMock()

        # Create a fake section with proper interface
        fake_section = FakeSection("S1", "A")
        fake_device = FakeDevice("D1", FakeDeviceType.Fuse)
        fake_device.ClosedPhase = "A"
        fake_section.devices = [fake_device]

        dict_sect = {"A": [(fake_section, 10.0)]}
        result = lb.TransferLoad(fake_file, dict_sect)

        self.assertIsInstance(result, list)
        self.assertTrue(len(result) > 0)

    def test_ClosestSumOfSubset_basic(self):
        """Test dynamic programming subset sum algorithm"""
        nums = [1.0, 2.0, 3.0, 4.0]
        target = 5.0
        closest_sum, indices = lb_mod.ClosestSumOfSubset(nums, target)

        self.assertTrue(abs(closest_sum - 5.0) < 1e-6)
        self.assertTrue(sum(nums[i] for i in indices) == closest_sum)

    def test_ClosestSumOfSubset_empty_input(self):
        """Test handling of empty input"""
        closest_sum, indices = lb_mod.ClosestSumOfSubset([], 10.0)

        self.assertEqual(closest_sum, 0.0)
        self.assertEqual(indices, [])

    def test_ClosestSumOfSubset_with_max_elements(self):
        """Test subset sum with element limit"""
        nums = [1.0, 2.0, 3.0, 4.0, 5.0]
        closest_sum, indices = lb_mod.ClosestSumOfSubset(nums, 10.0, max_elements=2)

        self.assertLessEqual(len(indices), 2)

    def test_GetTarget_returns_closest_sum(self):
        """Test GetTarget wrapper around ClosestSumOfSubset"""
        d = {"a": 1.0, "b": 2.0, "c": 3.0}
        target = 4.0
        result = lb_mod.GetTarget(d, target)

        values = [v for k, v in result]
        total = sum(values)
        # Result should be within 1 of target
        self.assertTrue(abs(total - 4.0) <= 1.0)

    def test_GetTarget_empty_dict(self):
        """Test GetTarget with empty dictionary"""
        result = lb_mod.GetTarget({}, 10.0)

        self.assertEqual(result, [])

    def test_CombineDicts_merges_common_keys(self):
        """Test dictionary merging for multiple phases"""
        d1 = {"A": {"x": 1}, "B": {"y": 2}}
        d2 = {"A": {"z": 3}, "B": {"w": 4}}
        result = lb_mod.CombineDicts(d1, d2)

        self.assertEqual(result["A"], {"x": 1, "z": 3})
        self.assertEqual(result["B"], {"y": 2, "w": 4})

    def test_CombineDicts_non_overlapping(self):
        """Test merging dicts with no common keys"""
        d1 = {"A": {"x": 1}}
        d2 = {"B": {"y": 2}}
        result = lb_mod.CombineDicts(d1, d2)

        # CombineDicts only merges keys from dict1, so dict2's keys won't be added
        self.assertIn("A", result)
        self.assertNotIn("B", result)
        self.assertEqual(result["A"], {"x": 1})


if __name__ == "__main__":
    import json
    import os
    from datetime import datetime

    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    suite.addTests(loader.loadTestsFromTestCase(TestUtilityFunctions))
    suite.addTests(loader.loadTestsFromTestCase(TestLoadBalancingPickSections))

    # Run tests and capture results
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Get the directory of this test file for report output
    test_dir = os.path.dirname(os.path.abspath(__file__))

    # Generate JSON report
    test_results = {
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

    json_path = os.path.join(test_dir, "test_results.json")
    with open(json_path, "w") as f:
        json.dump(test_results, f, indent=2)

    print(f"\n✓ Test report saved to: {json_path}")

    # Save text report
    txt_path = os.path.join(test_dir, "test_results.txt")
    with open(txt_path, "w") as f:
        f.write(f"Test Results - {datetime.now().isoformat()}\n")
        f.write("=" * 70 + "\n\n")
        f.write(f"Tests run: {result.testsRun}\n")
        f.write(
            f"Successes: {result.testsRun - len(result.failures) - len(result.errors)}\n"
        )
        f.write(f"Failures: {len(result.failures)}\n")
        f.write(f"Errors: {len(result.errors)}\n")
        f.write(f"Status: {'PASS' if result.wasSuccessful() else 'FAIL'}\n\n")

        if result.failures:
            f.write("FAILURES:\n")
            f.write("-" * 70 + "\n")
            for test, error in result.failures:
                f.write(f"{test}:\n{error}\n\n")

        if result.errors:
            f.write("ERRORS:\n")
            f.write("-" * 70 + "\n")
            for test, error in result.errors:
                f.write(f"{test}:\n{error}\n\n")

    print(f"✓ Test report saved to: {txt_path}")

    sys.exit(0 if result.wasSuccessful() else 1)
