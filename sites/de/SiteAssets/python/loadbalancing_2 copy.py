import locale
import os
import traceback
import math
import time
from datetime import datetime
from typing import List, Dict, Tuple
from dataclasses import dataclass, field
from enum import Enum
from cympy import study, enums, sim, rm, app, GetInputParameter
from executing import Source

# Constants
MINIMUM_CURRENT = 1.0
MULTIPLIER = 1.1
CELL_FORMAT_COLOR = 14737632
CHECK_METER_NAME = "CHECK_METER"
FORMAT = "{} ph: {:>7.2f}A, {:>7.2f}% PF, {:>7.2f}% unbalance"
PHASES = "ABC"


@dataclass
class NodeValue:
    """Store load-related values"""

    node_id: str
    IA: float
    IB: float
    IC: float
    IN: float = field(init=False)
    IBal: float
    PFA: float
    PFB: float
    PFC: float
    IunbA: float
    IunbB: float
    IunbC: float

    def __post_init__(self):
        """Calculate neutral current based on phase currents"""
        self.IN = (
            self.IA**2
            + self.IB**2
            + self.IC**2
            - self.IA * self.IB
            - self.IB * self.IC
            - self.IC * self.IA
        ) ** 0.5

    def log(self, file):
        """
        Print current, PF, and unbalance values in formatted view.
        """
        _write_and_print(file, "")
        _write_and_print(file, FORMAT.format("A", self.IA, self.PFA, self.IunbA))
        _write_and_print(file, FORMAT.format("B", self.IB, self.PFB, self.IunbB))
        _write_and_print(file, FORMAT.format("C", self.IC, self.PFC, self.IunbC))
        _write_and_print(file, "IN: {:>9.2f}A".format(self.IN))
        _write_and_print(file, "")


@dataclass
class StudyPoint:
    """Store study point-related values"""

    Nodes: list[NodeValue] = []

    def add(self, element):
        self.Nodes.append(element)


@dataclass
class SinglePhaseSections:
    sections: Dict[str, Dict] = field(default_factory=lambda: {ph: {} for ph in PHASES})



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
    return QueryWithFallback(
        study.QueryInfoDevice, keyword_list, dev_number, dev_type, 2
    )


def QueryNodes(keyword_list: List[str], node_id: str) -> List:
    """Query node information"""
    return QueryWithFallback(study.QueryInfoNode, keyword_list, node_id, 2)


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


def _write_and_print(file, message: str):
    """
    Helper function to write and print messages.
    """
    print(message)
    file.write(message + "\n")


class LoadBalancing:
    """Class for performing load balancing on power networks"""

    def __init__(self, network=None, *args, **kwargs):
        """Initialize LoadBalancing instance"""
        self._initialize_parameters()
        self._initialize_simulations()
        self._initialize_variables()
        self._initialize_study_points()

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
            "Iteration",
            "Report_Location",
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
            self.itr,
            self.file_dir,
        ) = values

    def _initialize_simulations(self):
        """Initialize meter objects"""
        self.meters = []
        self.main_meter = sim.Meter()
        self.check_meter = sim.Meter()
        self.mm_device = None
        self.cm_device = None
        self.LA = sim.LoadAllocation()
        self.LF = sim.LoadFlow()

    def _initialize_variables(self):
        """Initialize class variables"""
        self._variables = [
            "IAout",
            "IBout",
            "ICout",
            "IneutralOut",
            "IBal",
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

        self.sections = {}
        self.counter = 0
        self.format = "{} ph: {:>7.2f}A, {:>7.2f}% PF, {:>7.2f}% unbalance"
        self.separator = "—" * len(self.format.format("A", self.IA, self.PFA, 0))
        self._current_datetime = datetime.now().strftime("%Y%m%d_%H%M%S")
        self._file_name = (
            f"LoadBalancing_{self.network_id}_{self._current_datetime}.txt"
        )
        self._file_path = os.path.join(str(self.file_dir), str(self._file_name))

        self.sections_list = []
        self.new_sections_list = []

    def _initialize_study_points(self):
        self.study_point_ids = [
            node.ID for node in study.ListNodes() if node.ID.startswith("STUDY_POINT")
        ]
        self.study_point_ids.append(self.network_id)

    def __repr__(self):
        """
        String summary of sections available for load transfer.
        """
        for i in range(len(self.sections_list) - 1):
            self.sections = CombineDicts(
                self.sections_list[0], self.sections_list[i + 1]
            )

        string = "//".join([f"Load Balancing has been run {self.counter} time(s)"])
        if self.sections:
            string += "//Sections after load transfer:"
            for key, value in self.sections.items():
                string += f"//\n{self.separator}\n"
                string += f"//{key} Phase:\n"
                for sec, cur in value.items():
                    if sec != "empty":
                        string += "//Section: {:<13}{:2}{:>6.2f}A".format(
                            "[" + sec.ID + "]", "-", cur
                        )
        return string

    def GetSinglePhaseSections(self) -> List[Dict]:
        """Retrieve single-phase sections in the network"""
        dict_list = []

        for point in self.study_point_ids:
            dict_list.append(self.RunCYMEIteration(point))

        grouped_dict_list = []
        filtered = {}

        grouped_dict_list.append((self.study_point_ids[0], dict_list[0]))

        for i in range(1, len(dict_list)):
            previous_keys = {
                phase: set().union(*(d[phase].keys() for d in dict_list[:i]))
                for phase in ["A", "B", "C"]
            }

            filtered = {
                phase: {
                    key: value
                    for key, value in dict_list[i][phase].items()
                    if key not in previous_keys[phase]
                }
                for phase in ["A", "B", "C"]
            }

            grouped_dict_list.append((self.study_point_ids[i], filtered))

        return grouped_dict_list

    def RunCYMEIteration(self, node_id: str) -> Dict[str, Dict]:
        """Get single phase sections for load transfer"""
        dict = SinglePhaseSections()
        self.LF.Run([self.network_id])

        iterator = study.NetworkIterator(node_id, enums.IterationOption.Downstream)
        while iterator.Next():
            Section = iterator.GetSection()
            Phase = iterator.GetPhase()

            for Device in iterator.GetDevices():
                ismeter = study.QueryInfoDevice(
                    "IsMeter", Device.DeviceNumber, Device.DeviceType
                )
                if ismeter == "Yes" and Device not in self.meters:
                    self.meters.append(Device)

                if not self._is_valid_section(iterator):
                    continue

                if Device.DeviceType == enums.DeviceType.Transformer:
                    continue

                self._process_section_devices(Phase, Section, Device, dict.sections)

        return dict.sections

    def _is_valid_section(self, iterator) -> bool:
        """Check if section is valid for processing"""
        return (
            iterator.GetPhase() != iterator.GetFromPhase()
            and iterator.GetFromPhase() == enums.Phase.ABC
        )

    def _process_section_devices(self, Phase, Section, Device, dict_sec):
        """Process devices in a section"""

        currents = QueryDevices(
            ["IAout", "IBout", "ICout"],
            Device.DeviceNumber,
            enums.DeviceType.AllDevices,
        )

        for ph, current in zip(PHASES, currents):
            if (
                Phase == getattr(enums.Phase, ph)
                and isinstance(current, float)
                and current > MINIMUM_CURRENT
            ):
                dict_sec[ph][Section] = current

    def PickSections(
        self, sec_dict: Dict, ImaxA: float, ImaxB: float, ImaxC: float, IBal: float
    ) -> Tuple[Dict, Dict]:
        """Pick sections for load transfer based on current imbalances"""
        Iavg = IBal or (ImaxA + ImaxB + ImaxC) / 3
        Idiff = {k: v - Iavg for k, v in zip("ABC", [ImaxA, ImaxB, ImaxC])}
        print(Iavg)
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

    def TransferLoad(self, file, dict_sect: Dict) -> List:
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
                _write_and_print(
                    file,
                    f"Change {'[' + section.ID + ']':<12} {current:>5.2f}A  from {old_phase:>2} ph to {phase:>2} ph",
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

    def PickSections_2(
        self,
        sec_dict: Dict,
        ImaxA: float,
        ImaxB: float,
        ImaxC: float,
        IBal: float,
        tolerance=1e-1,
        max_moves=5,
    ) -> tuple[Dict, Dict]:
        """Alternative method to pick sections for load transfer using iterative balancing"""
        phase_branches = {k: v.copy() for k, v in sec_dict.items()}
        phase_names = list(phase_branches.keys())
        picks = {k: [] for k in phase_names}
        peak_loads = [ImaxA, ImaxB, ImaxC]
        avg_load = IBal or sum(peak_loads) / 3

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
                        imbalance = sum(abs(peak - avg_load) for peak in new_peaks)

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

        return picks, phase_branches

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
        if MULTIPLIER * sum([self.IA, self.IB, self.IC]) > sum(
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

    def MakeReport(self, IA, IB, IC, IA_out, IB_out, IC_out, rm_rows):
        """
        Build and show a custom report comparing pre/post balancing values.
        """
        report = rm.CustomReport(
            f"SummaryReport_{self.network_id}_{self._current_datetime}",
            ["NetworkID", "Phase", "Before (A)", "After (A)"],
        )
        cf = rm.CellFormat()
        cf.BackColor = CELL_FORMAT_COLOR
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

    def GetLoadFlow(self, node_id: str) -> List[float]:
        """
        Run load flow and return current, PF, and unbalance data.
        """

        self.LF.Run([self.network_id])

        IA, IB, IC, IN, IBal, IunbA, IunbB, IunbC, PFA, PFB, PFC = QueryNodes(
            self._variables, node_id
        )
        # IN = (IA**2 + IB**2 + IC**2 - IA * IB - IB * IC - IC * IA) ** 0.5
        # print(IN1)
        return [IA, IB, IC, IN, IBal, PFA, PFB, PFC, IunbA, IunbB, IunbC]

    def _RunBalancingIteration(self, file, study_points, picks_method):
        """
        Run one pass of load balancing using a section selection method.
        """
        pre_num = study.GetModificationsCount()

        self.sections_list = self.GetSinglePhaseSections()


        if not self.sections_list:
            raise RuntimeError("No single phase branches found")

        _write_and_print(file, f"Single Phase Sections: {picks_method.__name__}")


        rows = []
        for point, sections in self.sections_list:
            for study_point in study_points.Nodes:
                if study_point.node_id == point:
                    study_point.log(file)
                    IA, IB, IC, IBal = study_point.IA, study_point.IB, study_point.IC, study_point.IBal
                    picks, sections = picks_method(sections, IA, IB, IC, IBal)
                    self.new_sections_list.append(sections)
                    rows += self.TransferLoad(file, picks)
            # print(self.sections_down)
            # _write_and_print(file, *picks_args)
            # _IA = _IB = _IC = _IN = _IBal = _PFA = _PFB = _PFC = _Iunb = 0
            
            # _write_and_print(file, picks_down)
            # self.LF.Run([self.network_id])

            # _IA, _IB, _IC, _IN, _IBal, _PFA, _PFB, _PFC, _Iunb = self.GetLoadFlow(point)

            # picks_up, self.sections_up = picks_method(
            #     self.sections_up, _IA, _IB, _IC, _IBal
            # )
            # # print(self.sections_up)
            # rows += self.TransferLoad(file, picks_up)
        self.LF.Run([self.network_id])

        _write_and_print(file, "")
        _write_and_print(file, f"\nFeeder: {self.network_id}, after balancing:")
        # print(self.meters)
        for meter in self.meters:
            _write_and_print(file, f"\n@ Meter: {meter.DeviceNumber}")
            _IA, _IB, _IC, _IN, _IBal, _PFA, _PFB, _PFC, _Iunb = self.GetLoadFlow(
                study.QueryInfoDevice("ToNodeId", meter.DeviceNumber, meter.DeviceType)
            )
            self.PrintLoad(file, _IA, _IB, _IC, _IN, _PFA, _PFB, _PFC, _Iunb)
            self.UpdateMeter(
                meter,
                study.GetMeter(meter.DeviceNumber, meter.DeviceType),
                _IA,
                _IB,
                _IC,
                _PFA,
                _PFB,
                _PFC,
            )

            if meter.DeviceNumber == self.network_id:
                self.MakeReport(IA, IB, IC, _IA, _IB, _IC, rows)

        for study_point in self.study_points:
            _write_and_print(file, f"\n@ {study_point}")
            _IA, _IB, _IC, _IN, _IBal, _PFA, _PFB, _PFC, _Iunb = self.GetLoadFlow(
                study_point
            )
            self.PrintLoad(file, _IA, _IB, _IC, _IN, _PFA, _PFB, _PFC, _Iunb)
        # _write_and_print(file, "\n@ MAIN_METER:")
        # _IA, _IB, _IC, _IN, _IBal, _PFA, _PFB, _PFC, _Iunb = self.GetLoadFlow(self.network_id)
        # self.PrintLoad(file, _IA, _IB, _IC, _IN, _PFA, _PFB, _PFC, _Iunb)
        # self.UpdateMeter(
        #     self.mm_device,
        #     self.main_meter,
        #     _IA,
        #     _IB,
        #     _IC,
        #     _PFA,
        #     _PFB,
        #     _PFC,
        # )

        self.LA.Run([self.network_id])

        for t in str(self).split("//"):
            _write_and_print(file, t.strip())
        _write_and_print(file, self.separator)

        modifications = study.ListModifications()
        _write_and_print(file, "\nModifications made during the balancing process:")

        for idx, modification in enumerate(modifications):
            _write_and_print(file, f"{idx + 1}: {modification}")

        pst_num = study.GetModificationsCount()
        study.Undo(pst_num - pre_num)

    def Run(self):
        """
        Main logic to initialize, run two balancing methods, and report results.
        """
        with open(self._file_path, "w") as file:

            LB = LoadBalancing(network=self.network_id)
            if self.network_id not in study.ListNetworks():
                raise RuntimeError("The feeder loaded in the study is not correct!")

            _write_and_print(file, f"Feeder: {self.network_id}, before balancing:")

            count = study.GetModificationsCount()
            LB.SetFeederDemand()

            LB.LA.Run([LB.network_id])

            IA = IB = IC = IN = IBal = PFA = PFB = PFC = Iunb = 0

            # for meter in self.meters:
            #     _write_and_print(file, f"\n@ {meter.DeviceNumber}")
            #     IA, IB, IC, IN, IBal, PFA, PFB, PFC, Iunb = LB.GetLoadFlow(meter.DeviceNumber)
            #     LB.PrintLoad(file, IA, IB, IC, IN, PFA, PFB, PFC, Iunb)

            _write_and_print(file, "\n@ MAIN_METER:")
            SourceNode = NodeValue(
                str(LB.network_id), *LB.GetLoadFlow(str(LB.network_id))
            )
            SourceNode.log(file)
            StudyPoints = StudyPoint()

            for study_point_id in self.study_point_ids:
                _write_and_print(file, f"\n@ {study_point_id}")
                StudyNode = NodeValue(study_point_id, *LB.GetLoadFlow(study_point_id))
                StudyNode.log(file)
                StudyPoints.add(StudyNode)

            StudyPoints.add(SourceNode)
            # _write_and_print(file, LB.IA, LB.IB, LB.IC, LB.PFA, LB.PFB, LB.PFC)
            LB.counter += 1
            _write_and_print(file, LB.separator)
            _write_and_print(file, "Load balancing method #1:")

            LB._RunBalancingIteration(
                file, IA, IB, IC, IBal, LB.PickSections, (IA, IB, IC, IBal)
            )
            LB.counter += 1
            _write_and_print(file, LB.separator)
            _write_and_print(file, "Load balancing method #2:")

            LB._RunBalancingIteration(
                file,
                IA,
                IB,
                IC,
                IBal,
                LB.PickSections_2,
                (IA, IB, IC, IBal),
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
