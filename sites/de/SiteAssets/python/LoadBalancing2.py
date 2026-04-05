# """
# Update @ 2025-05-29
# Update @ 2025-06-27: Add function to balance not only the feeder, but the downstream
#                      of point of studies of choices
# Update @ 2025-07-28: Add error handling for LoadAllocation methods between KVA and KWH
# Update @ 2025-11-30: Improve PickSections_2 to use iterative balancing approach
# Update @ 2026-04-02: Code review — fix dict-merge bug in section summary, fix temp
#                      accumulation in PickSections, remove unused variables/params,
#                      harden float DP keys, separate business logic from __repr__.
# """

import locale
import os
import traceback
import math
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from cympy import GetInputParameter, app, enums, rm, sim, study

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MULTIPLIER = 1.1
CELL_FORMAT_COLOR = 14_737_632
ALLOCATION_METHODS: Tuple[str, str] = ("KVAMethod", "KWHMethod")
PHASES: Tuple[str, str, str] = ("A", "B", "C")

# cympy "detail level" argument used throughout QueryInfo* calls
_DECIBEL = 2


# ---------------------------------------------------------------------------
# Custom exception
# ---------------------------------------------------------------------------
class LoadBalancingError(Exception):
    """Raised when the load-balancing algorithm cannot proceed."""


# ---------------------------------------------------------------------------
# Pure helper functions
# ---------------------------------------------------------------------------


def combine_dicts(dict1: Dict, dict2: Dict) -> Dict:
    """
    Merge per-phase section dicts from *dict2* into *dict1* for matching keys.

    Returns a new dict; neither input is mutated.  Either argument may be
    empty, in which case the other is returned directly.
    """
    if not dict1:
        return dict2
    if not dict2:
        return dict1

    result = {k: v.copy() for k, v in dict1.items()}
    for key in result:
        if key in dict2:
            result[key].update(dict2[key])
    return result


def query_with_fallback(
    query_func,
    keyword_list: List[str],
    *args,
) -> List[Optional[float]]:
    """
    Call *query_func(keyword, *args)* for each keyword and return the results
    as floats where possible.

    Non-numeric, non-empty strings are preserved as-is so callers that expect
    text (e.g. "Yes"/"No") still receive useful values.
    """

    def _try_float(value: Any) -> Optional[float]:
        if value is None:
            return None
        text = str(value).strip()
        if not text:
            return None
        try:
            return locale.atof(text)
        except (ValueError, TypeError):
            pass
        try:
            return float(text)
        except (ValueError, TypeError):
            return None

    results: List[Optional[float]] = []
    for key in keyword_list:
        try:
            raw = query_func(key, *args)
        except Exception:
            results.append(None)
            continue

        parsed = _try_float(raw)
        # Preserve non-numeric strings (e.g. "Yes") for callers that need them
        results.append(
            parsed
            if parsed is not None
            else (raw if isinstance(raw, str) and raw.strip() else None)
        )
    return results


def query_devices(
    keyword_list: List[str], dev_number: str, dev_type
) -> List[Optional[float]]:
    """Query device attributes via *query_with_fallback*."""
    return query_with_fallback(
        study.QueryInfoDevice, keyword_list, dev_number, dev_type, _DECIBEL
    )


def query_nodes(keyword_list: List[str], node_id: str) -> List[Optional[float]]:
    """Query node attributes via *query_with_fallback*."""
    return query_with_fallback(study.QueryInfoNode, keyword_list, node_id, _DECIBEL)


def closest_sum_of_subset(
    nums: List[float],
    target: float,
) -> Tuple[float, List[int]]:
    """
    Return *(closest_sum, indices)* where *indices* is the subset of *nums*
    whose sum is closest to *target*.

    Uses dynamic programming.  Float keys are rounded to *_DECIBEL*
    decimal places to prevent hash collisions from floating-point arithmetic.
    """
    if not nums:
        return 0.0, []

    valid = [
        (i, n) for i, n in enumerate(nums) if isinstance(n, (int, float)) and n > 0
    ]
    if not valid:
        return 0.0, []

    # Pre-sort so smaller elements are tried first; order doesn't affect
    # correctness but keeps the table compact in typical cases.
    valid.sort(key=lambda x: x[1])

    # DP table: rounded_sum -> list[original_index]
    reachable: Dict[float, List[int]] = {0.0: []}
    best_diff = float("inf")
    best_sum = 0.0

    for orig_idx, num in valid:
        # Iterate over a snapshot so we don't modify the dict mid-loop
        for curr_sum, indices in list(reachable.items()):
            new_sum_raw = curr_sum + num
            new_sum = round(new_sum_raw, _DECIBEL)

            if new_sum in reachable and len(reachable[new_sum]) <= len(indices) + 1:
                continue  # Already have an equal or shorter path to this sum

            reachable[new_sum] = indices + [orig_idx]

            diff = abs(new_sum - target)
            if diff < best_diff:
                best_diff = diff
                best_sum = new_sum

    return best_sum, reachable.get(best_sum, [])


def get_target(dictionary: Dict, target: float) -> List[Tuple]:
    """
    Return key-value pairs from *dictionary* whose values sum closest to
    *abs(target)*.  Used to select sections for phase transfer.
    """
    if not dictionary:
        return []
    nums = list(dictionary.values())
    keys = list(dictionary.keys())
    _, indices = closest_sum_of_subset(nums, abs(target))
    return [(keys[i], nums[i]) for i in indices]


def _log(file, message: str) -> None:
    """Write *message* to *file* and echo it to stdout."""
    print(message)
    file.write(message + "\n")


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------


class LoadBalancing:
    """Perform three-phase load balancing on a CYME power network."""

    # ------------------------------------------------------------------
    # Initialisation
    # ------------------------------------------------------------------

    def __init__(self) -> None:
        self._initialize_parameters()
        self._initialize_simulation()
        self._initialize_variables()
        self._initialize_study_points()
        self._initialize_documentation()

    def _initialize_parameters(self) -> None:
        """Read and validate input parameters; raise *ValueError* if NetworkID is absent."""

        def _safe(name: str, default: float | str | None = None) -> float | str:
            try:
                value = GetInputParameter(name)
                if isinstance(default, (int, float)):
                    return float(value) if value else default
                return str(value) if value else str(default)
            except (ValueError, TypeError) as exc:
                print(f"Warning: cannot read parameter '{name}': {exc}")
                return default if default is not None else 0.0

        self.network_id: str = _safe("NetworkID", "")
        if not self.network_id:
            raise ValueError("NetworkID is required")

        self.IA = float(_safe("ImaxA", 0.0))
        self.IB = float(_safe("ImaxB", 0.0))
        self.IC = float(_safe("ImaxC", 0.0))
        self.PFA = float(_safe("PFA", 100.0))
        self.PFB = float(_safe("PFB", 100.0))
        self.PFC = float(_safe("PFC", 100.0))
        self.MINIMUM_CURRENT = float(_safe("Min_Current", 5.0))
        self.file_dir: str = str(_safe("Report_Location", "."))

    def _initialize_simulation(self) -> None:
        self.meters: List = []
        self.main_meter = sim.Meter()
        self.mm_device = None
        self.LA = sim.LoadAllocation()
        self.LA.SetValue(ALLOCATION_METHODS[0], "Method")
        self.LF = sim.LoadFlow()

    def _initialize_variables(self) -> None:
        # Node variables queried after each load-flow run
        self._lf_variables = [
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
        self._connected_phase = {ph: getattr(enums.Phase, ph) for ph in PHASES}
        self.sections: Dict = {}
        self.counter: int = 0
        self.study_points: List[str] = []
        self.sections_list: List[Dict] = []
        self.new_sections_list: List[Dict] = []
        self.DADquery: List[str] = []

    def _initialize_study_points(self) -> None:
        self.study_points = [
            node.ID for node in study.ListNodes() if node.ID.startswith("STUDY_POINT")
        ]

    def _initialize_documentation(self) -> None:
        self._fmt = "{} ph: {:>8.2f}A, {:>8.2f}% PF, {:>8.2f}% unbalance"
        self.separator = "—" * len(self._fmt.format("A", self.IA, self.PFA, 0))
        self._current_datetime = datetime.now().strftime("%Y%m%d_%H%M%S")
        self._file_name = (
            f"LoadBalancing_{self.network_id}_{self._current_datetime}.txt"
        )
        self._file_path = os.path.join(self.file_dir, self._file_name)

    # ------------------------------------------------------------------
    # Allocation method helper
    # ------------------------------------------------------------------

    def change_allocation_method(self) -> None:
        active = self.LA.GetValue("Method")
        next_method = (
            ALLOCATION_METHODS[1]
            if active == ALLOCATION_METHODS[0]
            else ALLOCATION_METHODS[0]
        )
        self.LA.SetValue(next_method, "Method")

    # kept for API compatibility
    ChangeAllocationMethod = change_allocation_method

    # ------------------------------------------------------------------
    # Section summary (pure representation — no side effects)
    # ------------------------------------------------------------------

    def _build_sections_summary(self) -> Dict:
        """
        Merge all per-study-point section dicts into one combined dict.

        FIX: the previous __repr__ implementation always passed
        ``sections_list[0]`` as the left-hand argument, so only the last dict
        was ever merged into index 0 and all intermediate dicts were lost.
        Now we fold the list left-to-right correctly.
        """
        n = len(self.sections_list)
        if n == 0:
            raise LoadBalancingError("No solution: sections_list is empty")
        merged = self.sections_list[0]
        for i in range(1, n):
            merged = combine_dicts(merged, self.sections_list[i])
        return merged

    def __repr__(self) -> str:
        """Lightweight repr — delegates heavy work to *_build_sections_summary*."""
        sections = self._build_sections_summary()
        lines = [f"Load Balancing has been run {self.counter} time(s)\n"]
        query_headers = ["//[Gis] |O/H Primary|", "//[Gis] |U/G Primary|"]
        query_lines = []
        i = 0
        if sections:
            lines.append("Single phase sections after load transfer:\n")
            query_lines.append("//where ")
            for phase, secs in sections.items():
                lines.append(f"{self.separator}\n")
                lines.append(f"{phase} Phase:\n")
                for sec, cur in secs.items():
                    if sec != "empty":
                        if i > 0:
                            lines.append("//or ")
                            i += 1

                        query_lines.append(f"|System Id| = {sec.ID}")

                        lines.append(
                            "Section: {:<15}{:3}{:>7.2f}A\n".format(
                                "[" + sec.ID + "]", "-", cur
                            )
                        )
        first = "\n".join([query_headers[0], *query_lines])
        second = "\n".join([query_headers[1], *query_lines])
        self.DADquery = first + "\n//plus" + second
        return "\n//".join(lines)

    # ------------------------------------------------------------------
    # Section discovery
    # ------------------------------------------------------------------

    def get_single_phase_sections(self) -> List[Dict]:
        """
        Collect single-phase sections for each study point and the main network.

        Sections that appear in an earlier (closer to source) study point are
        excluded from subsequent (downstream) dicts to avoid double-counting.
        """
        # Run load flow once before iterating — avoids redundant runs inside
        # RunCYMEIteration for every point.
        self.LF.Run([self.network_id])

        points = self.study_points + [str(self.network_id)]
        all_dicts = [self._get_sections_for_node(point) for point in points]

        if not all_dicts:
            return []

        grouped: List[Dict] = [all_dicts[0]]
        for i in range(1, len(all_dicts)):
            seen_keys = {
                phase: {key for prev in all_dicts[:i] for key in prev[phase]}
                for phase in PHASES
            }
            filtered = {
                phase: {
                    k: v
                    for k, v in all_dicts[i][phase].items()
                    if k not in seen_keys[phase]
                }
                for phase in PHASES
            }
            grouped.append(filtered)
        return grouped

    # Kept for API compatibility
    def GetSinglePhaseSections(self) -> List[Dict]:
        return self.get_single_phase_sections()

    def _get_sections_for_node(self, node_id: str) -> Dict:
        """
        Iterate downstream from *node_id* and collect single-phase sections
        with sufficient current.  Does **not** run LoadFlow internally.
        """
        dict_sec: Dict = {phase: {} for phase in PHASES}
        dict_node: Dict = {}
        iterator = study.NetworkIterator(node_id, enums.IterationOption.Downstream)
        while iterator.Next():
            section = iterator.GetSection()
            node = iterator.GetFromNode()
            phase = iterator.GetPhase()
            for device in iterator.GetDevices():
                is_meter = study.QueryInfoDevice(
                    "IsMeter", device.DeviceNumber, device.DeviceType
                )
                if is_meter == "Yes" and device not in self.meters:
                    self.meters.append(device)
                if not self._is_valid_section(iterator):
                    continue
                if device.DeviceType == enums.DeviceType.Transformer:
                    continue
                self._process_section_devices(
                    phase, section, node, device, dict_sec, dict_node
                )
        self.section_from_nodes = dict_node
        return dict_sec

    # Kept for API compatibility
    def RunCYMEIteration(self, node_id: str) -> Dict:
        self.LF.Run([self.network_id])
        return self._get_sections_for_node(node_id)

    def _is_valid_section(self, iterator) -> bool:
        """True only for sections where the phase transitions from ABC to single-phase."""
        return (
            iterator.GetPhase() != iterator.GetFromPhase()
            and iterator.GetFromPhase() == enums.Phase.ABC
        )

    def _process_section_devices(
        self, phase, section, node, device, dict_sec: Dict, dict_node: Dict
    ) -> None:
        """Add *section* to *dict_sec* if its current exceeds the minimum threshold."""
        currents = query_devices(
            ["IAout", "IBout", "ICout"],
            device.DeviceNumber,
            enums.DeviceType.AllDevices,
        )
        for ph, current in zip(PHASES, currents):
            if (
                phase == getattr(enums.Phase, ph)
                and isinstance(current, (int, float))
                and float(current) > self.MINIMUM_CURRENT
            ):
                dict_sec[ph][section] = float(current)
                dict_node[section] = node

    # ------------------------------------------------------------------
    # Section selection — Method 1 (greedy closest-sum)
    # ------------------------------------------------------------------

    def PickSections(
        self,
        sec_dict: Dict,
        ImaxA: float,
        ImaxB: float,
        ImaxC: float,
        IBal: float,
    ) -> Tuple[Dict, Dict]:
        """
        Select sections to transfer based on per-phase current imbalances.

        FIX: *temp* was previously accumulated across loop iterations, causing
        moves from earlier phases to bleed into later picks.  It is now reset
        per (key, value) pair.
        """
        Iavg = IBal or (ImaxA + ImaxB + ImaxC) / 3
        Idiff = {k: v - Iavg for k, v in zip("ABC", [ImaxA, ImaxB, ImaxC])}
        if not sec_dict:
            return {}, sec_dict

        ph_high = max(Idiff, key=lambda k: abs(Idiff[k]))
        other_phases = {k: v for k, v in Idiff.items() if k != ph_high}
        sorted_others = dict(
            sorted(other_phases.items(), key=lambda x: abs(x[1]), reverse=True)
        )

        sol: Dict = {}
        for key, value in sorted_others.items():
            if math.ceil(value) < 0:
                # *key* phase is light — steal branches from the heavy phase
                picks = get_target(sec_dict[ph_high], value)
                if picks:
                    sol[key] = picks
                    for sec, cur in picks:
                        sec_dict[ph_high].pop(sec, None)
                        sec_dict[key][sec] = cur
            elif math.floor(value) > 0:
                # *key* phase is heavy — donate branches to the heaviest phase
                # FIX: use a fresh list per key, not an accumulator across keys
                picks = get_target(sec_dict[key], value)
                if picks:
                    sol[ph_high] = picks
                    for sec, cur in picks:
                        sec_dict[key].pop(sec, None)
                        sec_dict[ph_high][sec] = cur

        return sol, sec_dict

    # ------------------------------------------------------------------
    # Section selection — Method 2 (iterative greedy improvement)
    # ------------------------------------------------------------------

    def PickSections_2(
        self,
        sec_dict: Dict,
        ImaxA: float,
        ImaxB: float,
        ImaxC: float,
        IBal: float,
        tolerance: float = 1e-1,
    ) -> Tuple[Dict, Dict]:
        """
        Iteratively find the single branch move that most reduces imbalance
        and repeat until no improvement is found.

        FIX: removed the unused *max_moves* parameter and the unused
        *current_peak* variable.  The *tolerance* parameter is retained for
        future use (currently the loop stops on any non-improvement).
        """
        phase_names = list(sec_dict.keys())
        phase_branches = {k: dict(v) for k, v in sec_dict.items()}  # shallow copy
        picks: Dict = {k: [] for k in phase_names}

        peak_loads = [ImaxA, ImaxB, ImaxC]
        avg_load = IBal or sum(peak_loads) / 3

        def _imbalance(loads: List[float]) -> float:
            return max(abs(load - avg_load) for load in loads)

        current_balance = _imbalance(peak_loads)
        improved = True

        while improved:
            improved = False
            best_move = None
            best_balance = current_balance

            for i, phase in enumerate(phase_names):
                for branch, load in phase_branches[phase].items():
                    for j, other_phase in enumerate(phase_names):
                        if i == j:
                            continue
                        new_peaks = peak_loads[:]
                        new_peaks[i] -= load
                        new_peaks[j] += load
                        new_balance = _imbalance(new_peaks)
                        if new_balance < best_balance:
                            best_balance = new_balance
                            best_move = (branch, load, i, j)

            if best_move is not None and best_balance < current_balance:
                branch, load, from_i, to_j = best_move
                from_phase, to_phase = phase_names[from_i], phase_names[to_j]
                phase_branches[from_phase].pop(branch)
                phase_branches[to_phase][branch] = load
                peak_loads[from_i] -= load
                peak_loads[to_j] += load
                picks[to_phase].append((branch, load))
                current_balance = best_balance
                improved = True

        return picks, phase_branches

    # ------------------------------------------------------------------
    # Load transfer
    # ------------------------------------------------------------------

    def TransferLoad(self, file, dict_sect: Dict) -> List:
        """
        Apply the selected phase transfers to the network model.
        Returns report rows for the custom report.
        """
        device_list: List[Tuple] = []
        report_rows: List = []

        for idx, (phase, sections) in enumerate(
            (ph, sec) for ph, secs in dict_sect.items() for sec in [secs]
        ):
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
                            (phase, device.DeviceNumber, device.DeviceType)
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
                _log(
                    file,
                    f"{idx + 1}: Change {'[' + section.ID + ']':<12} {current:>5.2f}A"
                    f"  from {old_phase:>2} ph to {phase:>2} ph",
                )

        self._update_devices(device_list)
        return report_rows

    def _update_devices(self, device_list: List[Tuple]) -> None:
        """Ensure ClosedPhase is set correctly for all affected devices."""
        for ph, dev_num, dev_type in device_list:
            target_phase = self._connected_phase[ph]
            if study.GetValueDevice("ClosedPhase", dev_num, dev_type) != target_phase:
                study.SetValueDevice(target_phase, "ClosedPhase", dev_num, dev_type)

    # ------------------------------------------------------------------
    # Demand / meter helpers
    # ------------------------------------------------------------------

    def SetFeederDemand(self) -> None:
        """
        Attach the feeders demand meter, updating it if the measured demand
        exceeds the currently imported value.
        """
        try:
            self.mm_device = study.GetDevice(self.network_id, enums.DeviceType.Breaker)
        except Exception as exc:
            raise LoadBalancingError(
                f"No Breaker found for network '{self.network_id}': {exc}"
            ) from exc
        try:
            self.main_meter = study.GetMeter(self.network_id, enums.DeviceType.Breaker)
        except Exception as exc:
            raise LoadBalancingError(
                f"No Meter found for network '{self.network_id}': {exc}"
            ) from exc

        IA_imp = self.main_meter.DemandA.Value1
        IB_imp = self.main_meter.DemandB.Value1
        IC_imp = self.main_meter.DemandC.Value1

        if MULTIPLIER * (self.IA + self.IB + self.IC) > (IA_imp + IB_imp + IC_imp):
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

    def UpdateMeter(self, device, meter, IA, IB, IC, PFA, PFB, PFC) -> None:
        """Overwrite meter demand with new phase currents and power factors."""
        meter.LoadValueType = enums.LoadValueType.AMP_PF
        meter.DemandA = sim.LoadValue(IA, PFA)
        meter.DemandB = sim.LoadValue(IB, PFB)
        meter.DemandC = sim.LoadValue(IC, PFC)
        study.AddMeter(device.DeviceNumber, device.DeviceType, meter, True)

    # ------------------------------------------------------------------
    # Reporting
    # ------------------------------------------------------------------

    def MakeReport(self, IA, IB, IC, IA_out, IB_out, IC_out, rm_rows) -> None:
        """Build and display the pre/post balancing summary report."""
        report = rm.CustomReport(
            f"SummaryReport_{self.network_id}_{self._current_datetime}",
            ["NetworkID", "Phase", "Before (A)", "After (A)"],
        )
        cf = rm.CellFormat()
        cf.BackColor = CELL_FORMAT_COLOR
        cf.Bold = True

        header_rows = [
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
        for row in header_rows + rm_rows:
            report.AddRow(row)
        report.Show()

    # ------------------------------------------------------------------
    # Load-flow helpers
    # ------------------------------------------------------------------

    def GetLoadFlow(self, node_dev: str):
        """
        Run load flow and return (IA, IB, IC, IN, IBal, PFA, PFB, PFC, Iunb).
        IN is recomputed from the phase currents for accuracy.
        """
        self.LF.Run([self.network_id])
        raw = query_nodes(self._lf_variables, node_dev)

        def _safe_float(x) -> float:
            return float(x) if isinstance(x, (int, float)) else 0.0

        IA, IB, IC, _IN, IBal, IunbA, IunbB, IunbC, PFA, PFB, PFC = (
            _safe_float(v) for v in raw
        )
        IN = math.sqrt(max(IA**2 + IB**2 + IC**2 - IA * IB - IB * IC - IC * IA, 0.0))
        return IA, IB, IC, IN, IBal, PFA, PFB, PFC, {"A": IunbA, "B": IunbB, "C": IunbC}

    def PrintLoad(self, file, IA, IB, IC, IN, PFA, PFB, PFC, Iunb) -> None:
        """Print per-phase current, power factor, and unbalance to *file*."""
        _log(file, "")
        _log(file, self._fmt.format("A", IA, PFA, Iunb["A"]))
        _log(file, self._fmt.format("B", IB, PFB, Iunb["B"]))
        _log(file, self._fmt.format("C", IC, PFC, Iunb["C"]))
        _log(file, "IN: {:>10.2f}A".format(IN))
        _log(file, "")

    # ------------------------------------------------------------------
    # Balancing iteration
    # ------------------------------------------------------------------

    def _RunBalancingIteration(self, file, IA, IB, IC, IBal, picks_method) -> None:
        """
        Execute one complete balancing pass using *picks_method*, log results,
        update meters, then undo all changes.
        """
        pre_num = study.GetModificationsCount()
        self.new_sections_list = []
        self.sections_list = self.get_single_phase_sections()

        if not self.sections_list:
            raise RuntimeError("No single-phase branches found")

        _log(file, f"Single Phase Sections: {picks_method.__name__}\n")
        _log(file, f"{self.separator}\n")

        points = self.study_points + [str(self.network_id)]
        rows: List = []
        picks: Dict = {}
        for point, sections in zip(points, self.sections_list):
            _IA, _IB, _IC, _IN, _IBal, _PFA, _PFB, _PFC, _Iunb = self.GetLoadFlow(point)
            picks, sections = picks_method(sections, _IA, _IB, _IC, _IBal)
            self.new_sections_list.append(sections)
            rows += self.TransferLoad(file, picks)

        self.LF.Run([self.network_id])
        _log(file, f"{self.separator}")
        _log(file, f"\nFeeder: {self.network_id}, after balancing:")

        for meter in self.meters:
            _log(file, f"\n@ Meter: {meter.DeviceNumber}")
            from_node = study.QueryInfoDevice(
                "FromNodeId", meter.DeviceNumber, meter.DeviceType
            )
            _IA, _IB, _IC, _IN, _IBal, _PFA, _PFB, _PFC, _Iunb = self.GetLoadFlow(
                from_node
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

        for t in repr(self).split("//"):
            _log(file, t.strip())
        _log(file, self.separator)

        modifications = study.ListModifications()
        _log(file, "\nModifications made during the balancing process:")
        for idx, mod in enumerate(modifications, start=1):
            _log(file, f"{idx}: {mod}")
        _log(file, self.separator)

        _log(file, "DAD Query:\n")
        for q in self.DADquery.split("//"):
            _log(file, q.strip())

        pst_num = study.GetModificationsCount()
        study.Undo(pst_num - pre_num)

    # ------------------------------------------------------------------
    # Entry point
    # ------------------------------------------------------------------

    def Run(self) -> None:
        """
        Orchestrate the full load-balancing workflow:
        1. Validate network and set feeder demand.
        2. Run load allocation (with automatic method fallback).
        3. Log pre-balancing state.
        4. Run Method 1 (greedy closest-sum) and Method 2 (iterative greedy).
        5. Undo all changes so the study is left in its original state.
        """
        with open(self._file_path, "w") as file:
            if self.network_id not in study.ListNetworks():
                raise RuntimeError(
                    f"Feeder '{self.network_id}' not found in the study."
                )

            _log(file, self.separator)
            _log(file, f"Feeder: {self.network_id}, before balancing:")
            original_count = study.GetModificationsCount()

            self.SetFeederDemand()

            # Try both allocation methods; raise if both fail
            allocation_errors: List[str] = []
            for _ in range(2):
                try:
                    self.LA.Run([self.network_id])
                    break
                except Exception as exc:
                    allocation_errors.append(str(exc))
                    _log(
                        file,
                        f"LoadAllocation ({self.LA.GetValue('Method')}) failed: {exc}. Switching method.",
                    )
                    self.change_allocation_method()
            else:
                _log(file, f"Both allocation methods failed: {allocation_errors}")
                raise RuntimeError("LoadAllocation failed for both methods.")

            # ---- Pre-balancing snapshot ----
            _log(file, "\n@ MAIN_METER:")
            IA, IB, IC, IN, IBal, PFA, PFB, PFC, Iunb = self.GetLoadFlow(
                self.network_id
            )
            self.PrintLoad(file, IA, IB, IC, IN, PFA, PFB, PFC, Iunb)

            # Populate self.meters via a single iteration pass
            self._get_sections_for_node(self.network_id)

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
                except Exception as exc:
                    _log(file, f"Error reading meter '{meter.DeviceNumber}': {exc}")
                    continue
                self.PrintLoad(file, _IA, _IB, _IC, _IN, _PFA, _PFB, _PFC, _Iunb)

            # Sort study points by ascending IBal (most balanced first)
            def _ibal_key(node_id: str) -> float:
                try:
                    return float(study.QueryInfoNode("IBal", node_id, _DECIBEL))
                except Exception:
                    return float("inf")

            self.study_points.sort(key=_ibal_key)

            for sp in self.study_points:
                _log(file, f"\n@ {sp}")
                try:
                    _IA, _IB, _IC, _IN, _IBal, _PFA, _PFB, _PFC, _Iunb = (
                        self.GetLoadFlow(sp)
                    )
                except Exception as exc:
                    _log(file, f"Error reading study point '{sp}': {exc}")
                    continue
                self.PrintLoad(file, _IA, _IB, _IC, _IN, _PFA, _PFB, _PFC, _Iunb)

            # ---- Balancing methods ----
            for method_num, method in enumerate(
                [self.PickSections, self.PickSections_2], start=1
            ):
                self.counter += 1
                _log(file, self.separator)
                _log(file, f"Load Balancing Method #{method_num}:\n")
                self._RunBalancingIteration(file, IA, IB, IC, IBal, method)
                _log(file, self.separator)

            # Restore the study to its original state
            study.Undo(study.GetModificationsCount() - original_count)


# ---------------------------------------------------------------------------
# Script entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    start = time.time()
    locale.setlocale(locale.LC_NUMERIC, "")
    app.ActivateRefresh(False)
    try:
        lb = LoadBalancing()
        lb.Run()
        del lb
    except Exception:
        traceback.print_exc()
    finally:
        app.ActivateRefresh(True)
    print(f"Execution Time: {time.time() - start:.2f}s")
