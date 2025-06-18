import math
import os, sys, traceback, locale
import textwrap
from datetime import datetime
from cympy.study import *
from cympy import app as App
from cympy import eq as Eqt
from cympy import sim as Sim


def initialize_globals():
    # Initialize global variables and check preconditions for the script execution.

    global Source_Name, Network_Id, Nominal_Voltage, Operating_Voltage
    global Len_Unit, Rep_Loc, Patch_Mode, Fault_Point, Config_Num, SC_Sim
    global LG_Fault_Resistance, LG_Fault_Reactance, LLL_Fault_Resistance, LLL_Fault_Reactance
    global p, InstType, RelayType, protType, protInstManu, InstID
    global FaultCurrentList, VariablesList, TableVariables, XfmrDevice, XfmrDeviceByPhase, XfmrEquipment, XfmrEquipmentByPhase
    global ReactorInfo, CableInfo, LineInfo, SourceInfo, NetworkParam, EquipmentList
    global Itr_Upstream, Itr_StopOnOpen, All_Device_Type, Eq_Type_Station, All_Instrument_Type, Eq_Type_SReactor, Eq_Type_Cable, Eq_Type_OHLine, Dev_Type_Source
    global Table_Header_Format, Table_Row_Format, Table_Header, Table_Seperatir

    locale.setlocale(locale.LC_NUMERIC, "")

    if not ListNetworks:
        raise ValueError("Error: No study is loaded")

    Itr_Upstream = cympy.enums.IterationOption.Upstream
    Itr_StopOnOpen = cympy.enums.IterationRestriction.StopOnOpen
    All_Device_Type = cympy.enums.DeviceType.AllDevices
    Eq_Type_Station = cympy.enums.EquipmentType.Substation
    All_Instrument_Type = cympy.enums.InstrumentType.AllInstruments
    Eq_Type_SReactor = cympy.enums.EquipmentType.SeriesReactor
    Eq_Type_Cable = cympy.enums.EquipmentType.Cable
    Eq_Type_OHLine = cympy.enums.EquipmentType.OverheadLine
    Dev_Type_Source = cympy.enums.DeviceType.Source
    Table_Header_Format = "{:<56}{:>8}{:>11}{:>10}{:>8}{:>8}{:>8}{:>10}{:>8}{:>8}{:>8}"
    Table_Row_Format = "{:<56}{:>8.1f}{:>11.1f}{:>10.4f}{:>8.4f}{:>8.4f}{:>8.4f}{:>10.4f}{:>8.4f}{:>8.4f}{:>8.4f}"

    get_info_network()
    setup_study_parameters()
    initialize_study_variables()


def get_info_network():
    global Source_Name, Network_Id, Nominal_Voltage, Operating_Voltage

    Nominal_List = [4.16, 12.47, 24.94]
    Operating_List = [4.28, 12.6, 25.2]
    # Check if a study is loaded and a valid Fault_Point is provided
    Network_Id = QueryInfoNode("$NetworkId$", Fault_Point)
    # sourcery skip: use-or-for-fallback
    Source_Eq = Eqt.GetEquipment(Network_Id, Eq_Type_Station)

    if not Source_Eq:
        Source_Eq = Eqt.GetEquipment("DEFAULT", Eq_Type_Station)

    Nominal_Voltage = locale.atof(Source_Eq.GetValue("NominalKVLL"))
    if Nominal_Voltage in Nominal_List:
        Operating_Voltage = [
            b for a, b in zip(Nominal_List, Operating_List) if Nominal_Voltage == a
        ][0]
    elif Nominal_Voltage in Operating_List:
        Operating_Voltage = Nominal_Voltage
    else:
        Operating_Voltage = locale.atof(Source_Eq.GetValue("DesiredKVLL"))

    if Operating_Voltage not in Operating_List:
        raise ValueError("Error: Nominal Voltage is incorrect")

    Source_Name = QueryInfoNode("$UpstreamSource$", Fault_Point)

    if not Source_Name:
        Source_Name = Network_Id

    Source_Eq.SetValue(Operating_Voltage, "NominalKVLL")

    SetValueTopo(
        Operating_Voltage,
        "Sources[0].EquivalentSourceModels[0].EquivalentSource.KVLL",
        Source_Name,
    )


def setup_study_parameters():
    global Len_Unit, Rep_Loc, Patch_Mode, Fault_Point, Config_Num, SC_Sim
    global LG_Fault_Resistance, LG_Fault_Reactance, LLL_Fault_Resistance, LLL_Fault_Reactance

    Len_Unit = App.GetKeyword("Length").Unit

    # Study parameters
    Current_Datetime = datetime.now().strftime("%Y-%m-%d-h%Hm%Ms%S")
    Fault_Point = cympy.GetInputParameter("Fault_Point")

    if QueryInfoNode("$NodeId$", Fault_Point) == "":
        raise ValueError("Error: Not Fault_Point")

    Patch_Mode = cympy.GetInputParameter("Patch_Mod")
    Fault_Resistance = cympy.GetInputParameter("Fault_Resistance")

    Report_FileName = (
        "SC-Report-" + Source_Name.replace("_", "-") + "-" + Current_Datetime + ".txt"
    )
    Rep_Loc = cympy.GetInputParameter("Report_Location") + Report_FileName

    SC_Sim = Sim.ShortCircuit()
    Active_Config = SC_Sim.GetValue("ActiveConfigurationID")
    Config_Count = SC_Sim.GetValue("ParametersConfigurations.Count")

    Config_Num = 0
    while Config_Num < int(Config_Count) - 1:
        if Active_Config != SC_Sim.GetValue(
            "ParametersConfigurations[{}].ConfigID".format(Config_Num)
        ):
            Config_Num += 1
        break

    if Fault_Resistance == 0:
        (
            LG_Fault_Resistance,
            LG_Fault_Reactance,
            LLL_Fault_Resistance,
            LLL_Fault_Reactance,
        ) = [0, 0, 0, 0]
    elif Fault_Resistance == 1:
        (
            LG_Fault_Resistance,
            LG_Fault_Reactance,
            LLL_Fault_Resistance,
            LLL_Fault_Reactance,
        ) = [40, 0, 8, 0]
    else:
        raise ValueError("Error: Fault_Resistance value has to be 0 or 1")

    map(
        SC_Sim.SetValue,
        [
            LG_Fault_Resistance,
            LG_Fault_Reactance,
            LLL_Fault_Resistance,
            LLL_Fault_Reactance,
            "BaseVoltage",
        ],
        [
            "ParametersConfigurations[{}].LGFaultResistanceOHMS".format(Config_Num),
            "ParametersConfigurations[{}].LGFaultReactanceOHMS".format(Config_Num),
            "ParametersConfigurations[{}].LLLFaultResistanceOHMS".format(Config_Num),
            "ParametersConfigurations[{}].LLLFaultReactanceOHMS".format(Config_Num),
            "ParametersConfigurations[{}].PreFaultVoltage".format(Config_Num),
        ],
    )


def initialize_study_variables():
    global p, InstType, RelayType, protType, protInstManu, InstID, Table_Header, Table_Seperatir
    global FaultCurrentList, VariablesList, TableVariables, XfmrDevice, XfmrDeviceByPhase, XfmrEquipment, XfmrEquipmentByPhase
    global ReactorInfo, CableInfo, LineInfo, SourceInfo, NetworkParam, EquipmentList

    p = 0

    # Group keywords for study results
    FaultCurrentList = [
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
    VariablesList = [
        "PrefaultVoltage",
        "R1ohm",
        "X1ohm",
        "R0ohm",
        "X0ohm",
        "Distance",
        "Latitude",
        "Longitude",
    ]
    TableVariables = [
        "R1ohm",
        "X1ohm",
        "R0ohm",
        "X0ohm",
        "Distance",
        "PhaseCount",
        "CableNbParallel",
    ]
    XfmrDevice = [
        "$EqCode$",
        "$EqId$",
        "$XfoKVANomTot$",
        "$XfoZ1$",
        "$XfoZ0$",
        "$XfoX1R1Ratio$",
        "$XfoX0R0Ratio$",
        "$XfoKVLL1$",
        "$XfoKVLL2$",
    ]
    XfmrDeviceByPhase = [
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
    XfmrEquipment = [
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
    XfmrEquipmentByPhase = [
        "$XfoByPhaseXfoType{}$".format(p),
        "$XfoByPhaseZ0{}$".format(p),
        "$XfoByPhaseZ1{}$".format(p),
        "$XfoByPhaseX0R0Ratio{}$".format(p),
        "$XfoByPhaseX1R1Ratio{}$".format(p),
        "$XfoByPhaseKvPrim{}$".format(p),
        "$XfoByPhaseKvSec{}$".format(p),
        "$XfoByPhaseInsulationType{}$".format(p),
        "$XfoByPhaseConnection$",
        "$XfoByPhaseKVANom{}$".format(p),
    ]
    ReactorInfo = ["RatedCurrent", "ReactanceOhms"]
    CableInfo = [
        "PositiveSequenceResistance",
        "PositiveSequenceReactance",
        "ZeroSequenceResistance",
        "ZeroSequenceReactance",
        "ImpedancesNote",
        "Comments",
    ]
    LineInfo = [
        "PositiveSequenceResistance",
        "PositiveSequenceReactance",
        "ZeroSequenceResistance",
        "ZeroSequenceReactance",
        "PhaseConductorID",
        "NeutralConductorID",
        "ConductorSpacingID",
        "Comments",
    ]
    SourceInfo = [
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
    Header_Txt = "|----Device Impedance(ohms)---|  |From Load side of Device(ohms)|"
    Table_Header = "Circuits: {:<46}{:>8}{:>11}{:>68}".format(
        Network_Id, "Length", "Distance", Header_Txt
    )
    Table_Seperatir = "—" * len(Table_Header)
    # Initialize a list for study results at each node/sections
    NetworkParam = []

    # Initialize a equipment list
    EquipmentList = []

    # Initialize variables for upstream protection
    InstType, RelayType, protType, protInstManu, InstID = (
        [],
        [],
        [],
        [],
        [],
    )


def queryNode(list_id, node_str):
    list_info = []
    for id in list_id:
        try:
            list_info.append(locale.atof(QueryInfoNode(id, node_str)))
        except:
            list_info.append(QueryInfoNode(id, node_str))
    return list_info


def queryDevice(list_id, dev_number, dev_type):
    list_info = []
    for id in list_id:
        try:
            list_info.append(locale.atof(QueryInfoDevice(id, dev_number, dev_type)))
        except:
            list_info.append(QueryInfoDevice(id, dev_number, dev_type))
    return list_info


def GetValueEquipment(list_id, eq_name, eq_type):
    list_info = []

    for id in list_id:
        try:
            list_info.append(locale.atof(Eqt.GetValue(id, eq_name, eq_type)))
        except:
            list_info.append(Eqt.GetValue(id, eq_name, eq_type))
    return list_info


def main():
    """
    Main function to execute the script logic.
    """
    initialize_globals()

    protDevNum, protDevType, protDesc = map(
        QueryInfoNode,
        ["UpstreamProtId", "UpstreamProtType", "TccDesc"],
        [Fault_Point] * 3,
    )
    protDev = GetDevice(protDevNum, All_Device_Type)
    protInst = ListInstruments(All_Instrument_Type, protDevNum)
    protDevId = protDev.EquipmentID
    protDevEq = QueryInfoDevice("NestedViewId", protDevNum, protDev.DeviceType)
    NormalStatus = protDev.GetValue("NormalStatus")
    protDesc = QueryInfoDevice("TccDesc", protDevNum, protDev.DeviceType, -1)

    for inst in protInst:
        if inst.InstrumentType != 1:
            protInstManu.append(inst.GetValue("Manufacturer"))
            protType.append(inst.GetValue("ProtectionType"))
            RelayType.append(inst.GetValue("RelayType"))
            InstType.append(inst.GetObjType())
            InstID.append(inst.InstrumentNumber)

    # set up study parameters

    # open the txt file for recording
    with open(Rep_Loc, "w") as textfile:
        textfile.write(Table_Header)
        print(Table_Header)

        # Create List: NetworkParam [Line Type, Line Length, Distance of section upstream node to sub
        # Total Section R1, Total Section X1, Total Section R0, Total Section X0
        # Thevenin R1, Thevenin X1Thevenin R0, Thevenin X0] used for the entire upstream network parameters, will store a list of lists

        # used to inventory all devices by equipment ID (OH Lines, Cables, Step up/down xfmrs, reactors, sources)

        # Append list Header_Txt
        NetworkParam.append(
            [
                "Equipment Type",
                "{}".format(Len_Unit),
                "to Sub{}".format(Len_Unit),
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
        if Patch_Mode == 1:
            # Iterator will start at Fault_Point node and step upstream section by section until it hits the source node
            iterator = NetworkIterator(
                Fault_Point,
                Itr_Upstream,
                Itr_StopOnOpen,
            )
            while iterator.Next():
                Sections = iterator.GetSection()
                DeviceList = ListDevices(
                    All_Device_Type,
                    "^" + Network_Id + "$",
                    "^" + Sections.ID + "$",
                )
                for Device in DeviceList:
                    MainLine = QueryInfoDevice(
                        "IsMainLine", Device.DeviceNumber, Device.DeviceType
                    )
                    PhaseCount = QueryInfoDevice(
                        "PhaseCount", Device.DeviceNumber, Device.DeviceType
                    )
                    if Device.DeviceType == 11:  # cympy.enums.DeviceType.OverheadLine
                        if MainLine == "Yes":
                            if PhaseCount == "3":
                                Device.SetValue("3P_336.4_ASC", "LineID")

                    elif Device.DeviceType == 10:  # cympy.enums.DeviceType.Underground
                        if MainLine == "Yes":
                            if PhaseCount == "3":
                                if (
                                    not Device.EquipmentID.startswith("3P_G4")
                                    and not Device.EquipmentID.startswith("3P_G16")
                                    and not Device.EquipmentID.startswith("3P_G13")
                                    and not Device.EquipmentID.startswith("3P_G14")
                                    and not Device.EquipmentID.startswith("3P_G17")
                                ):
                                    Device.SetValue(
                                        "3P_G15_-_1/C_500_KCM_CU_25_KV_XLPE", "CableID"
                                    )

        SC_Sim.Run()

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
        ) = queryNode(FaultCurrentList, Fault_Point)
        (
            PreFaultVolts,
            R1ohm,
            X1ohm,
            R0ohm,
            X0ohm,
            Dist_to_Sub,
            Latitude,
            Longitude,
        ) = queryNode(VariablesList, Fault_Point)
        Three_I0 = max(LG_max, LLG_3Io)
        Three_I0_imp = max(LG_imp, LLG_imp_3Io)

        NetworkParam.append(
            [
                "FAULT POINT (Lat.:{:.5f}, Long.:{:.5f})".format(Latitude, Longitude),
                0,
                Dist_to_Sub,
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

        iterator = NetworkIterator(
            Fault_Point,
            Itr_Upstream,
            Itr_StopOnOpen,
        )

        while iterator.Next():
            Node = iterator.GetNode()
            Sections = iterator.GetSection()
            Length = Sections.Length
            DeviceList = ListDevices(
                All_Device_Type,
                "^" + Network_Id + "$",
                "^" + Sections.ID + "$",
            )
            #print(Node, Sections, Length)

            DeviceList.reverse()

            (
                R1ohm,
                X1ohm,
                R0ohm,
                X0ohm,
                Dist_UpStream,
                Ph_Num_UpStream,
                Parallel_Run,
            ) = queryNode(TableVariables, Node.ID)

            if Node.ID == Sections.ToNode.ID:
                (
                    R1FN,
                    X1FN,
                    R0FN,
                    X0FN,
                    Dist_DownStream,
                    Ph_Num_DownStream,
                    Parallel_Run,
                ) = queryNode(TableVariables, Sections.FromNode.ID)
            elif Node.ID == Sections.FromNode.ID:
                (
                    R1FN,
                    X1FN,
                    R0FN,
                    X0FN,
                    Dist_DownStream,
                    Ph_Num_DownStream,
                    Parallel_Run,
                ) = queryNode(TableVariables, Sections.ToNode.ID)
            else:
                raise ValueError("Error: Iterator went wrong")

            # print(round(Dist_toNode - Dist_to_Sub,1), round(Length,1))
            if abs(Dist_DownStream - Dist_UpStream) - abs(Length) > 1:
                raise ValueError("Error: The distance and the length do not match")
            # continue

            # this for loop is used to build the NetworkParam list entries for each type of Equipment of importance. It's also used to build the EquipmentList
            for Device in DeviceList:
                #print(Device.GetObjType())
                # Two-Winding Step up/down Transformer and Autotransformers
                DeviceObj = Device.GetObjType()

                if (
                    Device.DeviceType == 1 or Device.DeviceType == 42
                ):  # cympy.enums.DeviceType.Transformer or cympy.enums.DeviceType.AutoTransformer
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
                    ) = queryDevice(XfmrDevice, Device.DeviceNumber, Device.DeviceType)
                    Length = 0.0
                    XfZ1ohms_Mag = (Z1PU * SecVolts * SecVolts * 10) / XfmrKVA
                    XfZ0ohms_Mag = (Z0PU * SecVolts * SecVolts * 10) / XfmrKVA

                    # Impedance of transformer with respect to high side
                    R1 = math.sqrt(pow(XfZ1ohms_Mag, 2) / (1 + pow(X1R1, 2)))
                    X1 = X1R1 * R1
                    R0 = math.sqrt(pow(XfZ0ohms_Mag, 2) / (1 + pow(X0R0, 2)))
                    X0 = X0R0 * R0

                    EquipmentList.append(
                        [Device.EquipmentID, Device.DeviceType, Device.DeviceNumber]
                    )
                    NetworkParam.append(
                        [
                            "{} : {}".format(XfmrType, XfmrID),
                            Length,
                            Dist_UpStream,
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

                # By-Phase Transformer
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
                        XfmrDeviceByPhase, Device.DeviceNumber, Device.DeviceType
                    )
                    Length = 0.0
                    XfZ1ohms_Mag = (Z1PU * pow(SecVolts, 2) * 10) / XfmrKVA
                    XfZ0ohms_Mag = (Z0PU * pow(SecVolts, 2) * 10) / XfmrKVA

                    R1 = math.sqrt(pow(XfZ1ohms_Mag, 2) / (1 + pow(X1R1, 2)))
                    X1 = X1R1 * R1
                    R0 = math.sqrt(pow(XfZ1ohms_Mag, 2) / (1 + pow(X1R1, 2)))
                    X0 = X0R0 * R0

                    EquipmentList.append(
                        [XfmrIDA, Device.DeviceType, Device.DeviceNumber, "A"]
                    )
                    EquipmentList.append(
                        [XfmrIDB, Device.DeviceType, Device.DeviceNumber, "B"]
                    )
                    EquipmentList.append(
                        [XfmrIDC, Device.DeviceType, Device.DeviceNumber, "C"]
                    )

                    NetworkParam.append(
                        [
                            "By-Phase Xfmr",
                            Length,
                            Dist_UpStream,
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

                # Series Reactor
                elif (
                    Device.DeviceType == 9  # cympy.enums.DeviceType.SeriesReactor
                    or Device.DeviceType == 4  # cympy.enums.DeviceType.Recloser
                    or Device.DeviceType == 2  # cympy.enums.DeviceType.Breaker
                    or Device.DeviceType == 7  # cympy.enums.DeviceType.Fuse
                ):
                    R1, X1, R0, X0 = (
                        R1FN - R1ohm,
                        X1FN - X1ohm,
                        R0FN - R0ohm,
                        X0FN - X0ohm,
                    )
                    Length = 0.0
                    # if any(Device.DeviceNumber in Eq for Eq in EquipmentList) and NetworkParam[-1][0] == 'Series Reactor: {}'.format(Device.EquipmentID):
                    # NetworkParam.pop()
                    # NetworkParam.append(['Series Reactor: {}'.format(Device.EquipmentID), Length, Dist_to_Sub,
                    # R1, X1, R0, X0, R1ohm, X1ohm, R0ohm, X0ohm])
                    # if any(Device.DeviceNumber in Eq for Eq in EquipmentList):
                    # continue
                    # else:
                    EquipmentList.append(
                        [Device.EquipmentID, Device.DeviceType, Device.DeviceNumber]
                    )
                    if Device.DeviceType == 9:
                        NetworkParam.append(
                            [
                                "{}: {}".format(DeviceObj, Device.EquipmentID),
                                0,
                                Dist_UpStream,
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
                    else:
                        NetworkParam.append(
                            [
                                "{}: {}".format(DeviceObj, Device.EquipmentID),
                                0,
                                Dist_UpStream,
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
                    #print(Length)

                # UG Cable
                elif Device.DeviceType == 10:
                    LineID = "{}: {}(*{})".format(
                        DeviceObj, Device.EquipmentID, Parallel_Run
                    )

                    # calculate the impedance at the From node
                    #print(Ph_Num_UpStream)
                    #print(Ph_Num_DownStream)
                    if ((Ph_Num_UpStream == 3 or Ph_Num_UpStream == 2)
                        and Ph_Num_DownStream == 1
                    ):
                        R1 = (2 * R1ohm + R0ohm) / 3
                        X1 = (2 * X1ohm + X0ohm) / 3
                        R0 = R1
                        X0 = X1
                    else:
                        R1, X1, R0, X0 = R1ohm, X1ohm, R0ohm, X0ohm
                    #print(R1, X1, R0, X0)
                    #print(R1FN, X1FN, R0FN, X0FN)
                    #print(R1ohm, X1ohm, R0ohm, X0ohm)
                    ## Same equipment as last section, add it up
                    if NetworkParam[-1][0] == LineID:

                        (
                            _,
                            Len,
                            _,
                            Sec_R1,
                            Sec_X1,
                            Sec_R0,
                            Sec_X0,
                            R1p,
                            X1p,
                            R0p,
                            X0p,
                        ) = NetworkParam.pop()

                        NetworkParam.append(
                            [
                                LineID,
                                (Len + Length),
                                Dist_UpStream,
                                Sec_R1+(R1p - R1),
                                Sec_X1+(X1p - X1),
                                Sec_R0+(R0p - R0),
                                Sec_X0+(X0p - X0),
                                R1ohm,
                                X1ohm,
                                R0ohm,
                                X0ohm,
                            ]
                        )

                    # different than last section
                    else:
                        NetworkParam.append(
                            [
                                LineID,
                                Length,
                                Dist_UpStream,
                                (R1FN - R1),
                                (X1FN - X1),
                                (R0FN - R0),
                                (X0FN - X0),
                                R1ohm,
                                X1ohm,
                                R0ohm,
                                X0ohm,
                            ]
                        )
                        # if UG cable type doesn't already exist in the EquipmentList, add it to the list
                        if (
                            not any(Device.EquipmentID in Eq for Eq in EquipmentList)
                            and Device.EquipmentID != "INT_WIRE"
                        ):
                            EquipmentList.append(
                                [Device.EquipmentID, Device.DeviceType]
                            )

                    #print(Length)

                # OH Line
                elif Device.DeviceType == 11:
                    LineID = "{}: {}".format(DeviceObj, Device.EquipmentID)

                    # calculate the impedance at the From node
                    if (
                        (Ph_Num_UpStream == 3
                        or Ph_Num_UpStream == 2)
                        and Ph_Num_DownStream == 1
                    ):
                        # 1ph oh line impedances
                        R1 = (2 * R1ohm + R0ohm) / 3
                        X1 = (2 * X1ohm + X0ohm) / 3
                        R0 = R1
                        X0 = X1
                    else:  # 2ph and 3ph oh line impedances
                        R1, X1, R0, X0 = R1ohm, X1ohm, R0ohm, X0ohm
                    # same as the last section so continue to sum
                    #print(NetworkParam[-1])

                    if NetworkParam[-1][0] == LineID:
                        (
                            _,
                            Len,
                            _,
                            Sec_R1,
                            Sec_X1,
                            Sec_R0,
                            Sec_X0,
                            R1p,
                            X1p,
                            R0p,
                            X0p,
                        ) = NetworkParam.pop()
                        #print(R1, X1, R0, X0)
                        NetworkParam.append(
                            [
                                LineID,
                                (Len + Length),
                                Dist_UpStream,
                                Sec_R1+(R1p - R1),
                                Sec_X1+(X1p - X1),
                                Sec_R0+(R0p - R0),
                                Sec_X0+(X0p - X0),
                                R1ohm,
                                X1ohm,
                                R0ohm,
                                X0ohm,
                            ]
                        )
                    # different than last section
                    else:
                        NetworkParam.append(
                            [
                                LineID,
                                Length,
                                Dist_UpStream,
                                (R1FN - R1),
                                (X1FN - X1),
                                (R0FN - R0),
                                (X0FN - X0),
                                R1ohm,
                                X1ohm,
                                R0ohm,
                                X0ohm,
                            ]
                        )
                        # if the OH line type doesn't already exist in the EquipmentList, append it to the list
                        if not (any(Device.EquipmentID in Eq for Eq in EquipmentList)):
                            EquipmentList.append(
                                [Device.EquipmentID, Device.DeviceType]
                            )

            if QueryInfoNode("IsSourceNode", Node.ID) == "Yes":
                EquipmentList.append([Source_Name, "Source"])
                NetworkParam.append(
                    [
                        "SourceEquivalent: " + str(Source_Name),
                        Length,
                        Dist_UpStream,
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
            # Once iterator reaches the source node break out of while loop
            # instances were found where the interator continued back to points where there were loops

        # Source Equivalent Fault Level Used (ie. high or low)

        # print out the NetworkParam entries as a table to the Cyme console as well as to the text file

        for index, param in enumerate(NetworkParam):
            if not "INT_WIRE" in param[0]:
                if index == 0:
                    print(
                        Table_Header_Format.format(
                            param[0],
                            param[1],
                            param[2],
                            param[3],
                            param[4],
                            param[5],
                            param[6],
                            param[7],
                            param[8],
                            param[9],
                            param[10],
                        )
                    )
                    print("\n{}".format(Table_Seperatir))
                    textfile.write(
                        ("\n" + Table_Header_Format).format(
                            param[0],
                            param[1],
                            param[2],
                            param[3],
                            param[4],
                            param[5],
                            param[6],
                            param[7],
                            param[8],
                            param[9],
                            param[10],
                        )
                    )
                    textfile.write("\n{}".format(Table_Seperatir))
                else:
                    print(
                        Table_Row_Format.format(
                            param[0],
                            param[1],
                            param[2],
                            param[3],
                            param[4],
                            param[5],
                            param[6],
                            param[7],
                            param[8],
                            param[9],
                            param[10],
                        )
                    )
                    textfile.write(
                        ("\n" + Table_Row_Format).format(
                            param[0],
                            param[1],
                            param[2],
                            param[3],
                            param[4],
                            param[5],
                            param[6],
                            param[7],
                            param[8],
                            param[9],
                            param[10],
                        )
                    )
        print("\n{}".format(Table_Seperatir))
        textfile.write("\n{}".format(Table_Seperatir))
        textfile.write("\n\n")

        Level = QueryInfoNode("SourceFaultLevel", Sections.FromNode.ID)

        textfile.write(
            "\nFAULT POINT (Amps) {:>6}{:>6}{:>6}{:>6}{:>6}".format(
                "LLL", "LL", "LLG", "LG", "3Io"
            )
        )
        textfile.write(
            "\nBolted Faults: {:>10.0f}{:>6.0f}{:>6.0f}{:>6.0f}{:>6.0f}".format(
                LLL_max, LL_max, LLG_max, LG_max, Three_I0
            )
        )
        textfile.write(
            "\nImpedance Faults: {:>7.0f}{:>6.0f}{:>6.0f}{:>6.0f}{:>6.0f}\n".format(
                LLL_imp, LL_imp, LLG_imp, LG_imp, Three_I0_imp
            )
        )
        textfile.write("\nFault Impedance (ohms) {:>6}{:>6}".format("R", "X"))
        textfile.write(
            "\nZf-LLL: {:>21.2f}{:>6.2f}".format(
                LLL_Fault_Resistance, LLL_Fault_Reactance
            )
        )
        textfile.write(
            "\nZf-LG : {:>21.2f}{:>6.2f}".format(
                LG_Fault_Resistance, LG_Fault_Reactance
            )
        )
        textfile.write(
            "\nPrefault Voltage at Fault Point: {} kVLL".format(PreFaultVolts)
        )
        textfile.write("\nSource Equivalent Fault Level Used: {}\n".format(Level))
        textfile.write(
            "\nUpstream Protection:\t {} [{}] @ [{}]".format(
                protDevType, protDevNum, protDevEq
            )
        )
        textfile.write("\n{}".format(protDesc.strip()))
        textfile.write("\nNormal Status:\t {}".format(NormalStatus))
        textfile.write("\nManufacturer:\t {}".format(protInstManu))
        textfile.write("\nInstrument Number: {}".format(InstID))
        textfile.write("\nProtection Type:\t {}".format(protType))
        textfile.write("\nRelay Type:\t\t {}\n".format(RelayType))

        print(
            "\nUpstream Protection:\t {} [{}] @ [{}]".format(
                protDevType, protDevNum, protDevEq
            )
        )
        print("\n{}".format(protDesc))
        print("\nNormal Status:\t {}".format(NormalStatus))
        print("\nManufacturer:\t {}".format(protInstManu))
        print("\nInstrument Number: {}".format(InstID))
        print("\nProtection Type:\t {}".format(protType))
        print("\nRelay Type:\t\t {}\n".format(RelayType))
        print("\nDetailed Report Here:\t {}".format(Rep_Loc))

        # Loop through equipment to print Equipment Database information
        for Eq in EquipmentList:
            textfile.write("\n[{}]".format(Eq[0]))

            # Two-Winding Transformer and Autotransformer
            if Eq[1] == 1 or Eq[1] == 42:
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
                ) = queryDevice(XfmrEquipment, Eq[2], Eq[1])
                textfile.write("\n{}".format(XfmrType))
                if Type == "Single-phase":
                    textfile.write("\n {} x {} kVA".format(Type, KVAnom))
                else:
                    textfile.write("\nType: {}".format(Type))
                    textfile.write("\nTotal Nominal Bank Rating: {} kVA".format(KVATot))
                    textfile.write("\n{} kVLL x {} kVLL".format(PrimVolts, SecVolts))
                    textfile.write("\nWinding Configuration: {}".format(Conn))
                    textfile.write("\nZ1: {}%, Z0: {}%".format(Z1PU, Z0PU))
                    textfile.write("\nX1/R1: {}, X0/R0: {}".format(X1R1, X0R0))
            # By-phase Transformer
            elif Eq[1] == 33:
                p = Eq[3]

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
                ) = queryDevice(XfmrEquipmentByPhase, Eq[2], Eq[1])
                textfile.write("\n{} : {} kVA".format(Type, KVANom))
                textfile.write("\n{} kV x {} kV".format(PrimVolts, SecVolts))

                textfile.write("\nInsulation: {}".format(InsulationType))
                textfile.write("\nZ: {}%".format(Z1PU))
                textfile.write("\nX/R: {}".format(X1R1))

            # Series Reactor
            elif Eq[1] == 9:
                textfile.write("\nSeries Reactor")
                RatedCurrent, ReactanceOhms = GetValueEquipment(
                    ReactorInfo, Eq[0], Eq_Type_SReactor
                )
                textfile.write(
                    "\nRated Current:       {:<8.2f} amps/Phase".format(RatedCurrent)
                )
                textfile.write(
                    "\nInductive Reactance: {:<8.4f} ohms/Phase".format(ReactanceOhms)
                )
            # UG Cable
            elif Eq[1] == 10:  # cympy.enums.DeviceType.Underground
                textfile.write("\nUnderground Cable")
                R1, X1, R0, X0, ImpedancesNote, Comments = GetValueEquipment(
                    CableInfo, Eq[0], Eq_Type_Cable
                )
                textfile.write("\nZ1: {:>8.4f} + j{:<8.4f} ohms/km".format(R1, X1))
                textfile.write("\nZ0: {:>8.4f} + j{:<8.4f} ohms/km".format(R0, X0))
                textfile.write(
                    "\n" + textwrap.fill("Comments: {}".format(Comments), 70)
                )
                if ImpedancesNote:
                    textfile.write(
                        "\n" + textwrap.fill("{}".format(ImpedancesNote), 70)
                    )

            # OH Line
            elif Eq[1] == 11:  # cympy.enums.DeviceType.OverheadLine
                textfile.write("\nOverhead Line")
                R1, X1, R0, X0, PhCond, NeCond, Spacing, Comments = GetValueEquipment(
                    LineInfo, Eq[0], Eq_Type_OHLine
                )
                textfile.write("\nZ1: {:>8.4f} + j{:<8.4f} ohms/km".format(R1, X1))
                textfile.write("\nZ0: {:>8.4f} + j{:<8.4f} ohms/km".format(R0, X0))
                textfile.write("\nPhase Conductor:   {}".format(PhCond))
                textfile.write("\nNetural Conductor: {}".format(NeCond))
                textfile.write("\nConductor Spacing: {}".format(Spacing))
                textfile.write(
                    "\n" + textwrap.fill("Comments: {}".format(Comments), 70)
                )
            # Source Equivalent
            elif Eq[1] == "Source":
                textfile.write("\nSource Equivalent")
                R1max, X1max, R0max, X0max, R1min, X1min, R0min, X0min = queryNode(
                    SourceInfo, Source_Name
                )
                textfile.write(
                    "\nLow Fault Level Z1:  {:>8.4f} + j{:<8.4f} ohms/km".format(
                        R1max, X1max
                    )
                )
                textfile.write(
                    "\nLow Fault Level Z0:  {:>8.4f} + j{:<8.4f} ohms/km".format(
                        R0max, X0max
                    )
                )
                textfile.write(
                    "\nHigh Fault Level Z1: {:>8.4f} + j{:<8.4f} ohms/km".format(
                        R1min, X1min
                    )
                )
                textfile.write(
                    "\nHigh Fault Level Z0: {:>8.4f} + j{:<8.4f} ohms/km".format(
                        R0min, X0min
                    )
                )
                textfile.write("\nComments:")
                if not Eqt.GetEquipment(Source_Name, Eq_Type_Station) or not GetDevice(
                    Network_Id, Dev_Type_Source
                ):
                    # if Source_Name can't be found in the Equipment database or a Source Device doesn't exist in the network being studied
                    textfile.write("User Defined Source Equivalent")
                else:
                    textfile.write(
                        "\n"
                        + textwrap.fill(
                            Eqt.GetValue("Comments", Source_Name, Eq_Type_Station), 70
                        )
                    )
            else:
                textfile.write(
                    "\nError: Equipment in study that is not being modeled above"
                )
            textfile.write("\n")
    ActivateModifications(True)
    # Rest of the script logic goes here...
    # E.g., setup_study_parameters(), run_short_circuit_analysis(), generate_report()


if __name__ == "__main__":
    try:
        main()
    except:
        traceback.print_exc()


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
