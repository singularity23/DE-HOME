#!/usr/bin/env python3
"""
Optimized Short Circuit Study Analysis Tool
by Kan Tang @2024-11-06
Optimized and refactored @2026-01-12

This module performs short circuit analysis and emission studies on power systems.
It requires the cympy library for CYMDIST integration.
"""

import math
import locale
import os
import sys
import subprocess
import time
import traceback
import webbrowser
import textwrap
from datetime import datetime
from dataclasses import dataclass
from typing import List, Tuple, Optional, Any, Callable
from urllib.parse import quote
from abc import ABC, abstractmethod

try:
    import cympy
    from cympy import app as App, eq as Eqt, sim as Sim, study as Std
except ImportError:
    # Mock cympy for testing purposes
    class MockCympy:
        class enums:
            IterationOption = type("IterationOption", (), {"Upstream": 1})()
            IterationRestriction = type("IterationRestriction", (), {"StopOnOpen": 2})()
            NodeType = type("NodeType", (), {"Loop": 3})()
            EquipmentType = type(
                "EquipmentType",
                (),
                {
                    "Substation": 1,
                    "OverheadLine": 11,
                    "Cable": 10,
                    "SeriesReactor": 9,
                    "Transformer": 1,
                    "AutoTransformer": 42,
                    "TransformerByPhase": 33,
                },
            )()
            DeviceType = type(
                "DeviceType",
                (),
                {
                    "Source": 2,
                    "Breaker": 3,
                    "Recloser": 4,
                    "Fuse": 7,
                    "Underground": 10,
                    "OverheadLine": 11,
                    "Transformer": 1,
                    "AutoTransformer": 42,
                    "TransformerByPhase": 33,
                    "SeriesReactor": 9,
                    "SpotLoad": 22,
                },
            )()
            InstrumentType = type("InstrumentType", (), {"AllInstruments": 0})()

        class study:
            @staticmethod
            def ListNodes(node_type=None):
                return []

            @staticmethod
            def ListNetworks():
                return ["TEST_NETWORK"]

            @staticmethod
            def QueryInfoNode(keyword, node_id):
                return None

            @staticmethod
            def QueryInfoDevice(keyword, dev_num, dev_type):
                return None

            @staticmethod
            def GetDevice(network_id, device_type):
                return MockDevice()

            @staticmethod
            def GetModificationsCount():
                return 0

            @staticmethod
            def Undo(n):
                pass

            @staticmethod
            def ListDevices(device_type, network_id):
                return []

            @staticmethod
            def ListInstruments(instrument_type, dev_num):
                return []

            @staticmethod
            def SetValueTopo(value, property_name, source_id):
                pass

            @staticmethod
            def SetValueDevice(value, prop, dev_num, dev_type):
                pass

            @staticmethod
            def NetworkIterator(start_node, iter_opt, iter_restrict):
                it = MockIterator()
                it.Next = lambda: False
                return it

        class app:
            @staticmethod
            def GetKeyword(keyword):
                m = MockObject()
                m.Unit = "m"
                return m

        class env:
            BasePower_AC_MVA = 100.0

        class eq:
            @staticmethod
            def GetEquipment(eq_id, eq_type):
                m = MockObject()
                m.GetValue = lambda x: None
                m.SetValue = lambda x, y: None
                return m

        class sim:
            class ShortCircuit:
                def __init__(self):
                    self._values = {
                        "AnalysisNetworks.SelectedNetworks": "1",
                        "ParametersConfigurations.Count": "1",
                        "ActiveConfigurationID": "cfg0",
                    }

                def GetValue(self, path):
                    return self._values.get(path, "")

                def SetValue(self, value, path):
                    self._values[path] = value

                def Run(self):
                    pass

        @staticmethod
        def GetInputParameter(param):
            return None

    class MockObject:
        pass

    class MockDevice:
        def GetObjType(self):
            return "MockDevice"

        def SetValue(self, value, prop):
            pass

    class MockIterator:
        def Next(self):
            return False

        def GetNode(self):
            return MockObject()

        def GetDevices(self):
            return []

        def GetFromNode(self):
            return MockObject()

        def GetFromPhase(self):
            return ""

        def GetPhase(self):
            return ""

    sys.modules["cympy"] = MockCympy()
    import cympy

    # Expose cympy attributes at module level for backward compatibility
    globals()["App"] = cympy.app
    globals()["Eqt"] = cympy.eq
    globals()["Sim"] = cympy.sim
    globals()["Std"] = cympy.study


# Platform-specific Chrome paths
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
    """Handles Chrome browser registration and URL opening with fallback mechanisms"""

    @staticmethod
    def get_platform_key() -> str:
        """Get platform key for Chrome path lookup"""
        if os.name == "nt":
            return "windows"
        elif sys.platform == "darwin":
            return "darwin"
        else:
            return "linux"

    @staticmethod
    def register_chrome() -> bool:
        """Register Chrome with webbrowser module and return success status."""
        platform_key = ChromeBrowser.get_platform_key()

        for path in CHROME_PATHS.get(platform_key, []):
            if os.path.exists(path):
                try:
                    webbrowser.register(
                        "chrome", None, webbrowser.BackgroundBrowser(path)
                    )
                    return True
                except Exception:
                    continue
        return False

    @staticmethod
    def get_chrome_path() -> Optional[str]:
        """Return path to Chrome executable or None if not found."""
        platform_key = ChromeBrowser.get_platform_key()

        for path in CHROME_PATHS.get(platform_key, []):
            if os.path.exists(path):
                return path
        return None

    @staticmethod
    def open_url(url: str) -> bool:
        """Open URL with Chrome, falling back to system default browser."""
        # Try webbrowser Chrome first
        try:
            chrome = webbrowser.get("chrome")

            chrome.open(url, new=0, autoraise=True)

            return True
        except webbrowser.Error:
            pass

        # Try registering Chrome
        if ChromeBrowser.register_chrome():
            try:
                chrome = webbrowser.get("chrome")

                chrome.open(url, new=0, autoraise=True)
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
        try:
            webbrowser.open(url, new=0, autoraise=True)
            return True
        except Exception:
            return False


class TextFormatter:
    """Text wrapping utility with indentation support."""

    @staticmethod
    def format_text(text: str, width: int, indent: int) -> str:
        """Wrap text to width with indentation for subsequent lines."""
        return textwrap.fill(
            text, width, initial_indent="", subsequent_indent=" " * indent
        )


class ImpedanceCalculator:
    """Utility class for impedance calculations with validation"""

    @staticmethod
    def calculate_impedance(
        Z: float, X_R_Ratio: float, KVLL: float, KVA: float
    ) -> Tuple[float, float]:
        """Calculate R and X from impedance percentage and X/R ratio. Returns (R, X) in ohms."""
        if Z <= 0 or KVLL <= 0 or KVA <= 0:
            raise ValueError("Invalid parameters: Z, KVLL, and KVA must be positive")

        Z_ohms_magnitude = (Z * 10 * KVLL**2) / KVA
        denominator = math.sqrt(1 + X_R_Ratio**2)

        R = Z_ohms_magnitude / denominator
        X = X_R_Ratio * R

        return R, X

    @staticmethod
    def calculate_impedance_difference(
        Z1pu: float, Z2pu: float, BaseKVLL: float, BaseMVA: float
    ) -> float:
        """Calculate per-unit impedance difference in ohms based on base voltage and MVA."""
        return (Z2pu - Z1pu) * (BaseKVLL**2) / BaseMVA


class QueryHelper:
    """Query CymDist data with fallback keywords and automatic locale-aware parsing."""

    @staticmethod
    def query_with_fallback(
        query_func: Callable, keyword_list: List[str], *args
    ) -> List[Any]:
        """Try each keyword in order; parse to float if possible, else return raw value. Return None on failure."""
        output_list = []
        for keyword in keyword_list:
            try:
                result = query_func(keyword, *args)
                # Try to convert to float, fallback to original value
                try:
                    output_list.append(locale.atof(result))
                except (ValueError, TypeError):
                    output_list.append(result)
            except Exception as e:
                print(
                    f"Warning: Failed to query {keyword}: for {args} : {e}"
                )  # Log error but continue processing
                output_list.append(None)
        return output_list

    @staticmethod
    def query_devices(
        keyword_list: List[str], dev_num: str, dev_type: int
    ) -> List[Any]:
        """Query multiple keywords for a device using fallback mechanism."""
        return QueryHelper.query_with_fallback(
            Std.QueryInfoDevice, keyword_list, dev_num, dev_type
        )

    @staticmethod
    def query_nodes(keyword_list: List[str], node_id: str) -> List[Any]:
        """Query multiple keywords for a node using fallback mechanism."""
        return QueryHelper.query_with_fallback(Std.QueryInfoNode, keyword_list, node_id)

    @staticmethod
    def get_value_equipment(
        keyword_list: List[str], eq_id: str, eq_type: int
    ) -> List[Any]:
        """Query multiple keywords for equipment using fallback mechanism."""
        return QueryHelper.query_with_fallback(
            Eqt.GetValue, keyword_list, eq_id, eq_type
        )


class EquipmentValueSetter:
    """Set values on equipment and topology objects with error handling."""

    @staticmethod
    def set_value_dev_eqt(
        value_property_setlist: List[Tuple[Any, str]], eq_obj: Any
    ) -> None:
        """Set multiple properties on an equipment object. Log warnings on failure but continue."""
        for value, property_name in value_property_setlist:
            try:
                eq_obj.SetValue(value, property_name)
            except Exception as e:
                print(f"Warning: Failed to set {property_name} to {value}: {e}")

    @staticmethod
    def set_source_value(
        value_property_setlist: List[Tuple[Any, str]], source_id: str
    ) -> None:
        """Set topology properties on source node. Log warnings on failure but continue."""
        for value, property_name in value_property_setlist:
            try:
                Std.SetValueTopo(value, property_name, source_id)
            except Exception as e:
                print(f"Warning: Failed to set source {property_name} to {value}: {e}")


@dataclass
class StudyParameters:
    """Container for emission study input parameters."""

    customer_type: str
    connection: str
    disturbing: str
    customer_load_mw: float
    emission: str
    feeder_limit: float


class BaseEquipment(ABC):
    """Abstract base for network equipment with impedance calculation and reporting."""

    BaseMVA = cympy.env.BasePower_AC_MVA

    def __init__(self, **kwargs):
        self.Device = kwargs.get("Device")
        self.Node = kwargs.get("Node")
        self.DeviceObj = self.Device.GetObjType() if self.Device else "Unknown"
        self.EqID = self.Device.EquipmentID if self.Device else "DEFAULT"
        self.EqType = self.Device.EquipmentType if self.Device else 0  # Unknown
        self.DevType = self.Device.DeviceType if self.Device else -1  # AllDevices
        self.DevNum = self.Device.DeviceNumber if self.Device else "DEFAULT"

        self.Eq = Eqt.GetEquipment(self.EqID, self.EqType) if self.Device else None

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

        # Calculate impedances
        self.R1 = self.R1FN - self.R1TN
        self.X1 = self.X1FN - self.X1TN
        self.R0 = self.R0FN - self.R0TN
        self.X0 = self.X0FN - self.X0TN

        self.toPhase = kwargs.get("toPhase", "")
        self.fromPhase = kwargs.get("fromPhase", "")

    def info_table(self, NETWORK_PARAM: List) -> None:
        """Append equipment impedance data to network parameter table."""
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
        NETWORK_PARAM.append(_DEVICE_INFO)

    def eq_data(self, EQUIP_LIST: list) -> None:
        """Add this equipment to list if not duplicated. Skip internal wires."""
        if all(self.EqID not in eq for eq in EQUIP_LIST) and self.EqID != "INT_WIRE":
            EQUIP_LIST.append([self.EqID, self])

    @abstractmethod
    def store_info(self, SCReport) -> None:
        """Write equipment details to report. Must be overridden by subclasses."""
        pass


class CableEquipment(BaseEquipment):
    """Overhead and underground cable equipment with parallel run and transposition handling."""

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

        # Handle phase transposition
        if self.toPhase != self.fromPhase:
            self.R1 = self.R0 = (self.R1TN + self.R1TN + self.R0TN) / 3
            self.X1 = self.X0 = (self.X1TN + self.X1TN + self.X0TN) / 3

    def info_table(self, NETWORK_PARAM: List) -> None:
        """Append cable data to table, consolidating consecutive identical cables."""
        if NETWORK_PARAM and NETWORK_PARAM[-1][0] == self.Nameplate:
            self._consolidate_cable_entry(NETWORK_PARAM)
        else:
            NETWORK_PARAM.append(
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

    def _consolidate_cable_entry(self, NETWORK_PARAM: List) -> None:
        """Merge current cable with previous entry, summing length and impedance."""
        prev_entry = NETWORK_PARAM.pop()
        NETWORK_PARAM.append(
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
        """Write cable impedance, rating, and conductor details to report."""
        SCReport.write(f"\n[{self.DeviceObj}: {self.EqID}]")

        def _write_info(label: str, value: str) -> None:
            if value:
                SCReport.write(f"\n{label:<25} {value}")

        _write_info(
            "Positive Sequence Z1:", f"{self.R1_db:<8.4f} + j{self.X1_db:<8.4f} ohms/km"
        )
        _write_info(
            "Negative Sequence Z0:", f"{self.R0_db:<8.4f} + j{self.X0_db:<8.4f} ohms/km"
        )
        _write_info("Nominal Rating:", f"{self.Rating:<8.0f} amps")

        if self.Comments:
            content = TextFormatter.format_text(str(self.Comments), 80, 26)
            _write_info("Comments:", content)

        if self.DevType == 11:  # OverheadLine
            _write_info("Phase Conductor:", self.PhCon)
            _write_info("Neutral Conductor:", self.NeuCon)
            _write_info("Conductor Spacing:", self.ConSpacing)
        elif self.DevType == 10:  # Cable
            if hasattr(self, "ImpNote") and self.ImpNote:
                content = TextFormatter.format_text(str(self.ImpNote), 80, 26)
                _write_info("Impedances Note:", content)


class ReactorEquipment(BaseEquipment):
    """Series reactor with rated current and reactance."""

    RX_INFO = ["RatedCurrent", "ReactanceOhms"]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.Length = 0
        self.R1 = self.R0 = 0

        self.EqType = cympy.enums.EquipmentType.SeriesReactor

        # Get reactor specific values
        self.RatedCurrent, self.ReactanceOhms = QueryHelper.get_value_equipment(
            self.RX_INFO, self.EqID, self.EqType
        )

        # Update nameplate for reactors
        self.Nameplate = f"{self.DeviceObj}: {self.EqID}"

    def info_table(self, NETWORK_PARAM: List) -> None:
        """Append reactor impedance data to table."""
        NETWORK_PARAM.append(
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
        """Write reactor rating, reactance, and comments to report."""
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
                content = TextFormatter.format_text(comments, 80, 26)
                SCReport.write(f"{'Comments:':<25} {content}")
        except Exception:
            pass


class ProtectionEquipment(BaseEquipment):
    """Breakers, reclosers, and fuses with relay/protection instrument details."""

    PROT_INFO = ["NestedViewId", "TccDesc", "NStatus", "ProtModel", "ProtAmps"]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.Length = 0
        self.R1 = self.X1 = self.R0 = self.X0 = 0
        self.EqID = "ProtectiveDevice"

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
            values = QueryHelper.query_devices(
                self.PROT_INFO, self.DevNum, self.DevType
            )
            (
                self.prot_nv_id,
                self.prot_tcc_desc,
                self.prot_normal_status,
                self.prot_model,
                self.prot_rating,
            ) = values

        # Update nameplate
        self.Nameplate = f"{self.DeviceObj}: {self.DevNum}"
        if self.prot_nv_id and self.prot_nv_id != "DEFAULT":
            self.Nameplate = f"{self.DeviceObj}: {self.DevNum} @ {self.prot_nv_id}"

    def _process_instruments(self) -> None:
        """Extract manufacturer, type, and relay details from protection instruments."""
        for inst in self.prot_instrument_list:
            if inst.InstrumentType != 1:  # Skip non-protection instruments
                self.protection_vendor.append(inst.GetValue("Manufacturer"))
                self.protection_type.append(inst.GetValue("ProtectionType"))
                self.relay_type.append(inst.GetValue("RelayType"))
                self.instrument_type.append(inst.GetObjType())
                self.instrument_number.append(inst.InstrumentNumber)

    def info_table(self, NETWORK_PARAM: List) -> None:
        """Append protection device to network table."""
        NETWORK_PARAM.append(
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
        """Write protection device model, rating, and instrument details to report."""
        SCReport.write(f"\n[{self.DeviceObj}: {self.DevNum}]")

        # Write protection information based on available data
        if self.prot_instrument_list:
            self._store_instrument_info(SCReport)
        else:
            self._store_basic_protection_info(SCReport)

    def _store_instrument_info(self, SCReport) -> None:
        """Write protection instruction vendor, type, and relay details."""
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
            SCReport.write(f"\n{'Rating:':<25} {self.prot_rating:<8}")

    def _store_basic_protection_info(self, SCReport) -> None:
        """Write protection device description, status, model, and rating."""
        if self.prot_tcc_desc:
            self._write_description(SCReport, "Description:", self.prot_tcc_desc)
        if self.prot_normal_status:
            SCReport.write(f"\n{'Normal Status:':<25} {self.prot_normal_status}")
        if self.prot_model:
            SCReport.write(f"\n{'Model:':<25} {self.prot_model}")
        if self.prot_rating:
            SCReport.write(f"\n{'Rating:':<25} {self.prot_rating:<8.0F} amps")

    def _write_multiple_values(self, SCReport, label: str, values: List) -> None:
        """Write label followed by multiple space-separated values."""
        n = len(values)
        format_template = "{:<20} " * n
        SCReport.write(f"\n{label:<25} {format_template.format(*values)}")

    def _write_description(self, SCReport, label: str, description: str) -> None:
        """Write multi-line description with consistent indentation."""
        lines = description.split("\n")
        SCReport.write(f"\n{label:<25} {lines[0]}")
        for line in lines[1:]:
            SCReport.write(f"{'':<25} {line}")


class TransformerEquipment(BaseEquipment):
    """Transformer with by-phase support, impedance validation, and three-phase configuration."""

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
        """Calculate device and per-unit impedance differences from transformer specs."""
        # Calculate device impedances
        self.R1, self.X1 = ImpedanceCalculator.calculate_impedance(
            self.XfoZ1, self.XfoX1R1Ratio, self.SecVolts, self.XfoKVANomTot
        )
        self.R0, self.X0 = ImpedanceCalculator.calculate_impedance(
            self.XfoZ0, self.XfoX0R0Ratio, self.SecVolts, self.XfoKVANomTot
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
                ImpedanceCalculator.calculate_impedance_difference(
                    Z1pu, Z2pu, self.SecBase, self.BaseMVA
                ),
            )

    def _validate_impedance_calculations(self) -> None:
        """Check impedance calculations against tolerance. Raise error if invalid."""
        tolerance = 1e-4
        if not (
            math.isclose(
                self.R1c**2 + self.R1**2, 2 * self.R1c * self.R1, rel_tol=tolerance
            )
            or math.isclose(
                self.R0c**2 + self.R0**2, 2 * self.R0c * self.R0, rel_tol=tolerance
            )
        ):
            raise ValueError("Error: the transformer device impedance is not correct")

    def info_table(self, NETWORK_PARAM: List) -> None:
        """Append transformer impedance data to network table."""
        NETWORK_PARAM.append(
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
        """Write transformer configuration, impedance, and comments to report."""
        # Build transformer description
        if hasattr(self, "XfoByPhaseEqIdA") and self.DevType == 33:
            # By-phase transformer
            SCReport.write(f"\n[{self.DevNum}]")
            SCReport.write(f"\n{self.Nameplate}")
            SCReport.write(f"\nPhase A: {self.XfoByPhaseEqIdA}")
            if self.XfoByPhaseEqIdB:
                SCReport.write(f"\nPhase B: {self.XfoByPhaseEqIdB}")
            if self.XfoByPhaseEqIdC:
                SCReport.write(f"\nPhase C: {self.XfoByPhaseEqIdC}")
        else:
            # Standard transformer
            SCReport.write(f"\n[{self.DevNum}]")
            SCReport.write(f"\n{self.XfoType} x {self.XfoKVANomTot} kVA")

        # Common transformer information
        SCReport.write(f"\n{self.PrimVolts} kVLL x {self.SecVolts} kVLL")
        SCReport.write(f"\nZ1: {self.XfoZ1}%, Z0: {self.XfoZ0}%")
        SCReport.write(f"\nX1/R1: {self.XfoX1R1Ratio}, X0/R0: {self.XfoX0R0Ratio}")

        # Add equipment code if available
        if hasattr(self, "EqCode") and self.EqCode:
            SCReport.write(f"\nEquipment Code: {self.EqCode}")

        # Add any additional comments from equipment database
        try:
            transformer_eq = Eqt.GetEquipment(
                self.EqID, cympy.enums.EquipmentType.Transformer
            )
            comments = transformer_eq.GetValue("Comments")
            if comments:
                content = TextFormatter.format_text(comments, 80, 26)
                SCReport.write(f"\nComments: {content}")
        except Exception:
            pass


class SourceEquivalent(BaseEquipment):
    """Source Thevenin equivalent with min/max impedance for fault level conditions."""

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

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.SourceName = self.Node.ID
        self.EqType = cympy.enums.EquipmentType.Substation
        self.EqID = "Source"

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
        if "High" in str(self.Level):
            self.R1, self.X1, self.R0, self.X0 = (
                self.R1min,
                self.X1min,
                self.R0min,
                self.X0min,
            )
        elif "Low" in str(self.Level):
            self.R1, self.X1, self.R0, self.X0 = (
                self.R1max,
                self.X1max,
                self.R0max,
                self.X0max,
            )
        else:
            self.R1 = self.X1 = self.R0 = self.X0 = 0

        self.Nameplate = f"SourceEquivalent: {self.SourceName}"
        self._source_eqt = None
        self._source_device = None

    def _get_source_objects(self) -> None:
        """Load source equipment and device objects from database."""
        try:
            self._source_eqt = Eqt.GetEquipment(self.SourceName, self.EqType)
        except Exception:
            self._source_eqt = None

        try:
            self._source_device = Std.GetDevice(
                self.SourceName, cympy.enums.DeviceType.Source
            )
        except Exception:
            self._source_device = None

    def info_table(self, NETWORK_PARAM: List) -> None:
        """Append source impedance (absolute values) to network table."""

        def _ensure_positive(number: float) -> float:
            """Ensure impedance values are positive for reporting"""
            return abs(number)

        NETWORK_PARAM.append(
            [
                self.Nameplate,
                0,
                0,
                _ensure_positive(self.R1),
                _ensure_positive(self.X1),
                _ensure_positive(self.R0),
                _ensure_positive(self.X0),
                0,
                0,
                0,
                0,
            ]
        )

    def store_info(self, SCReport) -> None:
        """Write source fault level, impedance, and equipment origin to report."""
        SCReport.write(f"\n[{self.Nameplate}]")

        # Display appropriate impedance values based on fault level
        if "Low" in str(self.Level):
            self._store_low_fault_level_info(SCReport)
        elif "High" in str(self.Level):
            self._store_high_fault_level_info(SCReport)

        # Add source comments and details
        self._store_source_comments(SCReport)

    def _store_low_fault_level_info(self, SCReport) -> None:
        """Write max fault level impedances to report."""
        SCReport.write(
            f"\n{'Low Fault Level Z1:':<25} {self.R1max:<8.4f} + j{self.X1max:<8.4f} ohms"
        )
        SCReport.write(
            f"\n{'Low Fault Level Z0:':<25} {self.R0max:<8.4f} + j{self.X0max:<8.4f} ohms"
        )

    def _store_high_fault_level_info(self, SCReport) -> None:
        """Write min fault level impedances to report."""
        SCReport.write(
            f"\n{'High Fault Level Z1:':<25} {self.R1min:<8.4f} + j{self.X1min:<8.4f} ohms"
        )
        SCReport.write(
            f"\n{'High Fault Level Z0:':<25} {self.R0min:<8.4f} + j{self.X0min:<8.4f} ohms"
        )

    def _store_source_comments(self, SCReport) -> None:
        """Write source equipment comments and origin (database, user-defined, or unknown)."""
        self._get_source_objects()
        comments = self._source_eqt.GetValue("Comments") if self._source_eqt else None
        if comments:
            content = TextFormatter.format_text(comments, 80, 26)
            SCReport.write(f"\n{'Comments:':<25} {content}")

        if self._source_device:
            SCReport.write(" Source equivalent from database")
        elif self._source_eqt:
            SCReport.write(" User Defined Source Equivalent")
        else:
            SCReport.write(" Unknown Error")


class FaultPoint(BaseEquipment):
    """Study point with fault currents, impedances, and location (lat/long)."""

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

    def __init__(self, fault_point: str, **kwargs):
        super().__init__(**kwargs)

        fault_data = QueryHelper.query_nodes(self.FAULT_CURRENT_INFO, fault_point)
        self.data = dict(zip(self.FAULT_CURRENT_INFO, fault_data))
        self.TIo = max(self.data["LGamp"], self.data["LLGT"])
        self.TIO_imp = max(self.data["LGampZ"], self.data["LLGTZ"])
        self.EqID = fault_point

    def info_table(self, NETWORK_PARAM: List) -> None:
        """Append fault point location and impedance to network table."""
        NETWORK_PARAM.append(
            [
                f"{self.EqID} (Lat.:{self.data['Latitude']:.5f},Long.:{self.data['Longitude']:.5f})",
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

    def store_info(self, SCReport) -> None:
        """Write bolted and impedance fault currents and prefault voltage to report."""
        SCReport.write(f"\n[{self.EqID}]")
        SCReport.write(
            "\n{:<25} {:<6}{:<6}{:<6}{:<6}{:<6}".format(
                "Faults (amps)", "LLL", "LL", "LLG", "LG", "3Io"
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
        """Build and open fault level form URL with query parameters."""
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

        if primaryForm != "Yes":
            return

        _date = datetime.now().strftime("%Y-%m-%d")
        _prefaultLN = round(self.data["PrefaultVoltage"] / math.sqrt(3), 2)
        _networkID = networkID.replace("_", " ")

        variables = [
            f"customer_name={quote(customerName)}",
            f"service_address={quote(serviceAddress)}",
            f"fault_location={faultLocation}",
            f"equipment_id={EquipmentID}",
            f"network_id={_networkID}",
            f"distance={'{:0.0f}'.format(self.data['Distance'])}",
            f"protection={quote(protection)}",
            f"date={_date}",
            f"LLL={int(round(self.data['LLLamp'], -2))}",
            f"LLG={int(round(self.data['LLGamp'], -2))}",
            f"LL={int(round(self.data['LLamp'], -2))}",
            f"LG={int(round(self.data['LGamp'], -2))}",
            f"R1={'{:.4f}'.format(self.data['R1ohm'])}",
            f"X1={'{:.4f}'.format(self.data['X1ohm'])}",
            f"R0={'{:.4f}'.format(self.data['R0ohm'])}",
            f"X0={'{:.4f}'.format(self.data['X0ohm'])}",
            f"prefault={self.data['PrefaultVoltage']}",
            f"prefaultLN={_prefaultLN}",
            f"engineer={engineer}",
            f"email={email}",
            f"phone={phone}",
        ]

        link = self._PATH + "?" + "&".join(variables)
        print(link)
        ChromeBrowser.open_url(link)


class EmissionStudy:
    """Harmonic/flicker emission study with customer load allocation and feeder limits."""

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
        """Initialize study variables with default (empty/zero) values."""
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
        """Execute full emission study: inputs, parameters, loads, and prepare variables."""
        try:
            self._get_input_parameters()
            self._get_system_parameters()
            self._calculate_loads()
            self._prepare_variables()
        except Exception as e:
            raise RuntimeError(f"Emission study failed: {e}") from e

    def _get_input_parameters(self) -> None:
        """Read study parameters and calculate customer load power factor."""
        inputs = map(cympy.GetInputParameter, self.INPUT_PARAMETERS)
        self.parameters = StudyParameters(*inputs)
        self.power_factor = self.POWER_FACTORS.get(
            str(self.parameters.customer_type), 0.95
        )
        self.customer_load_mva = self.parameters.customer_load_mw / self.power_factor

    def _get_system_parameters(self) -> None:
        """Query feeder voltage and phase count; use defaults if limits unspecified."""
        self.phase_count = cympy.study.QueryInfoNode("PhaseCount", self.poi)
        self.kv_ll = cympy.study.QueryInfoNode("KVLLBase", self.poi)

        if not self.parameters.feeder_limit:
            self.parameters.feeder_limit = self.FEEDER_LIMITS.get(self.kv_ll, 0.0)

    def _calculate_loads(self) -> None:
        """Calculate MV/LV loads and estimated max LV load normalized to feeder limit."""
        spot_loads = cympy.study.ListDevices(self.SPOT_DEV_TYPE, self.feeder_id)
        self._calculate_current_loads(spot_loads)

        total_mva = (
            self.current_load_smv + self.current_load_slv
        ) / 1000 + self.customer_load_mva
        self.slv_percentage = self.current_load_slv / (1000 * total_mva)
        self.estimated_slv = round(
            round(self.slv_percentage, 2) * self.parameters.feeder_limit, 3
        )

    def _calculate_current_loads(self, spot_loads: List) -> None:
        """Sum MV (INT_/PRI_ prefix) and LV spot loads separately."""
        smv_load = slv_load = 0.0

        for spot in spot_loads:
            load_kva = float(
                cympy.study.QueryInfoDevice(
                    "SpotKVAT", spot.DeviceNumber, self.SPOT_DEV_TYPE
                )
            )

            if any(prefix in spot.DeviceNumber for prefix in ["INT_", "PRI_"]):
                smv_load += load_kva
            else:
                slv_load += load_kva

        self.current_load_smv = smv_load
        self.current_load_slv = slv_load

    def _prepare_variables(self) -> None:
        """Build query parameters for emission study web form."""
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
        """Open emission report URL and write results to file."""
        ChromeBrowser.open_url("google.com")
        if not self._variables:
            raise RuntimeError("Study must be run before generating report")

        report_url = self.PATH + "&".join(self._variables)

        time.sleep(2)
        ChromeBrowser.open_url(report_url)

        self._write_report(output_file, report_url)

    def _write_report(self, file, report_url: str) -> None:
        """Write formatted emission study results and URL to file."""
        report_data = self._prepare_report_data(report_url)

        def _print_and_write(content: str) -> None:
            print(content)
            file.write(content)

        _print_and_write("\n" + "=" * 50 + "\n")
        _print_and_write("        EMISSION STUDY REPORT\n")
        _print_and_write("=" * 50 + "\n")

        for label, value in report_data:
            self._write_formatted_line(file, label, value)

    def _prepare_report_data(self, report_url: str) -> List[Tuple[str, str]]:
        """Build list of (label, value) tuples for emission study report."""
        r1, x1, r0, x0 = self.impedance
        return [
            ("Feeder:", self.feeder_id),
            ("Voltage (kV):", f"{self.kv_ll}"),
            ("Impedance R1/X1:", f"{r1}/{x1}"),
            ("Impedance R0/X0:", f"{r0}/{x0}"),
            ("Distance (m):", f"{self.distance}"),
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
            ("Report Link:", self._format_url(report_url)),
        ]

    def _write_formatted_line(self, file, label: str, value: str) -> None:
        """Write label-value pair with consistent 30-char label width."""
        line = f"{label:<30} {value}\n"
        print(line, end="\n")
        file.write(line)

    def _format_url(self, url: str) -> str:
        """Wrap URL for display with 31-char indentation."""
        import textwrap

        return textwrap.fill(
            url,
            80,
            initial_indent="",
            subsequent_indent=" " * 31,
            break_long_words=False,
            break_on_hyphens=False,
        )


class ShortCircuitStudy:
    """Orchestrate short circuit analysis: setup, configuration, simulation, and reporting."""

    # Constants
    ITERATION_UPSTREAM = cympy.enums.IterationOption.Upstream
    ITERATION_STOPONOPEN = cympy.enums.IterationRestriction.StopOnOpen
    LOOP_NODE = cympy.enums.NodeType.Loop
    TABLE_HEADER_FORMAT = "\n{:<56}{:>8}{:>11}{:>9}{:>8}{:>8}{:>8}{:>10}{:>8}{:>8}{:>8}"
    TABLE_ROW_FORMAT = "\n{:<56}{:>8.1f}{:>11.1f}{:>9.4f}{:>8.4f}{:>8.4f}{:>8.4f}{:>10.4f}{:>8.4f}{:>8.4f}{:>8.4f}"
    IMPEDANCE_UNIT = "Ohms"
    PREFAULT_VOLTAGE = ["BaseVoltage", "OperatingVoltage"]
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
        """Initialize study with default impedance, voltage, and fault parameters. Check for network loops."""
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

        self.Rep_Loc = self.Path = ""
        self.Source_R0 = self.Source_X0 = self.Source_R1 = self.Source_X1 = 0
        self.Reactor_X, self.Reactor_I = 0.900, 400
        self.table_header_1 = self.table_header_2 = self.table_separator = ""
        self.source_eq = None
        self.source_dev = None

        # Check for loops in the network
        if len(Std.ListNodes(self.LOOP_NODE)) > 0:
            raise RuntimeError("Error: Loop exists in the loaded circuits")

    def get_inputs(self) -> None:
        """Read fault points and source impedances from user inputs. Validate fault points exist."""
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
        """Initialize network, source equipment, table headers, and report filename."""
        print("- Setup study environment")

        self.NetworkID = Std.QueryInfoNode("$NetworkId$", fault_point)
        self.source_eq = Eqt.GetEquipment(
            self.NetworkID, cympy.enums.EquipmentType.Substation
        )
        self.SourceName = (
            Std.QueryInfoNode("$UpstreamSourceNodeID$", fault_point) or self.NetworkID
        )

        # Set LEN_UNIT from App.GetKeyword
        self.LEN_UNIT = App.GetKeyword("Length").Unit

        self._setup_table_headers()
        self._get_file_name(self.SourceName)

    def _setup_table_headers(self) -> None:
        """Build report table headers with network, distance, and impedance columns."""
        self.table_header_1 = "\n{:<56}{:>8}{:>11}  |{:-^31}||{:-^31}|".format(
            f"Circuits: {self.NetworkID}",
            f"{self.LEN_UNIT}",
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

        self.table_separator = "\n" + "—" * (len(self.table_header_1) - 1)

    def _get_file_name(self, source_name: str) -> None:
        """Generate time-stamped report filename."""
        current_datetime = datetime.now().strftime("%Y-%m-%d-h%Hm%Ms%S")
        file_name = f"SC-Report-{source_name}-{current_datetime}.txt"
        self.Rep_Loc = os.path.join(str(self.Path), file_name)

    def set_source_equivalent(self) -> None:
        """Configure source voltages, impedances, and series reactor from calculated/input values."""
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
        """Build list of (value, property_path) tuples for source configuration."""
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
        """Update reactor ID and validate/set rated current and reactance."""
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
        """Setup short circuit simulation: network selection, configuration, and fault impedance."""
        print("- Config short circuit study")
        self.NETWORK_PARAM = []
        self.EQUIP_LIST = []

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
        """Find active configuration ID in the list and return its index."""
        active_config_id = self.SC_Sim.GetValue("ActiveConfigurationID")
        for i in range(config_count):
            if active_config_id == self.SC_Sim.GetValue(
                f"ParametersConfigurations[{i}].ConfigID"
            ):
                return i
        return 0

    def _create_sc_set_list(self, config: int) -> List[Tuple[Any, str]]:
        """Build list of (value, property_path) tuples for short circuit configuration."""
        pretxt = f"ParametersConfigurations[{config}]."
        return [
            (self.LGFaultResistance, f"{pretxt}LGFaultResistanceOHMS"),
            (self.LGFaultReactance, f"{pretxt}LGFaultReactanceOHMS"),
            (self.LLLFaultResistance, f"{pretxt}LLLFaultResistanceOHMS"),
            (self.LLLFaultReactance, f"{pretxt}LLLFaultReactanceOHMS"),
            (self.PREFAULT_VOLTAGE[0], f"{pretxt}PreFaultVoltage"),
        ]

    def store_info(self, SCReport) -> None:
        """Write bolted and impedance fault resistance and reactance to report."""
        SCReport.write("\n{:<25} {:<8}{:<8}".format("Fault Impedance (ohms)", "R", "X"))

        fault_impedances = [
            (self.LLLFaultResistance, self.LLLFaultReactance, "Zf-LLL:"),
            (self.LGFaultResistance, self.LGFaultReactance, "Zf-LG:"),
        ]

        for resistance, reactance, label in fault_impedances:
            SCReport.write(
                "\n{:<25} {:<8.1f}{:<8.1f}".format(label, resistance, reactance)
            )

    def query_table(self, fromNode: Any, toNode: Any) -> Tuple[List[Any], List[Any]]:
        """Query impedance and distance data from both nodes. Return (fromNode, toNode) data."""
        info_toNode = QueryHelper.query_nodes(self.TABLE_VARIABLES, toNode.ID)
        info_fromNode = QueryHelper.query_nodes(self.TABLE_VARIABLES, fromNode.ID)
        return info_fromNode, info_toNode

    def feeder_mode(self, fault_point: Any) -> None:
        """Traverse network and configure cable/line equipment for new feeder setup."""
        iterator = Std.NetworkIterator(
            fault_point, self.ITERATION_UPSTREAM, self.ITERATION_STOPONOPEN
        )

        while iterator.Next():
            for Device in iterator.GetDevices():
                self._configure_device_line(Device)

    def _configure_device_line(self, Device: Any) -> None:
        """Set standard cable/line ID based on device type and phase count."""
        MainLine, PhaseCount = QueryHelper.query_devices(
            ["IsMainLine", "PhaseCount"], Device.DeviceNumber, Device.DeviceType
        )

        if Device.DeviceType == 11 and MainLine == "Yes" and PhaseCount == "3":
            Device.SetValue("3P_336.4_ASC", "LineID")
        elif Device.DeviceType == 10 and MainLine == "Yes":
            self._configure_cable_device(Device, PhaseCount)

    def _configure_cable_device(self, Device: Any, PhaseCount: str) -> None:
        """Set cable ID based on phase count and equipment ID prefix."""
        equipment_id = Device.EquipmentID
        if PhaseCount == "3" and not any(
            equipment_id.startswith(prefix)
            for prefix in ["3P_G16", "3P_G13", "3P_G14", "3P_G17"]
        ):
            Device.SetValue("3P_G15_-_1/C_500_KCM_CU_25_KV_XLPE", "CableID")
        elif not equipment_id.startswith("3P_G4"):
            Device.SetValue("3P_G4_-_1/C_#4/0_AWG_AL_25_KV_XLPE", "CableID")

    def make_report(self, file, NETWORK_PARAM: list, EQUIP_LIST: list) -> None:
        """Write complete short circuit study report with network path and equipment details."""
        print(f"- Results Text File: {self.Rep_Loc}")

        def _print_and_write(content: str) -> None:
            print(content)
            file.write(content)

        _print_and_write("\n" + "=" * 50 + "\n")
        _print_and_write("        FAULT STUDY REPORT\n")
        _print_and_write("=" * 50 + "\n")

        _print_and_write(self.table_separator)
        _print_and_write(self.table_header_1)
        _print_and_write(self.table_header_2)
        _print_and_write(self.table_separator)

        for param in NETWORK_PARAM:
            if "INT_WIRE" not in param[0]:
                _print_and_write(self.TABLE_ROW_FORMAT.format(*param))

        _print_and_write(self.table_separator)
        self.store_info(file)
        file.write(self.table_separator)

        for eq in EQUIP_LIST:
            eq[1].store_info(file)
            file.write(self.table_separator)


def device_handler(short_circuit_study, device_obj, Node, FromNode, Phase, FromPhase):
    """Route device to appropriate equipment class, query impedance, add to study."""
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

    info_fromNode, info_toNode = short_circuit_study.query_table(FromNode, Node)

    handler = device_handlers.get(device_obj.DeviceType)
    if handler:
        Dev = handler(
            Device=device_obj,
            info_toNode=info_toNode,
            info_fromNode=info_fromNode,
            toPhase=Phase,
            fromPhase=FromPhase,
        )
        Dev.eq_data(short_circuit_study.EQUIP_LIST)
        Dev.info_table(short_circuit_study.NETWORK_PARAM)


def main():
    """Run complete short circuit analysis for all fault points with optional emission studies."""
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

        SC.SC_Sim.Run()

        # Fault Point
        FP = FaultPoint(fault_point_id)
        FP.info_table(SC.NETWORK_PARAM)
        FP.eq_data(SC.EQUIP_LIST)

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

            if DeviceList:
                for Device in DeviceList:
                    device_handler(SC, Device, Node, FromNode, Phase, FromPhase)

            if Std.QueryInfoNode("IsSourceNode", Node.ID) == "Yes":
                source = SourceEquivalent(Node=Node)
                source.eq_data(SC.EQUIP_LIST)
                source.info_table(SC.NETWORK_PARAM)

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
                SC.make_report(report_file, SC.NETWORK_PARAM, SC.EQUIP_LIST)
                if ES.parameters.emission == "Yes":
                    ES.generate_report(report_file)

            FP.generate_form(SC.NetworkID)
            print(SC.table_separator)

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
