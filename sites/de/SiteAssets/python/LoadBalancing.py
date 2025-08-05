# """
# Update @ 2025-05-29
# Update @ 2025-06-27: Add function to balance not only the feeder, but the downstream of point of studies of choices
# Update @ 2025-07-28: Add error handling for LoadAllocation methods between KVA and KWH
# """

import locale
import os
import traceback
import math
import time
from datetime import datetime
from typing import List, Dict, Tuple
from enum import Enum
from cympy import study, enums, sim, rm, app, GetInputParameter

# Constants
MULTIPLIER = 1.1
CELL_FORMAT_COLOR = 14737632
ALLOCATION_METHODS = ["KVAMethod", "KWHMethod"]


# Enum for phase types
class PhaseType(Enum):
    """Phase types for the network"""

    A = "A"
    B = "B"
    C = "C"
    AC = "AC"
    BC = "BC"
    AB = "AB"
    ABC = "ABC"


# Custom exception for load balancing errors
class LoadBalancingError(Exception):
    """Custom exception for load balancing errors"""

    pass


def CombineDicts(dict1, dict2):
    """
    Merge values from dict2 into dict1 for matching keys using .update().
    Used to combine section dictionaries for different phases.
    Returns a new dictionary to avoid modifying the input.
    """
    result = {k: v.copy() for k, v in dict1.items()}
    for key in result:
        if key in dict2:
            result[key].update(dict2[key])
    return result


def QueryWithFallback(query_func, keyword_list: List[str], *args) -> List:
    """
    Run query_func on each keyword; return results with float conversion fallback.
    Used for querying device/node values, converting to float if possible.
    Handles empty strings and invalid float values gracefully.
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
    """Query device information using QueryWithFallback."""
    return QueryWithFallback(
        study.QueryInfoDevice, keyword_list, dev_number, dev_type, 2
    )


def QueryNodes(keyword_list: List[str], node_id: str) -> List:
    """Query node information using QueryWithFallback."""
    return QueryWithFallback(study.QueryInfoNode, keyword_list, node_id, 2)


def ClosestSumOfSubset(
    nums: List[float], target: float, max_elements: int | None = None
) -> Tuple[float, List[int]]:
    """
    Mathematically find indices of numbers whose sum is closest to the target.
    Uses dynamic programming to find optimal subset.

    Args:
        nums: List of numbers to choose from
        target: Target sum to achieve
        max_elements: Optional maximum number of elements in the subset

    Returns:
        Tuple of (closest sum achieved, list of indices used)
    """
    if not nums:
        return 0.0, []

    # Filter out invalid numbers and sort for efficiency
    valid_nums = [
        (i, n) for i, n in enumerate(nums) if isinstance(n, (int, float)) and n > 0
    ]
    if not valid_nums:
        return 0.0, []

    # Sort by absolute difference from target for better initial solutions
    valid_nums.sort(key=lambda x: abs(x[1] - target))

    reachable = {0.0: []}
    best_diff = float("inf")
    best_sum = 0.0

    for orig_idx, num in valid_nums:
        new_reachable = reachable.copy()
        for curr_sum, indices in reachable.items():
            if max_elements and len(indices) >= max_elements:
                continue
            new_sum = curr_sum + num
            if new_sum not in new_reachable or len(indices) + 1 < len(
                new_reachable[new_sum]
            ):
                new_indices = indices + [orig_idx]
                new_reachable[new_sum] = new_indices

                # Update best if this is closer to target
                curr_diff = abs(new_sum - target)
                if curr_diff < best_diff:
                    best_diff = curr_diff
                    best_sum = new_sum

        reachable = new_reachable

    return best_sum, reachable[best_sum]


def GetTarget(dictionary: Dict, target: float) -> List:
    """
    Use the ClosestSumOfSubset function to find
    key-value pairs from a dict of single phase branches, whose values sum closest to imbalance(target).
    Used for picking sections to transfer to balance the load.
    """
    if not dictionary:
        return []
    working_dict = dictionary.copy()
    working_dict["empty"] = 0
    nums = list(working_dict.values())
    keys = list(working_dict.keys())
    closest_sum, indices = ClosestSumOfSubset(nums, abs(target))
    return [(keys[i], nums[i]) for i in indices if keys[i] != "empty"]


def _log(file, message: str):
    """
    Helper function to write and print messages.
    Used for logging to both file and console.
    """
    print(message)
    file.write(message + "\n")


class LoadBalancing:
    """Class for performing load balancing on power networks"""

    def __init__(self):
        """
        Initialize LoadBalancing instance.
        Sets up parameters, simulation objects, variables, study points, and documentation.
        """
        self._initialize_parameters()
        self._initialize_simulation()
        self._initialize_variables()
        self._initialize_study_points()
        self._initialize_documentation()

    def _initialize_parameters(self):
        """
        Initialize parameters from input.
        Reads network ID, phase currents, power factors, and report location.
        Validates numeric inputs and provides default values if needed.
        """

        def safe_get_param(
            param_name: str, default_value: float | str | None = None
        ) -> float | str:
            try:
                value = GetInputParameter(param_name)
                if isinstance(default_value, (int, float)):
                    return float(value) if value else default_value
                return str(value) if value else str(default_value)
            except (ValueError, TypeError) as e:
                print(f"Warning: Error getting parameter {param_name}: {str(e)}")
                return default_value if default_value is not None else 0.0

        # Get and validate parameters with defaults
        self.network_id = safe_get_param("NetworkID", "")
        if not self.network_id:
            raise ValueError("NetworkID is required")

        # Initialize numeric parameters with proper typing
        self.IA = float(safe_get_param("ImaxA", 0.0))
        self.IB = float(safe_get_param("ImaxB", 0.0))
        self.IC = float(safe_get_param("ImaxC", 0.0))
        self.PFA = float(safe_get_param("PFA", 100.0))
        self.PFB = float(safe_get_param("PFB", 100.0))
        self.PFC = float(safe_get_param("PFC", 100.0))
        self.MINIMUM_CURRENT = float(safe_get_param("Min_Current", 5.0))
        self.file_dir = str(safe_get_param("Report_Location", "."))

    def _initialize_simulation(self):
        """
        Initialize meter objects and simulation tools.
        Sets up meters, load allocation, and load flow objects.
        """
        self.meters = []
        self.main_meter = sim.Meter()
        self.mm_device = None
        self.LA = sim.LoadAllocation()
        self.LA.SetValue(ALLOCATION_METHODS[0], "Method")
        self.LF = sim.LoadFlow()

    def _initialize_variables(self):
        """
        Initialize class variables for load flow and section tracking.
        """
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
        # Map phase names to enum values
        self._connected_phase = {
            phase.value: getattr(enums.Phase, phase.value) for phase in PhaseType
        }
        self.sections = {}
        self.counter = 0
        self.study_points = []
        self.sections_list = []
        self.new_sections_list = []

    def _initialize_documentation(self):
        """
        Set up formatting and file naming for reports.
        """
        self.format = "{} ph: {:>8.2f}A, {:>8.2f}% PF, {:>8.2f}% unbalance"
        self.separator = "—" * len(self.format.format("A", self.IA, self.PFA, 0))
        self._current_datetime = datetime.now().strftime("%Y%m%d_%H%M%S")
        self._file_name = (
            f"LoadBalancing_{self.network_id}_{self._current_datetime}.txt"
        )
        self._file_path = os.path.join(str(self.file_dir), str(self._file_name))

    def _initialize_study_points(self):
        """
        Gather all study points (nodes starting with 'STUDY_POINT') in the network.
        """
        self.study_points = [
            node.ID for node in study.ListNodes() if node.ID.startswith("STUDY_POINT")
        ]

    def ChangeAllocationMethod(self):
        active_method = self.LA.GetValue("Method")
        if active_method == ALLOCATION_METHODS[0]:
            self.LA.SetValue(ALLOCATION_METHODS[1], "Method")
        else:
            self.LA.SetValue(ALLOCATION_METHODS[0], "Method")

    def __repr__(self):
        """
        String summary of sections available for load transfer.
        Combines all section lists and formats them for display.
        """
        n = len(self.sections_list)
        if n == 1:
            self.sections = self.sections_list[0]
        elif n > 1:
            for i in range(len(self.sections_list) - 1):
                self.sections = CombineDicts(
                    self.sections_list[0], self.sections_list[i + 1]
                )
        else:
            raise LoadBalancingError("No solution")

        string = "//".join([f"Load Balancing has been run {self.counter} time(s)"])
        if self.sections:
            string += "//Single phase sections after load transfer:"
            for key, value in self.sections.items():
                string += f"//{self.separator}\n"
                string += f"//{key} Phase:\n"
                for sec, cur in value.items():
                    if sec != "empty":
                        string += "//Section: {:<15}{:3}{:>7.2f}A".format(
                            "[" + sec.ID + "]", "-", cur
                        )
        return string

    def GetSinglePhaseSections(self) -> list[Dict[str, Dict]]:
        """
        Retrieve single-phase sections in the network.
        Returns a list of dictionaries, one for each study point and the main network.
        Each dictionary maps phase name to a dict of sections and their current values.

        Returns:
            List[Dict[str, Dict]]: List of phase dictionaries, where each inner dict
            maps section objects to their current values.
        """
        # Get sections for each study point and the main network
        dict_list = [self.RunCYMEIteration(point) for point in self.study_points]
        dict_list.append(self.RunCYMEIteration(str(self.network_id)))

        if not dict_list:
            return []

        # Initialize result with the first dictionary
        grouped_dict_list = [dict_list[0]]

        # Process remaining dictionaries, filtering out previously seen sections
        phases = ["A", "B", "C"]
        for i in range(1, len(dict_list)):
            # Get all previously seen keys for each phase
            previous_keys = {
                phase: {key for d in dict_list[:i] for key in d[phase].keys()}
                for phase in phases
            }

            # Create filtered dictionary with only new sections
            filtered = {
                phase: {
                    key: value
                    for key, value in dict_list[i][phase].items()
                    if key not in previous_keys[phase]
                }
                for phase in phases
            }
            grouped_dict_list.append(filtered)

        return grouped_dict_list

    def RunCYMEIteration(self, node_id) -> Dict:
        """
        Get single phase sections for load transfer at a given node.
        Iterates through the network, collecting sections with sufficient current.
        """
        dict_sec = {phase.value: {} for phase in PhaseType if len(phase.value) == 1}
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
                self._process_section_devices(Phase, Section, Device, dict_sec)
        return dict_sec

    def _is_valid_section(self, iterator) -> bool:
        """
        Check if section is valid for processing.
        Only sections with phase change from ABC to single phase are valid.
        """
        return (
            iterator.GetPhase() != iterator.GetFromPhase()
            and iterator.GetFromPhase() == enums.Phase.ABC
        )

    def _process_section_devices(self, Phase, Section, Device, dict_sec):
        """
        Process devices in a section.
        Adds section to dict_sec if current is above min threshold.
        """
        currents = QueryDevices(
            ["IAout", "IBout", "ICout"],
            Device.DeviceNumber,
            enums.DeviceType.AllDevices,
        )
        for ph, current in zip("ABC", currents):
            if (
                Phase == getattr(enums.Phase, ph)
                and isinstance(current, float)
                and current > self.MINIMUM_CURRENT
            ):
                dict_sec[ph][Section] = current

    def PickSections(
        self, sec_dict: Dict, ImaxA: float, ImaxB: float, ImaxC: float, IBal: float
    ) -> Tuple[Dict, Dict]:
        """
        Pick sections for load transfer based on current imbalances.
        Returns a solution dictionary (branches whose phase needs to be changed) and the updated section dictionary (the single phase branches for each phase after transfer).
        """
        Iavg = IBal or (ImaxA + ImaxB + ImaxC) / 3
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
        temp = []
        for key, value in sorted_idiff.items():
            if math.ceil(value) < 0:
                sol[key] = GetTarget(sec_dict[ph_high], value)
                if sol[key]:
                    for i, j in sol[key]:
                        sec_dict[ph_high].pop(i, None)
                        sec_dict[key][i] = j
            elif math.floor(value) > 0:
                temp += GetTarget(sec_dict[key], value)
                sol[ph_high] = temp
                if temp:
                    for i, j in temp:
                        sec_dict[key].pop(i, None)
                        sec_dict[ph_high][i] = j
        return sol, sec_dict

    def TransferLoad(self, file, dict_sect: Dict) -> List:
        """
        Transfer load between phases
        Returns a list of report rows for the transfers
        """
        device_list = []
        report_rows = []
        idx = 0
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
                idx += 1
                _log(
                    file,
                    f"{idx}: Change {'[' + section.ID + ']':<12} {current:>5.2f}A  from {old_phase:>2} ph to {phase:>2} ph",
                )
        # _log(file, f"\n")
        self._update_devices(device_list)
        return report_rows

    def _update_devices(self, device_list: List[Tuple[str, str, enums.DeviceType]]):
        """
        Update device properties for all devices in the device_list.
        Ensure the phase change
        """
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
        """
        Alternative method to pick sections for load transfer using iterative balancing.
        Tries to minimize imbalance by moving branches between phases.
        """
        phase_branches = {k: v for k, v in sec_dict.items()}
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
        """
        Initialize the demand meter for the network.
        Updates the meter if the calculated demand is higher than the imported value.
        """
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
        """
        Update/overwrite the demand meter with new phase currents and power factors.
        """
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

    def GetLoadFlow(self, node_dev):
        """
        Run load flow and return current, PF, and unbalance data for a node.
        """
        self.LF.Run([self.network_id])
        _results = QueryNodes(self._variables, node_dev)

        [IA, IB, IC, IN, IBal, IunbA, IunbB, IunbC, PFA, PFB, PFC] = [
            0 if isinstance(x, str) or x == "" else x for x in _results
        ]

        IN = (IA**2 + IB**2 + IC**2 - IA * IB - IB * IC - IC * IA) ** 0.5
        Iunb = {"A": IunbA, "B": IunbB, "C": IunbC}
        return [IA, IB, IC, IN, IBal, PFA, PFB, PFC, Iunb]

    def PrintLoad(self, file, IA, IB, IC, IN, PFA, PFB, PFC, Iunb):
        """
        Print current, PF, and unbalance values in formatted view.
        """
        _log(file, "")
        _log(file, self.format.format("A", IA, PFA, Iunb["A"]))
        _log(file, self.format.format("B", IB, PFB, Iunb["B"]))
        _log(file, self.format.format("C", IC, PFC, Iunb["C"]))
        _log(file, "IN: {:>10.2f}A".format(IN))
        _log(file, "")

    def _RunBalancingIteration(self, file, IA, IB, IC, IBal, picks_method):
        """
        Run one pass of load balancing using a section selection method.
        Applies the method to each study point and the main network.
        """
        pre_num = study.GetModificationsCount()
        self.new_sections_list = []
        self.sections_list = self.GetSinglePhaseSections()
        _points_list = self.study_points.copy()
        _points_list.append(self.network_id)
        if not self.sections_list:
            raise RuntimeError("No single phase branches found")
        _log(file, f"Single Phase Sections: {picks_method.__name__}")
        _log(file, f"{self.separator}\n")

        rows = []
        for point, sections in zip(_points_list, self.sections_list):
            _IA, _IB, _IC, _IN, _IBal, _PFA, _PFB, _PFC, _Iunb = self.GetLoadFlow(point)
            picks, sections = picks_method(sections, _IA, _IB, _IC, _IBal)
            self.new_sections_list.append(sections)
            rows += self.TransferLoad(file, picks)
        self.LF.Run([self.network_id])
        _log(file, self.separator)
        _log(file, f"\nFeeder: {self.network_id}, after balancing:")
        for meter in self.meters:
            _log(file, f"\n@ Meter: {meter.DeviceNumber}")
            _IA, _IB, _IC, _IN, _IBal, _PFA, _PFB, _PFC, _Iunb = self.GetLoadFlow(
                study.QueryInfoDevice(
                    "FromNodeId", meter.DeviceNumber, meter.DeviceType
                )
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
            _log(file, f"\n@ {study_point}")
            _IA, _IB, _IC, _IN, _IBal, _PFA, _PFB, _PFC, _Iunb = self.GetLoadFlow(
                study_point
            )
            self.PrintLoad(file, _IA, _IB, _IC, _IN, _PFA, _PFB, _PFC, _Iunb)

        self.LA.Run([self.network_id])

        for t in str(self).split("//"):
            _log(file, t.strip())
        _log(file, self.separator)
        modifications = study.ListModifications()
        _log(file, "\nModifications made during the balancing process:")
        for idx, modification in enumerate(modifications):
            _log(file, f"{idx + 1}: {modification}")
        pst_num = study.GetModificationsCount()
        study.Undo(pst_num - pre_num)

    def Run(self):
        """
        Main logic to initialize, run two balancing methods, and report results.
        Handles file output, runs both balancing methods, and undoes changes after reporting.
        """
        with open(self._file_path, "w") as file:
            if self.network_id not in study.ListNetworks():
                raise RuntimeError("The feeder loaded in the study is not correct!")
            _log(file, self.separator)
            _log(file, f"Feeder: {self.network_id}, before balancing:")
            count = study.GetModificationsCount()
            self.SetFeederDemand()

            # Try both allocation methods if needed
            allocation_success = False
            allocation_errors = []
            for i in range(2):
                try:
                    self.LA.Run([self.network_id])
                    allocation_success = True
                    break
                except Exception as e:
                    allocation_errors.append(str(e))
                    _log(
                        file,
                        f"Error running LoadAllocation (method {self.LA.GetValue('Method')}): {e}. Switching allocation method.",
                    )
                    self.ChangeAllocationMethod()
            if not allocation_success:
                _log(file, f"Both allocation methods failed: {allocation_errors}")
                raise RuntimeError("LoadAllocation failed for both methods.")

            # Get initial load flow values
            IA = IB = IC = IN = IBal = PFA = PFB = PFC = Iunb = 0
            _log(file, "\n@ MAIN_METER:")
            IA, IB, IC, IN, IBal, PFA, PFB, PFC, Iunb = self.GetLoadFlow(
                self.network_id
            )
            self.PrintLoad(file, IA, IB, IC, IN, PFA, PFB, PFC, Iunb)

            # Run CYME iteration and print all meter loads
            self.RunCYMEIteration(self.network_id)
            for meter in self.meters:
                if meter.DeviceNumber == self.network_id:
                    continue
                _log(file, f"\n@ Meter: {meter.DeviceNumber}")
                try:
                    from_node = study.QueryInfoDevice(
                        "FromNodeId", meter.DeviceNumber, meter.DeviceType
                    )
                    _IA, _IB, _IC, _IN, _IBal, _PFA, _PFB, _PFC, _Iunb = (
                        self.GetLoadFlow(from_node)
                    )
                except Exception as e:
                    _log(
                        file,
                        f"Error getting load flow for meter {meter.DeviceNumber}: {e}",
                    )
                    continue
                self.PrintLoad(file, _IA, _IB, _IC, _IN, _PFA, _PFB, _PFC, _Iunb)

            # Sort study points by calculated IBal
            def calculated(x):
                try:
                    return float(study.QueryInfoNode("IBal", x, 2))
                except Exception:
                    return float("inf")

            self.study_points = sorted(self.study_points, key=calculated)
            for study_point in self.study_points:
                _log(file, f"\n@ {study_point}")
                try:
                    _IA, _IB, _IC, _IN, _IBal, _PFA, _PFB, _PFC, _Iunb = (
                        self.GetLoadFlow(study_point)
                    )
                except Exception as e:
                    _log(
                        file,
                        f"Error getting load flow for study point {study_point}: {e}",
                    )
                    continue
                self.PrintLoad(file, _IA, _IB, _IC, _IN, _PFA, _PFB, _PFC, _Iunb)

            self.counter += 1
            _log(file, self.separator)
            _log(file, "Load Balancing Method #1:\n")
            self._RunBalancingIteration(file, IA, IB, IC, IBal, self.PickSections)
            _log(file, self.separator)

            self.counter += 1

            _log(file, self.separator)
            _log(file, "Load Balancing Method #2:\n")
            self._RunBalancingIteration(file, IA, IB, IC, IBal, self.PickSections_2)
            _log(file, self.separator)
            study.Undo(study.GetModificationsCount() - count)


if __name__ == "__main__":
    # Script entry point. Sets up environment and runs the load balancing process.
    start = time.time()
    locale.setlocale(locale.LC_NUMERIC, "")
    app.ActivateRefresh(False)
    try:
        # Instantiate LoadBalancing with required parameters fetched internally
        lb = LoadBalancing()
        lb.Run()
        del lb
    except Exception:
        traceback.print_exc()
    finally:
        app.ActivateRefresh(True)
    print("Execution Time: {}s".format(time.time() - start))
    # app.ActivateRefresh(True)
