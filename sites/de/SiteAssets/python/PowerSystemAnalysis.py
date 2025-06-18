import locale
import math
import os
import sys
import textwrap
import traceback
from datetime import datetime

from cympy import app as App
from cympy import eq as Eqt
from cympy import sim as Sim
from cympy.study import *


def query_with_fallback(query_func, keyword_list, *args):
    try:
        return [locale.atof(query_func(id, *args)) for id in keyword_list]
    except Exception:
        output_list = []
        for id in keyword_list:
            try:
                output_list.append(locale.atof(query_func(id, *args)))
            except Exception:
                output_list.append(query_func(id, *args))
        return output_list


def queryDevice(keyword_list, dev_num, dev_type):
    return query_with_fallback(QueryInfoDevice, keyword_list, dev_num, dev_type, 5)


def queryNode(keyword_list, node_id):
    return query_with_fallback(QueryInfoNode, keyword_list, node_id, 5)


def get_value_eq(keyword_list, eq_name, eq_type):
    return query_with_fallback(Eqt.GetValue, keyword_list, eq_name, eq_type)


def set_value_source(value_property_setlist, source_id):
    #   It iterates over a list of value-property pairs and sets each value to the corresponding property for
    #   a specified source ID using the SetValueTopo function.
    for set in value_property_setlist:
        value, property = set
        SetValueTopo(value, property, source_id)


class PowerSystemAnalysis:
    #   PowerSystemAnalysis conducts a detailed power system analysis, primarily focusing
    #   on short circuit studies. It utilizes Cympy library to interface with CYME power
    #   engineering software, facilitating analysis in electrical power networks.

    def __init__(self):
        #   Initializes the PowerSystemAnalysis instance with default values for various parameters
        #   related to power system analysis. It also sets the locale for numeric formatting.

        self.source_name = None
        self.network_id = None
        self.nominal_voltage = None
        self.fault_point = None
        self.operating_voltage = None
        self.len_unit = None
        self.rep_loc = None
        self.patch_mode = None
        self.config_num = None
        self.sc_sim = None
        self.LG_Fault_Resistance = 40
        self.LG_Fault_Reactance = 0
        self.LLL_Fault_Resistance = 8
        self.LLL_Fault_Reactance = 0
        self.phase_number = "A"
        self.instrument_type = []
        self.relay_type = []
        self.protection_type = []
        self.protection_vendor = []
        self.instrument_number = []
        self.fault_current_list = None
        self.variables_list = None
        self.cable_variables = None
        self.xfmr_device = None
        self.xfmr_device_by_phase = None
        self.xfmr_equipment = None
        self.xfmr_equipment_by_phase = None
        self.reactor_info = None
        self.cable_info = None
        self.line_info = None
        self.source_info = None
        self.network_param = []
        self.equipment_list = []
        self.equipment_type = []
        self.itr_upstream = None
        self.itr_stop_on_open = None
        self.all_device_type = None
        self.eq_type_station = None
        self.all_instrument_type = None
        self.eq_type_sreactor = None
        self.eq_type_cable = None
        self.eq_type_ohline = None
        self.dev_type_source = None
        self.table_header_format = None
        self.table_row_format = None
        self.table_header = None
        self.table_separator = None
        self.report_filename = None
        self.rep_path = None
        self.upstream_prot_id = None
        self.upstream_prot_type = None
        self.tcc_desc = None
        self.prot_dev = None
        self.prot_instrument_list = None
        self.prot_nv_id = None
        self.prot_eq_id = None
        self.prot_normal_status = []
        self.prot_tcc_desc = ""
        self.points = []
        self.Source_R0 = 0
        self.Source_X0 = 0
        self.Source_R1 = 0
        self.Source_X1 = 0
        self.Source_RX = 0
        self.fault_resistance = 1
        self.RX_Amp = 400
        self.base_MVA = 100

    def read_input_parameters(self):
        #   Reads and sets essential input parameters for the power system analysis from Cympy.
        #   Raises ValueError if essential inputs like 'Fault_Point' are missing.

        print("- Read input parameters")

        (
            pretext,
            self.Source_R0,
            self.Source_X0,
            self.Source_R1,
            self.Source_X1,
            self.Source_RX,
            self.patch_mode,
            self.fault_resistance,
            self.rep_path,
        ) = map(
            cympy.GetInputParameter,
            [
                "Fault_Point",
                "Source_R0",
                "Source_X0",
                "Source_R1",
                "Source_X1",
                "Source_RX",
                "Patch_Mod",
                "Fault_Resistance",
                "Report_Location",
            ],
        )

        try:
            self.points = [
                node for node in ListNodes() if node.ID.startswith(pretext)]
        except:
            raise ValueError("No Network Loaded")

        if not self.points:
            raise ValueError("Error: Not Fault_Point")

    def load_constants(self):
        #   Loads constant values and enumerations required for the analysis. This includes
        #   setting up iteration options, device types, equipment types, etc.

        print("- Load constants")
        self.itr_upstream = cympy.enums.IterationOption.Upstream
        self.itr_stop_on_open = cympy.enums.IterationRestriction.StopOnOpen
        self.all_device_type = cympy.enums.DeviceType.AllDevices
        self.eq_type_station = cympy.enums.EquipmentType.Substation
        self.all_instrument_type = cympy.enums.InstrumentType.AllInstruments
        self.eq_type_sreactor = cympy.enums.EquipmentType.SeriesReactor
        self.eq_type_cable = cympy.enums.EquipmentType.Cable
        self.eq_type_ohline = cympy.enums.EquipmentType.OverheadLine
        self.dev_type_source = cympy.enums.DeviceType.Source
        self.base_MVA = cympy.env.BasePower_AC_MVA

    def setup_study_env(self, fault_point):

        #   Sets up the environment required for conducting the power system study.
        #   It includes determining the network ID, source equipment, length units, report filename,
        #   and configuring operating voltages.
        #   Throws ValueError if the nominal voltage setting is incorrect.

        print("- Setup study enviroment")

        self.network_id = QueryInfoNode("$NetworkId$", fault_point)

        self.source_eq = Eqt.GetEquipment(self.network_id, self.eq_type_station) or Eqt.GetEquipment(
            self.network_id, self.eq_type_station)

        self.source_name = QueryInfoNode(
            "$UpstreamSourceNodeID$", fault_point) or self.network_id

        self.len_unit = App.GetKeyword("Length").Unit

        Current_Datetime = datetime.now().strftime("%Y-%m-%d-h%Hm%Ms%S")
        self.report_filename = (
            "SC-Report-"
            + self.source_name.replace("_", "-")
            + "-"
            + Current_Datetime
            + ".txt"
        )
        # Setup operating votlage for the study

        self.nominal_voltage = locale.atof(
            self.source_eq.GetValue("NominalKVLL"))
        self.operating_voltage = locale.atof(
            self.source_eq.GetValue("DesiredKVLL"))

        set_list = [(
            self.operating_voltage/3**0.5,
            "Sources[0].EquivalentSourceModels[0].EquivalentSource.OperatingVoltage1",
        ),
            (
                self.operating_voltage/3**0.5,
                "Sources[0].EquivalentSourceModels[0].EquivalentSource.OperatingVoltage2",
        ),
            (
                self.operating_voltage/3**0.5,
                "Sources[0].EquivalentSourceModels[0].EquivalentSource.OperatingVoltage3",
        ),
            (
                "Ohms",
                "Sources[0].EquivalentSourceModels[0].EquivalentSource.ImpedanceUnit",
        ),
            (
                self.operating_voltage,
                "Sources[0].EquivalentSourceModels[0].EquivalentSource.KVLL",
        ),
            (
                self.Source_R0,
                "Sources[0].EquivalentSourceModels[0].EquivalentSource.SecondLevelR0",
        ),
            (
                self.Source_X0,
                "Sources[0].EquivalentSourceModels[0].EquivalentSource.SecondLevelX0",
        ),
            (
                self.Source_R1,
                "Sources[0].EquivalentSourceModels[0].EquivalentSource.SecondLevelR1",
        ),
            (
                self.Source_X1,
                "Sources[0].EquivalentSourceModels[0].EquivalentSource.SecondLevelX1",
        ),
            (
                self.Source_R1,
                "Sources[0].EquivalentSourceModels[0].EquivalentSource.SecondLevelR2",
        ),
            (
                self.Source_X1,
                "Sources[0].EquivalentSourceModels[0].EquivalentSource.SecondLevelX2",
        )]

        if GetDevice(self.network_id, self.dev_type_source):
            set_value_source(set_list, self.source_name)

        self.source_eq.SetValue("Ohms", "ImpedanceUnit")
        self.source_eq.SetValue(self.operating_voltage, "DesiredKVLL")
        self.source_eq.SetValue(self.Source_R1, "SecondLevelR1")
        self.source_eq.SetValue(self.Source_X1, "SecondLevelX1")
        self.source_eq.SetValue(self.Source_R0, "SecondLevelR0")
        self.source_eq.SetValue(self.Source_X0, "SecondLevelX0")
        self.source_eq.SetValue(self.Source_R1, "SecondLevelR2")
        self.source_eq.SetValue(self.Source_X1, "SecondLevelX2")

        RX_List = ListDevices(cympy.enums.DeviceType.SeriesReactor)

        if len(RX_List) > 0:
            RX_Device = RX_List[0]

            RX_Device.SetValue(
                "RX_{:n}_{:.3f}".format(
                    self.RX_Amp, self.Source_RX), "DeviceID"
            )

            RX_Eq = cympy.eq.GetEquipment(
                RX_Device.EquipmentID, RX_Device.EquipmentType)

            if (
                RX_Eq.GetValue("RatedCurrent") != self.RX_Amp
                or RX_Eq.GetValue("ReactanceOhms") != self.Source_RX
            ):

                map(
                    RX_Eq.SetValue,
                    [self.RX_Amp, self.Source_RX],
                    ["RatedCurrent", "ReactanceOhms"],
                )

    def config_SC_simulation(self):
        #   Configures the parameters for the short circuit (SC) simulation based on the fault resistance.
        #   Sets fault resistance and reactance for different fault types (LG, LLL, etc.).
        #   Raises ValueError for unsupported fault resistance values.

        self.sc_sim = Sim.ShortCircuit()
        config_count = locale.atoi(self.sc_sim.GetValue(
            "ParametersConfigurations.Count"))
        config = [
            i
            for i in range(config_count)
            if self.sc_sim.GetValue("ActiveConfigurationID")
            == self.sc_sim.GetValue(f"ParametersConfigurations[{i}].ConfigID")
        ][0]

        if self.fault_resistance == 0:
            (
                self.LG_Fault_Resistance,
                self.LG_Fault_Reactance,
                self.LLL_Fault_Resistance,
                self.LLL_Fault_Reactance,
            ) = [0, 0, 0, 0]
        elif self.fault_resistance == 1:
            (
                self.LG_Fault_Resistance,
                self.LG_Fault_Reactance,
                self.LLL_Fault_Resistance,
                self.LLL_Fault_Reactance,
            ) = [40, 0, 8, 0]
        else:
            raise ValueError("Error: Fault_Resistance value has to be 0 or 1")

        map(
            self.sc_sim.SetValue,
            [
                self.LG_Fault_Resistance,
                self.LG_Fault_Reactance,
                self.LLL_Fault_Resistance,
                self.LLL_Fault_Reactance,
                "OperatingVoltage",
            ],
            [
                f"ParametersConfigurations[{config}].LGFaultResistanceOHMS",
                f"ParametersConfigurations[{config}].LGFaultReactanceOHMS",
                f"ParametersConfigurations[{config}].LLLFaultResistanceOHMS",
                f"ParametersConfigurations[{config}].LLLFaultReactanceOHMS",
                f"ParametersConfigurations[{config}].PreFaultVoltage",
            ],
        )

    def initialize_study_variables(self):
        #   Initializes various variables and lists used in the study. This includes fault current lists,
        #   equipment information, table formats for reporting, and other relevant data for the analysis.
        self.fault_current_list = [
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
        ]
        self.variables_list = [
            "PrefaultVoltage",
            "R1ohm",
            "X1ohm",
            "R0ohm",
            "X0ohm",
            "Distance",
            "Latitude",
            "Longitude",
        ]
        self.cable_variables = [
            "R1ohm",
            "X1ohm",
            "R0ohm",
            "X0ohm",
            "Distance",
            "PhaseCount",
            "CableNbParallel",
        ]
        self.xfmr_device = [
            "$EqCode$",
            "$EqId$",
            "$XfoKVANomTot$",
            "$XfoZ1$",
            "$XfoZ0$",
            "$XfoX1R1Ratio$",
            "$XfoX0R0Ratio$",
            "$XfoKVLL1$",
            "$XfoKVLL2$",
            "$XfoVBaseFrom$",
            "$XfoVBaseTo$",
        ]
        self.xfmr_device_by_phase = [
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
        ]
        self.xfmr_equipment = [
            "$XfoType$",
            "$EqCode$",
            "$XfoZ1$",
            "$XfoZ0$",
            "$XfoX1R1Ratio$",
            "$XfoX0R0Ratio$",
            "$XfoKVLL1$",
            "$XfoKVLL2$",
            "$XfoKVANom$",
            "$XfoKVANomTot$",
            "$XfoConn$",
        ]
        self.xfmr_equipment_by_phase = [
            f"$XfoByPhaseXfoType{self.phase_number}$",
            f"$XfoByPhaseZ0{self.phase_number}$",
            f"$XfoByPhaseZ1{self.phase_number}$",
            f"$XfoByPhaseX0R0Ratio{self.phase_number}$",
            f"$XfoByPhaseX1R1Ratio{self.phase_number}$",
            f"$XfoByPhaseKvPrim{self.phase_number}$",
            f"$XfoByPhaseKvSec{self.phase_number}$",
            f"$XfoByPhaseInsulationType{self.phase_number}$",
            "$XfoByPhaseConnection$",
            f"$XfoByPhaseKVANom{self.phase_number}$",
        ]
        self.reactor_info = ["RatedCurrent", "ReactanceOhms"]
        self.cable_info = [
            "PositiveSequenceResistance",
            "PositiveSequenceReactance",
            "ZeroSequenceResistance",
            "ZeroSequenceReactance",
            "ImpedancesNote",
            "Comments",
        ]
        self.line_info = [
            "PositiveSequenceResistance",
            "PositiveSequenceReactance",
            "ZeroSequenceResistance",
            "ZeroSequenceReactance",
            "PhaseConductorID",
            "NeutralConductorID",
            "ConductorSpacingID",
            "Comments",
        ]
        self.source_info = [
            "SourceR1ohmsMax",
            "SourceX1ohmsMax",
            "SourceR0ohmsMax",
            "SourceX0ohmsMax",
            "SourceR1ohmsMin",
            "SourceX1ohmsMin",
            "SourceR0ohmsMin",
            "SourceX0ohmsMin",
        ]

        # Make report table Header_Txt
        self.table_header_format = (
            " {:<56}{:>8}{:>11}{:>9}{:>8}{:>8}{:>8}{:>10}{:>8}{:>8}{:>8}"
        )
        self.table_row_format = " {:<56}{:>8.1f}{:>11.1f}{:>9.4f}{:>8.4f}{:>8.4f}{:>8.4f}{:>10.4f}{:>8.4f}{:>8.4f}{:>8.4f}"

        self.table_header = " {:<56}{:>8}{:>11}  |{:-^31}||{:-^31}|".format(
            f'Circuits: {self.network_id}',
            "Length",
            "Distance",
            "Device Impedance(ohm)",
            "From Line Side of Device(ohm)",
        )
        self.table_separator = "—" * len(self.table_header)

    def run(self):
        #        """
        #        Main function that executes the power system analysis script. It includes reading input
        #        parameters, setting up study environment, running simulations, and generating a detailed report.
        #        It handles any exceptions that occur during the execution.
        #        """

        if not ListNetworks:
            raise ValueError("Error: No study is loaded")

        ps = PowerSystemAnalysis()
        ps.read_input_parameters()

        for point in ps.points:
            ps.fault_point = point.ID

            ps.load_constants()
            ps.setup_study_env(ps.fault_point)
            ps.config_SC_simulation()
            ps.initialize_study_variables()
            # set up study parameters

            # open the txt file for recording
            with open(ps.rep_loc, "w") as textfile:
                def print_and_write(content):
                    print(content)
                    textfile.write(content + "\n")

                print_and_write(ps.table_separator)
                print_and_write(ps.table_header)

                # Create List: NetworkParam [Line Type, Line Length, Distance of section upstream node to sub
                # Total Section R1, Total Section X1, Total Section R0, Total Section X0
                # Thevenin R1, Thevenin X1Thevenin R0, Thevenin X0] used for the entire upstream network parameters, will store a list of lists

                # used to inventory all devices by equipment ID (OH Lines, Cables, Step up/down xfmrs, reactors, sources)

                # Append list Header_Txt
                ps.equipment_type.append("Equipment Type")
                ps.network_param.append(
                    [
                        "{}".format(ps.len_unit),
                        "to Sub{}".format(ps.len_unit),
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
                if ps.patch_mode == 1:
                    # Iterator will start at Fault_Point node and step upstream section by section until it hits the source node
                    iterator = NetworkIterator(
                        ps.fault_point,
                        ps.itr_upstream,
                        ps.itr_stop_on_open,
                    )
                    while iterator.Next():
                        Sections = iterator.GetSection()
                        DeviceList = iterator.GetDevices()

                        for Device in DeviceList:
                            MainLine = QueryInfoDevice(
                                "IsMainLine", Device.DeviceNumber, Device.DeviceType
                            )
                            PhaseCount = QueryInfoDevice(
                                "PhaseCount", Device.DeviceNumber, Device.DeviceType
                            )
                            if (
                                Device.DeviceType == 11
                            ):  # cympy.enums.DeviceType.OverheadLine
                                if MainLine == "Yes" and PhaseCount == "3":
                                    Device.SetValue(
                                        "3P_336.4_ASC", "LineID")

                            elif (
                                Device.DeviceType == 10
                            ):  # cympy.enums.DeviceType.Underground
                                if MainLine == "Yes":
                                    if PhaseCount == "3":
                                        if (
                                            not Device.EquipmentID.startswith(
                                                "3P_G16")
                                            and not Device.EquipmentID.startswith(
                                                "3P_G13"
                                            )
                                            and not Device.EquipmentID.startswith(
                                                "3P_G14"
                                            )
                                            and not Device.EquipmentID.startswith(
                                                "3P_G17"
                                            )
                                        ):
                                            Device.SetValue(
                                                "3P_G15_-_1/C_500_KCM_CU_25_KV_XLPE",
                                                "CableID",
                                            )
                                    elif not Device.EquipmentID.startswith("3P_G4"):
                                        print("here")
                                        Device.SetValue(
                                            "3P_G4_-_1/C_#4/0_AWG_AL_25_KV_XLPE",
                                            "CableID",
                                        )

                ps.sc_sim.Run()

                # Capture all the fault information at the fault point and short circuit parameters

                (
                    LLL_max,
                    LG_max,
                    LL_max,
                    LLG_max,
                    LLG_3Io,
                    LLL_imp,
                    LG_imp,
                    LL_imp,
                    LLG_imp,
                    LLG_imp_3Io,
                ) = queryNode(ps.fault_current_list, ps.fault_point)
                (
                    PreFaultVolts,
                    R1ohm,
                    X1ohm,
                    R0ohm,
                    X0ohm,
                    Dist_to_Sub,
                    Latitude,
                    Longitude,
                ) = queryNode(ps.variables_list, ps.fault_point)
                Three_I0 = max(LG_max, LLG_3Io)
                Three_I0_imp = max(LG_imp, LLG_imp_3Io)

                Length, R1, X1, R0, X0 = 0, 0, 0, 0, 0

                EqID = "FAULT POINT (Lat.:{:.5f}, Long.:{:.5f})".format(
                    Latitude, Longitude
                )

                ps.equipment_type.append(EqID)
                ps.network_param.append(
                    [
                        Length,
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

                iterator = NetworkIterator(
                    ps.fault_point,
                    ps.itr_upstream,
                    ps.itr_stop_on_open,
                )

                while iterator.Next():
                    Node = iterator.GetNode()
                    Sections = iterator.GetSection()
                    Length = Sections.Length
                    DeviceList = iterator.GetDevices()
                    FromNode = iterator.GetFromNode()
                    FromPhase = iterator.GetFromPhase()
                    Phase = iterator.GetPhase()
                    # print(Sections.CalculatedLength)
                    # print(Length)

                    (
                        R1ohm,
                        X1ohm,
                        R0ohm,
                        X0ohm,
                        Dist_UpStream,
                        Ph_Num_UpStream,
                        Parallel_Run,
                    ) = queryNode(ps.cable_variables, Node.ID)

                    (
                        R1ohm_down,
                        X1ohm_down,
                        R0ohm_down,
                        X0ohm_down,
                        Dist_DownStream,
                        Ph_Num_DownStream,
                        Parallel_Run,
                    ) = queryNode(ps.cable_variables, FromNode.ID)

                    if Dist_DownStream >= Dist_UpStream:

                        R1, X1, R0, X0 = (
                            R1ohm_down - R1ohm,
                            X1ohm_down - X1ohm,
                            R0ohm_down - R0ohm,
                            X0ohm_down - X0ohm,
                        )

                    else:
                        raise ValueError(
                            "Error: dowsntream node can not be closer to substation than upstream")

                    # this for loop is used to build the NetworkParam list entries for each type of Equipment of importance. It's also used to build the ps.equipment_list
                    for Device in DeviceList:

                        # Two-Winding Step up/down Transformer and Autotransformers
                        DeviceObj = Device.GetObjType()
                        Length = locale.atof(QueryInfoDevice(
                            "Length", Device.DeviceNumber, Device.DeviceType))

                        # cympy.enums.DeviceType.Transformer or cympy.enums.DeviceType.AutoTransformer
                        if Device.DeviceType in [1, 42]:
                            (
                                XfmrType,
                                XfmrID,
                                XfmrKVA,
                                Z1PU,
                                Z0PU,
                                X1R1,
                                X0R0,
                                PrimVolts,
                                SecVolts,
                                PrimBase,
                                SecBase,
                            ) = queryDevice(
                                ps.xfmr_device, Device.DeviceNumber, Device.DeviceType)

                            per_unit = [
                                "R1pu",
                                "X1pu",
                                "R0pu",
                                "X0pu",
                            ]

                            (
                                R1pu,
                                X1pu,
                                R0pu,
                                X0pu,

                            ) = queryNode(per_unit, Node.ID)

                            (
                                R1pu_down,
                                X1pu_down,
                                R0pu_down,
                                X0pu_down,

                            ) = queryNode(per_unit, FromNode.ID)

                            R1c = (R1pu_down-R1pu)*(SecBase**2)/self.base_MVA
                            X1c = (X1pu_down-X1pu)*(SecBase**2)/self.base_MVA
                            R0c = (R0pu_down-R0pu)*(SecBase**2)/self.base_MVA
                            X0c = (X0pu_down-X0pu)*(SecBase**2)/self.base_MVA

                            XfZ1ohms_Mag = (Z1PU * 10 * SecVolts**2) / XfmrKVA
                            XfZ0ohms_Mag = (Z0PU * 10 * SecVolts**2) / XfmrKVA

                            # Impedance of transformer with respect to high side
                            R1 = (XfZ1ohms_Mag**2 / (1 + X1R1**2)) ** (1 / 2)
                            X1 = X1R1 * R1
                            R0 = (XfZ0ohms_Mag**2 / (1 + X0R0**2)) ** (1 / 2)
                            X0 = X0R0 * R0

                            if round(R1c**2 + R1**2, 4) != round(2*R1c*R1, 4) and round(R0c**2 + R0**2, 4) != round(2*R0c*R0, 4):
                                raise ValueError(
                                    "Error: the device impedance is not correct")

                            ps.equipment_list.append(
                                [
                                    Device.EquipmentID,
                                    Device.DeviceType,
                                    Device.DeviceNumber,
                                ]
                            )
                            EqID = "{} : {}".format(XfmrType, XfmrID)

                        elif (
                            Device.DeviceType == 33
                        ):  # cympy.enums.DeviceType.TransformerByPhase
                            (
                                XfmrType,
                                XfmrIDA,
                                XfmrIDB,
                                XfmrIDC,
                                XfmrKVA,
                                Z1PU,
                                Z0PU,
                                X1R1,
                                X0R0,
                                PrimVolts,
                                SecVolts,
                            ) = queryDevice(
                                ps.xfmr_device_by_phase,
                                Device.DeviceNumber,
                                Device.DeviceType,
                            )

                            per_unit = [
                                "R1pu",
                                "X1pu",
                                "R0pu",
                                "X0pu",

                            ]

                            (
                                R1pu,
                                X1pu,
                                R0pu,
                                X0pu,

                            ) = queryNode(per_unit, Node.ID)

                            (
                                R1pu_down,
                                X1pu_down,
                                R0pu_down,
                                X0pu_down,

                            ) = queryNode(per_unit, FromNode.ID)

                            R1c = (R1pu_down-R1pu)*(SecVolts**2)/self.base_MVA
                            X1c = (X1pu_down-X1pu)*(SecVolts**2)/self.base_MVA
                            R0c = (R0pu_down-R0pu)*(SecVolts**2)/self.base_MVA
                            X0c = (X0pu_down-X0pu)*(SecVolts**2)/self.base_MVA
                            print(R1c, X1c, R0c, X0c)

                            XfZ1ohms_Mag = (Z1PU * 10 * SecVolts**2) / XfmrKVA
                            XfZ0ohms_Mag = (Z0PU * 10 * SecVolts**2) / XfmrKVA

                            # Impedance of transformer with respect to high side
                            R1 = (XfZ1ohms_Mag**2 / (1 + X1R1**2)) ** (1 / 2)
                            X1 = X1R1 * R1
                            R0 = (XfZ0ohms_Mag**2 / (1 + X0R0**2)) ** (1 / 2)
                            X0 = X0R0 * R0

                            if round(R1c**2 + R1**2, 4) != round(2*R1c*R1, 4) and round(R0c**2 + R0**2, 4) != round(2*R0c*R0, 4):
                                raise ValueError(
                                    "Error: the device impedance is not correct")

                            ps.equipment_list.append(
                                [XfmrIDA, Device.DeviceType,
                                    Device.DeviceNumber, "A"]
                            )
                            ps.equipment_list.append(
                                [XfmrIDB, Device.DeviceType,
                                    Device.DeviceNumber, "B"]
                            )
                            ps.equipment_list.append(
                                [XfmrIDC, Device.DeviceType,
                                    Device.DeviceNumber, "C"]
                            )
                            EqID = "{} : {}".format(XfmrType, XfmrID)

                        elif Device.DeviceType in [9, 4, 2, 7]:
                            Length = 0
                            if Device.DeviceType != 9:
                                R1, X1, R0, X0 = 0, 0, 0, 0
                            else:
                                R1, R0 = 0, 0

                            ps.equipment_list.append(
                                [
                                    Device.EquipmentID,
                                    Device.DeviceType,
                                    Device.DeviceNumber,
                                ]
                            )
                            EqID = "{}: {}".format(
                                DeviceObj, Device.EquipmentID)

                        elif Device.DeviceType in [10, 11]:
                            if Device.DeviceType == 10:
                                Parallel_Run = cympy.study.QueryInfoDevice(
                                    "$CableNbParallel$",
                                    Device.DeviceNumber,
                                    Device.DeviceType,
                                )
                                EqID = "{}: {}(*{})".format(
                                    DeviceObj, Device.EquipmentID, Parallel_Run
                                )
                            else:
                                EqID = "{}: {}".format(
                                    DeviceObj, Device.EquipmentID)

                            # calculate the impedance at the From node
                            # print(Ph_Num_UpStream)
                            # print(Ph_Num_DownStream)
                            if Phase != FromPhase:
                                R1c = R1ohm_down - (2 * R1ohm + R0ohm) / 3
                                X1c = X1ohm_down - (2 * X1ohm + X0ohm) / 3
                                R0c = R0ohm_down - (2 * R1ohm + R0ohm) / 3
                                X0c = X0ohm_down - (2 * X1ohm + X0ohm) / 3

                            # print(R1, X1, R0, X0)
                            # print(R1FN, X1FN, R0FN, X0FN)
                            # print(R1ohm, X1ohm, R0ohm, X0ohm)
                            # Same equipment as last section, add it up
                            if ps.equipment_type[-1] == EqID:

                                (
                                    Len,
                                    _,
                                    Sec_R1,
                                    Sec_X1,
                                    Sec_R0,
                                    Sec_X0,
                                    _,
                                    _,
                                    _,
                                    _,
                                ) = ps.network_param.pop()

                                ps.equipment_type.pop()

                                Length = Len + Length
                                R1, X1, R0, X0 = (
                                    Sec_R1 + R1,
                                    Sec_X1 + X1,
                                    Sec_R0 + R0,
                                    Sec_X0 + X0,
                                )

                                # if UG cable type doesn't already exist in the ps.equipment_list, add it to the list
                            if (
                                all(
                                    Device.EquipmentID not in Eq
                                    for Eq in ps.equipment_list
                                )
                                and Device.EquipmentID != "INT_WIRE"
                            ):
                                ps.equipment_list.append(
                                    [Device.EquipmentID, Device.DeviceType]
                                )

                        if Device.DeviceType != 6 and Device.EquipmentID != "INT_WIRE":

                            ps.equipment_type.append(EqID)
                            ps.network_param.append(
                                [
                                    Length,
                                    Dist_UpStream,
                                    R1,
                                    X1,
                                    R0,
                                    X0,
                                    abs(R1ohm),
                                    abs(X1ohm),
                                    abs(R0ohm),
                                    abs(X0ohm),
                                ]
                            )

                    if QueryInfoNode("IsSourceNode", Node.ID) == "Yes":
                        ps.equipment_list.append([ps.source_name, "Source"])
                        EqID = f"SourceEquivalent: {str(ps.source_name)}"
                        ps.equipment_type.append(EqID)

                        ps.network_param.append(
                            [
                                0,
                                Dist_UpStream,
                                abs(R1ohm),
                                abs(X1ohm),
                                abs(R0ohm),
                                abs(X0ohm),
                                0,
                                0,
                                0,
                                0,
                            ]
                        )

                        # Once iterator reaches the source node break out of while loop
                # instances were found where the interator continued back to points where there were loops

                # Source Equivalent Fault Level Used (ie. high or low)

                # print out the NetworkParam entries as a table to the Cyme console as well as to the text file

                for index, param in enumerate(zip(ps.equipment_type, ps.network_param)):
                    if "INT_WIRE" not in param[0]:
                        if index == 0:
                            print_and_write(
                                ("\n" + ps.table_header_format).format(
                                    param[0], *param[1]
                                )
                            )
                            print_and_write("\n{}".format(ps.table_separator))
                        else:
                            print_and_write(
                                ("\n" +
                                 ps.table_row_format).format(param[0], *param[1])
                            )

                print_and_write("\n{}".format(ps.table_separator))
                print_and_write("\n")
                print_and_write("\n{}".format(ps.table_separator))
                Level = QueryInfoNode("SourceFaultLevel", Sections.FromNode.ID)

                print_and_write(
                    "\nFAULT POINT (Amps) {:>6}{:>6}{:>6}{:>6}{:>6}".format(
                        "LLL", "LL", "LLG", "LG", "3Io"
                    )
                )
                print_and_write(
                    "\nBolted Faults: {:>10.0f}{:>6.0f}{:>6.0f}{:>6.0f}{:>6.0f}".format(
                        LLL_max, LL_max, LLG_max, LG_max, Three_I0
                    )
                )
                print_and_write(
                    "\nImpedance Faults: {:>7.0f}{:>6.0f}{:>6.0f}{:>6.0f}{:>6.0f}\n".format(
                        LLL_imp, LL_imp, LLG_imp, LG_imp, Three_I0_imp
                    )
                )
                print_and_write(
                    "\nFault Impedance (ohms) {:>6}{:>6}".format("R", "X"))
                print_and_write(
                    "\nZf-LLL: {:>21.2f}{:>6.2f}".format(
                        ps.LLL_Fault_Resistance, ps.LLL_Fault_Reactance
                    )
                )
                print_and_write(
                    "\nZf-LG : {:>21.2f}{:>6.2f}".format(
                        ps.LG_Fault_Resistance, ps.LG_Fault_Reactance
                    )
                )
                print_and_write(
                    "\nPrefault Voltage at Fault Point: {} kVLL".format(
                        PreFaultVolts)
                )
                print_and_write("\n{}".format(ps.table_separator))

                ps.upstream_prot_id, ps.upstream_prot_type = map(
                    QueryInfoNode,
                    ["UpstreamProtId", "UpstreamProtType"],
                    [ps.fault_point] * 2,
                )

                if ps.upstream_prot_id:
                    ps.prot_dev = GetDevice(
                        ps.upstream_prot_id, ps.all_device_type)
                    ps.prot_instrument_list = ListInstruments(
                        ps.all_instrument_type, ps.upstream_prot_id
                    )
                    ps.prot_nv_id = QueryInfoDevice(
                        "NestedViewId", ps.upstream_prot_id, ps.prot_dev.DeviceType
                    )

                if ps.prot_dev:
                    ps.prot_eq_id = ps.prot_dev.EquipmentID

                    ps.prot_normal_status = ps.prot_dev.GetValue(
                        "NormalStatus")
                    ps.prot_tcc_desc = QueryInfoDevice(
                        "TccDesc", ps.upstream_prot_id, ps.prot_dev.DeviceType, -1
                    ).strip()

                if ps.prot_instrument_list:
                    for inst in ps.prot_instrument_list:
                        if inst.InstrumentType != 1:
                            ps.protection_vendor.append(
                                inst.GetValue("Manufacturer"))
                            ps.protection_type.append(
                                inst.GetValue("ProtectionType"))
                            ps.relay_type.append(inst.GetValue("RelayType"))
                            ps.instrument_type.append(inst.GetObjType())
                            ps.instrument_number.append(inst.InstrumentNumber)

                print_and_write(
                    "\nSource Equivalent Fault Level Used: {}\n".format(Level)
                )
                print_and_write(
                    "\n{:<25} {} [{}]".format(
                        "Upstream Protection:",
                        ps.upstream_prot_id,
                        ps.upstream_prot_type,
                    )
                )

                if ps.prot_tcc_desc:
                    print_and_write("\n{}".format(ps.prot_tcc_desc))

                print_and_write(
                    "\n{:<25} {}".format(
                        "Normal Status:", ps.prot_normal_status)
                )

                if ps.protection_vendor:
                    print_and_write(
                        "\n{:<25} {}".format(
                            "Manufacturer:", ps.protection_vendor)
                    )

                if ps.instrument_number:
                    print_and_write(
                        "\n{:<25} {}".format(
                            "Instrument Number:", ps.instrument_number)
                    )

                if ps.instrument_type:
                    print_and_write(
                        "\n{:<25} {}".format(
                            "Instrument Type:", ps.instrument_type)
                    )

                if ps.protection_type:
                    print_and_write(
                        "\n{:<25} {}".format(
                            "Protection Type:", ps.protection_type)
                    )

                if ps.relay_type:
                    print_and_write("\n{:<25} {}\n".format(
                        "Relay Type:", ps.relay_type))

                print_and_write("\n{}".format(ps.table_separator))

                # Loop through equipment to print Equipment Database information
                for Eq in ps.equipment_list:
                    print_and_write("\n[{}]".format(Eq[0]))

                    # Two-Winding Transformer and Autotransformer
                    if Eq[1] in [1, 42]:
                        (
                            Type,
                            XfmrType,
                            Z1PU,
                            Z0PU,
                            X1R1,
                            X0R0,
                            PrimVolts,
                            SecVolts,
                            KVAnom,
                            KVATot,
                            Conn,
                        ) = queryDevice(ps.xfmr_equipment, Eq[2], Eq[1])
                        print_and_write("\n{}".format(XfmrType))
                        if Type == "Single-phase":
                            print_and_write(
                                "\n {} x {} kVA".format(Type, KVAnom))
                        else:
                            print_and_write("\nType: {}".format(Type))
                            print_and_write(
                                "\nTotal Nominal Bank Rating: {} kVA".format(
                                    KVATot)
                            )
                            print_and_write(
                                "\n{} kVLL x {} kVLL".format(
                                    PrimVolts, SecVolts)
                            )
                            print_and_write(
                                "\nWinding Configuration: {}".format(Conn))
                            print_and_write(
                                "\nZ1: {}%, Z0: {}%".format(Z1PU, Z0PU))
                            print_and_write(
                                "\nX1/R1: {}, X0/R0: {}".format(X1R1, X0R0))
                    elif Eq[1] == 33:
                        ps.phase_number = Eq[3]

                        (
                            Type,
                            Z0PU,
                            Z1PU,
                            X0R0,
                            X1R1,
                            PrimVolts,
                            SecVolts,
                            InsulationType,
                            Conn,
                            KVANom,
                        ) = queryDevice(ps.xfmr_equipment_by_phase, Eq[2], Eq[1])
                        print_and_write("\n{} : {} kVA".format(Type, KVANom))
                        print_and_write(
                            "\n{} kV x {} kV".format(PrimVolts, SecVolts))

                        print_and_write(
                            "\nInsulation: {}".format(InsulationType))
                        print_and_write("\nZ: {}%".format(Z1PU))
                        print_and_write("\nX/R: {}".format(X1R1))

                    elif Eq[1] == 9:
                        print_and_write("\nSeries Reactor")
                        RatedCurrent, ReactanceOhms = get_value_eq(
                            ps.reactor_info, Eq[0], ps.eq_type_sreactor
                        )
                        print_and_write(
                            "\nRated Current:       {:<8.2f} amps/Phase".format(
                                RatedCurrent
                            )
                        )
                        print_and_write(
                            "\nInductive Reactance: {:<8.4f} ohms/Phase".format(
                                ReactanceOhms
                            )
                        )
                    elif Eq[1] == 10:  # cympy.enums.DeviceType.Underground
                        print_and_write("\nUnderground Cable")
                        R1, X1, R0, X0, ImpedancesNote, Comments = get_value_eq(
                            ps.cable_info, Eq[0], ps.eq_type_cable
                        )

                        print_and_write(
                            "\nZ1: {:>8.4f} + j{:<8.4f} ohms/km".format(R1, X1)
                        )
                        print_and_write(
                            "\nZ0: {:>8.4f} + j{:<8.4f} ohms/km".format(R0, X0)
                        )
                        print_and_write(
                            "\n" +
                            textwrap.fill("Comments: {}".format(Comments), 70)
                        )
                        if ImpedancesNote:
                            print_and_write(
                                "\n" +
                                textwrap.fill("{}".format(ImpedancesNote), 70)
                            )

                    elif Eq[1] == 11:  # cympy.enums.DeviceType.OverheadLine
                        print_and_write("\nOverhead Line")
                        R1, X1, R0, X0, PhCond, NeCond, Spacing, Comments = (
                            get_value_eq(
                                ps.line_info, Eq[0], ps.eq_type_ohline)
                        )
                        print_and_write(
                            "\nZ1: {:>8.4f} + j{:<8.4f} ohms/km".format(R1, X1)
                        )
                        print_and_write(
                            "\nZ0: {:>8.4f} + j{:<8.4f} ohms/km".format(R0, X0)
                        )
                        print_and_write(
                            "\nPhase Conductor:   {}".format(PhCond))
                        print_and_write(
                            "\nNetural Conductor: {}".format(NeCond))
                        print_and_write(
                            "\nConductor Spacing: {}".format(Spacing))
                        print_and_write(
                            "\n" +
                            textwrap.fill("Comments: {}".format(Comments), 70)
                        )
                    elif Eq[1] == "Source":
                        print_and_write("\nSource Equivalent")
                        R1max, X1max, R0max, X0max, R1min, X1min, R0min, X0min = (
                            queryNode(ps.source_info, ps.source_name)
                        )
                        print_and_write(
                            "\nLow Fault Level Z1:  {:>8.4f} + j{:<8.4f} ohms/km".format(
                                R1max, X1max
                            )
                        )
                        print_and_write(
                            "\nLow Fault Level Z0:  {:>8.4f} + j{:<8.4f} ohms/km".format(
                                R0max, X0max
                            )
                        )
                        print_and_write(
                            "\nHigh Fault Level Z1: {:>8.4f} + j{:<8.4f} ohms/km".format(
                                R1min, X1min
                            )
                        )
                        print_and_write(
                            "\nHigh Fault Level Z0: {:>8.4f} + j{:<8.4f} ohms/km".format(
                                R0min, X0min
                            )
                        )
                        print_and_write("\nComments:")
                        if not Eqt.GetEquipment(
                            ps.source_name, ps.eq_type_station
                        ) or not GetDevice(ps.network_id, ps.dev_type_source):
                            # if self.source_name can't be found in the Equipment database or a Source Device doesn't exist in the network being studied
                            print_and_write("User Defined Source Equivalent")
                        else:
                            print_and_write(
                                "\n"
                                + textwrap.fill(
                                    Eqt.GetValue(
                                        "Comments", ps.source_name, ps.eq_type_station
                                    ),
                                    70,
                                )
                            )
                    else:
                        print_and_write(
                            "\nError: Equipment in study that is not being modeled above"
                        )
                    print_and_write("\n")
                    # print("\n{}".format(ps.table_separator))
                    print_and_write("\n{}".format(ps.table_separator))

            ps.network_param = []
            ps.equipment_type = []
            ps.equipment_list = []
            ps.instrument_type = []
            ps.relay_type = []
            ps.protection_type = []
            ps.protection_vendor = []
            ps.instrument_number = []

        # Rest of the script logic goes here...
        # E.g., setup_study_parameters(), run_short_circuit_analysis(), generate_report()


if __name__ == "__main__":
    locale.setlocale(locale.LC_NUMERIC, "")
    App.ActivateRefresh(False)
    try:
        PowerSystemAnalysis().run()
    except:
        traceback.print_exc()
    ActivateModifications(True)
    #
    # Short Circuit Report Script
    # Version 1.2 - Revised 2020-Nov-20 by Kan Tang and Paul Therrien to correct Source Equivalent issue when User Defined
    # Equivalent impedances are used. Also removed 'INT_WIRE' entries fromprinting out in the console and the text file.
    # Version 1.1 - Revised 2020-Oct-30 by Paul Therrien to correct 1ph OH line and 1ph cable device impedance calculation
    # Version 1.0 - Created 2020-Oct-14 by Paul Therrien
    #
    # This script will trace and list out all of the series impedance devices between a node indentified as Fault_Point,
    # up to the source node. The results will be dumped into a txt file.
    #
