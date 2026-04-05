# Short Circuit Report Script
# Version 1.8 - Revised 2025-04-24 by Paul Therrien to improve From/To Node determination by using Upstream/Downstream keywords. Also added script exit when loop sections exist.
# Version 1.7 - Revised 2023-06-21 by Paul Therrien and Justin Lee to correct the generator warning code
# Version 1.6 - Revised 2022-Sep-08 by Kan Tang and Paul Therrien to improve the iterator restriction related to normal open loops
# Version 1.5 - Revised 2022-Jun-01 by Paul Therrien to correct code regarding open loop sections. Also added code to force calculation mode to Short-Circuit from Fault Flow
# 			   Corrected issue when there's only one Short-Circuit Config setup
# Version 1.4 - Revised 2021-Nov-09 by Paul Therrien to correct issues with iterating past open loop sections also changed the report filename to not include the underscore character
# Version 1.3 - Revised 2021-Jun-16 by Paul Therrien and Kan Tang to add in By-Phase Transformers as well as other minor code updates
# Version 1.2 - Revised 2020-Nov-20 by Kan Tang and Paul Therrien to correct Source Equivalent issue when User Defined Equivalent impedances are used. Also removed 'INT_WIRE' entries
# 			   printing out in the console and the text file.
# Version 1.1 - Revised 2020-Oct-30 by Paul Therrien to correct 1ph OH line and 1ph cable device impedance calculation
# Version 1.0 - Created 2020-Oct-14 by Paul Therrien


Report_Name = "Short Circuit Report - BCH v1.8"


# This script will trace and list out all of the series impedance devices between a node indentified
# as 'FAULT_POINT', up to the source node. The results will be dumped into a txt file.
############################################################################################################################################################
######## Added for Emission Study###########################################################################################################################
import cympy
import time
import webbrowser
import os
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from urllib.parse import urlencode, quote


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

        self.slv_percentage = self.current_load_slv / (1000 * total_mva)
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

            if any(prefix in spot.DeviceNumber for prefix in ["INT_", "PRI_"]):
                smv_load += load_kva
            else:
                slv_load += load_kva

        self.current_load_smv = smv_load
        self.current_load_slv = slv_load

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
        browser.open_new("google.com")
        time.sleep(2)
        browser.open(report_url, new=0)

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
            ("Percentage of LV Load (%):", f"{round(self.slv_percentage * 100)}"),
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


def FaultForm(LLL, LLG, LL, LG, PreFaultVolts, R1, X1, R0, X0):
    _PATH = r"https://hydroshare.bchydro.bc.ca/sites/de/SiteAssets/html/fault_level_form.html"
    PROT_TYPE = {
        "New Device - Proposed Settings": "new_proposed",
        "Existing Device - Proposed Settings": "existing_proposed",
        "Existing Device - Existing Settings": "existing_existing",
    }
    input_params = [
        "Customer_Name",
        "Service_Address",
        "Fault_Location",
        "Protection_Type",
        "Device_Type",
        "Device_ID",
        "Settings_Text",
        "Engineer",
        "Email_Address",
        "Phone_Number",
        "Primary_Form",
    ]

    inputs = map(cympy.GetInputParameter, input_params)

    (
        customerName,
        serviceAddress,
        faultLocation,
        protectionType,
        deviceType,
        deviceID,
        settings,
        engineer,
        email,
        phone,
        primaryForm,
    ) = inputs

    if primaryForm != "Yes":
        return

    """Generate a fault level report form URL with the given parameters"""
    _params = {
        "customer_name": customerName,
        "service_address": serviceAddress,
        "fault_location": faultLocation,
        "protection_type": PROT_TYPE.get(protectionType, ""),
        "device_type": deviceType,
        "device_id": deviceID,
        "settings_text": settings,
        "engineer": engineer,
        "email_address": email,
        "phone_number": phone,
        "date_issued": datetime.now().strftime("%Y-%m-%d"),
        "LLL": int(round(LLL, -2)),
        "LLG": int(round(LLG, -2)),
        "LL": int(round(LL, -2)),
        "LG": int(round(LG, -2)),
        "R1": "{:.4f}".format(R1),
        "X1": "{:.4f}".format(X1),
        "R0": "{:.4f}".format(R0),
        "X0": "{:.4f}".format(X0),
        "prefault": PreFaultVolts,
    }

    query_string = urlencode(_params, quote_via=quote)

    link = f"{_PATH}?{query_string}"
    browser = get_chrome()
    browser.open_new(link)


############################################################################################################################################################
############################################################################################################################################################


# Ensure that a node called "FAULT_POINT" exists, if not bypass script
if cympy.study.QueryInfoNode("$NodeId$", "FAULT_POINT") == "":
    print('ERROR: Could not find node with name "FAULT_POINT"')
else:
    import math
    import os

    from datetime import datetime

    now = datetime.now()
    current_datetime = now.strftime("%Y-%m-%d-h%Hm%Ms%S")

    network_id = cympy.study.QueryInfoNode("$NetworkId$", "FAULT_POINT")
    # Check to see if loop sections exist on circuit. If so exit script.
    if len(cympy.study.ListNodes(cympy.enums.NodeType.Loop, network_id)) > 0:
        print(
            "ERROR: Circuit " + network_id + " contains loop sections. Script aborted."
        )
        exit()

    Source_Name = (
        cympy.study.QueryInfoNode("$UpstreamSource$", "FAULT_POINT") or network_id
    )  # Keyword $UpstreamSource$ doesn't work when using a 'User Defined Equivalent' Source Type (causes a crash in Cyme 8.2)

    Source_Name_filename = Source_Name.replace(
        "_", "-"
    )  # remove the underscore from the network id to align with BCH file name requirements
    Report_FileName = (
        "SC Report " + Source_Name_filename + " " + current_datetime + ".txt"
    )
    Rep_Loc = cympy.GetInputParameter("Report_Location") + Report_FileName

    if os.path.exists(
        Rep_Loc
    ):  # in case report text file already exists, delete all file contents
        textfile = open(Rep_Loc, "r+")
        textfile.seek(0)  # absolute file positioning
        textfile.truncate()  # to erase all data
        textfile.close()

    units = cympy.env.SystemOfUnits  # 0 for metric and 1 for imperial
    UnitSize = cympy.env.LengthOfUnits  # 0 for feet/meter and 1 for mile/km
    UnitText = []
    UnitText.append(["m", "km"])
    UnitText.append(["ft", "miles"])

    # Create List: NetworkParam [Line Type, Line Length, Distance of section upstream node to sub,
    # 			  Total Section R1, Total Section X1, Total Section R0, Total Section X0,
    # 	          Thevenin R1, Thevenin X1Thevenin R0, Thevenin X0]
    # used for the entire upstream network parameters, will store a list of lists
    NetworkParam = []
    # used to inventory all devices by equipment ID (OH Lines, Cables, Step up/down xfmrs, reactors, sources)
    EquipmentList = []

    # Append list header
    NetworkParam.append(
        [
            "Equipment Type",
            "Length(m)",
            "Dist. to Sub(" + UnitText[units][UnitSize] + ")",
            "R1",
            "X1",
            "R0",
            "X0",
            "Thev_R1",
            "Thev_X1",
            "Thev_R0",
            "Thev_X0",
        ]
    )

    # Run Short Circuit Analysis and capture short circuit parameters and all the fault information at the fault point
    sc = cympy.sim.ShortCircuit()
    i = 0  # iterator to determine which SC configuration is the active one
    if (
        int(sc.GetValue("ParametersConfigurations")) > 1
    ):  # if there's more than one Short-Circuit Configuration setup
        while sc.GetValue("ActiveConfigurationID") != sc.GetValue(
            "ParametersConfigurations[" + str(i) + "].ConfigID"
        ):
            i += 1
    # The short circuit analysis can only be run in the Short-Circuit calculation mode, not the Fault Flow mode
    # This if statement forces the mode to be Short-Circuit in the case where the active configuration is setup for Fault Flow
    if sc.GetValue("ParametersConfigurations[" + str(i) + "].Domain") == "FF":
        sc.SetValue(
            "SC", "ParametersConfigurations[" + str(i) + "].Domain"
        )  # Change analysis mode to Short-Circuit
    sc.Run()
    LLL_max = cympy.study.QueryInfoNode("LLLamp", "FAULT_POINT")
    LG_max = cympy.study.QueryInfoNode("LGamp", "FAULT_POINT")
    LL_max = cympy.study.QueryInfoNode("LLamp", "FAULT_POINT")
    LLG_max = cympy.study.QueryInfoNode("LLGamp", "FAULT_POINT")
    LLL_imp = cympy.study.QueryInfoNode("LLLampZ", "FAULT_POINT")
    LG_imp = cympy.study.QueryInfoNode("LGampZ", "FAULT_POINT")
    LL_imp = cympy.study.QueryInfoNode("LLampZ", "FAULT_POINT")
    LLG_imp = cympy.study.QueryInfoNode("LLGampZ", "FAULT_POINT")

    LG_Fault_Resistance = sc.GetValue(
        "ParametersConfigurations[" + str(i) + "].LGFaultResistanceOHMS"
    )
    LG_Fault_Reactance = sc.GetValue(
        "ParametersConfigurations[" + str(i) + "].LGFaultReactanceOHMS"
    )
    LLL_Fault_Resistance = sc.GetValue(
        "ParametersConfigurations[" + str(i) + "].LLLFaultResistanceOHMS"
    )
    LLL_Fault_Reactance = sc.GetValue(
        "ParametersConfigurations[" + str(i) + "].LLLFaultReactanceOHMS"
    )
    PreFaultVolts = cympy.study.QueryInfoNode("$PrefaultVoltage$", "FAULT_POINT")

    # Thev. Imp. at fault point
    R1ohm = float(cympy.study.QueryInfoNode("$R1ohm$", "FAULT_POINT"))
    X1ohm = float(cympy.study.QueryInfoNode("$X1ohm$", "FAULT_POINT"))
    R0ohm = float(cympy.study.QueryInfoNode("$R0ohm$", "FAULT_POINT"))
    X0ohm = float(cympy.study.QueryInfoNode("$X0ohm$", "FAULT_POINT"))
    Fault_to_Sub_Dist = float(cympy.study.QueryInfoNode("$Distance$", "FAULT_POINT", 3))
    XCoord = cympy.study.QueryInfoNode("$CoordX$", "FAULT_POINT")
    YCoord = cympy.study.QueryInfoNode("$CoordY$", "FAULT_POINT")
    NetworkParam.append(
        [
            "Fault Point (XCoord:" + str(XCoord) + " YCoord:" + str(YCoord) + ")",
            0,
            Fault_to_Sub_Dist,
            0,
            0,
            0,
            0,
            R1ohm,
            X1ohm,
            R0ohm,
            X0ohm,
        ]
    )
    i = 1  # NetworkParam list iterator, i=1 is the FAULT_POINT entry
    Dist_to_Sub = Fault_to_Sub_Dist

    ############################################################################################################################################################
    ######## Added for Emission Study#############################################
    study = EmissionStudy(
        "FAULT_POINT", network_id, Dist_to_Sub, R1ohm, X1ohm, R0ohm, X0ohm
    )

    FaultForm(
        LLL_max, LLG_max, LL_max, LG_max, PreFaultVolts, R1ohm, X1ohm, R0ohm, X0ohm
    )
    ############################################################################################################################################################
    ############################################################################################################################################################

    # Show a warning on the console printout if a generator exists on the circuit. The script will still run though.
    if (
        len(
            cympy.study.ListDevices(
                cympy.enums.DeviceType.SynchronousGenerator, network_id
            )
        )
        > 0
        or len(
            cympy.study.ListDevices(
                cympy.enums.DeviceType.InductionGenerator, network_id
            )
        )
        > 0
        or len(
            cympy.study.ListDevices(
                cympy.enums.DeviceType.ElectronicConverterGenerator, network_id
            )
        )
        > 0
    ):
        print("**WARNING**")
        print("A generator is present on circuit " + network_id + ".")
        print("The results of this script should not be used.")

    # Iterator will start at 'FAULT_POINT' node and step upstream section by section until it hits the source node
    # The restriction StopOnOpen will prevent the iterator from iterating through normal open loops that start and end on the main line (ie. line from fault_point to source node).
    iterator = cympy.study.NetworkIterator(
        "FAULT_POINT",
        cympy.enums.IterationOption.Upstream,
        cympy.enums.IterationRestriction.StopOnOpen,
    )
    while iterator.Next():
        Sections = iterator.GetSection()
        DeviceList = cympy.study.ListDevices(
            cympy.enums.DeviceType.AllDevices, ".*", "^" + Sections.ID + "$"
        )  # list of all device attached to the section in the current iteration

        # this for loop is used to rearrange the DeviceList list so that Xfmrs or Reactors at the To Node
        # are first in the list and Xfmrs or Reactors at the From Node are last in the list
        # this is to ensure that the correct portion of either OH or UG line is summed on the correct side of the Xfmr/reactor
        for Device in DeviceList:
            if (
                Device.DeviceType == 1
                or Device.DeviceType == 33
                or Device.DeviceType == 42
                or Device.DeviceType == 9
            ):  # Transformer, by-phase transformer, autotransformer, or series reactor
                if (
                    Device.Location == 0 or Device.Location == 1
                    # if device is at From node (source side of section) or in the middle of the section
                ):
                    DeviceList.append(
                        DeviceList.pop(DeviceList.index(Device))
                    )  # move to end of list
                elif (
                    Device.Location == 2
                ):  # if device is at To node (load side of section)
                    DeviceList.insert(
                        0, DeviceList.pop(DeviceList.index(Device))
                    )  # move to start of list

        # this for loop is used to build the NetworkParam list entries for each type of Equipment
        # of importance. It's also used to build the EquipmentList
        for Device in DeviceList:
            UpstreamNode = cympy.study.QueryInfoDevice(
                "$UpstreamNodeId$", Device.DeviceNumber, Device.DeviceType
            )
            DownstreamNode = cympy.study.QueryInfoDevice(
                "$DownstreamNodeId$", Device.DeviceNumber, Device.DeviceType
            )
            # Thevenin Impedance at Load side of current Section
            R1ohm = float(cympy.study.QueryInfoNode("$R1ohm$", DownstreamNode))
            X1ohm = float(cympy.study.QueryInfoNode("$X1ohm$", DownstreamNode))
            R0ohm = float(cympy.study.QueryInfoNode("$R0ohm$", DownstreamNode))
            X0ohm = float(cympy.study.QueryInfoNode("$X0ohm$", DownstreamNode))

            if (
                Device.DeviceType == 1 or Device.DeviceType == 42
            ):  # Two-Winding Step up/down Transformer and Autotransformers
                XfmrType = cympy.study.QueryInfoDevice(
                    "$EqCode$", Device.DeviceNumber, Device.DeviceType
                )
                XfmrID = cympy.study.QueryInfoDevice(
                    "$EqId$", Device.DeviceNumber, Device.DeviceType
                )
                XfmrKVA = float(
                    cympy.study.QueryInfoDevice(
                        "$XfoKVANomTot$", Device.DeviceNumber, Device.DeviceType
                    )
                )
                Z1per = float(
                    cympy.study.QueryInfoDevice(
                        "$XfoZ1$", Device.DeviceNumber, Device.DeviceType
                    )
                )
                Z0per = float(
                    cympy.study.QueryInfoDevice(
                        "$XfoZ0$", Device.DeviceNumber, Device.DeviceType
                    )
                )
                X1R1 = float(
                    cympy.study.QueryInfoDevice(
                        "$XfoX1R1Ratio$", Device.DeviceNumber, Device.DeviceType
                    )
                )
                X0R0 = float(
                    cympy.study.QueryInfoDevice(
                        "$XfoX0R0Ratio$", Device.DeviceNumber, Device.DeviceType
                    )
                )
                PrimVolts = float(
                    cympy.study.QueryInfoDevice(
                        "$XfoKVLL1$", Device.DeviceNumber, Device.DeviceType
                    )
                )
                SecVolts = float(
                    cympy.study.QueryInfoDevice(
                        "$XfoKVLL2$", Device.DeviceNumber, Device.DeviceType
                    )
                )
                XfZ1ohms_Mag = (Z1per * SecVolts * SecVolts * 10) / XfmrKVA
                XfZ0ohms_Mag = (Z0per * SecVolts * SecVolts * 10) / XfmrKVA
                R1 = math.sqrt(XfZ1ohms_Mag * XfZ1ohms_Mag / (1 + (X1R1 * X1R1)))
                X1 = X1R1 * R1
                R0 = math.sqrt(XfZ0ohms_Mag * XfZ0ohms_Mag / (1 + (X0R0 * X0R0)))
                X0 = X0R0 * R0
                EquipmentList.append(
                    [Device.EquipmentID, Device.DeviceType, Device.DeviceNumber]
                )
                NetworkParam.append(
                    [
                        str(XfmrType) + ": " + str(XfmrID),
                        0.0,
                        Dist_to_Sub,
                        R1,
                        X1,
                        R0,
                        X0,
                        R1ohm,
                        X1ohm,
                        R0ohm,
                        X0ohm,
                    ]
                )
                i = i + 1

            elif Device.DeviceType == 33:  # By-Phase Transformer
                XfmrType = cympy.study.QueryInfoDevice(
                    "$EqCode$", Device.DeviceNumber, Device.DeviceType
                )
                XfmrIDA = cympy.study.QueryInfoDevice(
                    "$XfoByPhaseEqIdA$", Device.DeviceNumber, Device.DeviceType
                )
                XfmrIDB = cympy.study.QueryInfoDevice(
                    "$XfoByPhaseEqIdB$", Device.DeviceNumber, Device.DeviceType
                )
                XfmrIDC = cympy.study.QueryInfoDevice(
                    "$XfoByPhaseEqIdC$", Device.DeviceNumber, Device.DeviceType
                )
                XfmrKVA = float(
                    cympy.study.QueryInfoDevice(
                        "$XfoByPhaseKVANomTot$", Device.DeviceNumber, Device.DeviceType
                    )
                )
                Z1per = float(
                    cympy.study.QueryInfoDevice(
                        "$XfoByPhaseZ1$", Device.DeviceNumber, Device.DeviceType
                    )
                )
                Z0per = float(
                    cympy.study.QueryInfoDevice(
                        "$XfoByPhaseZ0$", Device.DeviceNumber, Device.DeviceType
                    )
                )
                X1R1 = float(
                    cympy.study.QueryInfoDevice(
                        "$XfoByPhaseX1R1Ratio$", Device.DeviceNumber, Device.DeviceType
                    )
                )
                X0R0 = float(
                    cympy.study.QueryInfoDevice(
                        "$XfoByPhaseX0R0Ratio$", Device.DeviceNumber, Device.DeviceType
                    )
                )
                PrimVolts = float(
                    cympy.study.QueryInfoDevice(
                        "$XfoByPhaseKvPrimA$", Device.DeviceNumber, Device.DeviceType
                    )
                )
                SecVolts = float(
                    cympy.study.QueryInfoDevice(
                        "$XfoByPhaseKvSecA$", Device.DeviceNumber, Device.DeviceType
                    )
                )
                XfZ1ohms_Mag = (Z1per * SecVolts * SecVolts * 10) / XfmrKVA
                XfZ0ohms_Mag = (Z0per * SecVolts * SecVolts * 10) / XfmrKVA
                R1 = math.sqrt(XfZ1ohms_Mag * XfZ1ohms_Mag / (1 + (X1R1 * X1R1)))
                X1 = X1R1 * R1
                R0 = math.sqrt(XfZ0ohms_Mag * XfZ0ohms_Mag / (1 + (X0R0 * X0R0)))
                X0 = X0R0 * R0
                EquipmentList.append(
                    ["By-Phase Xfmr", Device.DeviceType, Device.DeviceNumber]
                )
                NetworkParam.append(
                    [
                        str(XfmrType)
                        + ": A:"
                        + str(XfmrIDA)
                        + " B:"
                        + str(XfmrIDB)
                        + " C:"
                        + str(XfmrIDC),
                        0.0,
                        Dist_to_Sub,
                        R1,
                        X1,
                        R0,
                        X0,
                        R1ohm,
                        X1ohm,
                        R0ohm,
                        X0ohm,
                    ]
                )
                i = i + 1

            elif Device.DeviceType == 9:  # Series Reactor
                R1 = R1ohm - float(cympy.study.QueryInfoNode("$R1ohm$", UpstreamNode))
                X1 = X1ohm - float(cympy.study.QueryInfoNode("$X1ohm$", UpstreamNode))
                R0 = (
                    R0ohm - float(cympy.study.QueryInfoNode("$R0ohm$", UpstreamNode))
                )  # calculate the impedance difference between DownstreamNode and UpstreamNode
                X0 = X0ohm - float(cympy.study.QueryInfoNode("$X0ohm$", UpstreamNode))
                # it was found that the feeder series reactors were showing up two times in two different sections in the interator
                # this if statement overwrites the first reactor (the one that's one section downstream) with the second reactor parameters
                if any(
                    Device.DeviceNumber in Eq for Eq in EquipmentList
                ) and NetworkParam[i][0] == (
                    "Series Reactor: " + str(Device.EquipmentID)
                ):
                    NetworkParam[i][3] = (
                        R1  # assumes the duplicate reactor is within the previously iterated section
                    )
                    NetworkParam[i][4] = X1  # overwrite the impedance data
                    NetworkParam[i][5] = R0
                    NetworkParam[i][6] = X0
                    NetworkParam[i][7] = R1ohm
                    NetworkParam[i][8] = X1ohm
                    NetworkParam[i][9] = R0ohm
                    NetworkParam[i][10] = X0ohm
                else:
                    EquipmentList.append(
                        [Device.EquipmentID, Device.DeviceType, Device.DeviceNumber]
                    )
                    NetworkParam.append(
                        [
                            "Series Reactor: " + str(Device.EquipmentID),
                            0,
                            0,
                            R1,
                            X1,
                            R0,
                            X0,
                            R1ohm,
                            X1ohm,
                            R0ohm,
                            X0ohm,
                        ]
                    )
                    i = i + 1

            elif Device.DeviceType == 10:  # UG Cable
                LineID = "UG Cable: " + str(Device.EquipmentID)
                Length = Sections.Length
                Dist_to_Sub = float(
                    cympy.study.QueryInfoNode("$Distance$", UpstreamNode, 3)
                )

                if (
                    cympy.study.QueryInfoDevice(
                        "$PhaseCount$", Device.DeviceNumber, Device.DeviceType
                    )
                    == "1"
                ):  # calculate the impedance at the UpstreamNode
                    # 1ph cable impedances
                    R1FN = float(cympy.study.QueryInfoNode("$R1ohm$", UpstreamNode))
                    X1FN = float(cympy.study.QueryInfoNode("$X1ohm$", UpstreamNode))
                    R0FN = float(cympy.study.QueryInfoNode("$R0ohm$", UpstreamNode))
                    X0FN = float(cympy.study.QueryInfoNode("$X0ohm$", UpstreamNode))
                    R1 = (R1FN + R1FN + R0FN) / 3
                    X1 = (X1FN + X1FN + X0FN) / 3
                    R0 = (R1FN + R1FN + R0FN) / 3
                    X0 = (X1FN + X1FN + X0FN) / 3
                else:  # 2ph and 3ph cable impedances
                    R1 = float(cympy.study.QueryInfoNode("$R1ohm$", UpstreamNode))
                    X1 = float(cympy.study.QueryInfoNode("$X1ohm$", UpstreamNode))
                    R0 = float(cympy.study.QueryInfoNode("$R0ohm$", UpstreamNode))
                    X0 = float(cympy.study.QueryInfoNode("$X0ohm$", UpstreamNode))

                if NetworkParam[i][0] == LineID:  # same as last section
                    NetworkParam[i][1] = NetworkParam[i][1] + Length
                    NetworkParam[i][2] = Dist_to_Sub
                    NetworkParam[i][3] = NetworkParam[i][7] - R1
                    NetworkParam[i][4] = NetworkParam[i][8] - X1
                    NetworkParam[i][5] = NetworkParam[i][9] - R0
                    NetworkParam[i][6] = NetworkParam[i][10] - X0
                elif NetworkParam[i][0] != LineID:  # different than last section
                    # if UG cable type doesn't already exist in the EquipmentList, add it to the list
                    if not (any(Device.EquipmentID in Eq for Eq in EquipmentList)):
                        EquipmentList.append([Device.EquipmentID, Device.DeviceType])
                    NetworkParam.append(
                        [
                            LineID,
                            Length,
                            Dist_to_Sub,
                            R1ohm - R1,
                            X1ohm - X1,
                            R0ohm - R0,
                            X0ohm - X0,
                            R1ohm,
                            X1ohm,
                            R0ohm,
                            X0ohm,
                        ]
                    )
                    i = i + 1
                else:
                    print("ERROR with UG cable section")

            elif Device.DeviceType == 11:  # OH Line
                LineID = "OH Line: " + str(Device.EquipmentID)
                Length = Sections.Length
                Dist_to_Sub = float(
                    cympy.study.QueryInfoNode("$Distance$", UpstreamNode, 3)
                )
                if (
                    cympy.study.QueryInfoDevice(
                        "$PhaseCount$", Device.DeviceNumber, Device.DeviceType
                    )
                    == "1"
                ):  # calculate the impedance at the From node
                    # 1ph oh line impedances
                    R1FN = float(cympy.study.QueryInfoNode("$R1ohm$", UpstreamNode))
                    X1FN = float(cympy.study.QueryInfoNode("$X1ohm$", UpstreamNode))
                    R0FN = float(cympy.study.QueryInfoNode("$R0ohm$", UpstreamNode))
                    X0FN = float(cympy.study.QueryInfoNode("$X0ohm$", UpstreamNode))
                    R1 = (R1FN + R1FN + R0FN) / 3
                    X1 = (X1FN + X1FN + X0FN) / 3
                    R0 = (R1FN + R1FN + R0FN) / 3
                    X0 = (X1FN + X1FN + X0FN) / 3
                else:  # 2ph and 3ph oh line impedances
                    R1 = float(cympy.study.QueryInfoNode("$R1ohm$", UpstreamNode))
                    X1 = float(cympy.study.QueryInfoNode("$X1ohm$", UpstreamNode))
                    R0 = float(cympy.study.QueryInfoNode("$R0ohm$", UpstreamNode))
                    X0 = float(cympy.study.QueryInfoNode("$X0ohm$", UpstreamNode))

                if (
                    NetworkParam[i][0] == LineID
                ):  # same as the last section so continue to sum
                    NetworkParam[i][1] = NetworkParam[i][1] + Length
                    NetworkParam[i][2] = Dist_to_Sub
                    NetworkParam[i][3] = NetworkParam[i][7] - R1
                    NetworkParam[i][4] = NetworkParam[i][8] - X1
                    NetworkParam[i][5] = NetworkParam[i][9] - R0
                    NetworkParam[i][6] = NetworkParam[i][10] - X0
                elif NetworkParam[i][0] != LineID:
                    # if the OH line type doesn't already exist in the EquipmentList, append it to the list
                    if not (any(Device.EquipmentID in Eq for Eq in EquipmentList)):
                        EquipmentList.append([Device.EquipmentID, Device.DeviceType])
                    NetworkParam.append(
                        [
                            LineID,
                            Length,
                            Dist_to_Sub,
                            R1ohm - R1,
                            X1ohm - X1,
                            R0ohm - R0,
                            X0ohm - X0,
                            R1ohm,
                            X1ohm,
                            R0ohm,
                            X0ohm,
                        ]
                    )
                    i = i + 1
                else:
                    print("ERROR with OH Line section")
        # ^^^^^^For Loop through DeviceList^^^^^^^^

        # Once iterator reaches the source node break out of while loop
        # instances were found where the iterator continued back to points where there were loops
        if (
            cympy.study.QueryInfoNode("$IsSourceNode$", Sections.FromNode.ID) == "Yes"
            or cympy.study.QueryInfoNode("$IsSourceNode$", Sections.ToNode.ID) == "Yes"
        ):
            # print("Iterator at source node")
            break

    # ^^^^^^^^Iterator While Loop^^^^^^^

    # Thevenin Impedance of Source Node
    R1ohm = float(cympy.study.QueryInfoNode("$R1ohm$", Sections.FromNode.ID))
    X1ohm = float(cympy.study.QueryInfoNode("$X1ohm$", Sections.FromNode.ID))
    R0ohm = float(cympy.study.QueryInfoNode("$R0ohm$", Sections.FromNode.ID))
    X0ohm = float(cympy.study.QueryInfoNode("$X0ohm$", Sections.FromNode.ID))

    Level = cympy.study.QueryInfoNode(
        "$SourceFaultLevel$", Sections.FromNode.ID
    )  # Source Equivalent Fault Level Used (ie. high or low)

    EquipmentList.append([Source_Name, "Source"])
    NetworkParam.append(
        [
            "Source Equivalent: " + str(Source_Name),
            0,
            0,
            R1ohm,
            X1ohm,
            R0ohm,
            X0ohm,
            R1ohm,
            X1ohm,
            R0ohm,
            X0ohm,
        ]
    )

    # print out the NetworkParam entries as a table to the Cyme console and the Report text file
    textfile = open(Rep_Loc, "w")
    textfile.write(str(Report_Name) + "\n")
    textfile.write(
        "Circuit: "
        + str(network_id)
        + "          |---Device Impedance (ohms)--||From Load side of Device (ohms)|"
    )
    print(Report_Name)
    print(
        "Circuit: "
        + str(network_id)
        + "	          |---Device Impedance (ohms)--||---From Load side of Device---|"
    )

    separator = "-" * 89
    for row in NetworkParam:
        if (row[0] != NetworkParam[0][0]) and (
            not "INT_WIRE" in row[0]
        ):  # not the header row and not an 'INT_WIRE' cable section
            print(row[0])
            print(
                "{:<10.2f}{:<15.1f}{:>8.4f}{:>8.4f}{:>8.4f}{:>8.4f}{:>8.4f}{:>8.4f}{:>8.4f}{:>8.4f}".format(
                    row[1],
                    row[2],
                    row[3],
                    row[4],
                    row[5],
                    row[6],
                    row[7],
                    row[8],
                    row[9],
                    row[10],
                )
            )
            textfile.write("\n" + row[0] + "\n")
            textfile.write(
                "{:<10.2f}{:<15.1f}{:>8.4f}{:>8.4f}{:>8.4f}{:>8.4f}{:>8.4f}{:>8.4f}{:>8.4f}{:>8.4f}".format(
                    row[1],
                    row[2],
                    row[3],
                    row[4],
                    row[5],
                    row[6],
                    row[7],
                    row[8],
                    row[9],
                    row[10],
                )
            )
        elif row[0] == NetworkParam[0][0]:  # header row
            print(
                "{:<10}{:<15}{:>8}{:>8}{:>8}{:>8}{:>8}{:>8}{:>8}{:>8}".format(
                    row[1],
                    row[2],
                    row[3],
                    row[4],
                    row[5],
                    row[6],
                    row[7],
                    row[8],
                    row[9],
                    row[10],
                )
            )
            print(separator)
            textfile.write(
                "\n{:<10}{:<15}{:>8}{:>8}{:>8}{:>8}{:>8}{:>8}{:>8}{:>8}".format(
                    row[1],
                    row[2],
                    row[3],
                    row[4],
                    row[5],
                    row[6],
                    row[7],
                    row[8],
                    row[9],
                    row[10],
                )
            )
            textfile.write("\n" + separator)
    print(separator)
    print("Detailed Report Located Here: " + Rep_Loc)

    textfile.write("\n" + separator)
    textfile.write("\n\nBolted Faults (Amps) at Fault Point:")
    textfile.write("\nLLL".ljust(7) + "LL".ljust(6) + "LLG".ljust(6) + "LG".ljust(6))
    textfile.write("\n{:<6}{:<6}{:<6}{:<6}".format(LLL_max, LL_max, LLG_max, LG_max))
    textfile.write("\nImpedance Faults (Amps) at Fault Point:")
    textfile.write("\nLLL".ljust(7) + "LL".ljust(6) + "LLG".ljust(6) + "LG".ljust(6))
    textfile.write("\n{:<6}{:<6}{:<6}{:<6}".format(LLL_imp, LL_imp, LLG_imp, LG_imp))
    textfile.write("\nFault Impedance:")
    textfile.write("\n        R     X")
    textfile.write(
        "\n{:<8}{:<6}{:<6} ohms".format(
            "Zf-LLL", LLL_Fault_Resistance, LLL_Fault_Reactance
        )
    )
    textfile.write(
        "\n{:<8}{:<6}{:<6} ohms".format(
            "Zg-LG", LG_Fault_Resistance, LG_Fault_Reactance
        )
    )
    textfile.write("\nPrefault Voltage at Fault Point: " + str(PreFaultVolts) + " kVLL")
    textfile.write("\nSource Equivalent Fault Level Used: " + str(Level) + "\n")

    # Loop through equipment to print Equipment Database information to the report text file
    for Eq in EquipmentList:
        if Eq[1] == 1 or Eq[1] == 42:  # Two-Winding Transformer and Autotransformer
            Type = cympy.study.QueryInfoDevice("$XfoType$", Eq[2], Eq[1])
            XfmrType = cympy.study.QueryInfoDevice("$EqCode$", Eq[2], Eq[1])
            Z1per = float(cympy.study.QueryInfoDevice("$XfoZ1$", Eq[2], Eq[1]))
            Z0per = float(cympy.study.QueryInfoDevice("$XfoZ0$", Eq[2], Eq[1]))
            X1R1 = float(cympy.study.QueryInfoDevice("$XfoX1R1Ratio$", Eq[2], Eq[1]))
            X0R0 = float(cympy.study.QueryInfoDevice("$XfoX0R0Ratio$", Eq[2], Eq[1]))
            PrimVolts = float(cympy.study.QueryInfoDevice("$XfoKVLL1$", Eq[2], Eq[1]))
            SecVolts = float(cympy.study.QueryInfoDevice("$XfoKVLL2$", Eq[2], Eq[1]))
            textfile.write("\n[" + str(Eq[0]) + "]\n")
            textfile.write(XfmrType)
            if Type == "Single-phase":
                textfile.write(
                    "\n"
                    + str(Type)
                    + " x "
                    + str(cympy.study.QueryInfoDevice("$XfoKVANom$", Eq[2], Eq[1]))
                    + " kVA"
                )
            else:
                textfile.write("\nType: " + str(Type))
            textfile.write(
                "\nTotal Nominal Bank Rating: "
                + str(
                    float(cympy.study.QueryInfoDevice("$XfoKVANomTot$", Eq[2], Eq[1]))
                )
                + " kVA"
            )
            textfile.write("\n" + str(PrimVolts) + "kVLL x " + str(SecVolts) + "kVLL")
            textfile.write(
                "\nWinding Configuration: "
                + str(cympy.study.QueryInfoDevice("$XfoConn$", Eq[2], Eq[1]))
            )
            textfile.write("\nZ1: " + str(Z1per) + "%, Z0: " + str(Z0per) + "%")
            textfile.write("\nX1/R1: " + str(X1R1) + ", X0/R0: " + str(X0R0) + "\n")

        elif Eq[1] == 33:  # By-Phase Transformers
            textfile.write("\nBY-PHASE TRANSFORMER")
            PrimVolts = float(
                cympy.study.QueryInfoDevice("$XfoByPhaseVBaseFrom$", Eq[2], Eq[1])
            )
            SecVolts = float(
                cympy.study.QueryInfoDevice("$XfoByPhaseVBaseTo$", Eq[2], Eq[1])
            )
            textfile.write("\n" + str(PrimVolts) + "kVLL -> " + str(SecVolts) + "kVLL")
            textfile.write(
                "\nWinding Configuration: "
                + str(
                    cympy.study.QueryInfoDevice("$XfoByPhaseConnection$", Eq[2], Eq[1])
                )
            )
            TypeA = cympy.study.QueryInfoDevice("$XfoByPhaseXfoTypeA$", Eq[2], Eq[1])
            TypeB = cympy.study.QueryInfoDevice("$XfoByPhaseXfoTypeA$", Eq[2], Eq[1])
            TypeC = cympy.study.QueryInfoDevice("$XfoByPhaseXfoTypeA$", Eq[2], Eq[1])
            if TypeA == "Single-phase":
                XfmrIDA = cympy.study.QueryInfoDevice("$XfoByPhaseEqIdA$", Eq[2], Eq[1])
                Z1perA = float(
                    cympy.study.QueryInfoDevice("$XfoByPhaseZ1A$", Eq[2], Eq[1])
                )
                Z0perA = float(
                    cympy.study.QueryInfoDevice("$XfoByPhaseZ0A$", Eq[2], Eq[1])
                )
                X1R1_A = float(
                    cympy.study.QueryInfoDevice("$XfoByPhaseX1R1RatioA$", Eq[2], Eq[1])
                )
                X0R0_A = float(
                    cympy.study.QueryInfoDevice("$XfoByPhaseX0R0RatioA$", Eq[2], Eq[1])
                )
                textfile.write("\nA phase: [" + str(XfmrIDA) + "]")
                textfile.write(
                    "\nNominal Power Rating: "
                    + str(
                        float(
                            cympy.study.QueryInfoDevice(
                                "$XfoByPhaseKVANomA$", Eq[2], Eq[1]
                            )
                        )
                    )
                    + " kVA"
                )
                textfile.write("\nZ1: " + str(Z1perA) + "%, Z0: " + str(Z0perA) + "%")
                textfile.write("\nX1/R1: " + str(X1R1_A) + ", X0/R0: " + str(X0R0_A))
            if TypeB == "Single-phase":
                XfmrIDB = cympy.study.QueryInfoDevice("$XfoByPhaseEqIdB$", Eq[2], Eq[1])
                Z1perB = float(
                    cympy.study.QueryInfoDevice("$XfoByPhaseZ1B$", Eq[2], Eq[1])
                )
                Z0perB = float(
                    cympy.study.QueryInfoDevice("$XfoByPhaseZ0B$", Eq[2], Eq[1])
                )
                X1R1_B = float(
                    cympy.study.QueryInfoDevice("$XfoByPhaseX1R1RatioB$", Eq[2], Eq[1])
                )
                X0R0_B = float(
                    cympy.study.QueryInfoDevice("$XfoByPhaseX0R0RatioB$", Eq[2], Eq[1])
                )
                textfile.write("\nB phase: [" + str(XfmrIDB) + "]")
                textfile.write(
                    "\nNominal Power Rating: "
                    + str(
                        float(
                            cympy.study.QueryInfoDevice(
                                "$XfoByPhaseKVANomB$", Eq[2], Eq[1]
                            )
                        )
                    )
                    + " kVA"
                )
                textfile.write("\nZ1: " + str(Z1perB) + "%, Z0: " + str(Z0perB) + "%")
                textfile.write("\nX1/R1: " + str(X1R1_B) + ", X0/R0: " + str(X0R0_B))
            if TypeC == "Single-phase":
                XfmrIDC = cympy.study.QueryInfoDevice("$XfoByPhaseEqIdC$", Eq[2], Eq[1])
                Z1perC = float(
                    cympy.study.QueryInfoDevice("$XfoByPhaseZ1C$", Eq[2], Eq[1])
                )
                Z0perC = float(
                    cympy.study.QueryInfoDevice("$XfoByPhaseZ0C$", Eq[2], Eq[1])
                )
                X1R1_C = float(
                    cympy.study.QueryInfoDevice("$XfoByPhaseX1R1RatioC$", Eq[2], Eq[1])
                )
                X0R0_C = float(
                    cympy.study.QueryInfoDevice("$XfoByPhaseX0R0RatioC$", Eq[2], Eq[1])
                )
                textfile.write("\nC phase: [" + str(XfmrIDC) + "]")
                textfile.write(
                    "\nNominal Power Rating: "
                    + str(
                        float(
                            cympy.study.QueryInfoDevice(
                                "$XfoByPhaseKVANomC$", Eq[2], Eq[1]
                            )
                        )
                    )
                    + " kVA"
                )
                textfile.write("\nZ1: " + str(Z1perC) + "%, Z0: " + str(Z0perC) + "%")
                textfile.write(
                    "\nX1/R1: " + str(X1R1_C) + ", X0/R0: " + str(X0R0_C) + "\n"
                )

        elif Eq[1] == 9:  # Series Reactor
            textfile.write("\n[" + str(Eq[0]) + "]")
            textfile.write("\nSeries Reactor")
            textfile.write(
                "\nRated Current: "
                + str(cympy.eq.GetValue("RatedCurrent", Eq[0], 13))
                + " Amps"
            )
            textfile.write(
                "\nInductive Reactance: "
                + str(cympy.eq.GetValue("ReactanceOhms", Eq[0], 13))
                + " ohms/phase\n"
            )

        elif Eq[1] == 10:  # UG Cable
            textfile.write("\n[" + str(Eq[0]) + "]")
            textfile.write("\nUnderground Cable")
            textfile.write(
                "\nZ1: "
                + str(
                    cympy.eq.GetValue(
                        "PositiveSequenceResistance",
                        Eq[0],
                        cympy.enums.EquipmentType.Cable,
                    )
                )
                + " + j"
                + str(
                    cympy.eq.GetValue(
                        "PositiveSequenceReactance",
                        Eq[0],
                        cympy.enums.EquipmentType.Cable,
                    )
                )
                + " ohms/km"
            )
            textfile.write(
                "\nZ0: "
                + str(
                    cympy.eq.GetValue(
                        "ZeroSequenceResistance", Eq[0], cympy.enums.EquipmentType.Cable
                    )
                )
                + " + j"
                + str(
                    cympy.eq.GetValue(
                        "ZeroSequenceReactance", Eq[0], cympy.enums.EquipmentType.Cable
                    )
                )
                + " ohms/km"
            )
            textfile.write("\nComments: ")
            textfile.write(
                str(
                    cympy.eq.GetValue(
                        "ImpedancesNote", Eq[0], cympy.enums.EquipmentType.Cable
                    )
                )
                + "\n"
            )

        elif Eq[1] == 11:  # OH Line
            textfile.write("\n[" + str(Eq[0]) + "]")
            textfile.write("\nOverhead Line")
            textfile.write(
                "\nZ1: "
                + str(
                    cympy.eq.GetValue(
                        "PositiveSequenceResistance",
                        Eq[0],
                        cympy.enums.EquipmentType.OverheadLine,
                    )
                )
                + " + j"
                + str(
                    cympy.eq.GetValue(
                        "PositiveSequenceReactance",
                        Eq[0],
                        cympy.enums.EquipmentType.OverheadLine,
                    )
                )
                + " ohms/km"
            )
            textfile.write(
                "\nZ0: "
                + str(
                    cympy.eq.GetValue(
                        "ZeroSequenceResistance",
                        Eq[0],
                        cympy.enums.EquipmentType.OverheadLine,
                    )
                )
                + " + j"
                + str(
                    cympy.eq.GetValue(
                        "ZeroSequenceReactance",
                        Eq[0],
                        cympy.enums.EquipmentType.OverheadLine,
                    )
                )
                + " ohms/km"
            )
            textfile.write(
                "\nPhase Conductors: "
                + str(
                    cympy.eq.GetValue(
                        "PhaseConductorID",
                        Eq[0],
                        cympy.enums.EquipmentType.OverheadLine,
                    )
                )
            )
            textfile.write(
                "\nNeutral Conductor: "
                + str(
                    cympy.eq.GetValue(
                        "NeutralConductorID",
                        Eq[0],
                        cympy.enums.EquipmentType.OverheadLine,
                    )
                )
            )
            textfile.write(
                "\nConductor Spacing: "
                + str(
                    cympy.eq.GetValue(
                        "ConductorSpacingID",
                        Eq[0],
                        cympy.enums.EquipmentType.OverheadLine,
                    )
                )
            )
            textfile.write("\nComments: ")
            textfile.write(
                str(
                    cympy.eq.GetValue(
                        "Comments", Eq[0], cympy.enums.EquipmentType.OverheadLine
                    )
                )
                + "\n"
            )

        elif Eq[1] == "Source":  # Source Equivalent
            textfile.write("\n[" + str(Eq[0]) + "]")
            textfile.write("\nSource Equivalent")
            textfile.write("\nID: " + str(Source_Name))
            textfile.write(
                "\nLow Fault Level Z1: "
                + str(
                    cympy.study.QueryInfoNode("SourceR1ohmsMax", Sections.FromNode.ID)
                )
                + " + j"
                + str(
                    cympy.study.QueryInfoNode("SourceX1ohmsMax", Sections.FromNode.ID)
                )
                + " ohms"
            )
            textfile.write(
                "\nLow Fault Level Z0: "
                + str(
                    cympy.study.QueryInfoNode("SourceR0ohmsMax", Sections.FromNode.ID)
                )
                + " + j"
                + str(
                    cympy.study.QueryInfoNode("SourceX0ohmsMax", Sections.FromNode.ID)
                )
                + " ohms"
            )
            textfile.write(
                "\nHigh Fault Level Z1: "
                + str(
                    cympy.study.QueryInfoNode("SourceR1ohmsMin", Sections.FromNode.ID)
                )
                + " + j"
                + str(
                    cympy.study.QueryInfoNode("SourceX1ohmsMin", Sections.FromNode.ID)
                )
                + " ohms"
            )
            textfile.write(
                "\nHigh Fault Level Z0: "
                + str(
                    cympy.study.QueryInfoNode("SourceR0ohmsMin", Sections.FromNode.ID)
                )
                + " + j"
                + str(
                    cympy.study.QueryInfoNode("SourceX0ohmsMin", Sections.FromNode.ID)
                )
                + " ohms"
            )
            textfile.write("\nComments: ")
            try:
                cympy.eq.GetEquipment(Source_Name, cympy.enums.EquipmentType.Substation)
            except:
                cympy.study.GetDevice(network_id, cympy.enums.DeviceType.Source)
                # if Source_Name can't be found in the Equipment database or a Source Device doesn't exist in the network being studied
                textfile.write("User Defined Source Equivalent")
            else:
                textfile.write(
                    cympy.eq.GetValue(
                        "Comments", Source_Name, cympy.enums.EquipmentType.Substation
                    )
                )

        else:
            textfile.write(
                "\nError: Equipment in study that is not being modeled above\n"
            )

    ############################################################################################################################################################
    ######## Added for Emission Study#############################################

    try:
        study.run_study()
        if study.parameters.emission == "Yes":
            study.generate_report(textfile)
    except Exception as e:
        print(f"Error: {e}")
    ############################################################################################################################################################
    ############################################################################################################################################################

    textfile.close()
