import unittest
from unittest.mock import patch, MagicMock
import sys
import types
from cympy import study, enums, sim, rm, app, GetInputParameter
import LoadBalancing as lb_mod

# Patch cympy imports before importing the module under test
cympy_mock = types.ModuleType('cympy')
setattr(cympy_mock, "study", MagicMock())
setattr(cympy_mock, "enums", MagicMock())
setattr(cympy_mock, "sim", MagicMock())
setattr(cympy_mock, "rm", MagicMock())
setattr(cympy_mock, "app", MagicMock())
setattr(cympy_mock, "GetInputParameter", MagicMock())
sys.modules['cympy'] = cympy_mock


class TestUtilityFunctions(unittest.TestCase):
  def test_CombineDicts_merges_common_keys(self):
    d1 = {'A': {'x': 1}, 'B': {'y': 2}}
    d2 = {'A': {'z': 3}, 'B': {'w': 4}}
    result = lb_mod.CombineDicts(d1, d2)
    self.assertEqual(result['A'], {'x': 1, 'z': 3})
    self.assertEqual(result['B'], {'y': 2, 'w': 4})

  def test_ClosestSumOfSubset_basic(self):
    nums = [1.0, 2.0, 3.0, 4.0]
    target = 5
    closest_sum, indices = lb_mod.ClosestSumOfSubset(nums, target)
    self.assertTrue(abs(closest_sum - 5) < 1e-6)
    self.assertTrue(sum(nums[i] for i in indices) == closest_sum)

  def test_GetTarget_returns_closest_sum(self):
    d = {'a': 1, 'b': 2, 'c': 3}
    target = 4
    result = lb_mod.GetTarget(d, target)
    values = [v for k, v in result]
    self.assertTrue(abs(sum(values) - 4) <= 1)

  def test_QueryWithFallback_returns_float_or_original(self):
    def fake_query(key, *args):
      if key == "float":
        return "3.14"
      else:
        raise ValueError()
    with patch('locale.atof', side_effect=lambda x: float(x)):
      result = lb_mod.QueryWithFallback(fake_query, ["float", "fail"])
      self.assertEqual(result[0], 3.14)
      self.assertIsNone(result[1])

class TestLoadBalancingPickSections(unittest.TestCase):
  def setUp(self):
    # Patch enums.Phase
    enums.Phase = type('Phase', (), {'A': 'A', 'B': 'B', 'C': 'C', 'ABC': 'ABC'})
    # Patch enums.DeviceType
    enums.DeviceType = type('DeviceType', (), {'Transformer': 'Transformer', 'AllDevices': 'AllDevices', 'Fuse': 'Fuse', 'Recloser': 'Recloser', 'Switch': 'Switch', 'Breaker': 'Breaker'})
    # Patch study.QueryInfoDevice and study.QueryInfoNode
    study.QueryInfoDevice = MagicMock()
    study.QueryInfoNode = MagicMock()
    # Patch sim.LoadAllocation and sim.LoadFlow
    sim.LoadAllocation = MagicMock(return_value=MagicMock())
    sim.LoadFlow = MagicMock(return_value=MagicMock())
    # Patch rm
    rm.SectionCell = MagicMock(side_effect=lambda x: x)
    rm.FloatCell = MagicMock(side_effect=lambda x, y: x)
    rm.StringCell = MagicMock(side_effect=lambda x, cf=None: x)
    rm.NetworkCell = MagicMock(side_effect=lambda x: x)
    rm.CustomReport = MagicMock(return_value=MagicMock(addRow=MagicMock(), Show=MagicMock()))
    rm.CellFormat = MagicMock(return_value=MagicMock())
    # Patch GetInputParameter
    self.patcher_gip = patch('LoadBalancing.GetInputParameter', side_effect=lambda x: {
      "NetworkID": "N1",
      "ImaxA": 10.0,
      "ImaxB": 5.0,
      "ImaxC": 15.0,
      "PFA": 95.0,
      "PFB": 90.0,
      "PFC": 85.0,
      "Report_Location": "."
    }[x])
    self.mock_gip = self.patcher_gip.start()
    # Patch study.ListNodes and ListNetworks
    node = MagicMock()
    node.ID = "STUDY_POINT1"
    study.ListNodes = MagicMock(return_value=[node])
    study.ListNetworks = MagicMock(return_value=["N1"])
    # Patch study.GetModificationsCount and ListModifications
    study.GetModificationsCount = MagicMock(return_value=0)
    study.ListModifications = MagicMock(return_value=[])
    study.Undo = MagicMock()
    # Patch study.NetworkIterator
    class FakeIterator:
      def __init__(self):
        self._called = False
      def Next(self):
        if not self._called:
          self._called = True
          return True
        return False
      def GetSection(self):
        s = MagicMock()
        s.ID = "S1"
        s.GetValue.return_value = "A"
        s.ListDevices.return_value = []
        s.SetValue = MagicMock()
        return s
      def GetPhase(self):
        return 'A'
      def GetFromPhase(self):
        return 'ABC'
      def GetDevices(self):
        d = MagicMock()
        d.DeviceNumber = "D1"
        d.DeviceType = enums.DeviceType.Fuse
        d.SetValue = MagicMock()
        return [d]
    study.NetworkIterator = FakeIterator
    # Patch QueryDevices to return currents
    self.patcher_qd = patch('LoadBalancing.QueryDevices', return_value=[10.0, 0.0, 0.0])
    self.mock_qd = self.patcher_qd.start()
    # Patch QueryNodes to return node values
    self.patcher_qn = patch('LoadBalancing.QueryNodes', return_value=[10.0, 5.0, 15.0, 0.0, 10.0, 95.0, 90.0, 85.0, 0.0, 0.0, 0.0])
    self.mock_qn = self.patcher_qn.start()
    # Patch sim.Meter
    sim.Meter = MagicMock(return_value=MagicMock(DemandA=MagicMock(Value1=10.0), DemandB=MagicMock(Value1=5.0), DemandC=MagicMock(Value1=15.0)))
    # Patch study.GetDevice and GetMeter
    study.GetDevice = MagicMock(return_value=MagicMock(DeviceNumber="N1", DeviceType=enums.DeviceType.Breaker))
    study.GetMeter = MagicMock(return_value=sim.Meter())
    # Patch sim.LoadValue
    sim.LoadValue = MagicMock(side_effect=lambda a, b: MagicMock())
    # Patch study.AddMeter
    study.AddMeter = MagicMock()
    # Patch app.ActivateRefresh
    app.ActivateRefresh = MagicMock()
    # Patch locale.setlocale
    patch('locale.setlocale').start()
  def tearDown(self):
    self.patcher_qd.stop()
    self.patcher_qn.stop()
    self.patcher_gip.stop()
    self.patcher_qn.stop()

  def test_PickSections_balances_sections(self):
    lb = lb_mod.LoadBalancing()
    sec_dict = {
      'A': {'S1': 10.0},
      'B': {},
      'C': {}
    }
    sol, updated = lb.PickSections(sec_dict, 10.0, 5.0, 15.0, 10.0)
    self.assertIsInstance(sol, dict)
    self.assertIsInstance(updated, dict)

  def test_PickSections_2_balances_sections(self):
    lb = lb_mod.LoadBalancing()
    sec_dict = {
      'A': {'S1': 10.0},
      'B': {'S2': 5.0},
      'C': {'S3': 15.0}
    }
    picks, updated = lb.PickSections_2(sec_dict, 10.0, 5.0, 15.0, 10.0)
    self.assertIsInstance(picks, dict)
    self.assertIsInstance(updated, dict)

  def test_GetSinglePhaseSections_returns_list(self):
    lb = lb_mod.LoadBalancing()
    result = lb.GetSinglePhaseSections()
    self.assertIsInstance(result, list)
    self.assertTrue(all(isinstance(d, dict) for d in result))

  def test_RunCYMEIteration_returns_dict(self):
    lb = lb_mod.LoadBalancing()
    result = lb.RunCYMEIteration("STUDY_POINT1")
    self.assertIsInstance(result, dict)
    self.assertIn('A', result)

  def test_TransferLoad_updates_devices(self):
    lb = lb_mod.LoadBalancing()
    fake_file = MagicMock()
    fake_section = MagicMock()
    fake_section.ID = "S1"
    fake_section.GetValue.return_value = "A"
    fake_section.ListDevices.return_value = []
    fake_section.SetValue = MagicMock()
    dict_sect = {'A': [(fake_section, 10.0)]}
    result = lb.TransferLoad(fake_file, dict_sect)
    self.assertIsInstance(result, list)

if __name__ == "__main__":
  unittest.main()