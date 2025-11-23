# by Kan Tang @2024-11-06
# fix the url encode issue by Kan @2024-11-19
# minor improvements @2025-07-04
# rewrite emission study @2025-11-19

import math
import locale
import os
import cympy
import textwrap
import traceback
import webbrowser
import time

from urllib.parse import quote
from datetime import datetime
from cympy import app as App, eq as Eqt, sim as Sim, study as Std
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass


def get_chrome():
    chrome_paths = [
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
        os.path.expanduser(
            "~\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"
        ),
    ]
    for path in chrome_paths:
        if os.path.exists(path):
            webbrowser.register("chrome", None, webbrowser.BackgroundBrowser(path))

    return webbrowser.get("chrome")


def calculate_impedance(Z, X_R_Ratio, KVLL, KVA):
    # Calculate the actual resistance (R) and reactance (X) of a transformer given its
    # impedance in percentage (Z),
    # X/R ratio, rated primary line-to-line voltage (KVLL), and rated apparent power (KVA).
    # Args:
    #   Z (float): Impedance in percentage.
    #   X_R_Ratio (float): Ratio of reactance to resistance.
    #   KVLL (float): Rated primary line-to-line voltage in kilovolts.
    #   KVA (float): Rated apparent power in kilovolt-amperes.
    # Returns:
    #   tuple: Calculated resistance (R) and reactance (X) in ohms.

    Z_ohms_Mag = (Z * 10 * KVLL**2) / KVA
    R = math.sqrt(Z_ohms_Mag**2) / (1 + X_R_Ratio**2)
    X = X_R_Ratio * R
    return R, X


def calculate_impedance_2(Z1pu, Z2pu, BaseKVLL, BaseMVA):
    # Calculate the actual resistance (R) and reactance (X) of a transformer
    # given its impedance at primary side #in P.U. (Z1pu),
    # impedance at secondary side in P.U. (Z2pu),
    # selected base voltage (BaseKVLL) and (BaseMVA)
    return (Z2pu - Z1pu) * (BaseKVLL**2) / BaseMVA


def QueryWithFallback(query_func, keyword_list, *args):
    # QueryWithFallback(query_func, keyword_list, *args)
    # Queries a list of keywords using the provided query function with fallback mechanism.
    # Parameters:
    #   query_func (function): The function used to query each keyword.
    #   keyword_list (list): A list of keywords to query.
    #   args: Additional arguments to pass to the query function.
    # Returns:
    #   list: A list containing the results of querying each keyword,
    #   with locale-specific conversion to float if possible.
    output_list = []
    for id in keyword_list:
        result = query_func(id, *args)
        try:
            output_list.append(locale.atof(result))
        except Exception:
            output_list.append(result)
    return output_list


def QueryDevices(keyword_list, dev_num, dev_type):
    return QueryWithFallback(Std.QueryInfoDevice, keyword_list, dev_num, dev_type)


def QueryNodes(keyword_list, node_id):
    return QueryWithFallback(Std.QueryInfoNode, keyword_list, node_id)


def GetValueEquipment(keyword_list, eq_id, eq_type):
    return QueryWithFallback(Eqt.GetValue, keyword_list, eq_id, eq_type)


def SetValueDevEqt(value_property_setlist, eq_obj):
    #   Set values for properties in an EQ object based on the provided list of value-property sets.
    #   This function iterates through a list of tuples, each containing a value and a
    #   corresponding property,
    #   and applies these values to the specified EQ object. It allows for batch updates of
    #   properties in a structured manner.
    #   Args:
    #       value_property_setlist (list): A list of tuples where each tuple contains the
    #       value and property to be set.
    #       eq_obj: The EQ object on which the values will be set.
    #   Returns:None
    for set in value_property_setlist:
        value, property = set
        eq_obj.SetValue(value, property)


def SetSourceValue(value_property_setlist, source_id):
    #   Class representing a Short Circuit Study.This class encapsulates the parameters
    #   and methods necessary to conduct a short circuit study.
    #   It provides functionality to set values for various properties related to the study and to
    #   analyze the results based on specified criteria.
    #   Attributes:
    #       source_id (str): The identifier for the source used in the study.
    #       value_property_setlist (list): A list of tuples containing values and properties
    #       to be set.
    for set in value_property_setlist:
        value, property = set
        Std.SetValueTopo(value, property, source_id)


class ShortCircuitStudy:
    # Class representing a Short Circuit Study.
    # This class encapsulates the parameters and methods necessary to conduct a short
    # circuit study, including reading inputs, configuring simulations, and generating
    # reports. It provides functionality to set source impedances, calculate fault values,
    # and manage the overall study environment.

    ITERATION_UPSTREAM = cympy.enums.IterationOption.Upstream
    ITERATION_STOPONOPEN = cympy.enums.IterationRestriction.StopOnOpen
    LEN_UNIT = App.GetKeyword("Length").Unit
    TABLE_HEADER_FORMAT = (
        "\n {:<56}{:>8}{:>11}{:>9}{:>8}{:>8}{:>8}{:>10}{:>8}{:>8}{:>8}"
    )
    TABLE_ROW_FORMAT = "\n {:<56}{:>8.1f}{:>11.1f}{:>9.4f}{:>8.4f}{:>8.4f}{:>8.4f}{:>10.4f}{:>8.4f}{:>8.4f}{:>8.4f}"
    IMPEDANCE_UNIT = "Ohms"
    PREFAULT_VOLTAGE = "OperatingVoltage"
    FAULT_VALUES = {False: [0, 0, 0, 0], True: [40, 0, 8, 0]}
    TABLE_VARIABLES = [
        "R1ohm",
        "X1ohm",
        "R0ohm",
        "X0ohm",
        "R1pu",
        "X1pu",
        "R0pu",
        "X0pu",
        "Distance",
    ]

    def __init__(self):
        #   Initializes the PowerSystemAnalysis instance with default values for various parameters
        #   related to power system analysis. It also sets the locale for numeric formatting.
        self.SourceName, self.NetworkID = [""] * 2
        self.NominalVoltage, self.OperatingVoltage = [12.47, 12.6]
        self.FaultPoints = []
        self.SC_Sim = None
        self.PCC = ""
        self.FaultImpedance = True
        self.NewFeeder, self.SetSource = ["No", "No"]
        self.LenUnit = "m"
        self.LGFaultResistance, self.LGFaultReactance = [40, 0]
        self.LLLFaultResistance, self.LLLFaultReactance = [8, 0]
        self.toPhase, self.fromPhase = [""] * 2
        self.network_param = []
        self.equipment_list = []
        self.Rep_Loc, self.Path = [""] * 2
        self.Source_R0, self.Source_X0, self.Source_R1, self.Source_X1 = [0] * 4
        self.Reactor_X, self.Reactor_I = [0.900, 400]
        self.table_header_1, self.table_header_2, self.table_separator = [""] * 3

    def GetInputs(self):
        #   Reads and sets essential input parameters for the power system analysis from Cympy.
        #   Raises ValueError if essential inputs like 'Fault_Point' are missing.
        print("- Read input parameters")

        (
            Point,
            self.Source_R0,
            self.Source_X0,
            self.Source_R1,
            self.Source_X1,
            self.Reactor_X,
            self.NewFeeder,
            self.Path,
            self.SetSource,
        ) = map(
            cympy.GetInputParameter,
            [
                "Fault_Point",
                "Source_R0",
                "Source_X0",
                "Source_R1",
                "Source_X1",
                "Source_RX",
                "New_Feeder",
                "Report_Location",
                "Source_Impedance",
            ],
        )

        try:
            points = [node for node in Std.ListNodes() if node.ID.startswith(Point)]
        except Exception as e:
            raise ValueError("Error: No circuits loaded") from e
        else:
            self.FaultPoints = points
            if not self.FaultPoints:
                raise ValueError("Error: No 'Fault_Point' defined")

    def SetupEnv(self, fault_point):
        #   Sets up the environment required for conducting the power system study.
        #   It includes determining the network ID, source equipment, length units, report filename,
        #   and configuring operating voltages.
        #   Throws ValueError if the nominal voltage setting is incorrect.
        print("- Setup study enviroment")

        self.NetworkID = Std.QueryInfoNode("$NetworkId$", fault_point)

        self.source_eq = Eqt.GetEquipment(
            self.NetworkID, cympy.enums.EquipmentType.Substation
        )

        self.SourceName = (
            Std.QueryInfoNode("$UpstreamSourceNodeID$", fault_point) or self.NetworkID
        )

        self.table_header_1 = "\n {:<56}{:>8}{:>11}  |{:-^31}||{:-^31}|".format(
            f"Circuits: {self.NetworkID}",
            "Length",
            "Distance",
            "Device Impedance(ohm)",
            "From Line Side of Device(ohm)",
        )

        self.table_header_2 = self.TABLE_HEADER_FORMAT.format(
            "Equipment Type",
            f"{self.LEN_UNIT}",
            f"to Sub{self.LEN_UNIT}",
            "R1",
            "X1",
            "R0",
            "X0",
            "Thev_R1",
            "Thev_X1",
            "Thev_R0",
            "Thev_X0",
        )
        self.table_separator = "\n" + "—" * len(self.table_header_1)
        self.GetFileName(self.SourceName)

    def GetFileName(self, source_name):
        current_datetime = datetime.now().strftime("%Y-%m-%d-h%Hm%Ms%S")
        file_name = f"SC-Report-{source_name}-{current_datetime}.txt"
        self.Rep_Loc = os.path.join(str(self.Path), file_name)

    def SetSourceEquivalent(self):

        print("- Set source impedances")

        VOLTAGE_LIST = ["NominalKVLL", "DesiredKVLL"]
        self.NominalVoltage, self.OperatingVoltage = GetValueEquipment(
            VOLTAGE_LIST, self.NetworkID, cympy.enums.EquipmentType.Substation
        )

        txt_1 = "Sources[0].EquivalentSourceModels[0].EquivalentSource."
        txt_2 = ""
        nums_1 = ["1", "2", "3"]
        nums_2 = ["A", "B", "C"]

        def _common_list(pretext, nums):
            set_common_list = [
                (
                    self.OperatingVoltage / 3**0.5,
                    f"{pretext}OperatingVoltage{nums[0]}",
                ),
                (
                    self.OperatingVoltage / 3**0.5,
                    f"{pretext}OperatingVoltage{nums[1]}",
                ),
                (
                    self.OperatingVoltage / 3**0.5,
                    f"{pretext}OperatingVoltage{nums[2]}",
                ),
                (
                    True,
                    f"{pretext}UseSecondLevelImpedance",
                ),  # from top to here - device
                (
                    self.IMPEDANCE_UNIT,
                    f"{pretext}ImpedanceUnit",
                ),  # from here to bottom - equipment
                (
                    self.Source_R0,
                    f"{pretext}SecondLevelR0",
                ),
                (
                    self.Source_X0,
                    f"{pretext}SecondLevelX0",
                ),
                (
                    self.Source_R1,
                    f"{pretext}SecondLevelR1",
                ),
                (
                    self.Source_X1,
                    f"{pretext}SecondLevelX1",
                ),
                (
                    self.Source_R1,
                    f"{pretext}SecondLevelR2",
                ),
                (
                    self.Source_X1,
                    f"{pretext}SecondLevelX2",
                ),
            ]

            return set_common_list

        try:
            self.source_dev = Std.GetDevice(
                self.NetworkID, cympy.enums.DeviceType.Source
            )
            set_list = _common_list(txt_2, nums_2)
            SetValueDevEqt(set_list[:4], self.source_dev)
            SetValueDevEqt(set_list[4:], self.source_eq)
        except Exception:
            # From source equipment database
            set_list = _common_list(txt_1, nums_1)
            SetSourceValue(set_list, self.SourceName)

        RX_List = Std.ListDevices(cympy.enums.DeviceType.SeriesReactor, self.NetworkID)
        if len(RX_List):
            RX_Device = RX_List[0]

            RX_Device.SetValue(
                "RX_{:n}_{:.3f}".format(self.Reactor_I, self.Reactor_X), "DeviceID"
            )

            RX_Eq = Eqt.GetEquipment(RX_Device.EquipmentID, RX_Device.EquipmentType)
            # print(RX_Eq.GetValue("ReactanceOhms"))
            if (
                RX_Eq.GetValue("RatedCurrent") != self.Reactor_I
                or RX_Eq.GetValue("ReactanceOhms") != self.Reactor_X
            ):
                RX_Eq.SetValue(self.Reactor_I, "RatedCurrent")
                RX_Eq.SetValue(self.Reactor_X, "ReactanceOhms")
            # print(RX_Eq.GetValue("ReactanceOhms"))

    def ConfigSC(self):
        #   Configures the parameters for the short circuit (SC) simulation based on
        #   the fault resistance.
        #   Sets fault resistance and reactance for different fault types (LG, LLL, etc.).
        #   Raises ValueError for unsupported fault resistance values.
        print("- Config short circuit study")

        self.SC_Sim = Sim.ShortCircuit()
        n = self.SC_Sim.GetValue("AnalysisNetworks.SelectedNetworks")
        # print(n)
        for i in range(int(n)):
            self.SC_Sim.SetValue("", f"AnalysisNetworks.SelectedNetworks[{i}]")
        self.SC_Sim.SetValue(self.NetworkID, "AnalysisNetworks.SelectedNetworks[0]")

        config_count = locale.atoi(
            self.SC_Sim.GetValue("ParametersConfigurations.Count")
        )

        config = [
            i
            for i in range(config_count)
            if self.SC_Sim.GetValue("ActiveConfigurationID")
            == self.SC_Sim.GetValue(f"ParametersConfigurations[{i}].ConfigID")
        ][0]

        (
            self.LGFaultResistance,
            self.LGFaultReactance,
            self.LLLFaultResistance,
            self.LLLFaultReactance,
        ) = self.FAULT_VALUES.get(self.FaultImpedance, [0, 0, 0, 0])

        pretxt = f"ParametersConfigurations[{config}]."

        set_list = [
            (self.LGFaultResistance, f"{pretxt}LGFaultResistanceOHMS"),
            (self.LGFaultReactance, f"{pretxt}LGFaultReactanceOHMS"),
            (self.LLLFaultResistance, f"{pretxt}LLLFaultResistanceOHMS"),
            (self.LLLFaultReactance, f"{pretxt}LLLFaultReactanceOHMS"),
            (self.PREFAULT_VOLTAGE, f"{pretxt}PreFaultVoltage"),
        ]

        SetValueDevEqt(set_list, self.SC_Sim)

    def StoreInfo(self, SCReport):
        SCReport.write("\n{:<25} {:<8}{:<8}".format("Fault Impedance(ohms)", "R", "X"))
        fault_impedances = [
            (self.LLLFaultResistance, self.LLLFaultReactance, "Zf-LLL:"),
            (self.LGFaultResistance, self.LGFaultReactance, "Zf-LG:"),
        ]

        for resistance, reactance, label in fault_impedances:
            SCReport.write(
                "\n{:<25} {:<8.1f}{:<8.1f}".format(label, resistance, reactance)
            )

    def QueryTable(self, fromNode, toNode):

        info_toNode = QueryNodes(self.TABLE_VARIABLES, toNode.ID)
        info_fromNode = QueryNodes(self.TABLE_VARIABLES, fromNode.ID)

        return info_fromNode, info_toNode

    def FeederMode(self, fault_point):
        iterator = Std.NetworkIterator(
            fault_point,
            self.ITERATION_UPSTREAM,
            self.ITERATION_STOPONOPEN,
        )
        while iterator.Next():
            DeviceList = iterator.GetDevices()
            for Device in DeviceList:
                MainLine, PhaseCount = QueryDevices(
                    ["IsMainLine", "PhaseCount"], Device.DeviceNumber, Device.DeviceType
                )

                if Device.DeviceType == 11 and MainLine == "Yes" and PhaseCount == "3":
                    Device.SetValue("3P_336.4_ASC", "LineID")
                    continue
                if Device.DeviceType == 10 and MainLine == "Yes":
                    if PhaseCount == "3" and not any(
                        Device.EquipmentID.startswith(prefix)
                        for prefix in ["3P_G16", "3P_G13", "3P_G14", "3P_G17"]
                    ):
                        Device.SetValue("3P_G15_-_1/C_500_KCM_CU_25_KV_XLPE", "CableID")
                    elif not Device.EquipmentID.startswith("3P_G4"):
                        Device.SetValue("3P_G4_-_1/C_#4/0_AWG_AL_25_KV_XLPE", "CableID")

    def MakeReport(self, file, NetworkParam, EquipmentList):
        print(f"- Results Text File: {self.Rep_Loc}")

        def _print_and_write(content):
            print(content)
            file.write(content)

        _print_and_write(self.table_separator)
        _print_and_write(self.table_header_1)
        _print_and_write(self.table_header_2)
        _print_and_write(self.table_separator)

        for param in NetworkParam:
            if "INT_WIRE" not in param[0]:
                formatted_row = self.TABLE_ROW_FORMAT.format(*param)
                _print_and_write(formatted_row)

        _print_and_write(self.table_separator)
        self.StoreInfo(file)
        for eq in EquipmentList:
            # eq[0] = equipment ID, eq[1] = equipment object
            eq[1].StoreInfo(file)
            file.write(self.table_separator)


class GetDevEquipment:
    # Class to retrieve information about a specific device's equipment.
    # This class initializes with device information and calculates various parameters
    # related to the device.
    # It provides methods to add device information to a network parameter list and to
    # include device data in a list of equipment based on specified conditions.

    BaseMVA = cympy.env.BasePower_AC_MVA

    def __init__(self, **kwargs):
        self.Device = kwargs.get("Device")
        self.DeviceObj = self.Device.GetObjType() if self.Device is not None else None

        (
            self.R1TN,
            self.X1TN,
            self.R0TN,
            self.X0TN,
            self.R1TNpu,
            self.X1TNpu,
            self.R0TNpu,
            self.X0TNpu,
            self.TN_Distance,
        ) = kwargs.get("info_toNode") or (0, 0, 0, 0, 0, 0, 0, 0, 0)

        (
            self.R1FN,
            self.X1FN,
            self.R0FN,
            self.X0FN,
            self.R1FNpu,
            self.X1FNpu,
            self.R0FNpu,
            self.X0FNpu,
            self.FN_Distance,
        ) = kwargs.get("info_fromNode") or (0, 0, 0, 0, 0, 0, 0, 0, 0)

        self.Length = self.FN_Distance - self.TN_Distance
        self.Nameplate = f"{self.DeviceObj}: {self.Device.EquipmentID}"

        self.R1, self.X1, self.R0, self.X0 = (
            self.R1FN - self.R1TN,
            self.X1FN - self.X1TN,
            self.R0FN - self.R0TN,
            self.X0FN - self.X0TN,
        )

        self.toPhase = kwargs.get("toPhase")
        self.fromPhase = kwargs.get("fromPhase")

    def InfoTable(self, NetworkParam):
        _DEVICE_INFO = [
            self.Nameplate,
            self.Length,
            self.TN_Distance,
            self.R1,
            self.X1,
            self.R0,
            self.X0,
            self.R1TN,
            self.X1TN,
            self.R0TN,
            self.X0TN,
        ]
        NetworkParam.append(_DEVICE_INFO)

    def EqData(self, EquipmentList):

        if (
            all(self.Device.EquipmentID not in Eq for Eq in EquipmentList)
            and self.Device.EquipmentID != "INT_WIRE"
        ):
            EquipmentList.append([self.Device.EquipmentID, self])


class GetDevCables(GetDevEquipment):
    # Initialize the GetDevCables class with device information
    # and calculate parameters based on the device type.
    # Retrieve necessary values using GetValueEquipment function and set attributes accordingly.

    DEVICE_TYPE_MAP = {
        11: {
            "DEV_INFO": [
                "PositiveSequenceResistance",
                "PositiveSequenceReactance",
                "ZeroSequenceResistance",
                "ZeroSequenceReactance",
                "NominalRating",
                "PhaseConductorID",
                "NeutralConductorID",
                "ConductorSpacingID",
                "Comments",
            ],
            "attributes": [
                "R1_db",
                "X1_db",
                "R0_db",
                "X0_db",
                "Rating",
                "PhCon",
                "NeuCon",
                "ConSpacing",
                "Comments",
            ],
            "EqType": cympy.enums.EquipmentType.OverheadLine,
        },
        10: {
            "DEV_INFO": [
                "PositiveSequenceResistance",
                "PositiveSequenceReactance",
                "ZeroSequenceResistance",
                "ZeroSequenceReactance",
                "NominalRating",
                "ImpedancesNote",
                "Comments",
            ],
            "attributes": [
                "R1_db",
                "X1_db",
                "R0_db",
                "X0_db",
                "Rating",
                "ImpNote",
                "Comments",
            ],
            "EqType": cympy.enums.EquipmentType.Cable,
        },
    }

    def __init__(self, **kwargs):  # sourcery skip: use-fstring-for-formatting
        super().__init__(**kwargs)
        self.Comments = ""

        config = self.DEVICE_TYPE_MAP.get(
            self.Device.DeviceType, self.DEVICE_TYPE_MAP[10]
        )

        values = GetValueEquipment(
            config["DEV_INFO"], self.Device.EquipmentID, config["EqType"]
        )

        attributes = config["attributes"]

        for attr, value in zip(attributes, values):
            setattr(self, attr, value)

        if self.Device.DeviceType == 10:
            self.ParaRun = Std.QueryInfoDevice(
                "CableNbParallel", self.Device.DeviceNumber, self.Device.DeviceType
            )
            if self.ParaRun:
                self.Nameplate = "{}: {}(*{})".format(
                    self.DeviceObj, self.Device.EquipmentID, self.ParaRun
                )

        if self.toPhase != self.fromPhase:
            self.R1 = self.R0 = (self.R1TN + self.R1TN + self.R0TN) / 3
            self.X1 = self.X0 = (self.X1TN + self.X1TN + self.X0TN) / 3

    def InfoTable(self, NetworkParam):
        """Append cable information to NetworkParam"""
        if NetworkParam[-1][0] == self.Nameplate:
            (
                _,
                Len,
                _,
                R1p,
                X1p,
                R0p,
                X0p,
                _,
                _,
                _,
                _,
            ) = NetworkParam.pop()
            NetworkParam.append(
                [
                    self.Nameplate,
                    Len + self.Length,
                    self.TN_Distance,
                    self.R1 + R1p,
                    self.X1 + X1p,
                    self.R0 + R0p,
                    self.X0 + X0p,
                    self.R1TN,
                    self.X1TN,
                    self.R0TN,
                    self.X0TN,
                ]
            )
        else:
            NetworkParam.append(
                [
                    self.Nameplate,
                    self.Length,
                    self.TN_Distance,
                    self.R1,
                    self.X1,
                    self.R0,
                    self.X0,
                    self.R1TN,
                    self.X1TN,
                    self.R0TN,
                    self.X0TN,
                ]
            )

        self.CheckCalculations()

    def CheckCalculations(self):
        self.R1c = self.R1_db * self.Length / 1000
        self.X1c = self.X1_db * self.Length / 1000
        self.R0c = self.R0_db * self.Length / 1000
        self.X0c = self.X0_db * self.Length / 1000

        if round(self.R1c**2 + self.R1**2, 4) != round(
            2 * self.R1c * self.R1, 4
        ) and round(self.R0c**2 + self.R0**2, 4) != round(
            2 * self.R0c * self.R0, 4
        ):
            raise ValueError("Error: the device impedance is not correct")

    def StoreInfo(self, SCReport):
        def _write_info(label, value):
            if value:
                SCReport.write(f"\n{label:<25} {value}")

        SCReport.write("\n[{}: {}]".format(self.DeviceObj, self.Device.EquipmentID))
        SCReport.write(
            "\n{:<25} {:<8.4f} + j{:<8.4f} ohms/km".format(
                "Positive Sequence Z1:", self.R1_db, self.X1_db
            )
        )
        SCReport.write(
            "\n{:<25} {:<8.4f} + j{:<8.4f} ohms/km".format(
                "Negative Sequence Z0:", self.R0_db, self.X0_db
            )
        )
        SCReport.write("\n{:<25} {:<8.0f} amps".format("Nominal Rating:", self.Rating))

        content = textwrap.fill(f"{self.Comments}", 100)
        if self.Device.DeviceType == 11:
            _write_info("Phase Conductor:", self.PhCon)
            _write_info("Netural Conductor:", self.NeuCon)
            _write_info("Conductor Spacing:", self.ConSpacing)
        if self.Device.DeviceType == 10:
            _write_info("Impedances Note:", textwrap.fill(self.ImpNote, 100))
        _write_info("Comments:", content)


class GetDevReactors(GetDevEquipment):
    # Class to retrieve information about series reactors.
    # Initialize with device information and calculate parameters.
    # Methods:
    # - StoreInfo: Write series reactor information to a short circuit report.
    RX_INFO = ["RatedCurrent", "ReactanceOhms"]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.Length = 0
        self.R1 = 0
        self.R0 = 0
        self.EqType = cympy.enums.EquipmentType.SeriesReactor
        self.RatedCurrent, self.ReactanceOhms = GetValueEquipment(
            self.RX_INFO, self.Device.EquipmentID, self.EqType
        )

    def StoreInfo(self, SCReport):
        SCReport.write(f"\n[{self.Nameplate}]")
        SCReport.write(
            "\n{:<25} {:<8.0f} amps/Phase".format("Rated Current:", self.RatedCurrent)
        )
        SCReport.write(
            "\n{:<25} {:<8.3f} ohms/Phase".format(
                "Inductive Reactance:", self.ReactanceOhms
            )
        )


class GetProtection(GetDevEquipment):
    # Class for retrieving and storing protection information for a specific device.
    # Inherits from GetDevEquipment.
    # Methods:
    # - EqData: Add protection information to a list of equipment.
    # - StoreInfo: Write protection details to a short circuit report.

    PROT_INFO = [
        "NestedViewId",
        "TccDesc",
        "NStatus",
        "ProtModel",
        "ProtAmps",
    ]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.Length = 0
        self.R1, self.X1, self.R0, self.X0 = 0, 0, 0, 0

        self.prot_instrument_list = Std.ListInstruments(
            cympy.enums.InstrumentType.AllInstruments, self.Device.DeviceNumber
        )

        (
            self.prot_nv_id,
            self.prot_tcc_desc,
            self.prot_normal_status,
            self.prot_model,
            self.prot_rating,
        ) = [""] * 5

        self.protection_vendor = []
        self.protection_type = []
        self.relay_type = []
        self.instrument_type = []
        self.instrument_number = []

        if self.prot_instrument_list:
            self.process_instruments()
        else:
            (
                self.prot_nv_id,
                self.prot_tcc_desc,
                self.prot_normal_status,
                self.prot_model,
                self.prot_rating,
            ) = QueryDevices(
                self.PROT_INFO, self.Device.DeviceNumber, self.Device.DeviceType
            )

        self.Nameplate = "{}: {}".format(self.DeviceObj, self.Device.DeviceNumber)

        if self.prot_nv_id and self.prot_nv_id != "DEFAULT":
            self.Nameplate = "{}: {} @ {}".format(
                self.DeviceObj, self.Device.DeviceNumber, self.prot_nv_id
            )

    def process_instruments(self):
        for inst in self.prot_instrument_list:
            if inst.InstrumentType != 1:
                self.protection_vendor.append(inst.GetValue("Manufacturer"))
                self.protection_type.append(inst.GetValue("ProtectionType"))
                self.relay_type.append(inst.GetValue("RelayType"))
                self.instrument_type.append(inst.GetObjType())
                self.instrument_number.append(inst.InstrumentNumber)

    def EqData(self, EquipmentList):
        EquipmentList.append(["Protection", self])

    def StoreInfo(self, SCReport):
        def write_info(label, value):
            if value:
                if self.prot_instrument_list:
                    self.write_multiple_values(SCReport, label, value)
                elif label == "Description:":
                    self.write_description(SCReport, label, value)
                else:
                    SCReport.write(f"\n{label:<25} {value}")

        SCReport.write(f"\n[{self.DeviceObj}: {self.Device.DeviceNumber}]")
        write_info("Description:", self.prot_tcc_desc)
        write_info("Normal Status:", self.prot_normal_status)
        write_info("Manufacturer:", self.protection_vendor)
        write_info("Instrument Number:", self.instrument_number)
        write_info("Instrument Type:", self.instrument_type)
        write_info("Protection Type:", self.protection_type)
        write_info("Relay Type:", self.relay_type)
        write_info("Model:", self.prot_model)
        write_info("Rating:", self.prot_rating)

    def write_multiple_values(self, SCReport, label, value):
        n = len(value)
        ft = "{:<20} " * n
        SCReport.write(f"\n{label:<25} {ft.format(*value)}")

    def write_description(self, SCReport, label, value):
        txt = value.split("\n")
        SCReport.write(f"\n{label:<25} {txt[0]}")
        for s in txt[1:]:
            SCReport.write("{:<25} {}".format("", s))


class GetDevTransformers(GetDevEquipment):
    # Initialize a class to retrieve information about transformers based on device type.
    # This class retrieves transformer attributes from a predefined mapping and performs calculations
    # related to the transformer's impedance. It also checks the correctness of impedance calculations
    # and stores device information in a report.
    # Attributes:
    #     DEVICE_TYPE_MAP (dict): Mapping of device types to transformer attributes.
    #     Nameplate (str): Nameplate of the transformer.
    #     XfmrDevice (list): List of transformer device attributes.
    # Methods:
    #     __init__(**kwargs): Initializes the transformer with device attributes and calculates impedances.
    #     CheckCalculations(): Validates impedance calculations and raises errors if discrepancies
    #                          are found.
    #     StoreInfo(SCReport): Writes transformer information to the provided short circuit report.

    DEVICE_TYPE_MAP = {
        33: {
            "Nameplate": "By-Phase Transformer",
            "XfmrDevice": [
                "$EqCode$",
                "$XfoByPhaseEqIdA$",
                "$XfoByPhaseEqIdB$",
                "$XfoByPhaseEqIdC$",
                "$XfoByPhaseKVANomTot$",
                "$XfoByPhaseZ1$",
                "$XfoByPhaseZ0$",
                "$XfoByPhaseX1R1Ratio$",
                "$XfoByPhaseX0R0Ratio$",
                "$XfoByPhaseKvPrimA$",
                "$XfoByPhaseKvSecA$",
                "$XfoByPhaseVBaseFrom$",
                "$XfoByPhaseVBaseTo$",
            ],
            "attributes": [
                "EqCode",
                "XfoByPhaseEqIdA",
                "XfoByPhaseEqIdB",
                "XfoByPhaseEqIdC",
                "XfoKVANomTot",
                "XfoZ1",
                "XfoZ0",
                "XfoX1R1Ratio",
                "XfoX0R0Ratio",
                "PrimVolts",
                "SecVolts",
                "PrimBase",
                "SecBase",
            ],
        },
        "default": {
            "XfmrDevice": [
                "$EqCode$",
                "$EqId$",
                "$XfoKVANomTot$",
                "$XfoZ1$",
                "$XfoZ0$",
                "$XfoX1R1Ratio$",
                "$XfoX0R0Ratio$",
                "$XfoKVLL1$",
                "$XfoKVLL2$",
                "$XfoType$",
                "$XfoVBaseFrom$",
                "$XfoVBaseTo$",
            ],
            "attributes": [
                "EqCode",
                "EqId",
                "XfoKVANomTot",
                "XfoZ1",
                "XfoZ0",
                "XfoX1R1Ratio",
                "XfoX0R0Ratio",
                "PrimVolts",
                "SecVolts",
                "XfoType",
                "PrimBase",
                "SecBase",
            ],
        },
    }

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        config = self.DEVICE_TYPE_MAP.get(
            self.Device.DeviceType, self.DEVICE_TYPE_MAP["default"]
        )
        self.Nameplate = config.get("Nameplate", "")
        self.XfmrDevice = config["XfmrDevice"]
        attributes = config["attributes"]

        values = QueryDevices(
            self.XfmrDevice, self.Device.DeviceNumber, self.Device.DeviceType
        )
        for attr, value in zip(attributes, values):
            setattr(self, attr, value)

        self.CheckCalculations()

    def CheckCalculations(self):
        self.R1, self.X1 = calculate_impedance(
            self.XfoZ1, self.XfoX1R1Ratio, self.SecVolts, self.XfoKVANomTot
        )
        self.R0, self.X0 = calculate_impedance(
            self.XfoZ0, self.XfoX0R0Ratio, self.SecVolts, self.XfoKVANomTot
        )

        impedance_params = [
            (self.R1TNpu, self.R1FNpu, "R1c"),
            (self.X1TNpu, self.X1FNpu, "X1c"),
            (self.R0TNpu, self.R0FNpu, "R0c"),
            (self.X0TNpu, self.X0FNpu, "X0c"),
        ]

        for Z1pu, Z2pu, attr in impedance_params:
            setattr(
                self,
                attr,
                calculate_impedance_2(Z1pu, Z2pu, self.SecBase, self.BaseMVA),
            )

        if round(self.R1c**2 + self.R1**2, 4) != round(
            2 * self.R1c * self.R1, 4
        ) and round(self.R0c**2 + self.R0**2, 4) != round(
            2 * self.R0c * self.R0, 4
        ):
            raise ValueError("Error: the device impedance is not correct")

    def StoreInfo(self, SCReport):
        SCReport.write(
            f"\n[{self.Device.DeviceNumber}]"
            f"\n{self.Nameplate}"
            f"\n{self.XfoType} x {self.XfoKVANomTot} kVA"
            f"\n{self.PrimeVolts} kVLL x {self.SecVolts} kVLL"
            f"\nZ1: {self.XfoZ1}%, Z0: {self.XfoZ0}%"
            f"\nX1/R1: {self.XfoX1R1Ratio}, X0/R0: {self.XfoX0R0Ratio}"
        )


class GetPoint:
    # Initialize a class to retrieve fault data for a specific point
    # and store relevant information. Includes methods to update network parameters,
    # equipment list, and generate a report with fault current details.
    _PATH = r"https://hydroshare.bchydro.bc.ca/sites/de/SiteAssets/html/Fault%20Level%20Form.html"

    FAULT_CURRENT_INFO = [
        "LLLamp",
        "LGamp",
        "LLamp",
        "LLGamp",
        "LLGT",
        "LLLampZ",
        "LGampZ",
        "LLampZ",
        "LLGampZ",
        "LLGTZ",
        "PrefaultVoltage",
        "R1ohm",
        "X1ohm",
        "R0ohm",
        "X0ohm",
        "Distance",
        "Latitude",
        "Longitude",
    ]

    def __init__(self, fault_point):
        fault_data = QueryNodes(self.FAULT_CURRENT_INFO, fault_point)
        self.data = dict(zip(self.FAULT_CURRENT_INFO, fault_data))
        self.TIo = max(self.data["LGamp"], self.data["LLGT"])
        self.TIO_imp = max(self.data["LGampZ"], self.data["LLGTZ"])

    def InfoTable(self, NetworkParam):
        NetworkParam.append(
            [
                "FAULT POINT (Lat.:{:.5f},Long.:{:.5f})".format(
                    self.data["Latitude"], self.data["Longitude"]
                ),
                0,
                self.data["Distance"],
                0,
                0,
                0,
                0,
                self.data["R1ohm"],
                self.data["X1ohm"],
                self.data["R0ohm"],
                self.data["X0ohm"],
            ]
        )

    def EqData(self, EquipmentList):
        EquipmentList.append(["FaultPoint", self])

    def StoreInfo(self, SCReport):
        SCReport.write("\n")
        SCReport.write(
            "\n{:<25} {:<6}{:<6}{:<6}{:<6}{:<6}".format(
                "FAULT POINT(Amps)", "LLL", "LL", "LLG", "LG", "3Io"
            )
        )
        SCReport.write(
            "\n{:<25} {:<6.0f}{:<6.0f}{:<6.0f}{:<6.0f}{:<6.0f}".format(
                "Bolted Faults:",
                self.data["LLLamp"],
                self.data["LLamp"],
                self.data["LLGamp"],
                self.data["LGamp"],
                self.TIo,
            )
        )
        SCReport.write(
            "\n{:<25} {:<6.0f}{:<6.0f}{:<6.0f}{:<6.0f}{:<6.0f}\n".format(
                "Impedance Faults:",
                self.data["LLLampZ"],
                self.data["LLampZ"],
                self.data["LLGampZ"],
                self.data["LGampZ"],
                self.TIO_imp,
            )
        )
        SCReport.write(
            "\nPrefault Voltage at Fault Point: {} kVLL".format(
                self.data["PrefaultVoltage"]
            )
        )

    def GenerateForm(self, networkID):

        (
            customerName,
            serviceAddress,
            faultLocation,
            EquipmentID,
            protection,
            engineer,
            email,
            phone,
            primaryForm,
        ) = map(
            cympy.GetInputParameter,
            [
                "Customer_Name",
                "Service_Address",
                "Fault_Location",
                "Equipment_ID",
                "Protection",
                "Engineer",
                "Email",
                "Phone",
                "Primary_Form",
            ],
        )
        if primaryForm == "1":
            _date = datetime.now().strftime("%Y-%m-%d")
            _prefaultLN = round(self.data["PrefaultVoltage"] / math.sqrt(3), 2)
            _networkID = networkID.replace("_", " ")

            _variables = [
                f"customer_name={quote(customerName)}",
                f"service_address={quote(serviceAddress)}",
                f"fault_location={faultLocation}",
                f"equipment_id={EquipmentID}",
                f"network_id={_networkID}",
                f'distance={"{:0.0f}".format(self.data["Distance"])}',
                f"protection={quote(protection)}",
                f"date={_date}",
                f'LLL={int(round(self.data["LLLamp"],-2))}',
                f'LLG={int(round(self.data["LLGamp"],-2))}',
                f'LL={int(round(self.data["LLamp"],-2))}',
                f'LG={int(round(self.data["LGamp"],-2))}',
                f'R1={"{:.4f}".format(self.data["R1ohm"])}',
                f'X1={"{:.4f}".format(self.data["X1ohm"])}',
                f'R0={"{:.4f}".format(self.data["R0ohm"])}',
                f'X0={"{:.4f}".format(self.data["X0ohm"])}',
                f'prefault={self.data["PrefaultVoltage"]}',
                f"prefaultLN={_prefaultLN}",
                f"engineer={engineer}",
                f"email={email}",
                f"phone={phone}",
            ]
            _link = self._PATH + "?" + "&".join(_variables)
            print(_link)

            webbrowser.open_new(_link)


class GetSource:
    # Initialize a GetSource object with source information and methods to interact with it.
    # Args:
    #     Source_Name (str): The name of the data source.
    #     info_toNode (list): Information related to the source node.

    # Methods:
    #     - InfoTable(NetworkParam): Add source information to the network parameters.
    #     - EqData(EquipmentList): Add source data to the equipment list.
    #     - StoreInfo(SCReport): Store source information in the short circuit report.

    SOURCE_INFO = [
        "SourceR1ohmsMax",
        "SourceX1ohmsMax",
        "SourceR0ohmsMax",
        "SourceX0ohmsMax",
        "SourceR1ohmsMin",
        "SourceX1ohmsMin",
        "SourceR0ohmsMin",
        "SourceX0ohmsMin",
        "SourceFaultLevel",
    ]

    def __init__(self, Source_Name, info_toNode):
        self.SourceName = Source_Name

        self.EqType = cympy.enums.EquipmentType.Substation

        (
            self.R1max,
            self.X1max,
            self.R0max,
            self.X0max,
            self.R1min,
            self.X1min,
            self.R0min,
            self.X0min,
            self.Level,
        ) = QueryNodes(self.SOURCE_INFO, self.SourceName)

        self.R1TN, self.X1TN, self.R0TN, self.X0TN = info_toNode[:4]

        # print(self.R1TN, self.X1TN, self.R0TN, self.X0TN)
        self.Nameplate = f"SourceEquivalent: {self.SourceName}"

    def InfoTable(self, NetworkParam):
        def sign(number):
            return number * int(math.copysign(1, number))

        NetworkParam.append(
            [
                self.Nameplate,
                0,
                0,
                sign(self.R1TN),
                sign(self.X1TN),
                sign(self.R0TN),
                sign(self.X0TN),
                0,
                0,
                0,
                0,
            ]
        )

    def EqData(self, EquipmentList):
        EquipmentList.append(["Source", self])

    def StoreInfo(self, SCReport):

        SCReport.write(f"\n[{self.Nameplate}]")
        if "Low" in self.Level:
            SCReport.write(
                "\n{:<25} {:<8.4f} + j{:<8.4f} ohms/km".format(
                    "Low Fault Level Z1:", self.R1min, self.X1min
                )
            )
            SCReport.write(
                "\n{:<25} {:<8.4f} + j{:<8.4f} ohms/km".format(
                    "Low Fault Level Z0:", self.R0min, self.X0min
                )
            )

        elif "High" in self.Level:
            SCReport.write(
                "\n{:<25} {:<8.4f} + j{:<8.4f} ohms/km".format(
                    "High Fault Level Z1:", self.R1max, self.X1max
                )
            )
            SCReport.write(
                "\n{:<25} {:<8.4f} + j{:<8.4f} ohms/km".format(
                    "High Fault Level Z0:", self.R0max, self.X0max
                )
            )

        SCReport.write("\nComments:")
        try:
            Eqt.GetEquipment(self.SourceName, self.EqType)
        except Exception:
            Std.GetDevice(self.SourceName, cympy.enums.DeviceType.Source)
            SCReport.write("User Defined Source Equivalent")
        else:
            SCReport.write(
                "\n"
                + textwrap.fill(
                    Eqt.GetValue("Comments", self.SourceName, self.EqType), 100
                )
            )


def DeviceHandler(
    short_circuit_study, device_obj, info_toNode, info_fromNode, Phase, FromPhase
):
    # Handle different types of devices in a short circuit study.

    # Args:
    #     short_circuit_study: The short circuit study object.
    #     device_obj: The device object to handle.
    #     info_toNode: Information about the 'to' node.
    #     info_fromNode: Information about the 'from' node.
    #     Phase: Phase information.
    #     FromPhase: From phase information.

    device_handlers = {
        1: GetDevTransformers,  # cympy.enums.DeviceType.Transformer
        42: GetDevTransformers,  # cympy.enums.DeviceType.AutoTransformer
        33: GetDevTransformers,  # cympy.enums.DeviceType.TransformerByPhase
        2: GetProtection,  # cympy.enums.DeviceType.Breaker
        4: GetProtection,  # cympy.enums.DeviceType.Recloser
        7: GetProtection,  # cympy.enums.DeviceType.Fuse
        9: GetDevReactors,  # cympy.enums.DeviceType.SeriesReactor
        10: GetDevCables,  # cympy.enums.DeviceType.Underground
        11: GetDevCables,  # cympy.enums.DeviceType.OverheadLine
    }

    handler = device_handlers.get(device_obj.DeviceType)
    if handler:

        Dev = handler(
            Device=device_obj,
            info_toNode=info_toNode,
            info_fromNode=info_fromNode,
            toPhase=Phase,
            fromPhase=FromPhase,
        )

        Dev.EqData(short_circuit_study.equipment_list)
        Dev.InfoTable(short_circuit_study.network_param)


@dataclass
class StudyParameters:
    """Data class to hold study parameters"""

    customer_type: str
    connection: str
    disturbing: str
    customer_load_mw: float
    emission: str
    feeder_limit: float


class EmissionStudy:
    """Class for performing emission studies on power systems"""

    # Constants
    PATH = "http://pq.bchydro.bc.ca:100/pqtools_MVresults.php?"
    METHOD = 2
    SECTION = 0
    SPOT_DEV_TYPE = cympy.enums.DeviceType.SpotLoad

    # Lookup tables
    POWER_FACTORS: Dict[str, float] = {
        "Residential": 0.97,
        "Commercial": 0.95,
        "Industrial": 0.93,
    }

    FEEDER_LIMITS: Dict[float, float] = {
        4.16: 2.16,
        12.47: 6.48,
        24.94: 12.96,
    }

    CONNECTION_TYPES: Dict[str, int] = {
        "1PH": 1,
        "3PH Y": 34,
        "3PH D": 33,
    }

    DISTURBING_LOAD_TYPES: Dict[str, int] = {
        "YES": 2,
        "NO": 3,
    }

    # Input parameter names
    INPUT_PARAMETERS = [
        "Customer_Type",
        "Connection_Type",
        "Disturbing_Load",
        "Customer_Load",
        "Emission_Study",
        "Feeder_Limit",
    ]

    def __init__(
        self,
        poi: str,
        network_id: str,
        distance: float,
        r1: float,
        x1: float,
        r0: float,
        x0: float,
    ):
        """Initialize the emission study"""
        self.poi = poi
        self.feeder_id = network_id
        self.distance = distance
        self.impedance = (r1, x1, r0, x0)  # Group related parameters

        # Initialize instance variables
        self._initialize_variables()

    def _initialize_variables(self) -> None:
        """Initialize all instance variables with default values"""
        self.parameters: Optional[StudyParameters] = None
        self.kv_ll = 0.0
        self.phase_count = 0
        self.power_factor = 0.0
        self.customer_load_mva = 0.0
        self.current_load_smv = 0.0
        self.current_load_slv = 0.0
        self.slv_percentage = 0.0
        self.estimated_slv = 0.0
        self._variables: List[str] = []

    def run_study(self) -> None:
        """Main method to run the complete emission study"""
        try:
            self._get_input_parameters()
            self._get_system_parameters()
            self._calculate_loads()
            self._prepare_variables()
        except Exception as e:
            raise RuntimeError(f"Emission study failed: {e}") from e

    def _get_input_parameters(self) -> None:
        """Get all input parameters from CymDist"""
        inputs = map(cympy.GetInputParameter, self.INPUT_PARAMETERS)

        self.parameters = StudyParameters(*inputs)
        self.power_factor = self.POWER_FACTORS.get(
            str(self.parameters.customer_type), 0.95
        )

        # Calculate customer load in MVA
        self.customer_load_mva = self.parameters.customer_load_mw / self.power_factor

    def _get_system_parameters(self) -> None:
        """Get system parameters from the study"""
        self.phase_count = cympy.study.QueryInfoNode("PhaseCount", self.poi)
        self.kv_ll = cympy.study.QueryInfoNode("KVLLBase", self.poi)

        # Set feeder limit if not provided
        if not self.parameters.feeder_limit:
            self.parameters.feeder_limit = self.FEEDER_LIMITS.get(self.kv_ll, 0.0)

    def _calculate_loads(self) -> None:
        """Calculate current and estimated loads"""
        spot_loads = cympy.study.ListDevices(self.SPOT_DEV_TYPE, self.feeder_id)

        # Calculate current loads
        self._calculate_current_loads(spot_loads)

        # Calculate total MVA and SLV percentage
        total_mva = (
            self.current_load_smv + self.current_load_slv
        ) / 1000 + self.customer_load_mva

        self._calculate_slv_percentage(total_mva)
        self.estimated_slv = round(
            round(self.slv_percentage, 2) * self.parameters.feeder_limit, 3
        )

    def _calculate_current_loads(self, spot_loads: List) -> None:
        """Calculate current SMV and SLV loads from spot loads"""
        smv_load = 0.0
        slv_load = 0.0

        for spot in spot_loads:
            load_kva = float(
                cympy.study.QueryInfoDevice(
                    "SpotKVAT", spot.DeviceNumber, self.SPOT_DEV_TYPE
                )
            )

            if "INT_" in spot.DeviceNumber:
                smv_load += load_kva
            else:
                slv_load += load_kva

        self.current_load_smv = smv_load
        self.current_load_slv = slv_load

    def _calculate_slv_percentage(self, total_mva: float) -> None:
        """Calculate SLV percentage based on feeder limits"""
        if total_mva <= self.parameters.feeder_limit:
            print("Warning: The load will be over the feeder limit")
            total_current_load = self.current_load_slv + self.current_load_smv
            self.slv_percentage = (
                self.current_load_slv / total_current_load
                if total_current_load > 0
                else 0.0
            )
        else:
            self.slv_percentage = self.current_load_slv / (1000 * total_mva)

    def _prepare_variables(self) -> None:
        """Prepare variables for the report URL"""
        r1, x1, r0, x0 = self.impedance

        self._variables = [
            f"f={self.METHOD}",
            f"section={self.SECTION}",
            f"cct={self.feeder_id}",
            f"kV={self.kv_ll}",
            f"R1={r1}",
            f"X1={x1}",
            f"R0={r0}",
            f"X0={x0}",
            f"distance={self.distance}",
            f"phase={self.phase_count}",
            f"St={self.parameters.feeder_limit}",
            f"cPh={self.CONNECTION_TYPES.get(str(self.parameters.connection), 1)}",
            f"Si={round(self.customer_load_mva, 3)}",
            f"alpha={self.DISTURBING_LOAD_TYPES.get(str(self.parameters.disturbing), 3)}",
            f"Slv={self.estimated_slv}",
        ]

    def generate_report(self, output_file) -> None:
        """Generate and display the emission study report"""
        if not self._variables:
            raise RuntimeError("Study must be run before generating report")

        report_url = self.PATH + "&".join(self._variables)
        browser = get_chrome()
        browser.open_new(report_url)

        self._write_report(output_file, report_url)

    def _write_report(self, file, report_url: str) -> None:
        """Write formatted report to file and console"""
        report_data = self._prepare_report_data(report_url)

        file.write("\n" + "=" * 50 + "\n")
        file.write("        EMISSION STUDY REPORT\n")
        file.write("=" * 50 + "\n")

        for label, value in report_data:
            self._write_formatted_line(file, label, value)

    def _prepare_report_data(self, report_url: str) -> List[Tuple[str, str]]:
        """Prepare formatted report data"""
        return [
            ("Feeder:", self.feeder_id),
            ("Voltage (kV):", f"{self.kv_ll}"),
            ("Impedance R1/X1:", f"{self.impedance[0]}/{self.impedance[1]}"),
            ("Impedance R0/X0:", f"{self.impedance[2]}/{self.impedance[3]}"),
            ("Distance:", f"{self.distance}"),
            ("Phase:", f"{self.phase_count}"),
            ("Feeder Planning Limit (MVA):", f"{self.parameters.feeder_limit}"),
            ("Connection Type:", str(self.parameters.connection)),
            ("Customer Type:", str(self.parameters.customer_type)),
            ("Power Factor:", f"{self.power_factor:.3f}"),
            ("Customer Demand (MW):", f"{self.parameters.customer_load_mw:.3f}"),
            ("Customer Demand (MVA):", f"{self.customer_load_mva:.3f}"),
            ("Current LV Load (MVA):", f"{self.current_load_slv / 1000:.3f}"),
            ("Current MV Load (MVA):", f"{self.current_load_smv / 1000:.3f}"),
            ("Percentage of LV Load (%):", f"{self.slv_percentage * 100:.0f}"),
            ("Max. LV Load (MVA):", f"{self.estimated_slv:.3f}"),
            ("Disturbing Load:", str(self.parameters.disturbing)),
            ("Report Link:", f"\n{report_url}"),
        ]

    @staticmethod
    def _write_formatted_line(file, label: str, value: str) -> None:
        """Write a formatted line to file and console"""
        line = f"{label:<30} {value}\n"
        print(line, end="\n")
        file.write(line)


def main():
    if not Std.ListNetworks:
        raise ValueError("Error: No study is loaded")

    SC = ShortCircuitStudy()
    SC.GetInputs()
    file = ""

    count = Std.GetModificationsCount()
    for point in SC.FaultPoints:
        fault_point_id = point.ID
        SC.SetupEnv(fault_point_id)
        if SC.SetSource == "Yes":
            SC.SetSourceEquivalent()
        SC.ConfigSC()
        file = SC.Rep_Loc
        if SC.NewFeeder == "Yes":
            SC.FeederMode(fault_point_id)

        SC.SC_Sim.Run()
        # Fault Point
        FP = GetPoint(fault_point_id)
        FP.InfoTable(SC.network_param)
        FP.EqData(SC.equipment_list)

        itr = Std.NetworkIterator(
            fault_point_id,
            SC.ITERATION_UPSTREAM,
            SC.ITERATION_STOPONOPEN,
        )
        # Upstream path to Source
        while itr.Next():
            Node = itr.GetNode()
            Sections = itr.GetSection()
            Length = Sections.Length
            DeviceList = itr.GetDevices()
            FromNode = itr.GetFromNode()
            FromPhase = itr.GetFromPhase()
            Phase = itr.GetPhase()
            info_fromNode, info_toNode = SC.QueryTable(FromNode, Node)

            for Device in DeviceList:
                DeviceHandler(SC, Device, info_toNode, info_fromNode, Phase, FromPhase)
                # Source
            if Std.QueryInfoNode("IsSourceNode", Node.ID) == "Yes":
                SourceEquivalent = GetSource(SC.SourceName, info_toNode)
                SourceEquivalent.EqData(SC.equipment_list)
                SourceEquivalent.InfoTable(SC.network_param)

        ES = EmissionStudy(
            poi=fault_point_id,
            network_id=SC.NetworkID,
            distance=FP.data["Distance"],
            r1=FP.data["R1ohm"],
            x1=FP.data["X1ohm"],
            r0=FP.data["R0ohm"],
            x0=FP.data["X0ohm"],
        )
        try:
            ES.run_study()

            with open(file, "w") as report_file:
                SC.MakeReport(report_file, SC.network_param, SC.equipment_list)
                if ES.parameters.emission == "Yes":
                    ES.generate_report(report_file)

            FP.GenerateForm(SC.NetworkID)

        except Exception as e:
            print(f"Error: {e}")

    #    del SC, FP, ES, PCC
    Std.Undo(Std.GetModificationsCount() - count)


if __name__ == "__main__":
    start = time.time()
    locale.setlocale(locale.LC_NUMERIC, "")
    locale.getdefaultlocale = lambda *args: ["us_CA", "utf8"]
    App.ActivateRefresh(False)
    try:
        main()
    except Exception:
        traceback.print_exc()
    finally:
        App.ActivateRefresh(True)
    print("Excution Time: {}s".format(time.time() - start))
