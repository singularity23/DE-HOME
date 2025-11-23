# by Kan Tang @2024-11-06
# fix the url encode issue by Kan @2024-11-19
# minor improvements @2025-07-04
# rewrite emission study @2025-11-19
# optimized and refactored @2024-12-19

import math
import locale
import os
import cympy
import textwrap
import traceback
import webbrowser
import time
import sys
import subprocess
from urllib.parse import quote
from datetime import datetime
from dataclasses import dataclass
from typing import List, Tuple, Optional, Any
from cympy import app as App, eq as Eqt, sim as Sim, study as Std

# Constants
CHROME_PATHS = {
    "windows": [
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
        os.path.expanduser(
            "~\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"
        ),
    ],
    "darwin": ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
    "linux": [
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
        "/snap/bin/chromium",
    ],
}


class ChromeBrowser:
    """Handles Chrome browser registration and URL opening"""

    @staticmethod
    def register_chrome() -> bool:
        """Register Chrome browser with webbrowser module"""
        platform_key = (
            "windows"
            if os.name == "nt"
            else "darwin" if sys.platform == "darwin" else "linux"
        )

        for path in CHROME_PATHS.get(platform_key, []):
            if os.path.exists(path):
                webbrowser.register("chrome", None, webbrowser.BackgroundBrowser(path))
                return True
        return False

    @staticmethod
    def get_chrome_path() -> Optional[str]:
        """Get Chrome executable path"""
        platform_key = (
            "windows"
            if os.name == "nt"
            else "darwin" if sys.platform == "darwin" else "linux"
        )

        for path in CHROME_PATHS.get(platform_key, []):
            if os.path.exists(path):
                return path
        return None

    @staticmethod
    def open_url(url: str) -> bool:
        """Open URL with Chrome, falling back to default browser"""
        # Try webbrowser Chrome first
        try:
            chrome = webbrowser.get("chrome")
            chrome.open_new(url)
            return True
        except webbrowser.Error:
            pass

        # Try registering Chrome
        if ChromeBrowser.register_chrome():
            try:
                chrome = webbrowser.get("chrome")
                chrome.open_new(url)
                return True
            except webbrowser.Error:
                pass

        # Try subprocess
        chrome_path = ChromeBrowser.get_chrome_path()
        if chrome_path:
            try:
                if os.name == "nt":
                    subprocess.Popen([chrome_path, url], shell=True)
                else:
                    subprocess.Popen([chrome_path, url])
                return True
            except Exception:
                pass

        # Final fallback
        webbrowser.open_new(url)
        return False


class ImpedanceCalculator:
    """Utility class for impedance calculations"""

    @staticmethod
    def calculate_impedance(
        Z: float, X_R_Ratio: float, KVLL: float, KVA: float
    ) -> Tuple[float, float]:
        """
        Calculate resistance (R) and reactance (X) of a transformer.

        Args:
            Z: Impedance in percentage
            X_R_Ratio: Ratio of reactance to resistance
            KVLL: Rated primary line-to-line voltage in kilovolts
            KVA: Rated apparent power in kilovolt-amperes

        Returns:
            Tuple of calculated resistance (R) and reactance (X) in ohms
        """
        Z_ohms_Mag = (Z * 10 * KVLL**2) / KVA
        R = math.sqrt(Z_ohms_Mag**2) / (1 + X_R_Ratio**2)
        X = X_R_Ratio * R
        return R, X

    @staticmethod
    def calculate_impedance_2(
        Z1pu: float, Z2pu: float, BaseKVLL: float, BaseMVA: float
    ) -> float:
        """
        Calculate impedance difference between primary and secondary sides.
        """
        return (Z2pu - Z1pu) * (BaseKVLL**2) / BaseMVA


class QueryHelper:
    """Helper class for querying CymDist data with fallback mechanism"""

    @staticmethod
    def query_with_fallback(query_func, keyword_list: List[str], *args) -> List[Any]:
        """
        Query a list of keywords using the provided query function with fallback mechanism.
        """
        output_list = []
        for keyword in keyword_list:
            result = query_func(keyword, *args)
            try:
                output_list.append(locale.atof(result))
            except (ValueError, TypeError):
                output_list.append(result)
        return output_list

    @staticmethod
    def query_devices(
        keyword_list: List[str], dev_num: str, dev_type: int
    ) -> List[Any]:
        return QueryHelper.query_with_fallback(
            Std.QueryInfoDevice, keyword_list, dev_num, dev_type
        )

    @staticmethod
    def query_nodes(keyword_list: List[str], node_id: str) -> List[Any]:
        return QueryHelper.query_with_fallback(Std.QueryInfoNode, keyword_list, node_id)

    @staticmethod
    def get_value_equipment(
        keyword_list: List[str], eq_id: str, eq_type: int
    ) -> List[Any]:
        return QueryHelper.query_with_fallback(
            Eqt.GetValue, keyword_list, eq_id, eq_type
        )


class EquipmentValueSetter:
    """Helper class for setting equipment values"""

    @staticmethod
    def set_value_dev_eqt(
        value_property_setlist: List[Tuple[Any, str]], eq_obj: Any
    ) -> None:
        """Set values for properties in an EQ object"""
        for value, property_name in value_property_setlist:
            eq_obj.SetValue(value, property_name)

    @staticmethod
    def set_source_value(
        value_property_setlist: List[Tuple[Any, str]], source_id: str
    ) -> None:
        """Set values for source topology"""
        for value, property_name in value_property_setlist:
            Std.SetValueTopo(value, property_name, source_id)


@dataclass
class StudyParameters:
    """Data class to hold study parameters"""

    customer_type: str
    connection: str
    disturbing: str
    customer_load_mw: float
    emission: str
    feeder_limit: float


class ShortCircuitStudy:
    """Class representing a Short Circuit Study"""

    # Constants
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
        """Initialize the ShortCircuitStudy with default values"""
        self.SourceName = self.NetworkID = ""
        self.NominalVoltage, self.OperatingVoltage = 12.47, 12.6
        self.FaultPoints = []
        self.SC_Sim = None
        self.PCC = ""
        self.FaultImpedance = True
        self.NewFeeder = self.SetSource = "No"
        self.LenUnit = "m"
        self.LGFaultResistance = self.LGFaultReactance = 40, 0
        self.LLLFaultResistance = self.LLLFaultReactance = 8, 0
        self.toPhase = self.fromPhase = ""
        self.network_param = []
        self.equipment_list = []
        self.Rep_Loc = self.Path = ""
        self.Source_R0 = self.Source_X0 = self.Source_R1 = self.Source_X1 = 0
        self.Reactor_X, self.Reactor_I = 0.900, 400
        self.table_header_1 = self.table_header_2 = self.table_separator = ""
        self.source_eq = None
        self.source_dev = None

    def get_inputs(self) -> None:
        """Read and set essential input parameters for the power system analysis"""
        print("- Read input parameters")

        input_params = [
            "Fault_Point",
            "Source_R0",
            "Source_X0",
            "Source_R1",
            "Source_X1",
            "Source_RX",
            "New_Feeder",
            "Report_Location",
            "Source_Impedance",
        ]

        inputs = map(cympy.GetInputParameter, input_params)
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
        ) = inputs

        try:
            self.FaultPoints = [
                node for node in Std.ListNodes() if node.ID.startswith(Point)
            ]
        except Exception as e:
            raise ValueError("Error: No circuits loaded") from e

        if not self.FaultPoints:
            raise ValueError("Error: No 'Fault_Point' defined")

    def setup_env(self, fault_point: Any) -> None:
        """Set up the environment required for conducting the power system study"""
        print("- Setup study environment")

        self.NetworkID = Std.QueryInfoNode("$NetworkId$", fault_point)
        self.source_eq = Eqt.GetEquipment(
            self.NetworkID, cympy.enums.EquipmentType.Substation
        )
        self.SourceName = (
            Std.QueryInfoNode("$UpstreamSourceNodeID$", fault_point) or self.NetworkID
        )

        self._setup_table_headers()
        self._get_file_name(self.SourceName)

    def _setup_table_headers(self) -> None:
        """Setup table headers for reporting"""
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

    def _get_file_name(self, source_name: str) -> None:
        """Generate report filename"""
        current_datetime = datetime.now().strftime("%Y-%m-%d-h%Hm%Ms%S")
        file_name = f"SC-Report-{source_name}-{current_datetime}.txt"
        self.Rep_Loc = os.path.join(str(self.Path), file_name)

    def set_source_equivalent(self) -> None:
        """Set source impedances"""
        print("- Set source impedances")

        VOLTAGE_LIST = ["NominalKVLL", "DesiredKVLL"]
        self.NominalVoltage, self.OperatingVoltage = QueryHelper.get_value_equipment(
            VOLTAGE_LIST, self.NetworkID, cympy.enums.EquipmentType.Substation
        )

        set_list = self._create_source_set_list()

        try:
            self.source_dev = Std.GetDevice(
                self.NetworkID, cympy.enums.DeviceType.Source
            )
            # Set device values (first 4) and equipment values (remaining)
            EquipmentValueSetter.set_value_dev_eqt(set_list[:4], self.source_dev)
            EquipmentValueSetter.set_value_dev_eqt(set_list[4:], self.source_eq)
        except Exception:
            # From source equipment database
            EquipmentValueSetter.set_source_value(set_list, self.SourceName)

        self._configure_reactor()

    def _create_source_set_list(self) -> List[Tuple[Any, str]]:
        """Create the source set list for configuration"""
        operating_voltage_ln = self.OperatingVoltage / math.sqrt(3)

        return [
            (operating_voltage_ln, "OperatingVoltageA"),
            (operating_voltage_ln, "OperatingVoltageB"),
            (operating_voltage_ln, "OperatingVoltageC"),
            (True, "UseSecondLevelImpedance"),
            (self.IMPEDANCE_UNIT, "ImpedanceUnit"),
            (self.Source_R0, "SecondLevelR0"),
            (self.Source_X0, "SecondLevelX0"),
            (self.Source_R1, "SecondLevelR1"),
            (self.Source_X1, "SecondLevelX1"),
            (self.Source_R1, "SecondLevelR2"),
            (self.Source_X1, "SecondLevelX2"),
        ]

    def _configure_reactor(self) -> None:
        """Configure series reactor if present"""
        RX_List = Std.ListDevices(cympy.enums.DeviceType.SeriesReactor, self.NetworkID)
        if not RX_List:
            return

        RX_Device = RX_List[0]
        RX_Device.SetValue(f"RX_{self.Reactor_I}_{self.Reactor_X:.3f}", "DeviceID")

        RX_Eq = Eqt.GetEquipment(RX_Device.EquipmentID, RX_Device.EquipmentType)

        if (
            RX_Eq.GetValue("RatedCurrent") != self.Reactor_I
            or RX_Eq.GetValue("ReactanceOhms") != self.Reactor_X
        ):
            RX_Eq.SetValue(self.Reactor_I, "RatedCurrent")
            RX_Eq.SetValue(self.Reactor_X, "ReactanceOhms")

    def config_sc(self) -> None:
        """Configure the parameters for the short circuit simulation"""
        print("- Config short circuit study")

        self.SC_Sim = Sim.ShortCircuit()
        n = self.SC_Sim.GetValue("AnalysisNetworks.SelectedNetworks")

        for i in range(int(n)):
            self.SC_Sim.SetValue("", f"AnalysisNetworks.SelectedNetworks[{i}]")
        self.SC_Sim.SetValue(self.NetworkID, "AnalysisNetworks.SelectedNetworks[0]")

        config_count = locale.atoi(
            self.SC_Sim.GetValue("ParametersConfigurations.Count")
        )
        config = self._get_active_configuration(config_count)

        (
            self.LGFaultResistance,
            self.LGFaultReactance,
            self.LLLFaultResistance,
            self.LLLFaultReactance,
        ) = self.FAULT_VALUES.get(self.FaultImpedance, [0, 0, 0, 0])

        set_list = self._create_sc_set_list(config)
        EquipmentValueSetter.set_value_dev_eqt(set_list, self.SC_Sim)

    def _get_active_configuration(self, config_count: int) -> int:
        """Get the active configuration index"""
        active_config_id = self.SC_Sim.GetValue("ActiveConfigurationID")  # type: ignore
        for i in range(config_count):
            if active_config_id == self.SC_Sim.GetValue(  # type: ignore
                f"ParametersConfigurations[{i}].ConfigID"
            ):
                return i
        return 0

    def _create_sc_set_list(self, config: int) -> List[Tuple[Any, str]]:
        """Create short circuit set list"""
        pretxt = f"ParametersConfigurations[{config}]."
        return [
            (self.LGFaultResistance, f"{pretxt}LGFaultResistanceOHMS"),
            (self.LGFaultReactance, f"{pretxt}LGFaultReactanceOHMS"),
            (self.LLLFaultResistance, f"{pretxt}LLLFaultResistanceOHMS"),
            (self.LLLFaultReactance, f"{pretxt}LLLFaultReactanceOHMS"),
            (self.PREFAULT_VOLTAGE, f"{pretxt}PreFaultVoltage"),
        ]

    def store_info(self, SCReport) -> None:
        """Store fault impedance information"""
        SCReport.write("\n{:<25} {:<8}{:<8}".format("Fault Impedance(ohms)", "R", "X"))

        fault_impedances = [
            (self.LLLFaultResistance, self.LLLFaultReactance, "Zf-LLL:"),
            (self.LGFaultResistance, self.LGFaultReactance, "Zf-LG:"),
        ]

        for resistance, reactance, label in fault_impedances:
            SCReport.write(
                "\n{:<25} {:<8.1f}{:<8.1f}".format(label, resistance, reactance)
            )

    def query_table(self, fromNode: Any, toNode: Any) -> Tuple[List[Any], List[Any]]:
        """Query table information for nodes"""
        info_toNode = QueryHelper.query_nodes(self.TABLE_VARIABLES, toNode.ID)
        info_fromNode = QueryHelper.query_nodes(self.TABLE_VARIABLES, fromNode.ID)
        return info_fromNode, info_toNode

    def feeder_mode(self, fault_point: Any) -> None:
        """Configure feeder mode for the study"""
        iterator = Std.NetworkIterator(
            fault_point, self.ITERATION_UPSTREAM, self.ITERATION_STOPONOPEN
        )

        while iterator.Next():
            for Device in iterator.GetDevices():
                self._configure_device_line(Device)

    def _configure_device_line(self, Device: Any) -> None:
        """Configure device line based on type and characteristics"""
        MainLine, PhaseCount = QueryHelper.query_devices(
            ["IsMainLine", "PhaseCount"], Device.DeviceNumber, Device.DeviceType
        )

        if Device.DeviceType == 11 and MainLine == "Yes" and PhaseCount == "3":
            Device.SetValue("3P_336.4_ASC", "LineID")
        elif Device.DeviceType == 10 and MainLine == "Yes":
            self._configure_cable_device(Device, PhaseCount)

    def _configure_cable_device(self, Device: Any, PhaseCount: str) -> None:
        """Configure cable device"""
        equipment_id = Device.EquipmentID
        if PhaseCount == "3" and not any(
            equipment_id.startswith(prefix)
            for prefix in ["3P_G16", "3P_G13", "3P_G14", "3P_G17"]
        ):
            Device.SetValue("3P_G15_-_1/C_500_KCM_CU_25_KV_XLPE", "CableID")
        elif not equipment_id.startswith("3P_G4"):
            Device.SetValue("3P_G4_-_1/C_#4/0_AWG_AL_25_KV_XLPE", "CableID")

    def make_report(self, file, NetworkParam: List, EquipmentList: List) -> None:
        """Generate the study report"""
        print(f"- Results Text File: {self.Rep_Loc}")

        def _print_and_write(content: str) -> None:
            print(content)
            file.write(content)

        _print_and_write(self.table_separator)
        _print_and_write(self.table_header_1)
        _print_and_write(self.table_header_2)
        _print_and_write(self.table_separator)

        for param in NetworkParam:
            if "INT_WIRE" not in param[0]:
                _print_and_write(self.TABLE_ROW_FORMAT.format(*param))

        _print_and_write(self.table_separator)
        self.store_info(file)

        for eq in EquipmentList:
            eq[1].store_info(file)
            file.write(self.table_separator)


class BaseEquipment:
    """Base class for equipment types"""

    BaseMVA = cympy.env.BasePower_AC_MVA

    def __init__(self, **kwargs):
        self.Device = kwargs.get("Device")
        self.DeviceObj = self.Device.GetObjType() if self.Device else None
        self.EqID = self.Device.EquipmentID if self.Device else "DEFAULT"
        self.DevType = self.Device.DeviceType if self.Device else -1
        self.DevNum = self.Device.DeviceNumber if self.Device else "DEFAULT"
        # Initialize impedance parameters with defaults
        impedance_defaults = (0, 0, 0, 0, 0, 0, 0, 0, 0)
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
        ) = kwargs.get("info_toNode", impedance_defaults)

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
        ) = kwargs.get("info_fromNode", impedance_defaults)

        self.Length = self.FN_Distance - self.TN_Distance
        self.Nameplate = f"{self.DeviceObj}: {self.EqID}"

        self.R1 = self.R1FN - self.R1TN
        self.X1 = self.X1FN - self.X1TN
        self.R0 = self.R0FN - self.R0TN
        self.X0 = self.X0FN - self.X0TN

        self.toPhase = kwargs.get("toPhase", "")
        self.fromPhase = kwargs.get("fromPhase", "")

    def info_table(self, NetworkParam: List) -> None:
        """Add equipment information to network parameters"""
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

    def eq_data(self, EquipmentList: List) -> None:
        """Add equipment to equipment list"""
        if all(self.EqID not in eq for eq in EquipmentList) and self.EqID != "INT_WIRE":
            EquipmentList.append([self.EqID, self])

    def store_info(self, SCReport) -> None:
        """Store equipment information - to be implemented by subclasses"""
        raise NotImplementedError("Subclasses must implement store_info method")


class CableEquipment(BaseEquipment):
    """Class for cable equipment"""

    DEVICE_TYPE_MAP = {
        11: {  # OverheadLine
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
        10: {  # Cable
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

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.Comments = ""

        config = self.DEVICE_TYPE_MAP.get(self.DevType, self.DEVICE_TYPE_MAP[10])
        values = QueryHelper.get_value_equipment(
            config["DEV_INFO"], self.EqID, config["EqType"]
        )

        for attr, value in zip(config["attributes"], values):
            setattr(self, attr, value)

        if self.DevType == 10:  # Cable
            self.ParaRun = Std.QueryInfoDevice(
                "CableNbParallel", self.DevNum, self.DevType
            )
            if self.ParaRun:
                self.Nameplate = f"{self.DeviceObj}: {self.EqID}(*{self.ParaRun})"

        if self.toPhase != self.fromPhase:
            self.R1 = self.R0 = (self.R1TN + self.R1TN + self.R0TN) / 3
            self.X1 = self.X0 = (self.X1TN + self.X1TN + self.X0TN) / 3

    def info_table(self, NetworkParam: List) -> None:
        """Append cable information to NetworkParam with consolidation"""
        if NetworkParam and NetworkParam[-1][0] == self.Nameplate:
            self._consolidate_cable_entry(NetworkParam)
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

    def _consolidate_cable_entry(self, NetworkParam: List) -> None:
        """Consolidate consecutive cable entries"""
        prev_entry = NetworkParam.pop()
        NetworkParam.append(
            [
                self.Nameplate,
                prev_entry[1] + self.Length,
                self.TN_Distance,
                self.R1 + prev_entry[3],
                self.X1 + prev_entry[4],
                self.R0 + prev_entry[5],
                self.X0 + prev_entry[6],
                self.R1TN,
                self.X1TN,
                self.R0TN,
                self.X0TN,
            ]
        )

    def store_info(self, SCReport) -> None:
        """Store cable information to report"""

        def _write_info(label: str, value: str) -> None:
            if value:
                SCReport.write(f"\n{label:<25} {value}")

        SCReport.write(f"\n[{self.DeviceObj}: {self.EqID}]")
        SCReport.write(
            f"\n{'Positive Sequence Z1:':<25} {self.R1_db:<8.4f} + j{self.X1_db:<8.4f} ohms/km"  # pyright: ignore[reportAttributeAccessIssue]
        )
        SCReport.write(
            f"\n{'Negative Sequence Z0:':<25} {self.R0_db:<8.4f} + j{self.X0_db:<8.4f} ohms/km"  # pyright: ignore[reportAttributeAccessIssue]
        )
        SCReport.write(
            f"\n{'Nominal Rating:':<25} {self.Rating:<8.0f} amps"  # type: ignore
        )

        if self.Comments:
            content = textwrap.fill(str(self.Comments), 100)
            _write_info("Comments:", content)

        if self.DevType == 11:  # OverheadLine
            _write_info("Phase Conductor:", self.PhCon)  # type: ignore
            _write_info("Neutral Conductor:", self.NeuCon)  # type: ignore
            _write_info("Conductor Spacing:", self.ConSpacing)  # type: ignore
        elif self.DevType == 10:  # Cable
            _write_info(
                "Impedances Note:", textwrap.fill(str(self.ImpNote), 100)  # type: ignore
            )


class ReactorEquipment(BaseEquipment):
    """Class for series reactor equipment"""

    RX_INFO = ["RatedCurrent", "ReactanceOhms"]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.Length = 0
        self.R1 = self.R0 = 0
        self.X1 = self.X0 = 0
        self.EqType = cympy.enums.EquipmentType.SeriesReactor

        # Get reactor specific values
        self.RatedCurrent, self.ReactanceOhms = QueryHelper.get_value_equipment(
            self.RX_INFO, self.EqID, self.EqType
        )

        # Update nameplate for reactors
        self.Nameplate = f"{self.DeviceObj}: {self.EqID}"

    def info_table(self, NetworkParam: List) -> None:
        """Add reactor information to network parameters"""
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

    def store_info(self, SCReport) -> None:
        """Store reactor information to report"""
        SCReport.write(f"\n[{self.Nameplate}]")
        SCReport.write(f"\n{'Rated Current:':<25} {self.RatedCurrent:<8.0f} amps/Phase")
        SCReport.write(
            f"\n{'Inductive Reactance:':<25} {self.ReactanceOhms:<8.3f} ohms/Phase"
        )

        # Add any additional reactor-specific information
        try:
            reactor_eq = Eqt.GetEquipment(self.EqID, self.EqType)
            comments = reactor_eq.GetValue("Comments")
            if comments:
                SCReport.write(f"\n{'Comments:':<25} {textwrap.fill(comments, 100)}")
        except Exception:
            pass


class ProtectionEquipment(BaseEquipment):
    """Class for protection equipment (breakers, reclosers, fuses)"""

    PROT_INFO = ["NestedViewId", "TccDesc", "NStatus", "ProtModel", "ProtAmps"]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.Length = 0
        self.R1 = self.X1 = self.R0 = self.X0 = 0

        # Initialize protection attributes
        self.prot_nv_id = self.prot_tcc_desc = self.prot_normal_status = ""
        self.prot_model = self.prot_rating = ""
        self.protection_vendor = []
        self.protection_type = []
        self.relay_type = []
        self.instrument_type = []
        self.instrument_number = []

        # Get instrument list for this device
        self.prot_instrument_list = Std.ListInstruments(
            cympy.enums.InstrumentType.AllInstruments, self.DevNum
        )

        if self.prot_instrument_list:
            self._process_instruments()
        else:
            # Get basic protection info directly from device
            (
                self.prot_nv_id,
                self.prot_tcc_desc,
                self.prot_normal_status,
                self.prot_model,
                self.prot_rating,
            ) = QueryHelper.query_devices(self.PROT_INFO, self.DevNum, self.DevType)

        # Update nameplate
        self.Nameplate = f"{self.DeviceObj}: {self.DevNum}"
        if self.prot_nv_id and self.prot_nv_id != "DEFAULT":
            self.Nameplate = f"{self.DeviceObj}: {self.DevNum} @ {self.prot_nv_id}"

    def _process_instruments(self) -> None:
        """Process protection instruments for detailed information"""
        for inst in self.prot_instrument_list:
            if inst.InstrumentType != 1:  # Skip non-protection instruments
                self.protection_vendor.append(inst.GetValue("Manufacturer"))
                self.protection_type.append(inst.GetValue("ProtectionType"))
                self.relay_type.append(inst.GetValue("RelayType"))
                self.instrument_type.append(inst.GetObjType())
                self.instrument_number.append(inst.InstrumentNumber)

    def info_table(self, NetworkParam: List) -> None:
        """Add protection information to network parameters"""
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

    def eq_data(self, EquipmentList: List) -> None:
        """Add protection to equipment list (always add, don't check for duplicates)"""
        EquipmentList.append(["Protection", self])

    def store_info(self, SCReport) -> None:
        """Store protection information to report"""
        SCReport.write(f"\n[{self.DeviceObj}: {self.DevNum}]")

        # Write protection information based on available data
        if self.prot_instrument_list:
            self._store_instrument_info(SCReport)
        else:
            self._store_basic_protection_info(SCReport)

    def _store_instrument_info(self, SCReport) -> None:
        """Store detailed instrument information"""
        if self.protection_vendor:
            self._write_multiple_values(
                SCReport, "Manufacturer:", self.protection_vendor
            )
        if self.instrument_number:
            self._write_multiple_values(
                SCReport, "Instrument Number:", self.instrument_number
            )
        if self.instrument_type:
            self._write_multiple_values(
                SCReport, "Instrument Type:", self.instrument_type
            )
        if self.protection_type:
            self._write_multiple_values(
                SCReport, "Protection Type:", self.protection_type
            )
        if self.relay_type:
            self._write_multiple_values(SCReport, "Relay Type:", self.relay_type)
        if self.prot_model:
            SCReport.write(f"\n{'Model:':<25} {self.prot_model}")
        if self.prot_rating:
            SCReport.write(f"\n{'Rating:':<25} {self.prot_rating}")

    def _store_basic_protection_info(self, SCReport) -> None:
        """Store basic protection information"""
        if self.prot_tcc_desc:
            self._write_description(SCReport, "Description:", self.prot_tcc_desc)
        if self.prot_normal_status:
            SCReport.write(f"\n{'Normal Status:':<25} {self.prot_normal_status}")
        if self.prot_model:
            SCReport.write(f"\n{'Model:':<25} {self.prot_model}")
        if self.prot_rating:
            SCReport.write(f"\n{'Rating:':<25} {self.prot_rating}")

    def _write_multiple_values(self, SCReport, label: str, values: List) -> None:
        """Write multiple values in a formatted way"""
        n = len(values)
        format_template = "{:<20} " * n
        SCReport.write(f"\n{label:<25} {format_template.format(*values)}")

    def _write_description(self, SCReport, label: str, description: str) -> None:
        """Write description with proper formatting"""
        lines = description.split("\n")
        SCReport.write(f"\n{label:<25} {lines[0]}")
        for line in lines[1:]:
            SCReport.write(f"{'':<25} {line}")


class TransformerEquipment(BaseEquipment):
    """Class for transformer equipment"""

    DEVICE_TYPE_MAP = {
        33: {  # By-Phase Transformer
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
        "default": {  # Standard Transformer
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

        # Get transformer configuration based on device type
        config = self.DEVICE_TYPE_MAP.get(self.DevType, self.DEVICE_TYPE_MAP["default"])

        self.Nameplate = config.get("Nameplate", "Transformer")
        self.XfmrDevice = config["XfmrDevice"]
        attributes = config["attributes"]

        # Query transformer-specific values
        values = QueryHelper.query_devices(self.XfmrDevice, self.DevNum, self.DevType)

        # Set attributes dynamically
        for attr, value in zip(attributes, values):
            setattr(self, attr, value)

        # Calculate impedances
        self._calculate_impedances()
        self._validate_impedance_calculations()

    def _calculate_impedances(self) -> None:
        """Calculate transformer impedances"""
        # Calculate device impedances
        self.R1, self.X1 = ImpedanceCalculator.calculate_impedance(
            self.XfoZ1,  # type: ignore
            self.XfoX1R1Ratio,  # type: ignore
            self.SecVolts,  # type: ignore
            self.XfoKVANomTot,  # pyright: ignore[reportAttributeAccessIssue]
        )
        self.R0, self.X0 = ImpedanceCalculator.calculate_impedance(
            self.XfoZ0,  # type: ignore
            self.XfoX0R0Ratio,  # type: ignore
            self.SecVolts,  # type: ignore
            self.XfoKVANomTot,  # pyright: ignore[reportAttributeAccessIssue]
        )

        # Calculate impedance differences for validation
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
                ImpedanceCalculator.calculate_impedance_2(
                    Z1pu, Z2pu, self.SecBase, self.BaseMVA  # type: ignore
                ),
            )

    def _validate_impedance_calculations(self) -> None:
        """Validate impedance calculations"""
        if not math.isclose(
            self.R1c**2 + self.R1**2, 2 * self.R1c * self.R1, rel_tol=1e-4  # type: ignore
        ) and not math.isclose(
            self.R0c**2 + self.R0**2, 2 * self.R0c * self.R0, rel_tol=1e-4  # type: ignore
        ):
            raise ValueError("Error: the transformer device impedance is not correct")

    def info_table(self, NetworkParam: List) -> None:
        """Add transformer information to network parameters"""
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

    def store_info(self, SCReport) -> None:
        """Store transformer information to report"""
        # Build transformer description
        if hasattr(self, "XfoByPhaseEqIdA") and self.DevType == 33:
            # By-phase transformer
            SCReport.write(f"\n[{self.DevNum}]")
            SCReport.write(f"\n{self.Nameplate}")
            SCReport.write(f"\nPhase A: {self.XfoByPhaseEqIdA}")  # type: ignore
            if self.XfoByPhaseEqIdB:  # type: ignore
                SCReport.write(f"\nPhase B: {self.XfoByPhaseEqIdB}")  # type: ignore
            if self.XfoByPhaseEqIdC:  # type: ignore
                SCReport.write(f"\nPhase C: {self.XfoByPhaseEqIdC}")  # type: ignore
        else:
            # Standard transformer
            SCReport.write(f"\n[{self.DevNum}]")
            SCReport.write(f"\n{self.XfoType} x {self.XfoKVANomTot} kVA")  # type: ignore

        # Common transformer information
        SCReport.write(f"\n{self.PrimVolts} kVLL x {self.SecVolts} kVLL")  # type: ignore
        SCReport.write(f"\nZ1: {self.XfoZ1}%, Z0: {self.XfoZ0}%")  # type: ignore
        SCReport.write(f"\nX1/R1: {self.XfoX1R1Ratio}, X0/R0: {self.XfoX0R0Ratio}")  # type: ignore

        # Add equipment code if available
        if hasattr(self, "EqCode") and self.EqCode:  # type: ignore
            SCReport.write(f"\nEquipment Code: {self.EqCode}")  # type: ignore

        # Add any additional comments from equipment database
        try:
            transformer_eq = Eqt.GetEquipment(
                self.EqID, cympy.enums.EquipmentType.Transformer
            )
            comments = transformer_eq.GetValue("Comments")
            if comments:
                SCReport.write(f"\nComments: {textwrap.fill(comments, 100)}")
        except Exception:
            pass


class FaultPoint:
    """Class for fault point analysis"""

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

    def __init__(self, fault_point: str):
        fault_data = QueryHelper.query_nodes(self.FAULT_CURRENT_INFO, fault_point)
        self.data = dict(zip(self.FAULT_CURRENT_INFO, fault_data))
        self.TIo = max(self.data["LGamp"], self.data["LLGT"])
        self.TIO_imp = max(self.data["LGampZ"], self.data["LLGTZ"])

    def info_table(self, NetworkParam: List) -> None:
        """Add fault point information to network parameters"""
        NetworkParam.append(
            [
                f"FAULT POINT (Lat.:{self.data['Latitude']:.5f},Long.:{self.data['Longitude']:.5f})",
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

    def eq_data(self, EquipmentList: List) -> None:
        """Add fault point to equipment list"""
        EquipmentList.append(["FaultPoint", self])

    def store_info(self, SCReport) -> None:
        """Store fault point information to report"""
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
            f"\nPrefault Voltage at Fault Point: {self.data['PrefaultVoltage']} kVLL"
        )

    def generate_form(self, networkID: str) -> None:
        """Generate and open fault level form"""
        input_params = [
            "Customer_Name",
            "Service_Address",
            "Fault_Location",
            "Equipment_ID",
            "Protection",
            "Engineer",
            "Email",
            "Phone",
            "Primary_Form",
        ]

        inputs = map(cympy.GetInputParameter, input_params)
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
        ) = inputs

        if primaryForm != "1":
            return

        _date = datetime.now().strftime("%Y-%m-%d")
        _prefaultLN = round(self.data["PrefaultVoltage"] / math.sqrt(3), 2)
        _networkID = networkID.replace("_", " ")

        variables = [
            f"customer_name={quote(customerName)}",  # type: ignore
            f"service_address={quote(serviceAddress)}",  # type: ignore
            f"fault_location={faultLocation}",
            f"equipment_id={EquipmentID}",
            f"network_id={_networkID}",
            f'distance={"{:0.0f}".format(self.data["Distance"])}',
            f"protection={quote(protection)}",  # type: ignore
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

        link = self._PATH + "?" + "&".join(variables)
        print(link)
        ChromeBrowser.open_url(link)


class SourceEquivalent:
    """Class for source equivalent analysis and reporting"""

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

    def __init__(self, source_name: str, info_toNode: List[float]):
        """
        Initialize SourceEquivalent object.

        Args:
            source_name: The name of the source
            info_toNode: Impedance information from the source node [R1TN, X1TN, R0TN, X0TN, ...]
        """
        self.SourceName = source_name
        self.EqType = cympy.enums.EquipmentType.Substation

        # Query source-specific information
        source_data = QueryHelper.query_nodes(self.SOURCE_INFO, self.SourceName)
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
        ) = source_data

        # Extract Thevenin impedances from node information
        self.R1TN, self.X1TN, self.R0TN, self.X0TN = info_toNode[:4]

        self.Nameplate = f"SourceEquivalent: {self.SourceName}"
        self._source_obj = None
        self._source_device = None

    def _get_source_objects(self) -> None:
        """Retrieve source equipment and device objects"""
        try:
            self._source_obj = Eqt.GetEquipment(self.SourceName, self.EqType)
        except Exception:
            self._source_obj = None

        try:
            self._source_device = Std.GetDevice(
                self.SourceName, cympy.enums.DeviceType.Source
            )
        except Exception:
            self._source_device = None

    def info_table(self, NetworkParam: List) -> None:
        """Add source equivalent information to network parameters"""

        def _ensure_positive(number: float) -> float:
            """Ensure impedance values are positive for reporting"""
            return abs(number)

        NetworkParam.append(
            [
                self.Nameplate,
                0,  # Length
                0,  # Distance
                _ensure_positive(self.R1TN),
                _ensure_positive(self.X1TN),
                _ensure_positive(self.R0TN),
                _ensure_positive(self.X0TN),
                0,
                0,
                0,
                0,  # Thevenin impedances (not applicable for source)
            ]
        )

    def eq_data(self, EquipmentList: List) -> None:
        """Add source equivalent to equipment list"""
        EquipmentList.append(["Source", self])

    def store_info(self, SCReport) -> None:
        """Store source equivalent information to report"""
        SCReport.write(f"\n[{self.Nameplate}]")

        # Display appropriate impedance values based on fault level
        if "Low" in str(self.Level):
            self._store_low_fault_level_info(SCReport)
        elif "High" in str(self.Level):
            self._store_high_fault_level_info(SCReport)

        # Add source comments and details
        self._store_source_comments(SCReport)

    def _store_low_fault_level_info(self, SCReport) -> None:
        """Store low fault level impedance information"""
        SCReport.write(
            f"\n{'Low Fault Level Z1:':<25} {self.R1min:<8.4f} + j{self.X1min:<8.4f} ohms"
        )
        SCReport.write(
            f"\n{'Low Fault Level Z0:':<25} {self.R0min:<8.4f} + j{self.X0min:<8.4f} ohms"
        )

    def _store_high_fault_level_info(self, SCReport) -> None:
        """Store high fault level impedance information"""
        SCReport.write(
            f"\n{'High Fault Level Z1:':<25} {self.R1max:<8.4f} + j{self.X1max:<8.4f} ohms"
        )
        SCReport.write(
            f"\n{'High Fault Level Z0:':<25} {self.R0max:<8.4f} + j{self.X0max:<8.4f} ohms"
        )

    def _store_source_comments(self, SCReport) -> None:
        """Store source comments and additional details"""
        SCReport.write("\nComments:")

        self._get_source_objects()

        if self._source_device:
            SCReport.write(" User Defined Source Equivalent")
            self._store_user_defined_source_info(SCReport)
        elif self._source_obj:
            self._store_equipment_source_info(SCReport)
        else:
            SCReport.write(" Source equivalent from network parameters")

    def _store_user_defined_source_info(self, SCReport) -> None:
        """Store information for user-defined sources"""
        try:
            # Try to get additional information from user-defined source
            device_id = self._source_device.GetValue("DeviceID")  # type: ignore
            if device_id and device_id != self.SourceName:
                SCReport.write(f" (Device ID: {device_id})")

            # Get source voltage if available
            try:
                source_kv = self._source_device.GetValue("NominalKVLL")  # type: ignore
                if source_kv:
                    SCReport.write(f"\n{'Nominal Voltage:':<25} {source_kv} kV")
            except Exception:
                pass

        except Exception:
            pass

    def _store_equipment_source_info(self, SCReport) -> None:
        """Store information for equipment-based sources"""
        try:
            comments = Eqt.GetValue("Comments", self.SourceName, self.EqType)
            if comments:
                SCReport.write("\n" + textwrap.fill(comments, 100))

            # Add additional equipment details

        except Exception as e:
            SCReport.write(f" Unable to retrieve comments: {str(e)}")


class EmissionStudy:
    """Class for performing emission studies on power systems"""

    # Constants
    PATH = "http://pq.bchydro.bc.ca:100/pqtools_MVresults.php?"
    METHOD = 2
    SECTION = 0
    SPOT_DEV_TYPE = cympy.enums.DeviceType.SpotLoad

    # Lookup tables
    POWER_FACTORS = {"Residential": 0.97, "Commercial": 0.95, "Industrial": 0.93}
    FEEDER_LIMITS = {4.16: 2.16, 12.47: 6.48, 24.94: 12.96}
    CONNECTION_TYPES = {"1PH": 1, "3PH Y": 34, "3PH D": 33}
    DISTURBING_LOAD_TYPES = {"YES": 2, "NO": 3}

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
        self.poi = poi
        self.feeder_id = network_id
        self.distance = distance
        self.impedance = (r1, x1, r0, x0)
        self._initialize_variables()

    def _initialize_variables(self) -> None:
        self.parameters = None
        self.kv_ll = 0.0
        self.phase_count = 0
        self.power_factor = 0.0
        self.customer_load_mva = 0.0
        self.current_load_smv = 0.0
        self.current_load_slv = 0.0
        self.slv_percentage = 0.0
        self.estimated_slv = 0.0
        self._variables = []

    def run_study(self) -> None:
        try:
            self._get_input_parameters()
            self._get_system_parameters()
            self._calculate_loads()
            self._prepare_variables()
        except Exception as e:
            raise RuntimeError(f"Emission study failed: {e}") from e

    def _get_input_parameters(self) -> None:
        inputs = map(cympy.GetInputParameter, self.INPUT_PARAMETERS)
        self.parameters = StudyParameters(*inputs)  # type: ignore
        self.power_factor = self.POWER_FACTORS.get(
            str(self.parameters.customer_type), 0.95
        )
        self.customer_load_mva = self.parameters.customer_load_mw / self.power_factor

    def _get_system_parameters(self) -> None:
        self.phase_count = cympy.study.QueryInfoNode("PhaseCount", self.poi)
        self.kv_ll = cympy.study.QueryInfoNode("KVLLBase", self.poi)

        if not self.parameters.feeder_limit:  # type: ignore
            self.parameters.feeder_limit = self.FEEDER_LIMITS.get(self.kv_ll, 0.0)  # type: ignore

    def _calculate_loads(self) -> None:
        spot_loads = cympy.study.ListDevices(self.SPOT_DEV_TYPE, self.feeder_id)
        self._calculate_current_loads(spot_loads)

        total_mva = (
            self.current_load_smv + self.current_load_slv
        ) / 1000 + self.customer_load_mva
        self._calculate_slv_percentage(total_mva)
        self.estimated_slv = round(
            round(self.slv_percentage, 2) * self.parameters.feeder_limit, 3  # type: ignore
        )

    def _calculate_current_loads(self, spot_loads: List) -> None:
        smv_load = slv_load = 0.0

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
        if total_mva <= self.parameters.feeder_limit:  # type: ignore
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
            f"St={self.parameters.feeder_limit}",  # type: ignore
            f"cPh={self.CONNECTION_TYPES.get(str(self.parameters.connection), 1)}",  # type: ignore
            f"Si={round(self.customer_load_mva, 3)}",
            f"alpha={self.DISTURBING_LOAD_TYPES.get(str(self.parameters.disturbing), 3)}",  # type: ignore
            f"Slv={self.estimated_slv}",
        ]

    def generate_report(self, output_file) -> None:
        if not self._variables:
            raise RuntimeError("Study must be run before generating report")

        report_url = self.PATH + "&".join(self._variables)
        ChromeBrowser.open_url(report_url)
        self._write_report(output_file, report_url)

    def _write_report(self, file, report_url: str) -> None:
        report_data = self._prepare_report_data(report_url)

        file.write("\n" + "=" * 50 + "\n")
        file.write("        EMISSION STUDY REPORT\n")
        file.write("=" * 50 + "\n")

        for label, value in report_data:
            self._write_formatted_line(file, label, value)

    def _prepare_report_data(self, report_url: str) -> List[Tuple[str, str]]:
        r1, x1, r0, x0 = self.impedance
        return [
            ("Feeder:", self.feeder_id),
            ("Voltage (kV):", f"{self.kv_ll}"),
            ("Impedance R1/X1:", f"{r1}/{x1}"),
            ("Impedance R0/X0:", f"{r0}/{x0}"),
            ("Distance:", f"{self.distance}"),
            ("Phase:", f"{self.phase_count}"),
            ("Feeder Planning Limit (MVA):", f"{self.parameters.feeder_limit}"),  # type: ignore
            ("Connection Type:", str(self.parameters.connection)),  # type: ignore
            ("Customer Type:", str(self.parameters.customer_type)),  # type: ignore
            ("Power Factor:", f"{self.power_factor:.3f}"),
            ("Customer Demand (MW):", f"{self.parameters.customer_load_mw:.3f}"),  # type: ignore
            ("Customer Demand (MVA):", f"{self.customer_load_mva:.3f}"),
            ("Current LV Load (MVA):", f"{self.current_load_slv / 1000:.3f}"),
            ("Current MV Load (MVA):", f"{self.current_load_smv / 1000:.3f}"),
            ("Percentage of LV Load (%):", f"{self.slv_percentage * 100:.0f}"),
            ("Max. LV Load (MVA):", f"{self.estimated_slv:.3f}"),
            ("Disturbing Load:", str(self.parameters.disturbing)),  # type: ignore
            ("Report Link:", f"\n{textwrap.fill(report_url, 100)}"),
        ]

    @staticmethod
    def _write_formatted_line(file, label: str, value: str) -> None:
        line = f"{label:<30} {value}\n"
        print(line, end="\n")
        file.write(line)


def device_handler(
    short_circuit_study, device_obj, info_toNode, info_fromNode, Phase, FromPhase
):
    """Handle different types of devices in a short circuit study"""
    device_handlers = {
        1: TransformerEquipment,  # cympy.enums.DeviceType.Transformer
        42: TransformerEquipment,  # cympy.enums.DeviceType.AutoTransformer
        33: TransformerEquipment,  # cympy.enums.DeviceType.TransformerByPhase
        2: ProtectionEquipment,  # cympy.enums.DeviceType.Breaker
        4: ProtectionEquipment,  # cympy.enums.DeviceType.Recloser
        7: ProtectionEquipment,  # cympy.enums.DeviceType.Fuse
        9: ReactorEquipment,  # cympy.enums.DeviceType.SeriesReactor
        10: CableEquipment,  # cympy.enums.DeviceType.Underground
        11: CableEquipment,  # cympy.enums.DeviceType.OverheadLine
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
        Dev.eq_data(short_circuit_study.equipment_list)
        Dev.info_table(short_circuit_study.network_param)


def main():
    if not Std.ListNetworks:
        raise ValueError("Error: No study is loaded")

    SC = ShortCircuitStudy()
    SC.get_inputs()

    count = Std.GetModificationsCount()
    for point in SC.FaultPoints:
        fault_point_id = point.ID
        SC.setup_env(fault_point_id)

        if SC.SetSource == "Yes":
            SC.set_source_equivalent()

        SC.config_sc()

        if SC.NewFeeder == "Yes":
            SC.feeder_mode(fault_point_id)

        SC.SC_Sim.Run()  # type: ignore

        # Fault Point
        FP = FaultPoint(fault_point_id)
        FP.info_table(SC.network_param)
        FP.eq_data(SC.equipment_list)

        # Upstream path to Source
        itr = Std.NetworkIterator(
            fault_point_id, SC.ITERATION_UPSTREAM, SC.ITERATION_STOPONOPEN
        )

        while itr.Next():
            Node = itr.GetNode()
            DeviceList = itr.GetDevices()
            FromNode = itr.GetFromNode()
            FromPhase = itr.GetFromPhase()
            Phase = itr.GetPhase()

            info_fromNode, info_toNode = SC.query_table(FromNode, Node)

            for Device in DeviceList:
                device_handler(SC, Device, info_toNode, info_fromNode, Phase, FromPhase)

            if Std.QueryInfoNode("IsSourceNode", Node.ID) == "Yes":
                # Source equivalent handling would be implemented here
                SourceEquivalentObj = SourceEquivalent(SC.SourceName, info_toNode)
                SourceEquivalentObj.eq_data(SC.equipment_list)
                SourceEquivalentObj.info_table(SC.network_param)

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

            with open(SC.Rep_Loc, "w") as report_file:
                SC.make_report(report_file, SC.network_param, SC.equipment_list)
                if ES.parameters.emission == "Yes":  # type: ignore
                    ES.generate_report(report_file)

            FP.generate_form(SC.NetworkID)

        except Exception as e:
            print(f"Error: {e}")

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

    print(f"Execution Time: {time.time() - start:.2f}s")
