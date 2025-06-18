import locale
import traceback
import math
import time
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
from cympy import *

# Constants
MINIMUM_CURRENT = 1.0
LOAD_FACTOR = 1.1
DEFAULT_LOCALE = ("us_CA", "utf8")
CELL_FORMAT_COLOR = 14737632
CHECK_METER_NAME = "CHECK_METER" 


@dataclass
class PhaseValues:
    """Store phase-related values"""

    A: float
    B: float
    C: float


class PhaseType(Enum):
    """Phase types for the network"""

    A = "A"
    B = "B"
    C = "C"
    AC = "AC"
    BC = "BC"
    AB = "AB"
    ABC = "ABC"


class LoadBalancingError(Exception):
    """Custom exception for load balancing errors"""

    pass


def CombineDicts(dict1, dict2):
    """
    Merge values from dict2 into dict1 for matching keys using .update().
    """

    for key in dict1:
        if key in dict2:
            dict1[key].update(dict2[key])

        return dict1


def QueryWithFallback(query_func, keyword_list: List[str], *args) -> List:
    """
    Run query_func on each keyword; return results with float conversion fallback.
    """

    results = []
    for key in keyword_list:
        result = None
        try:
            result = query_func(key, *args)
            results.append(locale.atof(result))
        except Exception:
            results.append(result)

    return results


def QueryDevices(keyword_list: List[str], dev_number: str, dev_type: str) -> List:
    """Query device information"""
    return QueryWithFallback(study.QueryInfoDevice, keyword_list, dev_number, dev_type)


def QueryNodes(keyword_list: List[str], node_id: str) -> List:
    """Query node information"""
    return QueryWithFallback(study.QueryInfoNode, keyword_list, node_id)


def ClosestSumOfSubset(nums: List[float], target: float) -> Tuple[float, List[int]]:
    """
    Find indices of numbers whose sum is closest to the target.
    """

    if not nums:
        return 0.0, []

    reachable = {0.0: []}
    for idx, num in enumerate(nums):
        new_reachable = reachable.copy()
        for curr_sum, indices in reachable.items():
            new_sum = curr_sum + num
            if new_sum not in new_reachable or len(indices) + 1 < len(
                new_reachable[new_sum]
            ):
                new_reachable[new_sum] = indices + [idx]
        reachable = new_reachable

    closest_sum = min(reachable.keys(), key=lambda x: abs(x - target))
    return closest_sum, reachable[closest_sum]


def GetTarget(dictionary: Dict, target: float) -> List:
    """
    Return key-value pairs from a dict whose values sum closest to target.
    """
    if not dictionary:
        return []

    working_dict = dictionary.copy()
    working_dict["empty"] = 0

    nums = list(working_dict.values())
    keys = list(working_dict.keys())

    closest_sum, indices = ClosestSumOfSubset(nums, abs(target))
    return [(keys[i], nums[i]) for i in indices if keys[i] != "empty"]


class LoadBalancing:
    """Class for performing load balancing on power networks"""

    def __init__(self, network=None, *args, **kwargs):
        """Initialize LoadBalancing instance"""
        self._initialize_parameters()
        if network is not None:
            self.network_id = network
        self._initialize_meters()
        self._initialize_variables()

    def _initialize_parameters(self):
        """Initialize parameters from input"""
        params = [
            "NetworkID",
            "Point_of_Study",
            "ImaxA",
            "ImaxB",
            "ImaxC",
            "PFA",
            "PFB",
            "PFC",
            "Check_Meter",
            "ImaxA_CM",
            "ImaxB_CM",
            "ImaxC_CM",
            "PFA_CM",
            "PFB_CM",
            "PFC_CM",
            "Iteration",
        ]
        values = list(map(GetInputParameter, params))

        (
            self.network_id,
            self.study_point,
            self.IA,
            self.IB,
            self.IC,
            self.PFA,
            self.PFB,
            self.PFC,
            self.CM,
            self.IA_CM,
            self.IB_CM,
            self.IC_CM,
            self.PFA_CM,
            self.PFB_CM,
            self.PFC_CM,
            self.itr,
        ) = values

    def _initialize_meters(self):
        """Initialize meter objects"""
        self.main_meter = sim.Meter()
        self.check_meter = sim.Meter()
        self.mm_device = None
        self.cm_device = None

    def _initialize_variables(self):
        """Initialize class variables"""
        self._variables = [
            "IAout",
            "IBout",
            "ICout",
            "Ineutral",
            "IUnbalA",
            "IUnbalB",
            "IUnbalC",
            "PFA",
            "PFB",
            "PFC",
        ]
        self._connected_phase = {
            phase.value: getattr(enums.Phase, phase.value) for phase in PhaseType
        }
        try:
            if study.GetNode(self.study_point):
                self.Option = True
        except Exception:
            self.Option = False

        self.Node = {True: self.study_point, False: self.network_id}
        self.LA = sim.LoadAllocation()
        self.LF = sim.LoadFlow()
        self.sections = {}
        self.counter = 0
        self.format = "{} ph: {:>7.2f}A, {:>7.2f}% PF, {:>7.2f}% unbalance"
        self.separator = "—" * len(self.format.format("A", self.IA, self.PFA, 0))

    def __repr__(self):
        """
        String summary of sections available for load transfer.
        """
        self.sections = CombineDicts(self.sections_down, self.sections_up)

        string = "//".join([f"Load Balancing has been run {self.counter} time(s)"])
        if self.sections:
            string += "//Sections available for load transfer:"
            for key, value in self.sections.items():
                string += f"//\n{self.separator}\n"
                string += f"//{key} Phase:\n"
                for sec, cur in value.items():
                    if sec != "empty":
                        string += "//Section: {:<13}{:2}{:>6.2f}A".format(
                            "[" + sec.ID + "]", "-", cur
                        )
        return string

    def GetSinglePhaseSections(self, node_id: str) -> Tuple[Dict, Dict]:
        """Retrieve single-phase sections in the network"""
        dict_down = self.RunCYMEIteration(node_id)
        dict_all = self.RunCYMEIteration(self.network_id)

        dict_up = {
            phase: {
                key: value
                for key, value in dict_all[phase].items()
                if key not in dict_down[phase]
            }
            for phase in ["A", "B", "C"]
        }

        return dict_down, dict_up

    def RunCYMEIteration(self, node_id: str) -> Dict:
        """Get single phase sections for load transfer"""
        dict_sec = {phase.value: {} for phase in PhaseType if len(phase.value) == 1}
        self.LF.Run([self.network_id])

        iterator = study.NetworkIterator(node_id, enums.IterationOption.Downstream)
        while iterator.Next():
            if not self._is_valid_section(iterator):
                continue

            self._process_section_devices(iterator, dict_sec)

        return dict_sec

    def _is_valid_section(self, iterator) -> bool:
        """Check if section is valid for processing"""
        return (
            iterator.GetPhase() != iterator.GetFromPhase()
            and iterator.GetFromPhase() == enums.Phase.ABC
        )

    def _process_section_devices(self, iterator, dict_sec):
        """Process devices in a section"""
        Section = iterator.GetSection()
        Phase = iterator.GetPhase()

        for Device in iterator.GetDevices():
            if Device.DeviceType == enums.DeviceType.Transformer:
                continue

            currents = QueryDevices(
                ["IAout", "IBout", "ICout"],
                Device.DeviceNumber,
                enums.DeviceType.AllDevices,
            )

            for ph, current in zip("ABC", currents):
                if (
                    Phase == getattr(enums.Phase, ph)
                    and isinstance(current, float)
                    and current > MINIMUM_CURRENT
                ):
                    dict_sec[ph][Section] = current

    def PickSections(
        self, sec_dict: Dict, ImaxA: float, ImaxB: float, ImaxC: float
    ) -> Tuple[Dict, Dict]:
        """Pick sections for load transfer based on current imbalances"""
        Iavg = (ImaxA + ImaxB + ImaxC) / 3
        Idiff = {k: v - Iavg for k, v in zip("ABC", [ImaxA, ImaxB, ImaxC])}

        if not sec_dict:
            return {}, sec_dict

        ph_high = max(Idiff, key=lambda k: abs(Idiff[k]))
        temp_idiff = Idiff.copy()
        del temp_idiff[ph_high]

        sorted_idiff = dict(
            sorted(temp_idiff.items(), key=lambda item: abs(item[1]), reverse=True)
        )

        sol = {}
        for key, value in sorted_idiff.items():
            if math.ceil(value) < 0:
                temp = GetTarget(sec_dict[ph_high], value)
                sol[key] = temp
                if temp:
                    for i, j in temp:
                        if i != "empty":
                            sec_dict[ph_high].pop(i, None)
                            sec_dict[key][i] = j
            elif math.floor(value) > 0:
                results = GetTarget(sec_dict[key], value)
                sol[ph_high] = results
                if results:
                    for i, j in results:
                        if i != "empty":
                            sec_dict[key].pop(i, None)
                            sec_dict[ph_high][i] = j

        return sol, sec_dict

    def TransferLoad(self, dict_sect: Dict) -> List:
        """Transfer load between sections and update device properties"""
        device_list = []
        report_rows = []

        for phase, sections in dict_sect.items():
            for section, current in sections:
                if section == "empty":
                    continue

                old_phase = section.GetValue("Phase")
                for device in section.ListDevices():
                    if device.DeviceType in {
                        enums.DeviceType.Fuse,
                        enums.DeviceType.Recloser,
                        enums.DeviceType.Switch,
                    }:
                        device.SetValue(self._connected_phase[phase], "ClosedPhase")
                        device_list.append(
                            [phase, device.DeviceNumber, device.DeviceType]
                        )

                section.SetValue(phase, "Phase")
                report_rows.append(
                    [
                        rm.SectionCell(section.ID),
                        rm.FloatCell(current, 2),
                        rm.StringCell(old_phase),
                        rm.StringCell(phase),
                    ]
                )
                print(
                    f"Change {'[' + section.ID + ']':<12} {current:>5.2f}A  from {old_phase:>2} ph to {phase:>2} ph"
                )

        self._update_devices(device_list)
        return report_rows

    def _update_devices(self, device_list: List[Tuple[str, str, enums.DeviceType]]):
        """Update device properties"""
        for ph, dev_num, dev_type in device_list:
            if (
                study.GetValueDevice("ClosedPhase", dev_num, dev_type)
                != self._connected_phase[ph]
            ):
                study.SetValueDevice(
                    self._connected_phase[ph], "ClosedPhase", dev_num, dev_type
                )

    def PickSections_2(self, sec_dict: Dict, ImaxA: float, ImaxB: float, ImaxC: float, tolerance=1e-1, max_moves=5,) -> tuple[Dict, Dict]:
        """Alternative method to pick sections for load transfer using iterative balancing"""
        phase_branches = {k: v.copy() for k, v in sec_dict.items()}
        phase_names = list(phase_branches.keys())
        picks = {k: [] for k in phase_names}
        peak_loads = [ImaxA, ImaxB, ImaxC]
        avg_load = sum(peak_loads) / 3

        for _ in range(max_moves):
            best_move = None
            best_balance = sum(abs(load - avg_load) for load in peak_loads)

            for i, phase in enumerate(phase_names):
                for branch, load in phase_branches[phase].items():
                    for j, other_phase in enumerate(phase_names):
                        if i == j:
                            continue

                        new_peaks = peak_loads[:]
                        new_peaks[i] -= load
                        new_peaks[j] += load
                        imbalance = sum(abs(l - avg_load) for l in new_peaks)

                        if imbalance < best_balance - tolerance:
                            best_balance = imbalance
                            best_move = (branch, load, i, j)

            if best_move:
                branch, load, from_i, to_j = best_move
                from_phase, to_phase = phase_names[from_i], phase_names[to_j]

                phase_branches[from_phase].pop(branch)
                phase_branches[to_phase][branch] = load
                peak_loads[from_i] -= load
                peak_loads[to_j] += load
                picks[to_phase].append((branch, load))
            else:
                break

        return picks, sec_dict

    def SetFeederDemand(self):
        """Initialize the demand meter for the network"""
        try:
            self.mm_device = study.GetDevice(self.network_id, enums.DeviceType.Breaker)
        except Exception as e:
            raise LoadBalancingError(
                f"No Breaker found for the network: {self.network_id}. Error: {str(e)}"
            )

        try:
            self.main_meter = study.GetMeter(self.network_id, enums.DeviceType.Breaker)
        except Exception as e:
            raise LoadBalancingError(
                f"No Meter found for the network: {self.network_id}. Error: {str(e)}"
            )

        IA_import, IB_import, IC_import = (
            self.main_meter.DemandA.Value1,
            self.main_meter.DemandB.Value1,
            self.main_meter.DemandC.Value1,
        )
        if LOAD_FACTOR * sum([self.IA, self.IB, self.IC]) > sum(
            [IA_import, IB_import, IC_import]
        ):
            self.UpdateMeter(
                self.mm_device,
                self.main_meter,
                self.IA,
                self.IB,
                self.IC,
                self.PFA,
                self.PFB,
                self.PFC,
            )

    def UpdateMeter(self, device, meter, IA, IB, IC, PFA, PFB, PFC):
        """Update the demand meter with new phase currents and power factors"""
        meter.LoadValueType = enums.LoadValueType.AMP_PF
        meter.DemandA = sim.LoadValue(IA, PFA)
        meter.DemandB = sim.LoadValue(IB, PFB)
        meter.DemandC = sim.LoadValue(IC, PFC)
        study.AddMeter(device.DeviceNumber, device.DeviceType, meter, True)

    def AddCheckMeter(self, check_meter_node, IA, IB, IC, PFA, PFB, PFC):
        """Add a check meter to a section for monitoring load"""
        _cm_node = study.GetNode(check_meter_node)
        _cm_section = study.QueryInfoNode("ParentId", _cm_node.ID)

        try:
            self.cm_device = study.AddDevice(
                "CHECK_METER",
                enums.DeviceType.Miscellaneous,
                _cm_section,
                "DEFAULT",
                enums.Location.To,
                True,
            )
        except:
            self.cm_device = study.GetDevice(
                "CHECK_METER", enums.DeviceType.Miscellaneous
            )

        if self.cm_device:
            self.UpdateMeter(
                self.cm_device, self.check_meter, IA, IB, IC, PFA, PFB, PFC
            )

    def MakeReport(self, IA, IB, IC, IA_out, IB_out, IC_out, rm_rows):
        """
        Build and show a custom report comparing pre/post balancing values.
        """
        report = rm.CustomReport(
            f"SummaryReport_{self.counter}",
            ["NetworkID", "Phase", "Before (A)", "After (A)"],
        )
        cf = rm.CellFormat()
        cf.BackColor = 14737632
        cf.Bold = True
        rows = [
            [
                rm.NetworkCell(self.network_id),
                rm.StringCell("A"),
                rm.FloatCell(IA, 2),
                rm.FloatCell(IA_out, 2),
            ],
            [
                rm.StringCell(""),
                rm.StringCell("B"),
                rm.FloatCell(IB, 2),
                rm.FloatCell(IB_out, 2),
            ],
            [
                rm.StringCell(""),
                rm.StringCell("C"),
                rm.FloatCell(IC, 2),
                rm.FloatCell(IC_out, 2),
            ],
            [
                rm.StringCell("SectionID", cf),
                rm.StringCell("Load (A)", cf),
                rm.StringCell("Before", cf),
                rm.StringCell("After", cf),
            ],
        ]
        report_rows = rows + rm_rows
        for row in report_rows:
            report.AddRow(row)
        report.Show()

    def GetLoadFlow(self, node_id):
        """
        Run load flow and return current, PF, and unbalance data.
        """

        self.LF.Run([self.network_id])

        IA, IB, IC, IN, IunbA, IunbB, IunbC, PFA, PFB, PFC = QueryNodes(
            self._variables, node_id
        )
        # IN = (IA**2 + IB**2 + IC**2 - IA * IB - IB * IC - IC * IA) ** 0.5
        Iunb = {"A": IunbA, "B": IunbB, "C": IunbC}
        return [IA, IB, IC, IN, PFA, PFB, PFC, Iunb]

    def PrintLoad(self, IA, IB, IC, IN, PFA, PFB, PFC, Iunb):
        """
        Print current, PF, and unbalance values in formatted view.
        """
        print("")
        print(self.format.format("A", IA, PFA, Iunb["A"]))
        print(self.format.format("B", IB, PFB, Iunb["B"]))
        print(self.format.format("C", IC, PFC, Iunb["C"]))
        print("IN: {:>9.2f}A".format(IN))
        print("")

    def _RunBalancingIteration(self, node_id, IA, IB, IC, picks_method, picks_args):
        """
        Run one pass of load balancing using a section selection method.
        """
        pre_num = study.GetModificationsCount()
        self.sections_down, self.sections_up = self.GetSinglePhaseSections(node_id)

        if not self.sections_down and not self.sections_up:
            raise RuntimeError("No single phase branches found")

        print(f"Single Phase Sections: {picks_method.__name__}")

        picks_down, self.sections_down = picks_method(self.sections_down, *picks_args)
        # print(*picks_args)
        _IA = _IB = _IC = _IN = _PFA = _PFB = _PFC = _Iunb = 0

        rows = self.TransferLoad(picks_down)
        # print(picks_down)
        self.LF.Run([self.network_id])

        if node_id != self.network_id:
            _IA, _IB, _IC, _IN, _PFA, _PFB, _PFC, _Iunb = self.GetLoadFlow(
                self.network_id
            )

            self.UpdateMeter(
                self.mm_device,
                self.main_meter,
                _IA,
                _IB,
                _IC,
                _PFA,
                _PFB,
                _PFC,
            )

        picks_up, self.sections_up = picks_method(self.sections_up, _IA, _IB, _IC)

        rows += self.TransferLoad(picks_up)

        print("")
        print(f"\nFeeder: {self.network_id}, after balancing:")

        if self.CM == 1:
            print(f"\n@ {CHECK_METER_NAME}")
            _IA, _IB, _IC, _IN, _PFA, _PFB, _PFC, _Iunb = self.GetLoadFlow(
                CHECK_METER_NAME
            )
            self.PrintLoad(_IA, _IB, _IC, _IN, _PFA, _PFB, _PFC, _Iunb)
            self.UpdateMeter(
                self.cm_device,
                self.check_meter,
                _IA,
                _IB,
                _IC,
                _PFA,
                _PFB,
                _PFC,
            )

        print(f"\n@ MAIN_METER:")
        _IA, _IB, _IC, _IN, _PFA, _PFB, _PFC, _Iunb = self.GetLoadFlow(self.network_id)
        self.PrintLoad(_IA, _IB, _IC, _IN, _PFA, _PFB, _PFC, _Iunb)
        self.UpdateMeter(
            self.mm_device,
            self.main_meter,
            _IA,
            _IB,
            _IC,
            _PFA,
            _PFB,
            _PFC,
        )

        if self.network_id != node_id:
            print(f"\n@ {node_id}")
            _IA, _IB, _IC, _IN, _PFA, _PFB, _PFC, _Iunb = self.GetLoadFlow(node_id)
            self.PrintLoad(_IA, _IB, _IC, _IN, _PFA, _PFB, _PFC, _Iunb)

        self.MakeReport(IA, IB, IC, _IA, _IB, _IC, rows)

        self.LA.Run([self.network_id])

        for t in str(self).split("//"):
            print(t.strip())
        print(self.separator)
        pst_num = study.GetModificationsCount()
        study.Undo(pst_num - pre_num)

    def Run(self):
        """
        Main logic to initialize, run two balancing methods, and report results.
        """
        LB = LoadBalancing(network=self.network_id)
        if self.network_id not in study.ListNetworks():
            raise RuntimeError("The feeder loaded in the study is not correct!")

        print(f"Feeder: {self.network_id}, before balancing:")

        count = study.GetModificationsCount()
        LB.SetFeederDemand()

        if LB.CM == 1:
            LB.AddCheckMeter(
                CHECK_METER_NAME,
                LB.IA_CM,
                LB.IB_CM,
                LB.IC_CM,
                LB.PFA_CM,
                LB.PFB_CM,
                LB.PFC_CM,
            )

        LB.LA.Run([LB.network_id])

        IA = IB = IC = IN = PFA = PFB = PFC = Iunb = 0

        if LB.CM == 1:
            print(f"\n@ {CHECK_METER_NAME}")
            IA, IB, IC, IN, PFA, PFB, PFC, Iunb = LB.GetLoadFlow(CHECK_METER_NAME)
            LB.PrintLoad(IA, IB, IC, IN, PFA, PFB, PFC, Iunb)

        print(f"\n@ MAIN_METER:")
        IA, IB, IC, IN, PFA, PFB, PFC, Iunb = LB.GetLoadFlow(LB.network_id)
        LB.PrintLoad(IA, IB, IC, IN, PFA, PFB, PFC, Iunb)

        _study_node = LB.Node[LB.Option]

        if LB.network_id != _study_node:
            print(f"\n@ {_study_node}")
            IA, IB, IC, IN, PFA, PFB, PFC, Iunb = LB.GetLoadFlow(_study_node)
            LB.PrintLoad(IA, IB, IC, IN, PFA, PFB, PFC, Iunb)

        LB.IA, LB.IB, LB.IC, LB.PFA, LB.PFB, LB.PFC = IA, IB, IC, PFA, PFB, PFC

        # print(LB.IA, LB.IB, LB.IC, LB.PFA, LB.PFB, LB.PFC)
        LB.counter += 1
        print(LB.separator)
        print(f"Load balancing method #1:")

        LB._RunBalancingIteration(
            _study_node, IA, IB, IC, LB.PickSections, (IA, IB, IC)
        )
        LB.counter += 1
        print(LB.separator)
        print(f"Load balancing method #2:")

        LB._RunBalancingIteration(
            _study_node, IA, IB, IC, LB.PickSections_2, (IA, IB, IC)
        )
        del LB
        study.Undo(study.GetModificationsCount() - count)


if __name__ == "__main__":
    # """
    # Script entry point. Sets up environment and runs the load balancing process.
    # """
    start = time.time()
    # script_dir = GetInputParameter("Script_Location")
    # sys.path.append(os.path.abspath(script_dir))
    locale.setlocale(locale.LC_NUMERIC, "")
    # locale.getdefaultlocale=lambda *args: ["us_CA", "utf8"]
    app.ActivateRefresh(False)
    try:
        # Instantiate LoadBalancing with required parameters fetched internally
        lb = LoadBalancing()
        lb.Run()
    except Exception:
        traceback.print_exc()
    print("Execution Time: {}s".format(time.time() - start))
    # app.ActivateRefresh(True)
