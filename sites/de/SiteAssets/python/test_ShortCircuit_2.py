# Tests for ShortCircuit_2.py
# Run with: python -m pytest sites/de/SiteAssets/python/test_ShortCircuit_2.py -v
# Or: python -m unittest sites.de.SiteAssets.python.test_ShortCircuit_2 -v

import sys
import os
import types
import unittest
from unittest.mock import patch, MagicMock
from io import StringIO

# ---------------------------------------------------------------------------
# Fake cympy module - must be installed before importing ShortCircuit_2
# ---------------------------------------------------------------------------

# Enums used by ShortCircuit_2
class FakeIterationOption:
    Upstream = 1


class FakeIterationRestriction:
    StopOnOpen = 2


class FakeNodeType:
    Loop = 3


class FakeEquipmentType:
    Substation = 1
    OverheadLine = 11
    Cable = 10
    SeriesReactor = 9


class FakeDeviceType:
    Source = 2
    Breaker = 3
    Recloser = 4
    Fuse = 7
    Underground = 10
    OverheadLine = 11
    Transformer = 1
    AutoTransformer = 42
    TransformerByPhase = 33
    SeriesReactor = 9
    SpotLoad = 22


class FakeInstrumentType:
    AllInstruments = 0


class FakeEnums:
    IterationOption = FakeIterationOption
    IterationRestriction = FakeIterationRestriction
    NodeType = FakeNodeType
    EquipmentType = FakeEquipmentType
    DeviceType = FakeDeviceType
    InstrumentType = FakeInstrumentType


class FakeStudy:
    """Fake cympy.study (Std) - ListNodes must return [] so ShortCircuitStudy.__init__ does not raise."""

    def ListNodes(self, node_type=None):
        return []

    def ListNetworks(self):
        return ["TEST_NETWORK"]

    def QueryInfoNode(self, keyword, node_id):
        return None

    def QueryInfoDevice(self, keyword, dev_num, dev_type):
        return None

    def GetDevice(self, network_id, device_type):
        return MagicMock()

    def GetModificationsCount(self):
        return 0

    def Undo(self, n):
        pass

    def ListDevices(self, device_type, network_id):
        return []

    def ListInstruments(self, instrument_type, dev_num):
        return []

    def SetValueTopo(self, value, property_name, source_id):
        pass

    def SetValueDevice(self, value, prop, dev_num, dev_type):
        pass

    def NetworkIterator(self, start_node, iter_opt, iter_restrict):
        it = MagicMock()
        it.Next = MagicMock(return_value=False)
        return it


class FakeApp:
    @staticmethod
    def GetKeyword(keyword):
        m = MagicMock()
        m.Unit = "m"
        return m


class FakeEnv:
    BasePower_AC_MVA = 100.0


class FakeEq:
    @staticmethod
    def GetEquipment(eq_id, eq_type):
        m = MagicMock()
        m.GetValue = MagicMock(return_value=None)
        m.SetValue = MagicMock()
        return m


class FakeSim:
    class ShortCircuit:
        def __init__(self):
            self._values = {"AnalysisNetworks.SelectedNetworks": "1", "ParametersConfigurations.Count": "1", "ActiveConfigurationID": "cfg0"}

        def GetValue(self, path):
            return self._values.get(path, "")

        def SetValue(self, value, path):
            self._values[path] = value

        def Run(self):
            pass


# Build fake cympy and inject before import
cympy_fake = types.ModuleType("cympy")
cympy_fake.enums = FakeEnums()
cympy_fake.study = FakeStudy()
cympy_fake.app = FakeApp()
cympy_fake.env = FakeEnv()
cympy_fake.eq = FakeEq()
cympy_fake.sim = types.ModuleType("cympy.sim")
cympy_fake.sim.ShortCircuit = FakeSim.ShortCircuit
cympy_fake.GetInputParameter = MagicMock(return_value=None)

# Ensure cympy.study is the instance (ShortCircuit_2 uses Std = study)
sys.modules["cympy"] = cympy_fake

# Import after mock; use alias so we can patch cympy inside the module for some tests
import ShortCircuit_2 as sc2

# Re-expose for tests
ImpedanceCalculator = sc2.ImpedanceCalculator
QueryHelper = sc2.QueryHelper
EquipmentValueSetter = sc2.EquipmentValueSetter
StudyParameters = sc2.StudyParameters
ShortCircuitStudy = sc2.ShortCircuitStudy
ChromeBrowser = sc2.ChromeBrowser
BaseEquipment = sc2.BaseEquipment
CableEquipment = sc2.CableEquipment
ReactorEquipment = sc2.ReactorEquipment
ProtectionEquipment = sc2.ProtectionEquipment
TransformerEquipment = sc2.TransformerEquipment
SourceEquivalent = sc2.SourceEquivalent
FaultPoint = sc2.FaultPoint
device_handler = sc2.device_handler
EmissionStudy = sc2.EmissionStudy


# ---------------------------------------------------------------------------
# Test: ImpedanceCalculator (pure math, no mocks)
# ---------------------------------------------------------------------------
class TestImpedanceCalculator(unittest.TestCase):
    def test_calculate_impedance_basic(self):
        Z, X_R, KVLL, KVA = 5.0, 10.0, 12.47, 10000.0
        R, X = ImpedanceCalculator.calculate_impedance(Z, X_R_Ratio=X_R, KVLL=KVLL, KVA=KVA)
        self.assertIsInstance(R, float)
        self.assertIsInstance(X, float)
        self.assertGreater(R, 0)
        self.assertGreater(X, 0)
        # X = X_R * R
        self.assertAlmostEqual(X / R, X_R, places=5)

    def test_calculate_impedance_zero_x_r(self):
        R, X = ImpedanceCalculator.calculate_impedance(5.0, 0.0, 12.47, 10000.0)
        self.assertGreaterEqual(R, 0)
        self.assertAlmostEqual(X, 0.0, places=6)

    def test_calculate_impedance_2_positive_diff(self):
        Z1pu, Z2pu, BaseKVLL, BaseMVA = 0.1, 0.2, 12.47, 100.0
        result = ImpedanceCalculator.calculate_impedance_2(Z1pu, Z2pu, BaseKVLL, BaseMVA)
        self.assertGreater(result, 0)
        expected = (Z2pu - Z1pu) * (BaseKVLL ** 2) / BaseMVA
        self.assertAlmostEqual(result, expected, places=6)

    def test_calculate_impedance_2_negative_diff(self):
        Z1pu, Z2pu, BaseKVLL, BaseMVA = 0.3, 0.1, 12.47, 100.0
        result = ImpedanceCalculator.calculate_impedance_2(Z1pu, Z2pu, BaseKVLL, BaseMVA)
        self.assertLess(result, 0)


# ---------------------------------------------------------------------------
# Test: StudyParameters (dataclass)
# ---------------------------------------------------------------------------
class TestStudyParameters(unittest.TestCase):
    def test_study_parameters_creation(self):
        p = StudyParameters(
            customer_type="residential",
            connection="wye",
            disturbing="load",
            customer_load_mw=1.5,
            emission="Yes",
            feeder_limit=5.0,
        )
        self.assertEqual(p.customer_type, "residential")
        self.assertEqual(p.connection, "wye")
        self.assertEqual(p.customer_load_mw, 1.5)
        self.assertEqual(p.emission, "Yes")
        self.assertEqual(p.feeder_limit, 5.0)


# ---------------------------------------------------------------------------
# Test: ChromeBrowser (patch filesystem and webbrowser)
# ---------------------------------------------------------------------------
class TestChromeBrowser(unittest.TestCase):
    @patch("ShortCircuit_2.os.path.exists")
    def test_get_chrome_path_returns_none_when_not_found(self, mock_exists):
        mock_exists.return_value = False
        path = ChromeBrowser.get_chrome_path()
        self.assertIsNone(path)

    @patch("ShortCircuit_2.os.path.exists")
    def test_get_chrome_path_returns_path_when_found(self, mock_exists):
        mock_exists.return_value = True
        path = ChromeBrowser.get_chrome_path()
        self.assertIsNotNone(path)

    @patch("ShortCircuit_2.webbrowser.open_new")
    @patch.object(ChromeBrowser, "get_chrome_path", return_value=None)
    @patch.object(ChromeBrowser, "register_chrome", return_value=False)
    @patch("ShortCircuit_2.webbrowser.get", side_effect=None)
    def test_open_url_fallback_opens_default_browser(self, mock_get, mock_reg, mock_get_path, mock_open):
        import webbrowser
        mock_get.side_effect = webbrowser.Error("no chrome")
        result = ChromeBrowser.open_url("https://example.com")
        self.assertFalse(result)
        mock_open.assert_called_once_with("https://example.com")


# ---------------------------------------------------------------------------
# Test: QueryHelper (mock query function)
# ---------------------------------------------------------------------------
class TestQueryHelper(unittest.TestCase):
    def test_query_with_fallback_numeric_results(self):
        def fake_query(kw, *args):
            return "1.5" if kw == "a" else "2.25"
        result = QueryHelper.query_with_fallback(fake_query, ["a", "b"])
        self.assertEqual(len(result), 2)
        self.assertIn(result[0], (1.5, "1.5"))  # locale.atof or raw
        self.assertIn(result[1], (2.25, "2.25"))

    def test_query_with_fallback_non_numeric_passthrough(self):
        def fake_query(kw, *args):
            return "not_a_number"
        result = QueryHelper.query_with_fallback(fake_query, ["x"])
        self.assertEqual(result, ["not_a_number"])


# ---------------------------------------------------------------------------
# Test: EquipmentValueSetter (mock eq object)
# ---------------------------------------------------------------------------
class TestEquipmentValueSetter(unittest.TestCase):
    def test_set_value_dev_eqt_calls_setvalue(self):
        mock_eq = MagicMock()
        value_property_setlist = [(10.0, "R1"), (0.5, "X1")]
        EquipmentValueSetter.set_value_dev_eqt(value_property_setlist, mock_eq)
        self.assertEqual(mock_eq.SetValue.call_count, 2)
        mock_eq.SetValue.assert_any_call(10.0, "R1")
        mock_eq.SetValue.assert_any_call(0.5, "X1")

    def test_set_source_value_calls_setvaluetopo(self):
        with patch.object(sc2.Std, "SetValueTopo") as mock_topo:
            value_property_setlist = [(1.0, "R0"), (2.0, "X0")]
            EquipmentValueSetter.set_source_value(value_property_setlist, "SOURCE_ID")
            self.assertEqual(mock_topo.call_count, 2)


# ---------------------------------------------------------------------------
# Test: ShortCircuitStudy (with mocked cympy so __init__ succeeds)
# ---------------------------------------------------------------------------
class TestShortCircuitStudy(unittest.TestCase):
    def test_init_succeeds_when_no_loop_nodes(self):
        # FakeStudy.ListNodes returns [] so no RuntimeError
        sc = ShortCircuitStudy()
        self.assertEqual(sc.SourceName, "")
        self.assertEqual(sc.NetworkID, "")
        self.assertEqual(sc.NominalVoltage, 12.47)
        self.assertEqual(sc.OperatingVoltage, 12.6)
        self.assertIsNone(sc.SC_Sim)
        self.assertTrue(sc.FaultImpedance)
        self.assertEqual(sc.NewFeeder, "No")

    def test_fault_values_constants(self):
        self.assertEqual(ShortCircuitStudy.FAULT_VALUES[False], [0, 0, 0, 0])
        self.assertEqual(ShortCircuitStudy.FAULT_VALUES[True], [40, 0, 8, 0])

    def test_create_source_set_list(self):
        sc = ShortCircuitStudy()
        sc.OperatingVoltage = 12.6
        sc.Source_R0, sc.Source_X0 = 1.0, 2.0
        sc.Source_R1, sc.Source_X1 = 0.5, 1.0
        sc.IMPEDANCE_UNIT = "Ohms"
        lst = sc._create_source_set_list()
        self.assertIsInstance(lst, list)
        self.assertEqual(len(lst), 11)
        # Operating voltage LN = 12.6 / sqrt(3)
        import math
        expected_ln = 12.6 / math.sqrt(3)
        self.assertAlmostEqual(lst[0][0], expected_ln, places=5)
        self.assertEqual(lst[0][1], "OperatingVoltageA")
        self.assertEqual(lst[4][1], "ImpedanceUnit")
        self.assertEqual(lst[5][0], 1.0)
        self.assertEqual(lst[6][0], 2.0)
        self.assertEqual(lst[7][0], 0.5)
        self.assertEqual(lst[8][0], 1.0)

    def test_create_sc_set_list(self):
        sc = ShortCircuitStudy()
        sc.LGFaultResistance, sc.LGFaultReactance = 40.0, 0.0
        sc.LLLFaultResistance, sc.LLLFaultReactance = 8.0, 0.0
        sc.PREFAULT_VOLTAGE = ["BaseVoltage", "OperatingVoltage"]
        lst = sc._create_sc_set_list(0)
        self.assertEqual(len(lst), 5)
        self.assertEqual(lst[0][1], "ParametersConfigurations[0].LGFaultResistanceOHMS")
        self.assertAlmostEqual(lst[0][0], 40.0)
        self.assertAlmostEqual(lst[2][0], 8.0)

    def test_get_file_name_sets_rep_loc(self):
        sc = ShortCircuitStudy()
        sc.Path = os.path.join(os.path.dirname(__file__) or ".", "output")
        sc._get_file_name("TEST_SOURCE")
        self.assertIn("SC-Report-TEST_SOURCE-", sc.Rep_Loc)
        self.assertTrue(sc.Rep_Loc.endswith(".txt"))
        self.assertIn(sc.Path, sc.Rep_Loc)

    def test_setup_table_headers(self):
        sc = ShortCircuitStudy()
        sc.NetworkID = "NET1"
        sc.LEN_UNIT = "m"
        sc._setup_table_headers()
        self.assertIn("NET1", sc.table_header_1)
        self.assertIn("R1", sc.table_header_2)
        self.assertIn("Equipment Type", sc.table_header_2)
        self.assertTrue(len(sc.table_separator) > 0)


# ---------------------------------------------------------------------------
# Test: device_handler mapping
# ---------------------------------------------------------------------------
class TestDeviceHandler(unittest.TestCase):
    def test_device_handlers_map_expected_types(self):
        # device_handler uses a dict mapping DeviceType -> class; we only test the mapping exists
        # by checking that device_handler is callable and the study has query_table
        sc = ShortCircuitStudy()
        self.assertTrue(hasattr(sc, "query_table"))
        self.assertTrue(hasattr(sc, "NETWORK_PARAM"))
        self.assertTrue(hasattr(sc, "EQUIP_LIST"))
        self.assertTrue(callable(device_handler))


# ---------------------------------------------------------------------------
# Test: BaseEquipment (with mock Device and kwargs)
# ---------------------------------------------------------------------------
class TestBaseEquipment(unittest.TestCase):
    def test_base_equipment_info_table_appends_row(self):
        mock_device = MagicMock()
        mock_device.GetObjType.return_value = "Cable"
        mock_device.EquipmentID = "EQ1"
        mock_device.EquipmentType = 10
        mock_device.DeviceType = 10
        mock_device.DeviceNumber = "D1"
        mock_device.GetObjType.return_value = "Cable"
        with patch.object(sc2.Eqt, "GetEquipment", return_value=MagicMock()):
            imp_defaults = (0.1, 0.2, 0.05, 0.1, 0, 0, 0, 0, 100.0)
            eq = BaseEquipment(
                Device=mock_device,
                Node=MagicMock(),
                info_toNode=imp_defaults,
                info_fromNode=(0.2, 0.4, 0.1, 0.2, 0, 0, 0, 0, 200.0),
            )
        NETWORK_PARAM = []
        eq.info_table(NETWORK_PARAM)
        self.assertEqual(len(NETWORK_PARAM), 1)
        row = NETWORK_PARAM[0]
        self.assertIn("Cable", row[0])
        self.assertIn("EQ1", row[0])
        self.assertEqual(row[1], 100.0)  # Length = FN_Distance - TN_Distance
        self.assertAlmostEqual(row[3], 0.1)  # R1 = R1FN - R1TN
        self.assertAlmostEqual(row[4], 0.2)  # X1

    def test_base_equipment_eq_data_appends_once(self):
        mock_device = MagicMock()
        mock_device.GetObjType.return_value = "Fuse"
        mock_device.EquipmentID = "F1"
        mock_device.EquipmentType = 7
        mock_device.DeviceType = 7
        mock_device.DeviceNumber = "D1"
        with patch.object(sc2.Eqt, "GetEquipment", return_value=MagicMock()):
            imp = (0, 0, 0, 0, 0, 0, 0, 0, 0)
            eq = BaseEquipment(
                Device=mock_device,
                Node=MagicMock(),
                info_toNode=imp,
                info_fromNode=imp,
            )
        EQUIP_LIST = []
        eq.eq_data(EQUIP_LIST)
        self.assertEqual(len(EQUIP_LIST), 1)
        self.assertEqual(EQUIP_LIST[0][0], "F1")
        self.assertEqual(EQUIP_LIST[0][1], eq)
        eq.eq_data(EQUIP_LIST)  # same EqID should not duplicate (all(... not in ...))
        self.assertEqual(len(EQUIP_LIST), 1)

    def test_base_equipment_store_info_raises_not_implemented(self):
        mock_device = MagicMock()
        mock_device.GetObjType.return_value = "X"
        mock_device.EquipmentID = "E1"
        mock_device.EquipmentType = 0
        mock_device.DeviceType = -1
        mock_device.DeviceNumber = "D1"
        with patch.object(sc2.Eqt, "GetEquipment", return_value=MagicMock()):
            eq = BaseEquipment(Device=mock_device, Node=MagicMock(), info_toNode=(0,) * 9, info_fromNode=(0,) * 9)
        with self.assertRaises(NotImplementedError):
            eq.store_info(StringIO())


# ---------------------------------------------------------------------------
# Test: CableEquipment._consolidate_cable_entry (logic only)
# ---------------------------------------------------------------------------
class TestCableEquipmentConsolidation(unittest.TestCase):
    def test_consolidate_cable_entry_merges_length_and_impedance(self):
        mock_device = MagicMock()
        mock_device.GetObjType.return_value = "Cable"
        mock_device.EquipmentID = "3P_G15_500"
        mock_device.EquipmentType = 10
        mock_device.DeviceType = 10
        mock_device.DeviceNumber = "D1"
        with patch.object(sc2.Std, "QueryInfoDevice", return_value=None):
            with patch.object(sc2.Eqt, "GetEquipment", return_value=MagicMock()):
                with patch.object(QueryHelper, "get_value_equipment", return_value=[0.1, 0.2, 0.05, 0.1, 500, "", ""]):
                    imp = (0.0, 0.0, 0.0, 0.0, 0, 0, 0, 0, 0.0)
                    eq = CableEquipment(
                        Device=mock_device,
                        Node=MagicMock(),
                        info_toNode=imp,
                        info_fromNode=(0.1, 0.2, 0.05, 0.1, 0, 0, 0, 0, 50.0),
                    )
        NETWORK_PARAM = [
            ["Cable: 3P_G15_500", 50.0, 0.0, 0.1, 0.2, 0.05, 0.1, 0.0, 0.0, 0.0, 0.0],
        ]
        eq._consolidate_cable_entry(NETWORK_PARAM)
        self.assertEqual(len(NETWORK_PARAM), 1)
        row = NETWORK_PARAM[0]
        self.assertEqual(row[1], 50.0 + eq.Length)  # merged length
        self.assertAlmostEqual(row[3], 0.1 + 0.1)  # R1 summed
        self.assertAlmostEqual(row[4], 0.2 + 0.2)  # X1 summed


# ---------------------------------------------------------------------------
# Test: FaultPoint (with mocked QueryHelper.query_nodes)
# ---------------------------------------------------------------------------
class TestFaultPoint(unittest.TestCase):
    def test_fault_point_initializes_with_mocked_query(self):
        # Order matches FAULT_CURRENT_INFO: LLLamp, LGamp, LLamp, LLGamp, LLGT, LLLampZ, LGampZ, LLampZ, LLGampZ, LLGTZ, PrefaultVoltage, R1ohm, X1ohm, R0ohm, X0ohm, Distance, Latitude, Longitude
        fault_data = [
            1000.0, 800.0, 900.0, 850.0, 850.0,  # LLL, LG, LL, LLG, LLGT (TIo = max(LG, LLGT) = 850)
            500.0, 400.0, 450.0, 425.0, 425.0,  # *Z variants (TIO_imp = max(LGampZ, LLGTZ) = 425)
            12.47, 0.1, 0.2, 0.05, 0.1, 150.0, 49.0, -123.0,
        ]
        with patch.object(QueryHelper, "query_nodes", return_value=fault_data):
            fp = FaultPoint("FAULT_NODE_1")
        self.assertEqual(fp.EqID, "FAULT_NODE_1")
        self.assertEqual(fp.data["Distance"], 150.0)
        self.assertEqual(fp.data["R1ohm"], 0.1)
        self.assertEqual(fp.TIo, 850.0)
        self.assertEqual(fp.TIO_imp, 425.0)


# ---------------------------------------------------------------------------
# Test: main() raises when no networks
# ---------------------------------------------------------------------------
class TestMain(unittest.TestCase):
    def test_main_raises_when_no_networks(self):
        with patch.object(sc2.Std, "ListNetworks", return_value=[]):
            with self.assertRaises(ValueError):
                sc2.main()
        with patch.object(sc2.Std, "ListNetworks", return_value=None):
            with self.assertRaises(ValueError):
                sc2.main()


if __name__ == "__main__":
    results_file = os.path.join(os.path.dirname(__file__), "test_results.txt")
    with open(results_file, "w", encoding="utf-8") as f:
        runner = unittest.TextTestRunner(stream=f, verbosity=2)
        suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
        result = runner.run(suite)
    # Also print to console
    with open(results_file, "r", encoding="utf-8") as f:
        print(f.read())
    sys.exit(0 if result.wasSuccessful() else 1)
