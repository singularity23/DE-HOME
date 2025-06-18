import locale
import os
import sys
import traceback
import time
import math
from datetime import datetime
from pathlib import Path
from cympy import *


def QueryWithFallback(query_func, keyword_list, *args):
    # """
    # Executes a query function for a list of keywords and attempts to convert the results to numeric values.

    # Args:
    #     query_func (function): The function used to query information, from cympy module.
    #     keyword_list (list): A list of keywords to query.
    #     *args: Additional arguments to pass to the query function.

    # Returns:
    #     list: A list containing the results of the query. If the result can be converted to a numeric value, it is returned as a float; otherwise, the original result is returned.
    # """
    output_list = []
    for id in keyword_list:
        result = query_func(id, *args)
        try:
            output_list.append(locale.atof(result))
        except Exception:
            output_list.append(result)
    return output_list


def QueryDevices(keyword_list, dev_number, dev_type):
    # """
    # Queries devices based on provided keywords, device number, and device type.

    # Args:
    #     keyword_list (list): List of keywords to filter devices.
    #     dev_number (str): Identifier or number of the device to query.
    #     dev_type (str): Type or category of the device.

    # Returns:
    #     Any: Result of the device query, as returned by the fallback query function.
    # """
    return QueryWithFallback(study.QueryInfoDevice, keyword_list, dev_number, dev_type)


def QueryNodes(keyword_list, node_id):
    # """
    # Queries nodes based on provided keywords and node ID.

    # Args:
    #     keyword_list (list): List of keywords to filter nodes.
    #     node_id (str): Identifier of the node to query.

    # Returns:
    #     Any: Result of the node query, as returned by the fallback query function.
    # """
    return QueryWithFallback(study.QueryInfoNode, keyword_list, node_id)


def ClosestSumOfSubset(nums, target):
    # """
    # Finds the subset of numbers whose sum is closest to the target value.

    # Uses dynamic programming to track all reachable sums and their corresponding indices.
    # Returns the sum closest to the target and the indices of the numbers that make up this sum.

    # Args:
    #     nums (list of float): List of numbers to consider.
    #     target (float): The target sum to approach.

    # Returns:
    #     tuple: (closest_sum, indices)
    #     closest_sum (float): The sum of the selected subset closest to the target.
    #     indices (list of int): The indices of the numbers in the original list that make up closest_sum.
    # """
    reachable = {0: []}
    for idx, num in enumerate(nums):
        new_reachable = dict(reachable)
        for s, indices in reachable.items():
            new_sum = s + num
            if new_sum not in new_reachable or len(indices) + 1 < len(new_reachable[new_sum]):
                new_reachable[new_sum] = indices + [idx]
        reachable = new_reachable

    closest_sum = min(reachable.keys(), key=lambda x: abs(x - target))
    return closest_sum, reachable[closest_sum]


def GetTarget(dictionary, target):
    # """
    # Finds a pair of items in the dictionary whose values sum closest to the target.

    # Args:
    #     dictionary (dict): Dictionary of items.
    #     target (float): Target sum.

    # Returns:
    #     list: List of (key, value) pairs whose values sum closest to the target.
    # """
    dictionary = dictionary.copy()
    dictionary["empty"] = 0
    nums = list(dictionary.values())
    keys = list(dictionary.keys())
    new_target = abs(target)
    closest_sum, subset_indices = ClosestSumOfSubset(nums, new_target)
    if not subset_indices:
        return []

    picks = [(keys[idx], nums[idx]) for idx in subset_indices]
    return picks


class LoadBalancing:
    # """
    # Class for performing load balancing on a power network.

    # Attributes:
    #     network_id (str): The network identifier.
    #     IA, IB, IC (float): Phase currents.
    #     PFA, PFB, PFC (float): Power factors for each phase.
    #     LA, LF: Load allocation and load flow simulation objects.
    #     sections (dict): Sections available for load transfer.
    #     counter (int): Number of balancing iterations performed.
    #     IN (float): Neutral current.
    #     Iunb (dict): Unbalance for each phase.
    #     Idiff (dict): Difference in current for each phase.
    #     format (str): String format for output.
    #     separator (str): Separator line for output.
    # """
    _network_id, _IA, _IB, _IC, _PFA, _PFB, _PFC, _Iteration = map(
        GetInputParameter,
        ["NetworkID", "ImaxA", "ImaxB", "ImaxC", "PFA", "PFB", "PFC", "Iteration"],
    )
    _variables = [
        "IAout", "IBout", "ICout", "IUnbalA", "IUnbalB", "IUnbalC", "PFA", "PFB", "PFC"
    ]
    _connected_phase = {
        "A": enums.Phase.A, "B": enums.Phase.B, "C": enums.Phase.C,
        "AC": enums.Phase.AC, "BC": enums.Phase.BC, "AB": enums.Phase.AB, "ABC": enums.Phase.ABC,
    }

    def __init__(self, *args, **kwargs):
        # """
        # Initializes the LoadBalancing object with default or provided network parameters.
        # """
        self.network_id = kwargs.get("network", self._network_id)
        self.IA = self.IB = self.IC = self.PFA = self.PFB = self.PFC = 0
        self.LA = self.LF = None
        self.sections = {}
        self.counter = 0
        self.IN = 0
        self.Iunb = {"A": 0, "B": 0, "C": 0}
        self.Idiff = {"A": 0, "B": 0, "C": 0}
        self.format = "{} ph: {:>7.2f}A, {:>7.2f}%PF, {:>7.2f}% unbalance"
        self.separator = "—" * \
            len(self.format.format("A", self.IA, self.PFA, self.Iunb["A"]))

    def __repr__(self):
        # """
        # Returns a string representation of the LoadBalancing object, including feeder and section info.
        # """
        string = "//".join([
            f"Feeder: {self.network_id}",
            f"Load Balancing has been run {self.counter} time(s)"
        ])
        if self.sections:
            string += "//Sections available for load transfer:"
            for key, value in self.sections.items():
                string += f"//{key} Phase:"
                for sec, cur in value.items():
                    if sec != "empty":
                        string += "//Section:{:<13}{:2}{:>6.2f}A".format(
                            sec.ID, "-", cur)
        return string

    def GetSinglePhaseSections(self, network_id):
        # """
        # Retrieves all single-phase sections in the network suitable for load transfer.

        # Args:
        #     network_id (str): The network identifier.

        # Returns:
        #     dict: Dictionary of sections by phase.
        # """
        iterator = study.NetworkIterator(network_id)
        dict_sec = {"A": {}, "B": {}, "C": {}}
        self.LF.Run([network_id])
        while iterator.Next():
            Phase = iterator.GetPhase()
            FromPhase = iterator.GetFromPhase()
            Section = iterator.GetSection()
            Devices = iterator.GetDevices()
            if Phase != FromPhase and FromPhase == enums.Phase.ABC:
                for Device in Devices:
                    if Device.DeviceType != enums.DeviceType.Transformer:
                        IAout, IBout, ICout = QueryDevices(
                            ["IAout", "IBout", "ICout"],
                            Device.DeviceNumber,
                            enums.DeviceType.AllDevices,
                        )
                        if Phase == enums.Phase.A and isinstance(IAout, float) and IAout > 1:
                            dict_sec["A"][Section] = IAout
                        elif Phase == enums.Phase.B and isinstance(IBout, float) and IBout > 1:
                            dict_sec["B"][Section] = IBout
                        elif Phase == enums.Phase.C and isinstance(ICout, float) and ICout > 1:
                            dict_sec["C"][Section] = ICout
        return dict_sec

    def PickSections(self, sec_dict, ImaxA, ImaxB, ImaxC):
        # """
        # Picks sections for load transfer based on current imbalances.

        # Args:
        #     sec_dict (dict): Dictionary of available sections by phase.
        #     ImaxA, ImaxB, ImaxC (float): Maximum currents for each phase.

        # Returns:
        #     list: Solution and updated section dictionary.
        # """

        # Calculate the average current across all phases
        Iavg = (ImaxA + ImaxB + ImaxC) / 3

        # Calculate the difference from the average for each phase
        Idiff = {
            "A": (ImaxA - Iavg),
            "B": (ImaxB - Iavg),
            "C": (ImaxC - Iavg),
        }
        # Identify the phase with the greatest imbalance (absolute value)
        ph_high = max(Idiff, key=lambda k: abs(Idiff[k]))

        # If there are no sections available, return an empty solution
        if not sec_dict:
            return []

        # Get the imbalance of the most imbalanced phase and remove it from Idiff
        I_high = Idiff[ph_high]
        Idiff.pop(ph_high)

        # Sort remaining phases by their absolute imbalance in descending order
        Idiff = dict(
            sorted(Idiff.items(), key=lambda item: abs(item[1]), reverse=True))

        sol = {}   # Initialize a dictionary to store solutions
        temp = []  # Temporary list to store results

        # Iterate over the phases and their imbalances
        for key, value in Idiff.items():
            if math.ceil(value) < 0:
                # If the value is negative (indicating excess), attempt to transfer load
                temp = GetTarget(sec_dict[ph_high], value)
                sol[key] = temp

                # Update the section dictionaries with new assignments
                for i, j in temp:
                    if i != "empty":
                        sec_dict[ph_high].pop(i)
                        sec_dict[key][i] = j

            elif math.floor(value) > 0:
                # If the value is positive, seek additional capacity
                results = GetTarget(sec_dict[key], value)
                temp += results
                sol[ph_high] = temp

                # Update the section dictionaries with new assignments
                for i, j in results:
                    if i != "empty":
                        sec_dict[key].pop(i)
                        sec_dict[ph_high][i] = j

        # Return the solution and updated section dictionary
        return [sol, sec_dict] if temp else [[], sec_dict]

    def TransferLoad(self, dict_sect):
        # """
        # Transfers load between sections and updates device and section properties.

        # Args:
        #     dict_sect (dict): Dictionary of sections to transfer.

        # Returns:
        #     list: Rows for reporting the load transfer.
        # """
        device_list = []
        rows = []
        for key, values in dict_sect.items():
            for sec, cur in values:
                if sec != "empty":
                    phase = sec.GetValue("Phase")
                    Devices = sec.ListDevices()
                    for Device in Devices:
                        if Device.DeviceType in [
                            enums.DeviceType.Fuse,
                            enums.DeviceType.Recloser,
                            enums.DeviceType.Switch,
                        ]:
                            Device.SetValue(
                                self._connected_phase[key], "ClosedPhase")
                            device_list.append(
                                [key, Device.DeviceNumber, Device.DeviceType])
                    sec.SetValue(key, "Phase")
                    rows.append([
                        rm.SectionCell(sec.ID),
                        rm.FloatCell(cur, 2),
                        rm.StringCell(phase),
                        rm.StringCell(key),
                    ])
                    print(
                        f"Change {sec.ID:<12} {cur:>5}A  from {phase:>2} ph to {key:>2} ph")
        for ph, dev_num, dev_type_list in device_list:
            if study.GetValueDevice("ClosedPhase", dev_num, dev_type_list) != self._connected_phase[ph]:
                study.SetValueDevice(
                    self._connected_phase[ph], "ClosedPhase", dev_num, dev_type_list)
        return rows

    def PickSections_2(self, sec_dict, ImaxA, ImaxB, ImaxC, tolerance=1e-1, max_moves=5):
        # """
        # Alternative method to pick sections for load transfer using iterative balancing.

        # Args:
        #     sec_dict (dict): Dictionary of available sections by phase.
        #     ImaxA, ImaxB, ImaxC (float): Maximum currents for each phase.
        #     tolerance (float): Tolerance for improvement.
        #     max_moves (int): Maximum number of moves to attempt.

        # Returns:
        #     tuple: Picks and updated section dictionary.
        # """
        # Initialize variables
        phase_branches = [sec_dict["A"], sec_dict["B"], sec_dict["C"]]
        phase_names = ['A', 'B', 'C']
        picks = {k: [] for k in phase_names}
        peak_loads = [ImaxA, ImaxB, ImaxC]
        avg_load = sum(peak_loads) / 3

        # Iterate up to a maximum number of moves
        for _ in range(max_moves):
            best_move = None
            best_balance = sum(abs(load - avg_load) for load in peak_loads)

            # Find the best move by comparing imbalances across phases
            for i, branch_i in enumerate(phase_branches):
                for branch, load in branch_i.items():
                    for j, branch_j in enumerate(phase_branches):
                        if i != j:
                            # Check potential new peak loads after moving load
                            new_peaks = peak_loads[:]
                            new_peaks[i] -= load
                            new_peaks[j] += load
                            imbalance = sum(abs(l - avg_load) for l in new_peaks)

                            # Validate if the current move improves the balance
                            if imbalance < best_balance - tolerance:
                                best_balance = imbalance
                                best_move = (branch, load, i, j)

            # Execute the best found move
            if best_move:
                branch, load, from_i, to_j = best_move
                phase_branches[from_i].pop(branch)
                phase_branches[to_j][branch] = load
                peak_loads[from_i] -= load
                peak_loads[to_j] += load
                picks[phase_names[to_j]].append((branch, load))

            else:
                # Break early if no improvements can be made
                break

        return picks, sec_dict

    def InitDemand(self, demand=None, location=None):
        # """
        # Initializes the demand meter for the network if not already set.

        # Args:
        #     demand: Demand meter object.
        #     location (str): Network location.

        # Returns:
        #     Demand meter object.
        # """
        if location is None:
            location = self.network_id
        if demand is None:
            demand = sim.Meter()
            self.LA.SetDemand(location, demand)
        IA_import = demand.DemandA.Value1
        IB_import = demand.DemandB.Value1
        IC_import = demand.DemandC.Value1
        if 1.1 * (self._IA + self._IB + self._IC) > IA_import + IB_import + IC_import:
            self.UpdateMeter(
                location, self._IA, self._IB, self._IC, self._PFA, self._PFB, self._PFC, demand
            )
        return demand

    def UpdateMeter(self, network, IA, IB, IC, PFA, PFB, PFC, demand):
        # """
        # Updates the demand meter with new phase currents and power factors.

        # Args:
        #     network (str): Network identifier.
        #     IA, IB, IC (float): Phase currents.
        #     PFA, PFB, PFC (float): Power factors.
        #     demand: Demand meter object.
        # """
        demand.LoadValueType = enums.LoadValueType.AMP_PF
        demand.DemandA = sim.LoadValue()
        demand.DemandB = sim.LoadValue()
        demand.DemandC = sim.LoadValue()
        demand.DemandA.Value1 = IA
        demand.DemandB.Value1 = IB
        demand.DemandC.Value1 = IC
        demand.DemandA.Value2 = PFA
        demand.DemandB.Value2 = PFB
        demand.DemandC.Value2 = PFC
        study.AddMeter(network, enums.DeviceType.Breaker, demand, True)

    def MakeReport(self, IA, IB, IC, IA_out, IB_out, IC_out, rm_rows):
        # """
        # Generates and displays a report summarizing the load balancing results.

        # Args:
        #     IA, IB, IC (float): Phase currents before balancing.
        #     IA_out, IB_out, IC_out (float): Phase currents after balancing.
        #     rm_rows (list): Additional rows for the report.
        # """
        report = rm.CustomReport(
            f"SummaryReport_{self.counter}",
            ["NetworkID", "Phase", "Before (A)", "After (A)"],
        )
        cf = rm.CellFormat()
        cf.BackColor = 14737632
        cf.Bold = True
        rows = [
            [rm.NetworkCell(self.network_id), rm.StringCell(
                "A"), rm.FloatCell(IA, 2), rm.FloatCell(IA_out, 2)],
            [rm.StringCell(""), rm.StringCell("B"), rm.FloatCell(
                IB, 2), rm.FloatCell(IB_out, 2)],
            [rm.StringCell(""), rm.StringCell("C"), rm.FloatCell(
                IC, 2), rm.FloatCell(IC_out, 2)],
            [rm.StringCell("SectionID", cf), rm.StringCell(
                "Load (A)", cf), rm.StringCell("Before", cf), rm.StringCell("After", cf)],
        ]
        report_rows = rows + rm_rows
        for row in report_rows:
            report.AddRow(row)
        report.Show()

    def GetLoadFlow(self, node_id):
        # """
        # Retrieves the load flow readings and power factors for the specified node.

        # Args:
        #     node_id (str): The identifier for the node from which to retrieve load flow data.

        # Returns:
        #     list: A list containing the load values and power factors for phases A, B, C.
        # """
        IA, IB, IC, IunbA, IunbB, IunbC, PFA, PFB, PFC = QueryNodes(
            self._variables, node_id)
        IN = (IA**2 + IB**2 + IC**2 - IA * IB - IB * IC - IC * IA) ** 0.5
        print("")
        print(self.format.format("A", IA, PFA, IunbA))
        print(self.format.format("B", IB, PFB, IunbB))
        print(self.format.format("C", IC, PFC, IunbC))
        print("IN: {:>9.2f}A".format(IN))
        print("")
        Iunb = {"A": IunbA, "B": IunbB, "C": IunbC}
        return [IA, IB, IC, IN, PFA, PFB, PFC, Iunb]

    def _run_balancing_iteration(self, IA, IB, IC, meter, picks_method, picks_args):
        # """
        # Runs a single load balancing iteration using the specified picking method.

        # Args:
        #     IA, IB, IC (float): Phase currents before balancing.
        #     meter: Meter object.
        #     picks_method (function): Section picking method.
        #     picks_args (tuple): Arguments for the picking method.
        # """
        pre_num = study.GetModificationsCount()
        self.sections = self.GetSinglePhaseSections(self.network_id)
        if not self.sections:
            print("No solution has been found")
            sys.exit()
        print(f"Single Phase Sections: {picks_method.__name__}")
        picks, self.sections = picks_method(self.sections, *picks_args)
        if not picks:
            print("No Solution has been found!")
            sys.exit()
        rows = self.TransferLoad(picks)
        self.LF.Run([self.network_id])
        self.IA, self.IB, self.IC, self.IN, self.PFA, self.PFB, self.PFC, self.Iunb = self.GetLoadFlow(
            self.network_id)
        self.MakeReport(IA, IB, IC, self.IA, self.IB, self.IC, rows)
        self.UpdateMeter(self.network_id, self.IA, self.IB,
                         self.IC, self.PFA, self.PFB, self.PFC, meter)
        self.LA.Run([self.network_id])
        for t in str(self).split("//"):
            print(t.strip())
        print(self.separator)
        pst_num = study.GetModificationsCount()
        study.Undo(pst_num - pre_num)

    def Run(self):
        # """
        # Main entry point for running the load balancing process.
        # Initializes the simulation, runs balancing iterations, and generates reports.
        # """
        LB = LoadBalancing(network=self.network_id)
        print(f"Feeder: {self.network_id}")
        LB.LA = sim.LoadAllocation()
        LB.LF = sim.LoadFlow()
        count = study.GetModificationsCount()
        meter = study.GetMeter(self.network_id, enums.DeviceType.Breaker)
        if not any([LB.IA, LB.IB, LB.IC]):
            meter = LB.InitDemand(meter)
        LB.LA.Run([LB.network_id])
        LB.LF.Run([LB.network_id])
        IA, IB, IC, IN, PFA, PFB, PFC, Iunb = LB.GetLoadFlow(LB.network_id)
        LB._IA, LB._IB, LB._IC, LB._PFA, LB._PFB, LB._PFC = IA, IB, IC, PFA, PFB, PFC
        print(LB.separator)
        for _ in range(LB._Iteration):
            LB.counter += 1
            LB._run_balancing_iteration(
                IA, IB, IC, meter, LB.PickSections, (IA, IB, IC))
            LB._run_balancing_iteration(
                IA, IB, IC, meter, LB.PickSections_2, (LB._IA, LB._IB, LB._IC))
        del LB
        study.Undo(study.GetModificationsCount() - count)


if __name__ == "__main__":
    # """
    # Script entry point. Sets up environment and runs the load balancing process.
    # """
    start = time.time()
    script_dir = GetInputParameter("Script_Location")
    sys.path.append(os.path.abspath(script_dir))
    locale.setlocale(locale.LC_NUMERIC, "")
    locale.getdefaultlocale = lambda *args: ["us_CA", "utf8"]
    app.ActivateRefresh(False)
    try:
        LoadBalancing().Run()
    except Exception:
        traceback.print_exc()
    print("Execution Time: {}s".format(time.time() - start))
