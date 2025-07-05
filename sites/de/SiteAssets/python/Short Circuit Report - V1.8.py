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
import cympy
import webbrowser

Report_Name = "Short Circuit Report - BCH v1.8"


# This script will trace and list out all of the series impedance devices between a node indentified
# as 'FAULT_POINT', up to the source node. The results will be dumped into a txt file.
##############################################################################
######## Added for Emission Study#############################################
class EmissionStudy:
    PATH = "http://pq.bchydro.bc.ca:100/pqtools_MVresults.php?"
    METHOD = 2
    SECTION = 0
    POWER_FACTOR = {
        "Residential": 1.00,
        "Commercial": 0.96,
        "Industrial": 0.94,
        "Non-Buildings": 0.99,
        "Temporary": 0.92,
    }
    FEEDER_LIMIT = {
        "4": [4.16, 2.16],
        "12": [12.47, 6.48],
        "25": [24.94, 12.96],
    }
    CONNECTION_TYPE = {
        "1PH": 1,
        "3PH Y": 34,
        "3PH D": 33,
    }
    DISTURBING_LOAD = {
        "YES": 2,
        "NO": 3,
    }
    SPOT_DEV_TYPE = cympy.enums.DeviceType.SpotLoad

    def __init__(self, POI, network_id, distance, R1, X1, R0, X0):
        self.FeederID = network_id
        self.POI = POI
        self.Distance = distance
        (self.R1, self.X1, self.R0, self.X0) = (R1, X1, R0, X0)
        self.FeederLimit = 6.48
        self.KVLL = 12.47
        self.CustLoadMVA = 0
        self.EstimatedLVMVA = 0
        self.ConnectionType = 34
        self.DisturbingLoad = 3
        self.PhaseCount = 3

    def ReadInputs(self):
        (
            self.Customer_Type,
            self.Connection,
            self.Disturbing,
            self.CustLoadMW,
            self.EmissionStudy,
        ) = map(
            cympy.GetInputParameter,
            [
                "Customer_Type",
                "Connection_Type",
                "Disturbing_Load",
                "Customer_Load",
                "Emission_Study",
            ],
        )

    def GetVariables(self):
        self.PowerFactor = self.POWER_FACTOR[self.Customer_Type]
        self.ConnectionType = self.CONNECTION_TYPE[self.Connection]
        self.DisturbingLoad = self.DISTURBING_LOAD[self.Disturbing]
        self.PhaseCount = cympy.study.QueryInfoNode("PhaseCount", self.POI)
        self.KVLL, self.FeederLimit = self.FEEDER_LIMIT[self.FeederID[4:6]]

    def CalculateLoads(self):
        self.CustLoadMVA = round(self.CustLoadMW / self.PowerFactor, 2)

        SpotLoads = cympy.study.ListDevices(self.SPOT_DEV_TYPE, self.FeederID)
        
        self.MVLoad = sum(
            float(
                cympy.study.QueryInfoDevice(
                    "SpotKVAT", Spot.DeviceNumber, self.SPOT_DEV_TYPE
                )
            )
            for Spot in SpotLoads
            if "INT_" in Spot.DeviceNumber
        )
        self.LVLoad = sum(
            float(
                cympy.study.QueryInfoDevice(
                    "SpotKVAT", Spot.DeviceNumber, self.SPOT_DEV_TYPE
                )
            )
            for Spot in SpotLoads
            if "INT_" not in Spot.DeviceNumber
        )

        self.EstimatedLVMVA = self.LVLoadRatio = 0
        _TotalMVA = (self.MVLoad + self.LVLoad) / 1000 + self.CustLoadMVA
        if _TotalMVA > self.FeederLimit:
            print("Warning: The load will be over the feeder limit")
            self.EstimatedLVMVA = round(
                self.FeederLimit - self.CustLoadMVA - self.MVLoad / 1000, 2
            )
        else:
            self.LVLoadRatio = self.LVLoad / (1000 * _TotalMVA)
            self.EstimatedLVMVA = round(self.LVLoadRatio * self.FeederLimit, 2)

    def SetParameters(self):

        self._Variables = [
            f"f={self.METHOD}",
            f"section={self.SECTION}",
            f"cct={self.FeederID}",
            f"kV={self.KVLL}",
            f"R1={self.R1}",
            f"X1={self.X1}",
            f"R0={self.R0}",
            f"X0={self.X0}",
            f"distance={self.Distance}",
            f"phase={self.PhaseCount}",
            f"St={self.FeederLimit}",
            f"cPh={self.ConnectionType}",
            f"Si={self.CustLoadMVA}",
            f"alpha={self.DisturbingLoad}",
            f"Slv={self.EstimatedLVMVA}",
        ]

    def GetReport(self, file):
        _link = self.PATH + "&".join(self._Variables)
        webbrowser.open_new(_link)

        def print_and_write(label, value):
            if value:
                print(f"\n{label:<30} {value:<8}")
                file.write(f"\n{label:<30} {value:<8}")

        _content = [
            ["Feeder:", self.FeederID],
            ["Voltage:", self.KVLL],
            ["R1:", self.R1],
            ["X1:", self.X1],
            ["R0:", self.R0],
            ["X0:", self.X0],
            ["Distance:", self.Distance],
            ["Phase:", self.PhaseCount],
            ["Feeder Planning Limit:", self.FeederLimit],
            ["Connection Type:", self.Connection],
            ["Customer Type:", self.Customer_Type],
            ["Power Factor:", self.PowerFactor],
            ["Current MV Load (MVA):", round(self.MVLoad / 1000, 2)],
            ["Customer Demand (MW):", round(self.CustLoadMW, 2)],
            ["Customer Demand (MVA):", round(self.CustLoadMVA, 2)],
            ["Current LV Load (MVA):", round(self.LVLoad / 1000, 2)],
            ["Percentage of LV Load %:", round(self.LVLoadRatio * 100, 2)],
            ["Max. LV Load (MVA):", round(self.EstimatedLVMVA, 2)],
            ["Disturbing Load:", self.Disturbing],
            ["Link to Report:", f"\n{_link}"],
        ]
        print_and_write("", "\n")
        for c in _content:
            print_and_write(*c)


##############################################################################


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

    if not cympy.study.GetDevice(network_id, cympy.enums.DeviceType.Source):
        Source_Name = network_id
    else:
        Source_Name = cympy.study.QueryInfoNode(
            "$UpstreamSource$",
            "FAULT_POINT",
            # Keyword $UpstreamSource$ doesn't work when using a 'User Defined Equivalent' Source Type (causes a crash in Cyme 8.2)
        )

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

##############################################################################
######## Added for Emission Study#############################################
    ES = EmissionStudy(
        "FAULT_POINT", Source_Name, Dist_to_Sub, R1ohm, X1ohm, R0ohm, X0ohm
    )
##############################################################################

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
            if not cympy.eq.GetEquipment(
                Source_Name, cympy.enums.EquipmentType.Substation
            ) or not cympy.study.GetDevice(network_id, cympy.enums.DeviceType.Source):
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

##############################################################################
######## Added for Emission Study#############################################
    ES.ReadInputs()
    if ES.EmissionStudy:
        ES.GetVariables()
        ES.CalculateLoads()
        ES.SetParameters()
        # Report to text file
        ES.GetReport(textfile)
###############################################################################

    textfile.close()