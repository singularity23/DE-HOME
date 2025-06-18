# Update: 2025-05-29

import locale
import os
import sys
import traceback
import time
import math
from datetime import datetime
from pathlib import Path
from cympy import *

# Make use of cympy.queryInfoNode and cympy.queryInfoDevice functions to query a group of information

def QueryWithFallback(query_func, keyword_list, *args):

	output_list = []
	for id in keyword_list:
		result = query_func(id, *args)
		try:
			output_list.append(locale.atof(result))
		except Exception:
			output_list.append(result)
	#print(output_list)
	return output_list


def QueryDevices(keyword_list, dev_number, dev_type):

	return QueryWithFallback(study.QueryInfoDevice, keyword_list, dev_number, dev_type)


def QueryNodes(keyword_list, node_id):
	#print(keyword_list)
	#print(node_id)
	return QueryWithFallback(study.QueryInfoNode, keyword_list, node_id)

# global functions

def ClosestSumOfSubset(nums, target):
	"""
	Finds the subset of numbers whose sum is closest to the target value.

	Uses dynamic programming to track all reachable sums and their corresponding indices.
	Returns the sum closest to the target and the indices of the numbers (in the original `nums` list) that make up this sum.

	Args:
		nums (list of float): List of numbers to consider.
		target (float): The target sum to approach.

	Returns:
		tuple: (closest_sum, indices)
		closest_sum (float): The sum of the selected subset closest to the target.
		indices (list of int): The indices (referring to the original `nums` list) of the numbers that make up closest_sum.
	"""
	reachable = {0: []}
	for idx, num in enumerate(nums):
		new_reachable = dict(reachable)

		for s, indices in reachable.items():
			new_sum = s + num

			if new_sum not in new_reachable or len(indices) + 1 < len(
				new_reachable[new_sum]
			):
				new_reachable[new_sum] = indices + [idx]
		reachable = new_reachable

	closest_sum = min(reachable.keys(), key=lambda x: abs(x - target))

	return closest_sum, reachable[closest_sum]


def GetTarget(dictionary, target):
	"""
	Finds a pair of items in the dictionary whose values sum closest to the target.

	Args:
		dictionary (dict): Dictionary of items. The input dictionary is copied to avoid mutating the original.
		target (float): Target sum.

	Returns:
		list: List of (key, value) pairs whose values sum closest to the target.
	"""
	dictionary = dictionary.copy()
	dictionary["empty"] = 0

	nums = list(dictionary.values())
	keys = list(dictionary.keys())
	new_target = abs(target)
	closest_sum, subset_indices = ClosestSumOfSubset(nums, new_target)
 
	if not subset_indices:
		return []

	selected = [(keys[idx], nums[idx]) for idx in subset_indices]
	#print(f"selected:{selected}")
	return selected

def CombineDicts(dict1, dict2):
	for key, value in dict1.items():
		dict1[key].update(dict2[key])

	return dict1


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


	def __init__(self, *args, **kwargs):
		# """
		# Initializes the LoadBalancing object with default or provided network parameters.
		# """
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
			"A": enums.Phase.A,
			"B": enums.Phase.B,
			"C": enums.Phase.C,
			"AC": enums.Phase.AC,
			"BC": enums.Phase.BC,
			"AB": enums.Phase.AB,
			"ABC": enums.Phase.ABC,
		}
		params = list(map(
			GetInputParameter,
			[
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
			],
		))
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
		) = params

		#print(params)
		#print(self.IA, self.IB, self.IC, self.PFA, self.PFB, self.PFC)
		self.network_id = kwargs.get("network", self.network_id)

		try:
			if study.GetNode(self.study_point):
				self.Option = True
		except:
			self.Option = False

		self.Node = {
			True: self.study_point,
			False: self.network_id,
		}

		self.LA = sim.LoadAllocation()
		self.LF = sim.LoadFlow()
		self.LA.SetValue('ActualKVAMethod', 'Method') #for Connected KVA, 'KVAMethod', for consumption kwh, 'KWHMethod'

		self.sections = {}
		self.sections_up = {}
		self.sections_down = {}
		self.counter = 0
		self.Iunb = {"A": 0, "B": 0, "C": 0}
		self.Idiff = {"A": 0, "B": 0, "C": 0}
		self.format = "{} ph: {:>7.2f}A, {:>7.2f}% PF, {:>7.2f}% unbalance"
		self.separator = "—" * len(
			self.format.format("A", self.IA, self.PFA, self.Iunb["A"])
		)

		self.check_meter_node = 'CHECK_METER'
		self.main_meter = sim.Meter()
		self.mm_device = None

		self.check_meter = sim.Meter()
		self.cm_device = None



	def __repr__(self):
		# """
		# Returns a string representation of the LoadBalancing object, including feeder and section info.
		# """
		self.sections = CombineDicts(self.sections_down, self.sections_up)

		string = "//".join(
			[f"Load Balancing has been run {self.counter} time(s)"])
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



	def GetSinglePhaseSections(self, node_id):
		"""
		Retrieves all single-phase sections in the network suitable for load transfer.

		Args:
			network_id (str): The network identifier.

		Returns:
			dict: Dictionary of sections by phase.
		"""

		dict_down = self.RunCYMEIteration(node_id)

		#print(dict_down)

		dict_all = self.RunCYMEIteration(self.network_id)

		#print(dict_all)

		dict_up = {"A": {}, "B": {}, "C": {}}
		
		dict_up["A"] = {key:value for key, value in dict_all["A"].items() if key not in dict_down["A"]}
		dict_up["B"] = {key:value for key, value in dict_all["B"].items() if key not in dict_down["B"]}
		dict_up["C"] = {key:value for key, value in dict_all["C"].items() if key not in dict_down["C"]}

		#print(dict_up)

		return dict_down, dict_up



	def RunCYMEIteration (self, node_id):

		dict_sec = {"A": {}, "B": {}, "C": {}}
		self.LF.Run([self.network_id])
		
		iterator = study.NetworkIterator(node_id, enums.IterationOption.Downstream)
		while iterator.Next():
				Phase = iterator.GetPhase()
				FromPhase = iterator.GetFromPhase()
				Section = iterator.GetSection()
				
				if Phase == FromPhase or FromPhase != enums.Phase.ABC:
						continue
						
				for Device in iterator.GetDevices():
						if Device.DeviceType == enums.DeviceType.Transformer:
								continue
								
						currents = QueryDevices(
								["IAout", "IBout", "ICout"],
								Device.DeviceNumber,
								enums.DeviceType.AllDevices,
						)
						
						for ph, current in zip("ABC", currents):
								if (Phase == getattr(enums.Phase, ph) and 
										isinstance(current, float) and 
										current > MINIMUM_CURRENT):
										dict_sec[ph][Section] = current
										
		return dict_sec

	def PickSections(self, sec_dict, ImaxA, ImaxB, ImaxC):
		# """
		# Picks sections for load transfer based on current imbalances and unbalance.

		# Args:
		#     sec_dict (dict): Dictionary of available sections by phase.
		#     ImaxA, ImaxB, ImaxC (float): Maximum currents for each phase.
		#     Iunb (dict): Unbalance for each phase.

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

		#print(Iavg, Idiff, ph_high)
		# If there are no sections available, return an empty solution
		if not sec_dict:
			return []

		# Get the imbalance of the most imbalanced phase and remove it from Idiff
		I_high = Idiff[ph_high]
		Idiff.pop(ph_high)

		# Sort remaining phases by their absolute imbalance in descending order
		Idiff = dict(
			sorted(Idiff.items(), key=lambda item: abs(item[1]), reverse=True))

		sol = {}  # Initialize a dictionary to store solutions
		temp = []  # Temporary list to store results

		# Iterate over the phases and their imbalances
		for key, value in Idiff.items():
			if math.ceil(value) < 0:
				# If the value is negative (indicating excess), attempt to transfer load
				temp = GetTarget(sec_dict[ph_high], value)
				sol[key] = temp
				if temp != []:

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
				if results != []:
				# Update the section dictionaries with new assignments
					for i, j in results:
						if i != "empty":
							sec_dict[key].pop(i)
							sec_dict[ph_high][i] = j

		# Return the solution and updated section dictionary

		return [sol, sec_dict]

	def PickSections_2(
		self, sec_dict, ImaxA, ImaxB, ImaxC, tolerance=1e-1, max_moves=5
	):
		# """
		# Alternative method to pick sections for load transfer using iterative balancing.

		# Args:
		#     sec_dict (dict): Dictionary of available sections by phase (updated in place).
		#     ImaxA, ImaxB, ImaxC (float): Maximum currents for each phase.
		#     tolerance (float): Tolerance for improvement.
		#     max_moves (int): Maximum number of moves to attempt.

		# Returns:
		#     tuple: (picks, sec_dict) where picks is a dictionary of selected moves and sec_dict is the updated section dictionary (modified in place).
		# """
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
		#print(dict_sect)
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
								[key, Device.DeviceNumber, Device.DeviceType]
							)
					sec.SetValue(key, "Phase")
					rows.append(
						[
							rm.SectionCell(sec.ID),
							rm.FloatCell(cur, 2),
							rm.StringCell(phase),
							rm.StringCell(key),
						]
					)
					print(
						f"Change {'[' + sec.ID + ']':<12} {cur:>5.2f}A  from {phase:>2} ph to {key:>2} ph"
					)
		for ph, dev_num, dev_type_list in device_list:
			if (
				study.GetValueDevice("ClosedPhase", dev_num, dev_type_list)
				!= self._connected_phase[ph]
			):
				study.SetValueDevice(
					self._connected_phase[ph], "ClosedPhase", dev_num, dev_type_list
				)

		return rows



	def SetFeederDemand(self):
		# """
		# Initializes the demand meter for the network if not already set.

		# Args:
		#     demand: Demand meter object.
		#     location (str): Network location.

		# Returns:
		#     Demand meter object.
		# """

		try:
			self.mm_device = study.GetDevice(
				self.network_id, enums.DeviceType.Breaker)
		except:
			raise ValueError(
				f"No Breaker found for the network: {self.network_id}")

		try:
			self.main_meter = study.GetMeter(
				self.network_id, enums.DeviceType.Breaker)
		except:
			raise ValueError(
				f"No Meter found for the network: {self.network_id}")

		IA_import, IB_import, IC_import = self.main_meter.DemandA.Value1, self.main_meter.DemandB.Value1, self.main_meter.DemandC.Value1
		if 1.1 * sum([self.IA, self.IB, self.IC]) > sum([IA_import, IB_import, IC_import]):
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
		Updates the demand meter with new phase currents and power factors.

		Args:
			device: The device object to which the meter is attached.
			meter: The meter object to update.
			IA, IB, IC (float): Phase currents.
			PFA, PFB, PFC (float): Power factors.
		"""

		meter.LoadValueType = enums.LoadValueType.AMP_PF

		meter.DemandA = sim.LoadValue(IA, PFA)
		meter.DemandB = sim.LoadValue(IB, PFB)
		meter.DemandC = sim.LoadValue(IC, PFC)

		study.AddMeter(device.DeviceNumber, device.DeviceType, meter, True)

	def AddCheckMeter(self, check_meter_node, IA, IB, IC, PFA, PFB, PFC):
		# """
		# Adds a check meter to a section for monitoring load.

		# Args:
		#     section_id (str): Identifier of the section to which the meter will be added.
		# """
		_cm_node = study.GetNode(check_meter_node)
		_cm_section = study.QueryInfoNode('ParentId', _cm_node.ID)

		try:
			self.cm_device = study.AddDevice('CHECK_METER', enums.DeviceType.Miscellaneous, _cm_section, 'DEFAULT', enums.Location.To, True)
		except:
			self.cm_device = study.GetDevice('CHECK_METER', enums.DeviceType.Miscellaneous)

		#print(self.cm_device)
		if self.cm_device:
			self.UpdateMeter(
				self.cm_device,
				self.check_meter,
				IA,
				IB,
				IC,
				PFA,
				PFB,
				PFC,
			)

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
		# """
		# Retrieves the load flow readings and power factors for the specified node.
		# Args:
		#     node_id (str): The identifier for the node from which to retrieve load flow data.
		# Returns:
		#     list: A list containing the load values and power factors for phases A, B, C.
		# """

		self.LF.Run([self.network_id])

		IA, IB, IC, IN, IunbA, IunbB, IunbC, PFA, PFB, PFC = QueryNodes(
			self._variables, node_id
		)
		#IN = (IA**2 + IB**2 + IC**2 - IA * IB - IB * IC - IC * IA) ** 0.5
		Iunb = {"A": IunbA, "B": IunbB, "C": IunbC}
		return [IA, IB, IC, IN, PFA, PFB, PFC, Iunb]

	def PrintLoad(self, IA, IB, IC, IN, PFA, PFB, PFC, Iunb):

		print("")
		print(self.format.format("A", IA, PFA, Iunb["A"]))
		print(self.format.format("B", IB, PFB, Iunb["B"]))
		print(self.format.format("C", IC, PFC, Iunb["C"]))
		print("IN: {:>9.2f}A".format(IN))
		print("")


	def _RunBalancingIteration(
		self, node_id, IA, IB, IC, picks_method, picks_args
	):
		# """
		# Runs a single load balancing iteration using the specified picking method.

		# Args:
		#     IA, IB, IC (float): Phase currents before balancing.
		#     meter: Meter object.
		#     picks_method (function): Section picking method.
		#     picks_args (tuple): Arguments for the picking method.
		# """
		pre_num = study.GetModificationsCount()
		self.sections_down, self.sections_up = self.GetSinglePhaseSections(node_id)

		if not self.sections_down and not self.sections_up:
			raise RuntimeError("No single phase branches found")

		print(f"Single Phase Sections: {picks_method.__name__}")

		picks_down, self.sections_down = picks_method(self.sections_down, *picks_args)
		#print(*picks_args)

		rows = self.TransferLoad(picks_down)
		#print(picks_down)
		self.LF.Run([self.network_id])

		if node_id != self.network_id:

			_IA, _IB, _IC, _IN, _PFA, _PFB, _PFC, _Iunb = (
				self.GetLoadFlow(self.network_id)
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
			print(f"\n@ {self.check_meter_node}")
			_IA, _IB, _IC, _IN, _PFA, _PFB, _PFC, _Iunb = (
				self.GetLoadFlow(self.check_meter_node)
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
		_IA, _IB, _IC, _IN, _PFA, _PFB, _PFC, _Iunb = (
			self.GetLoadFlow(self.network_id)
		)
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
			_IA, _IB, _IC, _IN, _PFA, _PFB, _PFC, _Iunb = (
				self.GetLoadFlow(node_id)
			)
			self.PrintLoad(_IA, _IB, _IC, _IN, _PFA, _PFB, _PFC, _Iunb)

		self.MakeReport(IA, IB, IC, _IA, _IB, _IC, rows)

		self.LA.Run([self.network_id])

		for t in str(self).split("//"):
			print(t.strip())
		print(self.separator)
		pst_num=study.GetModificationsCount()
		study.Undo(pst_num - pre_num)

	def Run(self):
		# """
		# Main entry point for running the load balancing process.
		# Initializes the simulation, runs balancing iterations, and generates reports.
		# """
		LB=LoadBalancing(network=self.network_id)
		if self.network_id not in study.ListNetworks():
			raise RuntimeError("The feeder loaded in the study is not correct!")

		print(f"Feeder: {self.network_id}, before balancing:")

		count=study.GetModificationsCount()
		LB.SetFeederDemand()

		if LB.CM == 1:
			LB.AddCheckMeter(LB.check_meter_node, LB.IA_CM, LB.IB_CM, LB.IC_CM, LB.PFA_CM, LB.PFB_CM, LB.PFC_CM)

		LB.LA.Run([LB.network_id])

		IA = IB = IC = IN = PFA = PFB = PFC = Iunb = 0

		if LB.CM == 1:
			print(f"\n@ {LB.check_meter_node}")
			IA, IB, IC, IN, PFA, PFB, PFC, Iunb=LB.GetLoadFlow(LB.check_meter_node)
			LB.PrintLoad(IA, IB, IC, IN, PFA, PFB, PFC, Iunb)

		print(f"\n@ MAIN_METER:")
		IA, IB, IC, IN, PFA, PFB, PFC, Iunb=LB.GetLoadFlow(LB.network_id)
		LB.PrintLoad(IA, IB, IC, IN, PFA, PFB, PFC, Iunb)

		_study_node=LB.Node[LB.Option]

		if LB.network_id != _study_node:
			print(f"\n@ {_study_node}")
			IA, IB, IC, IN, PFA, PFB, PFC, Iunb=LB.GetLoadFlow(_study_node)
			LB.PrintLoad(IA, IB, IC, IN, PFA, PFB, PFC, Iunb)

		LB.IA, LB.IB, LB.IC, LB.PFA, LB.PFB, LB.PFC=IA, IB, IC, PFA, PFB, PFC

		#print(LB.IA, LB.IB, LB.IC, LB.PFA, LB.PFB, LB.PFC)
		print(LB.separator)
		for _ in range(LB.itr):
			LB.counter += 1
			print(self.separator)
			print(f"Load balancing method #1:")
			LB._RunBalancingIteration(
				_study_node, IA, IB, IC, LB.PickSections, (IA, IB, IC)
			)
			
			LB.counter += 1
			print(self.separator)
			print(f"Load balancing method #2:")
			LB._RunBalancingIteration(
				_study_node,
				IA,
				IB,
				IC,
				LB.PickSections_2,
				(IA, IB, IC)
			)
		del LB
		study.Undo(study.GetModificationsCount() - count)


if __name__ == "__main__":
	# """
	# Script entry point. Sets up environment and runs the load balancing process.
	# """
	start=time.time()
	# script_dir = GetInputParameter("Script_Location")
	# sys.path.append(os.path.abspath(script_dir))
	locale.setlocale(locale.LC_NUMERIC, "")
	locale.getdefaultlocale=lambda *args: ["us_CA", "utf8"]
	app.ActivateRefresh(False)
	try:
		LoadBalancing().Run()
	except Exception:
		traceback.print_exc()
	print("Execution Time: {}s".format(time.time() - start))
