from enum import Enum as _Enum

class _CymdistDataEnum_ParametersConfigTypeEnum(_Enum):
	Custom = 1
	Default = 2

class _CymdistDataEnum_LFCalculationMethodEnum(_Enum):
	VoltageDropUnbalanced = 1
	VoltageDropBalanced = 2
	FastDecoupled = 3
	GaussSeidel = 4
	NewtonRaphson = 5
	NewtonRaphsonUnbalanced = 6

class _CymdistDataEnum_SourceImpedanceSelectionEnum(_Enum):
	AsDefined = 1
	FirstLevel = 2
	SecondLevel = 3

class _CymdistDataEnum_LFTapOperationModeEnum(_Enum):
	Normal = 1
	Normal_LowestTap = 2
	Normal_HighestTap = 3
	Infinite = 4
	LockLTC = 5
	DisableTapChanger = 6

class _CymdistDataEnum_CFCalculationMethodEnum(_Enum):
	WeightedByCustomerTypes = 1
	WeightedByLoadValues = 2

class _CymdistDataEnum_LineTemperatureAdjustmentEnum(_Enum):
	Operating = 1
	ContinuousOperatingRating = 2
	UserDefined = 3

class _CymdistDataEnum_ImpedanceToleranceStandardEnum(_Enum):
	IEC = 1
	IEEE = 2
	UserDefined = 3

class _CymdistDataEnum_LoadFlowFactorTypeEnum(_Enum):
	UserIndividualSettings = 1
	Global = 2
	ByLoadType = 3
	ByZone = 4
	ByGeneratorType = 5
	ByMotorType = 6
	FromLibrary = 7
	ByNetwork = 8

class _CymdistDataEnum_LoadFlowSensitivityLoadTypeEnum(_Enum):
	Undefined = 1
	ZIP = 2
	Exp = 3
	Mixed = 4

class _CymdistDataEnum_EquipmentDBTypeEnum(_Enum):
	OldGeneratorDB = 1
	OldMotorDB = 2
	OldShuntSingleFrequencySourceDB = 3
	OldRelayControlledBreakerDB = 4
	NoEquipmentDB = 5
	SwitchingProtectingDeviceDB = 6
	SubstationDB = 7
	TransformerDB = 8
	RegulatorDB = 9
	SwitchDB = 10
	SectionalizerDB = 11
	FuseDB = 12
	RecloserDB = 13
	BreakerDB = 14
	LVCBDB = 15
	MiscellaneousSwitchingProtectingDeviceDB = 16
	SeriesCapacitorDB = 17
	SeriesReactorDB = 18
	ShuntCapacitorDB = 19
	ShuntReactorDB = 20
	ConductorDB = 21
	CableDB = 22
	OverheadLineDB = 23
	OverheadLineUnbalancedDB = 24
	OverheadSpacingOfConductorDB = 25
	DoubleCircuitSpacingDB = 26
	MiscellaneousDB = 27
	ArcFurnaceDB = 28
	CTypeFilterDB = 29
	DoubleTunedFilterDB = 30
	HighPassFilterDB = 31
	IdealConverterDB = 32
	NonIdealConverterDB = 33
	FrequencySourceDB = 34
	SingleTunedFilterDB = 35
	SynchronousGeneratorDB = 36
	InductionGeneratorDB = 37
	ElectronicConverterGeneratorDB = 38
	InductionMotorDB = 39
	SynchronousMotorDB = 40
	ThreeWindingTransformerDB = 41
	UDMDB = 42
	WecsDB = 43
	WindModelDB = 44
	GroundingTransformerDB = 45
	MicroTurbineDB = 46
	PhotovoltaicDB = 47
	SofcDB = 48
	InsolationModelDB = 49
	AutoTransformerDB = 50
	ThreeWindingAutoTransformerDB = 51
	SVCDB = 52
	NetworkProtectorDB = 53
	GeneratorCostCurveModelDB = 54
	BuswayDB = 55
	PhaseShifterTransformerDB = 56
	VariableFrequencyDriveDB = 57
	GenerationCurveModelDB = 58
	MotorCurveModelDB = 59
	LoadCurveModelDB = 60
	ChargerDB = 61
	DCUPSDB = 62
	DCMotorDB = 63
	BatteryDB = 64
	DCDCConverterDB = 65
	DCCableDB = 66
	DCLVCBDB = 67
	DCFuseDB = 68
	DCSwitchDB = 69
	PythonDeviceScriptDB = 70
	ConductorMaterialDB = 71
	InsulationMaterialDB = 72
	ConverterControlDB = 73
	BESSDB = 74
	ACDCConverterDB = 75
	VARCompensatorDB = 76
	DuctBankDB = 77
	FlickerCurveModelDB = 78
	ConverterFaultCurveModelDB = 79

class _CymGUIEnum_GUIDisplayLayerType(_Enum):
	Invalid = 1
	Custom = 2
	E_None = 3
	Phase = 4
	Feeder = 5
	FeederRandom = 6
	FeederMainLine = 7
	FeederMainLineRandom = 8
	Zone = 9
	ZoneRandom = 10
	DoubleCircuit = 11
	DoubleCircuitRandom = 12
	DuctBank = 13
	DuctBankRandom = 14
	Environment = 15
	EnvironmentRandom = 16
	Distance = 17
	Year = 18
	YearRandom = 19
	NewCustomers = 20
	NewCustomersRandom = 21
	LoadTransfer = 22
	LoadTransferRandom = 23
	ModifGroup = 24
	ModifGroupRandom = 25
	BaseVoltageLevel = 26
	Device = 27
	DeviceStage = 28
	DeviceStageRandom = 29
	FailureDensity = 30
	FailureCause = 31
	FailureType = 32
	ConductorSize = 33
	VoltageDip = 34
	LoadUnbalance = 35
	VoltageUnbalance = 36
	LoadingLevel = 37
	VoltageLevel = 38
	KVARLevel = 39
	LLLMaxFault = 40
	LLMaxFault = 41
	LGMaxFault = 42
	TCC = 43
	LLGMaxFault = 44
	LLLMinFault = 45
	LLMinFault = 46
	LLGMinFault = 47
	LGMinFault = 48
	ProtectiveReach = 49
	ProtectionZoneRandom = 50
	ProtectionLevel = 51
	VoltageRegulationLevel = 52
	CapacitorLevel = 53
	IntegrationCapacity_MaxNodeCapacity = 54
	IntegrationCapacity_AbnormalVoltages = 55
	IntegrationCapacity_ReverseFlow = 56
	IntegrationCapacity_ThermalLoading = 57
	IntegrationCapacity_VoltageVariations = 58
	IntegrationCapacity_Flicker = 59
	IntegrationCapacity_VoltageUnbalance = 60
	IntegrationCapacity_RegulatorBandwidthVariation = 61
	IntegrationCapacity_FaultCurrentVariation = 62
	IntegrationCapacity_GenerationToLoadRatio = 63
	IntegrationCapacity_ProtectionReach = 64
	IntegrationCapacity_SympatheticTrip = 65
	IntegrationCapacity_MinimumFaultClearance = 66
	EPRIDrive_MaxNodeCapacity = 67
	EPRIDrive_DistributedDER = 68
	EPRIDrive_MinCentralizedDER = 69
	EPRIDrive_MaxCentralizedDER = 70
	TimeSeriesAnalysis_FirstOverloadYear = 71
	TimeSeriesAnalysis_LongestOverload = 72
	TimeSeriesAnalysis_TotalOverloadTime = 73
	TimeSeriesAnalysis_WorstOverload = 74
	TimeSeriesAnalysis_FirstOverloadYear_Conductors = 75
	TimeSeriesAnalysis_LongestOverload_Conductors = 76
	TimeSeriesAnalysis_TotalOverloadTime_Conductors = 77
	TimeSeriesAnalysis_WorstOverload_Conductors = 78
	TimeSeriesAnalysis_FirstOvervoltageYear = 79
	TimeSeriesAnalysis_LongestOvervoltage = 80
	TimeSeriesAnalysis_TotalOvervoltageTime = 81
	TimeSeriesAnalysis_WorstOvervoltage = 82
	TimeSeriesAnalysis_FirstUndervoltageYear = 83
	TimeSeriesAnalysis_LongestUndervoltage = 84
	TimeSeriesAnalysis_TotalUndervoltageTime = 85
	TimeSeriesAnalysis_WorstUndervoltage = 86
	LoadReliefDispatchableDER_BESSSitingScore = 87
	LoadReliefDispatchableDER_ECGSitingScore = 88
	ShortCircuitRating = 89
	ConductorSpans = 90
	ReliabilityAssessment_SAIFI = 91
	ReliabilityAssessment_SAIDI = 92
	ReliabilityAssessment_CAIFI = 93
	ReliabilityAssessment_CAIDI = 94
	ReliabilityAssessment_CTAIDI = 95
	ReliabilityAssessment_MAIFI = 96
	ReliabilityAssessment_MAIFIE = 97
	ReliabilityAssessment_ASAI = 98
	ReliabilityAssessment_ASUI = 99
	ReliabilityAssessment_ENS = 100
	ReliabilityAssessment_AENS = 101
	ReliabilityAssessment_LEI = 102
	ReliabilityAssessment_CER = 103
	ReliabilityAssessment_CEMIn = 104
	ReliabilityAssessment_CEMSMIn = 105
	ReliabilityAssessment_CELIDs = 106
	ReliabilityAssessment_CELIDt = 107
	ReliabilityAssessment_ASIFI = 108
	ReliabilityAssessment_ASIDI = 109
	ReliabilityAssessment_AverageSustainedFailureRate = 110
	ReliabilityAssessment_AverageMomentaryFailureRate = 111
	ReliabilityAssessment_AverageAnnualOutageTime = 112
	ReliabilityAssessment_AverageOutageDuration = 113
	ReliabilityAssessment_AverageTotalActualKWLoad = 114
	ReliabilityAssessment_NumberOfCustomersInterrupted = 115
	ReliabilityAssessment_CustomerInterruptionDurationInHours = 116

class _CymGUIEnum_GUIColorMapLayerType(_Enum):
	Analysis = 1
	Custom = 2
	E_None = 3
	IntegrationCapacity_MaxNodeCapacity = 4
	IntegrationCapacity_AbnormalVoltages = 5
	IntegrationCapacity_ReverseFlow = 6
	IntegrationCapacity_ThermalLoading = 7
	IntegrationCapacity_VoltageVariations = 8
	IntegrationCapacity_ProtectionReach = 9
	IntegrationCapacity_SympatheticTrip = 10
	IntegrationCapacity_MinimumFaultClearance = 11
	IntegrationCapacity_Flicker = 12
	IntegrationCapacity_VoltageUnbalance = 13
	IntegrationCapacity_RegulatorBandwidthVariation = 14
	IntegrationCapacity_FaultCurrentVariation = 15
	IntegrationCapacity_GenerationToLoadRatio = 16
	EPRIDrive_MaxNodeCapacity = 17
	LoadReliefDispatchableDER_BESSSitingScore = 18
	LoadReliefDispatchableDER_ECGSitingScore = 19
	LoadReliefNonDispatchableDER_DERSizeType1Level1 = 20
	LoadReliefNonDispatchableDER_DERSizeType1Level2 = 21
	LoadReliefNonDispatchableDER_DERSizeType1Level3 = 22
	LoadReliefNonDispatchableDER_DERSizeType2Level1 = 23
	LoadReliefNonDispatchableDER_DERSizeType2Level2 = 24
	LoadReliefNonDispatchableDER_DERSizeType2Level3 = 25
	LoadReliefNonDispatchableDER_DERSizeType3Level1 = 26
	LoadReliefNonDispatchableDER_DERSizeType3Level2 = 27
	LoadReliefNonDispatchableDER_DERSizeType3Level3 = 28
	TimeSeriesAnalysis_LongestOverload = 29
	TimeSeriesAnalysis_TotalOverloadTime = 30
	TimeSeriesAnalysis_WorstOverload = 31
	TimeSeriesAnalysis_LongestOverload_Conductors = 32
	TimeSeriesAnalysis_TotalOverloadTime_Conductors = 33
	TimeSeriesAnalysis_WorstOverload_Conductors = 34
	TimeSeriesAnalysis_LongestOverload_ProtectionSwitching = 35
	TimeSeriesAnalysis_TotalOverloadTime_ProtectionSwitching = 36
	TimeSeriesAnalysis_WorstOverload_ProtectionSwitching = 37
	TimeSeriesAnalysis_LongestOverload_TransformersRegulators = 38
	TimeSeriesAnalysis_TotalOverloadTime_TransformersRegulators = 39
	TimeSeriesAnalysis_WorstOverload_TransformersRegulators = 40
	TimeSeriesAnalysis_LongestOvervoltage = 41
	TimeSeriesAnalysis_TotalOvervoltageTime = 42
	TimeSeriesAnalysis_WorstOvervoltage = 43
	TimeSeriesAnalysis_LongestUndervoltage = 44
	TimeSeriesAnalysis_TotalUndervoltageTime = 45
	TimeSeriesAnalysis_WorstUndervoltage = 46
	FaultLocator_Likelihood = 47
	ReliabilityAssessment_SAIFI = 48
	ReliabilityAssessment_SAIDI = 49
	ReliabilityAssessment_CAIFI = 50
	ReliabilityAssessment_CAIDI = 51
	ReliabilityAssessment_CTAIDI = 52
	ReliabilityAssessment_MAIFI = 53
	ReliabilityAssessment_MAIFIE = 54
	ReliabilityAssessment_ASAI = 55
	ReliabilityAssessment_ASUI = 56
	ReliabilityAssessment_ENS = 57
	ReliabilityAssessment_AENS = 58
	ReliabilityAssessment_LEI = 59
	ReliabilityAssessment_CER = 60
	ReliabilityAssessment_CEMIn = 61
	ReliabilityAssessment_CEMSMIn = 62
	ReliabilityAssessment_CELIDs = 63
	ReliabilityAssessment_CELIDt = 64
	ReliabilityAssessment_ASIFI = 65
	ReliabilityAssessment_ASIDI = 66
	ReliabilityAssessment_AverageSustainedFailureRate = 67
	ReliabilityAssessment_AverageMomentaryFailureRate = 68
	ReliabilityAssessment_AverageAnnualOutageTime = 69
	ReliabilityAssessment_AverageOutageDuration = 70
	ReliabilityAssessment_AverageTotalActualKWLoad = 71
	ReliabilityAssessment_NumberOfCustomersInterrupted = 72
	ReliabilityAssessment_CustomerInterruptionDurationInHours = 73

class _CymGUIEnum_GUITagLayerType(_Enum):
	Analysis = 1
	Custom = 2
	Default = 3
	TCC = 4
	LoadFlow = 5
	ShortCircuit = 6
	ShortCircuitSummary = 7
	FaultFlowSequence = 8
	FaultFlowPhase = 9
	IECShortCircuit61363 = 10
	IECShortCircuit60909 = 11
	ANSIShortCircuitSummary = 12
	DCShortCircuit = 13
	DCFaultFlow = 14
	DCLoadFlow = 15
	ReliabilitySystemIndices = 16
	ReliabilityZoneIndices = 17

class _CymGUIEnum_GUITooltipLayerType(_Enum):
	Custom = 1
	Default = 2
	IntegrationCapacityAnalysisResults = 3
	EPRIDriveAnalysisResults = 4
	ShortCircuit = 5
	LoadFlow = 6
	LoadRelief = 7

class _CymdistDataEnum_ShuntFaultDomainEnum(_Enum):
	FF = 1
	SC = 2

class _CymdistDataEnum_GeneratorImpedanceTypeEnum(_Enum):
	SteadyState = 1
	Transient = 2
	Subtransient = 3

class _CymdistDataEnum_ShortCircuitDGModelsEnum(_Enum):
	ConstantCurrent = 1
	VoltageSourceBehindImpedance = 2

class _CymdistDataEnum_ConverterBasedDERModelTypeEnum(_Enum):
	AsDefined = 1
	Global = 2
	ByDERType = 3
	ByFilter = 4

class _CymdistDataEnum_FaultContributionModelEnum(_Enum):
	Linear = 1
	Nonlinear = 2

class _CymdistDataEnum_LinearFaultContributionTypeEnum(_Enum):
	Unknown = 1
	ConstantCurrent = 2
	VoltageSourceBehindImpedance = 3

class _CymdistDataEnum_PreFaultVoltageEnum(_Enum):
	BaseVoltage = 1
	OperatingVoltage = 2
	LoadFlowSolution = 3
	RatedCurrent = 4

class _CymGUIEnum_GUITagItemLocation(_Enum):
	Standard = 1
	Primary = 2
	Secondary = 3
	Tertiary = 4

class _CymGUIEnum_GUITagItemTextAlign(_Enum):
	Default = 1
	Left = 2
	Center = 3
	Right = 4

class _CymGUIEnum_GUITagItemBorder(_Enum):
	Default = 1
	E_None = 2
	Rectangle = 3

class _CymGUIEnum_GUITagItemBackground(_Enum):
	Default = 1
	Transparent = 2
	Opaque = 3

class _CymDataEnum_DeviceTypeEnum(_Enum):
	UnknownDevice = 1
	OldShuntSingleFrequencySource = 2
	OldRelayControlledBreaker = 3
	ProtectiveDevice = 4
	LineConfig = 5
	Regulator = 6
	Transformer = 7
	Breaker = 8
	LVCB = 9
	Recloser = 10
	Sectionalizer = 11
	Switch = 12
	Fuse = 13
	SeriesCapacitor = 14
	SeriesReactor = 15
	Cable = 16
	OverheadLine = 17
	OverheadLineUnbalanced = 18
	OverheadByPhase = 19
	SpotLoad = 20
	DistributedLoad = 21
	ShuntCapacitor = 22
	ShuntReactor = 23
	Miscellaneous = 24
	ArcFurnace = 25
	CTypeFilter = 26
	DoubleTunedFilter = 27
	HighPassFilter = 28
	IdealConverter = 29
	NonIdealConverter = 30
	ShuntFrequencySource = 31
	SeriesFrequencySource = 32
	SingleTunedFilter = 33
	InductionGenerator = 34
	SynchronousGenerator = 35
	InductionMotor = 36
	SynchronousMotor = 37
	ThreeWindingTransformer = 38
	TransformerByPhase = 39
	ElectronicConverterGenerator = 40
	Source = 41
	NetworkEquivalent = 42
	Wecs = 43
	GroundingTransformer = 44
	Photovoltaic = 45
	MicroTurbine = 46
	Sofc = 47
	AutoTransformer = 48
	ThreeWindingAutoTransformer = 49
	SVC = 50
	ShuntParallelRLCBranch = 51
	ShuntRLCBranch = 52
	SeriesParallelRLCBranch = 53
	SeriesRLCBranch = 54
	ShuntFrequencyDependentBranch = 55
	SeriesFrequencyDependentBranch = 56
	ShuntMutuallyCoupled3phBranch = 57
	SeriesMutuallyCoupled3phBranch = 58
	NetworkProtector = 59
	Busway = 60
	Upfc = 61
	PhaseShifterTransformer = 62
	Statcom = 63
	SwitchableShuntBank = 64
	DcLink = 65
	VariableFrequencyDrive = 66
	RegulatorByPhase = 67
	DoubleCircuitLine = 68
	Charger = 69
	DCUPS = 70
	DCMotor = 71
	Battery = 72
	DCDCConverter = 73
	DCCable = 74
	DCLoad = 75
	DCImpedance = 76
	DCLVCB = 77
	DCFuse = 78
	DCSwitch = 79
	BESS = 80
	VARCompensator = 81

class _CymdistDataEnum_FaultPhaseEnum(_Enum):
	E_None = 1
	A = 2
	B = 3
	C = 4
	AB = 5
	BC = 6
	AC = 7
	Prime = 8
	ABC = 9
	All = 10
	Default = 11

class _CymdistDataEnum_ItemTypeEnum(_Enum):
	E_None = 1
	Section = 2
	Multipoints = 3
	Failures = 4
	Conductor = 5
	Substation = 6
	Regulator = 7
	Transformer = 8
	Motor = 9
	Generator = 10
	Cable = 11
	OverheadLine = 12
	OverheadLineUnbalanced = 13
	OverheadByPhase = 14
	Breaker = 15
	LVCB = 16
	Recloser = 17
	Sectionalizer = 18
	Switch = 19
	Fuse = 20
	SeriesCapacitor = 21
	SeriesReactor = 22
	Capacitor = 23
	Load = 24
	SpotLoad = 25
	DistributedLoad = 26
	LockDistributedLoad = 27
	LockSpotLoad = 28
	LockLoad = 29
	Meter = 30
	DisconnectSpotLoad = 31
	DisconnectDistributedLoad = 32
	ShuntCapacitor = 33
	ShuntReactor = 34
	Miscellaneous = 35
	ArcFurnace = 36
	CTypeFilter = 37
	DoubleTunedFilter = 38
	HighPassFilter = 39
	IdealConverter = 40
	NonIdealConverter = 41
	ShuntFrequencySource = 42
	SeriesFrequencySource = 43
	SingleTunedFilter = 44
	InductionGenerator = 45
	SynchronousGenerator = 46
	InductionMotor = 47
	SynchronousMotor = 48
	ThreeWindingTransformer = 49
	TransformerByPhase = 50
	ElectronicConverterGenerator = 51
	NetworkEquivalent = 52
	Node = 53
	Bus = 54
	UDM = 55
	Wecs = 56
	WindModel = 57
	GroundingTransformer = 58
	MicroTurbine = 59
	Sofc = 60
	Photovoltaic = 61
	PotentialTransformer = 62
	CurrentTransformer = 63
	VoltageRelay = 64
	FrequencyRelay = 65
	OverCurrentRelay = 66
	MotorRelay = 67
	AutoTransformer = 68
	ThreeWindingAutoTransformer = 69
	SVC = 70
	ShuntRLCBranch = 71
	SeriesRLCBranch = 72
	ShuntParallelRLCBranch = 73
	SeriesParallelRLCBranch = 74
	ShuntFrequencyDependentBranch = 75
	SeriesFrequencyDependentBranch = 76
	ShuntMutuallyCoupled3phBranch = 77
	SeriesMutuallyCoupled3phBranch = 78
	GenericUDM = 79
	LoadSheddingRelayUDM = 80
	NetworkProtector = 81
	Busway = 82
	PhaseShifterTransformer = 83
	Statcom = 84
	Upfc = 85
	ImpedanceRelayUDM = 86
	DcLink = 87
	SwitchableShuntBank = 88
	VariableFrequencyDrive = 89
	RegulatorByPhase = 90
	DoubleCircuitLine = 91
	Charger = 92
	DCUPS = 93
	DCMotor = 94
	Battery = 95
	DCDCConverter = 96
	DCCable = 97
	DCLoad = 98
	DCImpedance = 99
	DCLVCB = 100
	DCFuse = 101
	DCSwitch = 102
	CentralizedCapacitorControlSystem = 103
	VoltageMeter = 104
	DistanceRelay = 105
	BESS = 106
	FaultIndicator = 107
	CustomerLoad = 108
	Network = 109
	VARCompensator = 110
	Ammeter = 111
	Varmeter = 112
	Wattmeter = 113
	DuctBank = 114

class _CymDataEnum_NetworkItemTypeEnum(_Enum):
	Unknown = 1
	Structure = 2
	Zone = 3
	Section = 4
	DisconnectedSection = 5
	IsolatedSection = 6
	Node = 7
	Bus = 8
	Loop = 9
	PhaseMerging = 10
	Interconnection = 11
	SourceNode = 12
	Topo = 13
	DoubleCircuit = 14
	ThermalInstallation = 15

class _CymdistDataEnum_ANSI_DutyTypeEnum(_Enum):
	TimeDelayed = 1
	ContactParting = 2
	ClosingLatching = 3
	LVCB = 4
	ALL = 5
	E_None = 6

class _CymdistDataEnum_ANSI_BreakerSpeedEnum(_Enum):
	E_2Cycles = 1
	E_3Cycles = 2
	E_5Cycles = 3
	E_8Cycles = 4

class _CymdistDataEnum_IEC_DutyTypeEnum(_Enum):
	Initial = 1
	Peak = 2
	Breaking = 3
	SteadyState = 4
	IECDutyTypeAll = 5
	IECDutyTypeTypeNone = 6

class _CymdistDataEnum_IEC_PeakMethodEnum(_Enum):
	MethodA = 1
	MethodB = 2
	MethodC = 3

class _CymdistDataEnum_IEC_SteadyStateExcitationSettingEnum(_Enum):
	Series1 = 1
	Series2 = 2

class _CymdistDataEnum_IEC_FaultCurrentTypeEnum(_Enum):
	Maximum = 1
	Minimum = 2

class _CymdistDataEnum_PhaseEnum(_Enum):
	E_None = 1
	B = 2
	C = 3
	A = 4
	AB = 5
	AC = 6
	BC = 7
	ABC = 8

class _CymDataEnum_FaultTypeEnum(_Enum):
	LLL = 1
	LLG = 2
	LL = 3
	LG = 4
	LLLG = 5
	OnePhaseOpen = 6
	TwoPhasesOpen = 7
	AsymmetricalImpedance = 8
	ALL_ShuntFault = 9
	ALL_SeriesFault = 10
	InterCircuitNone = 11
	GroundFaults = 12
	ALL = 13

class _CymdistDataEnum_LoadAllocationMethodEnum(_Enum):
	KVAMethod = 1
	KWHMethod = 2
	REAMethod = 3
	ActualKVAMethod = 4

class _CymdistDataEnum_DemandTypeEnum(_Enum):
	MeteringPoint = 1
	FeederDemand = 2
	AnyDemand = 3

class _CymdistDataEnum_LoadAllocTransfoYDActionEnum(_Enum):
	AlwaysAsk = 1
	ConvertConfig = 2
	KeepConfig = 3

class _CymdistDataEnum_CenterTapDistributionEnum(_Enum):
	ActualCT = 1
	ConnectedCT = 2
	CustomerTypeCT = 3

class _CymdistDataEnum_MeterLocationEnum(_Enum):
	Primary = 1
	Secondary = 2
	Tertiary = 3

class _CymdistDataEnum_VoltVarOptimizationMethodEnum(_Enum):
	Var = 1
	CVR = 2

class _CymdistDataEnum_VoltVarOptimizationScalingFactorEnum(_Enum):
	Single = 1
	MultipleFromLibrary = 2
	MultipleUserDefined = 3

class _CymdistDataEnum_TimeStepUnitsEnum(_Enum):
	Second = 1
	Minute = 2
	Hour = 3

class _CymdistDataEnum_AbnormalVoltageUnitEnum(_Enum):
	_VoltagePercent = 1
	_Voltage120V = 2
	_DifferencePercent = 3
	_Difference120V = 4

class _CymdistDataEnum_ReportModeTypeEnum(_Enum):
	E_None = 1
	SpreadSheet = 2
	ASCII = 3
	Excel = 4
	Html = 5
	XML = 6
	WEB = 7
	MDB = 8
	Word = 9
	View = 10
	TabularResultData = 11
	Data = 12
	CSV = 13

class _CymdistDataEnum_LoadHarmonicModelEnum(_Enum):
	ParallelRL = 1
	ParallelRL_SkinEffect = 2
	SeriesRL = 3
	CIGRE_C_Type = 4

class _CymdistDataEnum_LineHarmonicModelEnum(_Enum):
	SeriesRL = 1
	NominalPI = 2
	DistTransposed = 3
	DistTransposedSkinEffect = 4
	DistUntransposed = 5
	IndividualSettings = 6

class _CymdistDataEnum_HarmonicDistortionLimitEnum(_Enum):
	IEEE_519_1992 = 1
	IEEE_519_2014 = 2
	UserDefined = 3

class _CymdistDataEnum_HarmonicDistortionSystemVoltage(_Enum):
	E_120V_69KV = 1
	E_69KV_161KV = 2
	E_161KV_and_up = 3

class _CymdistDataEnum_PhaseTypeEnum(_Enum):
	UndefinedPhaseType = 1
	SinglePhase = 2
	ThreePhase = 3

class _CymdistDataEnum_RAMAnalysisTypeEnum(_Enum):
	Assessment = 1
	Calibration = 2
	Automation = 3

class _CymdistDataEnum_RAMAnalysisModeEnum(_Enum):
	Predictive = 1
	Historical = 2
	NetworkIndices = 3

class _CymdistDataEnum_ResultOutputModeEnum(_Enum):
	Display = 1
	SaveToDrive = 2
	SaveToDatabase = 3
	ResultData = 4

class _CymdistDataEnum_CAMRestoreModeEnum(_Enum):
	PickupBySwitching = 1
	PickupByRepair = 2
	PickupByStrategicDevices = 3

class _CymdistDataEnum_AFOpeningTimeModeEnum(_Enum):
	TCC = 1
	UserDefined = 2

class _CymdistDataEnum_AFContribDurationModeEnum(_Enum):
	MaxArcDuration = 1
	Global = 2
	PowerRange = 3

class _CymdistDataEnum_OPFCalculationMethodEnum(_Enum):
	PurePrimeDual = 1
	PredictorCorrector = 2

class _CymdistDataEnum_OPFOptimizationScopeEnum(_Enum):
	EntireSystem = 1
	SelectedZones = 2
	NoOptimization = 3

class _CymdistDataEnum_OPFVoltageLimitsModeEnum(_Enum):
	IndividualSettings = 1
	LoadFlowLimits = 2
	IgnoreLimits = 3

class _CymdistDataEnum_OPFLoadingLimitsModeEnum(_Enum):
	IndividualSettings = 1
	IgnoreLimits = 2

class _CymdistDataEnum_OPFGeneratorPowerModeEnum(_Enum):
	IndividualSettings = 1
	Fixed_Gen = 2
	Fixed_Min = 3
	Fixed_Max = 4
	IgnoreLimits = 5

class _CymdistDataEnum_VoltageUnitTypeEnum(_Enum):
	Percent = 1
	E_120V = 2
	pu = 3
	kVLL = 4
	kVLN = 5

class _CymdistDataEnum_LoadFlowWithProfilesAnalysisModeEnum(_Enum):
	SingleTime = 1
	StrategicPoints = 2
	TimeRange = 3

class _CymdistDataEnum_LoadFlowWithProfilesSingleTimeModeEnum(_Enum):
	SingleDateTime = 1
	TypicalDayTime = 2
	PeakDemand = 3
	MinimumDemand = 4

class _CymdistDataEnum_LoadFlowWithProfilesTimeRangeModeEnum(_Enum):
	DateTimeRange = 1
	Year = 2
	TypicalDay = 3
	Month = 4
	DateRange = 5
	Day = 6
	ProjectSpan = 7
	TypicalDays_AllIntervals = 8

class _CymdistDataEnum_PeakIntervalTypeEnum(_Enum):
	E_None = 1
	Year = 2
	Month = 3
	Season = 4

class _CymdistDataEnum_MonthTypeEnum(_Enum):
	NoSeasonMonth = 1
	January = 2
	February = 3
	March = 4
	April = 5
	May = 6
	June = 7
	July = 8
	August = 9
	September = 10
	October = 11
	November = 12
	December = 13
	AllMonths = 14
	Winter = 15
	Spring = 16
	Summer = 17
	Fall = 18
	AllSeason = 19

class _CymdistDataEnum_DiscontinuityIntervalTypeEnum(_Enum):
	Week = 1
	Day = 2

class _CymdistDataEnum_DiscontinuityDayEnum(_Enum):
	Sunday = 1
	Monday = 2
	Tuesday = 3
	Wednesday = 4
	Thursday = 5
	Friday = 6
	Saturday = 7

class _CymdistDataEnum_ProfileSourceTypeEnum(_Enum):
	LegacyProfileDatabase = 1
	ProfileDataSourcePlugin = 2

class _CymdistDataEnum_LFWPStrategicPointReferenceEnum(_Enum):
	Network = 1
	SourceNode = 2

class _CymdistDataEnum_LoadFlowWithProfilesLogOptionEnum(_Enum):
	NoReport = 1
	ReportOnlyErrors = 2
	ReportAllMessages = 3

class _CymPluginEnum_TimeIntervalTypeEnum(_Enum):
	E_None = 1
	Second = 2
	Minute = 3
	Hour = 4
	Day = 5

class _CymPluginEnum_ItemTypeEnum(_Enum):
	All = 1
	Unknown = 2
	VoltageMeter = 3
	Breaker = 4
	Fuse = 5
	LVCB = 6
	Recloser = 7
	Sectionalizer = 8
	Switch = 9
	NetworkProtector = 10
	EquivalentSource = 11
	InductionGenerator = 12
	SynchronousGenerator = 13
	ECG = 14
	WECS = 15
	Photovoltaic = 16
	MicroTurbine = 17
	SOFC = 18
	BESS = 19
	Regulator = 20
	RegulatorByPhase = 21
	Transformer = 22
	TransformerByPhase = 23
	AutoTransformer = 24
	ThreeWindingTransformer = 25
	ThreeWindingAutoTransformer = 26
	PhaseShifterTransformer = 27
	SpotLoad = 28
	DistributedLoad = 29
	CustomerLoad = 30
	InductionMotor = 31
	SynchronousMotor = 32
	ShuntCapacitor = 33
	ShuntReactor = 34
	SeriesCapacitor = 35
	SeriesReactor = 36
	SVC = 37
	STATCOM = 38
	OverheadLineBalanced = 39
	OverheadLineUnbalanced = 40
	Cable = 41
	OverheadByPhase = 42
	DoubleCircuitLine = 43
	Busway = 44
	Miscellaneous = 45
	SourceNode = 46
	Network = 47
	Node = 48
	Global = 49
	Profile = 50
	CustomerTypeProfile = 51
	GeneratorProfile = 52

class _CymPluginEnum_DataPointRequestContextTypeEnum(_Enum):
	TimeBasedNetworkUpdate = 1
	TimeBasedData = 2
	Analysis = 3

class _CymdistDataEnum_ShuntFaultMethodEnum(_Enum):
	ANSI = 1
	IEC = 2
	Conventional = 3

class _CymdistDataEnum_DCArcFlashMethodEnum(_Enum):
	StokesOppenlander = 1
	Paukert = 2
	MaximumPower = 3

class _CymdistDataEnum_FaultLocatorRecordedTypeEnum(_Enum):
	Current = 1
	RTF = 2

class _CymdistDataEnum_FaultLocatorFaultDetailEnum(_Enum):
	A = 1
	B = 2
	C = 3
	E_1 = 4
	E_2 = 5
	E_0 = 6
	Xph = 7
	X1 = 8
	E_3I0 = 9
	PhaseCurrent = 10

class _CymdistDataEnum_MinimumFaultRatingSelectionEnum(_Enum):
	Nominal = 1
	AsDefined = 2
	ClearingCriteria = 3

class _CymTCCDataEnum_TCCItemTypeEnum(_Enum):
	Unknown = 1
	Transformer = 2
	LVCB = 3
	DCLVCB = 4
	Recloser = 5
	Fuse = 6
	DCFuse = 7
	InductionMotor = 8
	SynchronousMotor = 9
	Cable = 10
	OverheadLineBalanced = 11
	OverheadLineUnbalanced = 12
	OverheadByPhase = 13
	OverCurrentRelay = 14
	MotorRelay = 15
	MarginAnchor = 16
	TestPoint = 17
	Circle = 18
	Line = 19
	Text = 20
	Sectionalizer = 21
	SynchronousGenerator = 22

class _CymDataEnum_RelayTypeEnum(_Enum):
	Unknown = 1
	Electromechanical = 2
	Electronic = 3
	Motor = 4
	DefiniteTime = 5

class _CymDataEnum_RecloserTypeEnum(_Enum):
	Unknown = 1
	SinglePhase = 2
	ThreePhase = 3
	Electronic = 4
	WithTccSetup = 5
	Intellirupter = 6

class _CymDataEnum_LVCBTypeEnum(_Enum):
	Unknown = 1
	GroundFault = 2
	MoldedCase = 3
	Electromechanical = 4
	SolidState = 5

class _CymdistDataEnum_DSEQualityIndicesUnitEnum(_Enum):
	E_None = 1
	CHI = 2
	Percent = 3
	W = 4
	kW = 5
	VAR = 6
	kVAR = 7
	Amp = 8
	V = 9
	kV = 10

class _CymdistDataEnum_StateEstimatorInitializationModeEnum(_Enum):
	E_None = 1
	LoadAllocation = 2
	UtilizationFactor = 3
	Scaling = 4
	SecondaryNetworks = 5

class _CymdistDataEnum_DSELinearLoadScalingEnum(_Enum):
	E_None = 1
	Global = 2
	ByZone = 3
	ByNetworkType = 4
	ByLoadType = 5

class _CymdistDataEnum_LoadValueTypeEnum(_Enum):
	KW_KVAR = 1
	KVA_PF = 2
	KW_PF = 3
	AMP_PF = 4

class _CymdistDataEnum_DSESecNetworksInitCalculationMethodEnum(_Enum):
	ConnectedCapacity = 1
	Consumption = 2
	ActualLoad = 3

class _CymdistDataEnum_IECTimeConstantMode(_Enum):
	Global = 1
	EquipmentType = 2
	IndividualSettings = 3

class _CymdistDataEnum_SwitchingOptimizationObjectiveEnum(_Enum):
	MinimizeLosses = 1
	MinimizeVoltageExceptions = 2
	MinimizeOverloadExceptions = 3
	BalanceLoad = 4
	BalanceLength = 5
	MinimizeSwitchingOperations = 6

class _CymdistDataEnum_SwitchingOptimizationMethodEnum(_Enum):
	HeuristicLocal = 1
	HeuristicGlobal = 2
	HeuristicZones = 3
	Iterative = 4

class _CymdistDataEnum_DissipationModelEnum(_Enum):
	E_None = 1
	Total = 2
	Partial = 3

class _CymdistDataEnum_SynchronousMachineStabilityModelEnum(_Enum):
	FixedPQ = 1
	Type1 = 2
	Type2 = 3
	Type3 = 4
	Type4 = 5
	Type5 = 6

class _CymdistDataEnum_InductionMotorRunningStabilityModelEnum(_Enum):
	StaticLoad = 1
	DynamicType1 = 2

class _CymdistDataEnum_InductionMotorStartingStabilityModelEnum(_Enum):
	ModelDynamicType2 = 1
	ModelDynamicType3 = 2

class _CymdistDataEnum_UDMTypeEnum(_Enum):
	Exciter = 1
	Turbine = 2
	Stabilizer = 3
	FrequencyDroopRelay = 4
	ImpedanceRelay = 5
	InductionMotor = 6
	StaticLoad = 7
	LowFrequencyRelay = 8
	LowVoltageRelay = 9
	PowerSwingRelay = 10
	ShuntCapacitor = 11
	ShuntReactor = 12
	SVC = 13
	Generic = 14
	Photovoltaic = 15
	MicroTurbine = 16
	SOFC = 17
	WECS = 18
	BESS = 19
	Converter = 20

class _CymdistDataEnum_IntegrationCapacityAnalysisMethodEnum(_Enum):
	Iterative = 1
	IterativeSimplified = 2
	Heuristic = 3

class _CymdistDataEnum_IntegrationCapacityReactivePowerModeEnum(_Enum):
	FixedPowerFactor = 1
	FixedReactivePower = 2
	VoltVar_WattsPrecedence = 3

class _CymdistDataEnum_ConverterVarReferenceEnum(_Enum):
	ActivePowerRating = 1
	ReactivePowerRating = 2
	ReactivePowerAvailable = 3

class _CymdistDataEnum_IntegrationCapacityDERTypeEnum(_Enum):
	SinglePhase = 1
	ThreePhase = 2
	All = 3

class _CymdistDataEnum_IntegrationCapacityVoltageUnbalanceDefinitionEnum(_Enum):
	IEC = 1
	NEMA = 2

class _CymdistDataEnum_LoadNetworkOptionEnum(_Enum):
	Validation = 1
	UserDefined = 2
	AllDependencies = 3
	MinDependencies = 4
	Equivalents = 5
	MinDependenciesDownstream = 6

class _CymdistDataEnum_DERImpactMaximumPowerEnum(_Enum):
	RatedPower = 1
	InverterRating = 2
	ActiveGeneration = 3

class _CymdistDataEnum_LTDResetModeEnum(_Enum):
	Fast = 1
	InductionDisc = 2
	Delay = 3
	DelayFreeze = 4
	VoltageAveraging = 5

class _CymdistDataEnum_CurveAdjustmentModeEnum(_Enum):
	IndividualSettings = 1
	OverrideSettings = 2
	NoAdjustment = 3

class _CymdistDataEnum_CurveModelEnum(_Enum):
	P_Q = 1
	P_PF = 2
	LF_PF = 3
	WindSpeed = 4
	Insolation = 5
	DCGeneration = 6

class _CymdistDataEnum_EPRIDriveLargeDERDistributionEnum(_Enum):
	WholeNetwork = 1
	FrontHalf = 2
	EndHalf = 3
	AtExistingLoads = 4

class _CymdistDataEnum_EPRIDriveBadImpedanceActionEnum(_Enum):
	NoAction = 1
	Remove = 2
	Adjust = 3

class _CymdistDataEnum_LoadReliefDispatchableDERTimeRangeEnum(_Enum):
	SpecifiedWorstConditions = 1
	TimeRange = 2
	GenericLoadProfile = 3
	DefinedSize = 4

class _CymdistDataEnum_LoadReliefDispatchableDERControlSchemeEnum(_Enum):
	FullGeneration = 1
	PeakShaving = 2

class _CymdistDataEnum_LoadReliefDispatchableDERConstraintWeightEnum(_Enum):
	IgnoreConstraint = 1
	Minimum = 2
	Low = 3
	Medium = 4
	High = 5
	Maximum = 6
	DiscardLocation = 7

class _CymdistDataEnum_LoadReliefDispatchableDERScoreStrategyEnum(_Enum):
	AbnormalConditions = 1
	OverloadCount = 2
	LoadingLevel = 3

class _CymdistDataEnum_LoadReliefDispatchableDERScoreDownstreamReferenceEnum(_Enum):
	NumberOfCustomers = 1
	Consumption = 2
	ConnectedCapacity = 3

class _CymdistDataEnum_ThermalCapacityChronologicalModifEnum(_Enum):
	NoModif = 1
	AddDuctBank = 2
	DeleteDuctBank = 3
	AddCableInDuctBank = 4
	DeleteCableInDuctBank = 5
	UnknownModifDuctBank = 6
	UnknownModifCable = 7

class _CymdistDataEnum_ThermalCapacitySimulationTypeEnum(_Enum):
	SteadyState_Temperature = 1
	SteadyState_Ampacity = 2
	Transient_Temperature = 3
	Transient_Ampacity = 4

class _CymdistDataEnum_ThermalCapacitySteadyStateCyclicLoadingEnum(_Enum):
	NeherMcGrath = 1
	IEC60853 = 2

class _CymdistDataEnum_ThermalCapacityTemperatureInitializationEnum(_Enum):
	UseSteadyStateLoadFactor = 1
	UseLossFactor = 2
	PerformPreT0TransientAnalysis = 3
	UseSpecificLoadFlow = 4
	UseLoadFlowWithProfiles = 5

class _CYMBaseDataEnum_TriStateBooleanEnum(_Enum):
	Undefined = 1
	E_True = 2
	E_False = 3

class _CymdistDataEnum_BTMScenarioCalculationMethodEnum(_Enum):
	MonteCarlo = 1
	MonteCarloAccelerated = 2

class _CymdistDataEnum_BTMScenarioAnalysisTypeEnum(_Enum):
	SingleTime = 1
	TimeRange = 2

class _CymdistDataEnum_BTMScenarioAnalysisModeEnum(_Enum):
	EntireDay = 1
	HourRange = 2

class _CymdistDataEnum_BTMScenarioAnalysisTechnologyTypeEnum(_Enum):
	ElectricVehicules = 1
	GenericImpactProfile = 2

class _CymdistDataEnum_BTMScenarioAnalysisEligibilityModeEnum(_Enum):
	AllLocationEligible = 1
	BasedOnKeyword = 2

class _CymdistDataEnum_BTMScenarioAnalysisPresenceModeEnum(_Enum):
	NoTechnologyPresent = 1
	BasedOnKeyword = 2

class _CymdistDataEnum_BTMScenarioAnalysisPropensityModeEnum(_Enum):
	UniformPropensity = 1
	BasedOnKeyword = 2

class _CymdistDataEnum_BTMScenarioAnalysisPenetrationLevelEnum(_Enum):
	PercentageAllLocations = 1
	PercentageEligibleLocations = 2
	NumberNewInstallations = 3

class _CymdistDataEnum_ProfileAdjustmentStrategyEnum(_Enum):
	NoAdjustment = 1
	IndividualOnly = 2
	IndividualThenType = 3
	TypeOnly = 4

class _CymdistDataEnum_ProfileAdjustmentLoadScalingMethodEnum(_Enum):
	NoScaling = 1
	ScalingWithAnalysis = 2

class _CymDataEnum_LocationEnum(_Enum):
	From = 1
	To = 2
	Middle = 3

class _CymdistDataEnum_ConnectionConfigurationEnum(_Enum):
	UndefinedConnection = 1
	Yg = 2
	Y = 3
	D = 4
	OpenDelta = 5
	ClosedDelta = 6
	Zg = 7
	CT = 8
	Dg = 9
	T = 10
	Tg = 11

class _CymdistDataEnum_RegulatorSettingOptionEnum(_Enum):
	LoadCenter = 1
	RXSettings = 2
	ZSettings = 3
	FixedTap = 4
	Terminal = 5
	PythonScript = 6

class _CymdistDataEnum_ReverseSensingModeEnum(_Enum):
	BiDirectional = 1
	CoGeneration = 2
	LockedForward = 3
	LockedReverse = 4
	NeutralIdle = 5
	NoReverse = 6
	ReverseIdle = 7
	ReactiveBiDirectional = 8
	ReverseCoGeneration = 9
	BiasCoGeneration = 10
	BiasBiDirectional = 11
	AutoDetermination = 12

class _CymdistDataEnum_ConnectionStatusEnum(_Enum):
	Connected = 1
	Disconnected = 2
	Bypassed = 3

class _CymdistDataEnum_FaultIndicatorTypeEnum(_Enum):
	NoFaultIndicator = 1
	VisualFaultIndicator = 2
	RemoteFaultIndicator = 3

class _CymdistDataEnum_PythonParameterTypeEnum(_Enum):
	Text = 1
	Real = 2
	Number = 3
	Boolean = 4
	FilePath = 5
	Custom = 6

class _CymdistDataEnum_PythonParameterDirectionEnum(_Enum):
	Input = 1
	Output = 2

class _CymDataEnum_TransformerConnectionEnum(_Enum):
	EquipConnection = 1
	Yg_Yg = 2
	D_Yg = 3
	Yg_D = 4
	D_D = 5
	Y_Y = 6
	DO_DO = 7
	YO_DO = 8
	D_Y = 9
	Y_D = 10
	Yg_Y = 11
	Y_Yg = 12
	Yg_Zg = 13
	D_Zg = 14
	Zg_Yg = 15
	Zg_D = 16
	Yg_CT = 17
	D_CT = 18
	Yg_DCT = 19
	D_DCT = 20
	Y_DCT = 21
	DO_DOCT = 22
	YO_DOCT = 23
	DO_YO = 24
	Yg_Dn = 25
	Y_Dn = 26
	D_Dn = 27
	Zg_Dn = 28
	Dn_Yg = 29
	Dn_Y = 30
	Dn_D = 31
	Dn_Dn = 32
	Dn_Zg = 33
	T_T = 34
	T_Tg = 35

class _CymdistDataEnum_XFoPhaseShiftEnum(_Enum):
	E_0deg = 1
	E_330deg = 2
	E_300deg = 3
	E_270deg = 4
	E_240deg = 5
	E_210deg = 6
	E_180deg = 7
	E_150deg = 8
	E_120deg = 9
	E_90deg = 10
	E_60deg = 11
	E_30deg = 12

class _CymdistDataEnum_CTPhaseEnum(_Enum):
	AB = 1
	BC = 2
	CA = 3

class _CymdistDataEnum_TapLocationEnum(_Enum):
	Primary = 1
	Secondary = 2
	Tertiary = 3

class _CymdistDataEnum_TransformerSettingOptionEnum(_Enum):
	FixedTapPrimary = 1
	FixedTap = 2
	Terminal = 3
	LoadCenter = 4
	RXSettings = 5
	ZSettings = 6

class _CymdistDataEnum_TapPositionModeEnum(_Enum):
	TapModeFixed = 1
	TapModeLastLoadFlowPosition = 2

class _CymdistDataEnum_LTCControlTypeEnum(_Enum):
	VoltagePercent = 1
	Voltage120V = 2
	ReactivePower = 3

class _CymTCCDataEnum_InRushModeEnum(_Enum):
	E_None = 1
	Circle = 2
	Curves = 3
	CurveCEE = 4

class _CymTCCDataEnum_ClippingModeEnum(_Enum):
	E_None = 1
	ShortCircuit = 2
	UserDefined = 3
	AsDefined = 4

class _CymTCCDataEnum_CoordinationModeEnum(_Enum):
	MultiplierFirst = 1
	AdderFirst = 2
	MinAdderOrMult = 3
	MaxAdderOrMult = 4
	MaxTS2 = 5
	MinTS2 = 6

class _CymTCCDataEnum_CoordinationApplyOnEnum(_Enum):
	Minimum = 1
	Maximum = 2

class _CymTCCDataEnum_ThroughFaultCurveEnum(_Enum):
	Frequent = 1
	Infrequent = 2
	DamagePoint = 3
	FrequentInfrequent = 4

class _CymdistDataEnum_SwitchStatusEnum(_Enum):
	Open = 1
	Closed = 2

class _CymdistDataEnum_RestorationModeEnum(_Enum):
	Bidirectional = 1
	Unidirectional_From = 2
	Unidirectional_To = 3

class _CymdistDataEnum_SensorModeEnum(_Enum):
	SensingBoth = 1
	SensingFrom = 2
	SensingTo = 3

class _CymTCCDataEnum_SequenceDrawingModeEnum(_Enum):
	KFactor = 1
	Cumulative = 2
	E_None = 3

class _CymTCCDataEnum_ProtectionTypeEnum(_Enum):
	Phase = 1
	Ground = 2
	PhaseFast = 3
	PhaseSlow = 4
	GroundFast = 5
	GroundSlow = 6
	PhaseAndGround = 7

class _CymTCCDataEnum_IntellirupterProfileEnum(_Enum):
	GeneralProfile1 = 1
	GeneralProfile2 = 2
	GeneralProfile3 = 3
	GeneralProfile4 = 4
	ClosingProfile1 = 5
	ClosingProfile2 = 6
	HotLineTagProfile = 7

class _CymTCCDataEnum_IntellirupterDirectionEnum(_Enum):
	Direction1 = 1
	Direction2 = 2

class _CymdistDataEnum_CTConnectionEnum(_Enum):
	CTUndefined = 1
	E_1N = 2
	E_2N = 3
	E_12 = 4

class _CymdistDataEnum_OPFFlowConstraintsUnitEnum(_Enum):
	Amp = 1
	kW = 2
	kvar = 3
	kVA = 4

class _CymdistDataEnum_ConductorPositionEnum(_Enum):
	PositionA = 1
	PositionB = 2
	PositionC = 3
	PositionAB = 4
	PositionAC = 5
	PositionBA = 6
	PositionBC = 7
	PositionCA = 8
	PositionCB = 9
	PositionABC = 10
	PositionACB = 11
	PositionBAC = 12
	PositionBCA = 13
	PositionCAB = 14
	PositionCBA = 15

class _CymdistDataEnum_LALockDuringLoadAllocationEnum(_Enum):
	DefinedByLoadModel = 1
	Unlocked = 2
	Locked = 3
	InitiallyLocked = 4

class _CymdistDataEnum_HarmonicModelEnum(_Enum):
	SimplifiedFromNameplateData = 1
	DetailedFromEqImpedances = 2

class _CymdistDataEnum_LTDAdjustmentSettingsEnum(_Enum):
	NoAdjustment = 1
	PowerCurve = 2
	WindCurve = 3
	InsolationCurve = 4

class _CymdistDataEnum_VoltageControlTypeEnum(_Enum):
	VoltageControlled = 1
	Fixed = 2
	Swing = 3

class _CymdistDataEnum_MotorStatusEnum(_Enum):
	Off = 1
	Running = 2
	LockedRotor = 3

class _CymdistDataEnum_MotorAssistanceTypeEnum(_Enum):
	NoAssistance = 1
	AutoTransformerAssistance = 2
	ResistorAssistance = 3
	CapacitorAssistance = 4
	StarDeltaAssistance = 5
	VariableFrequencyAssistance = 6
	SlipRingAssistance = 7
	SoftStarterVoltageRampAssistance = 8
	SoftStarterCurrentRampAssistance = 9
	SoftStarterCurrentLimitAssistance = 10
	MotorStartingCurvesAssistance = 11

class _CymdistDataEnum_MotorModeEnum(_Enum):
	ConstantPQ = 1
	ConstantP = 2
	ConstantSlip = 3

class _CymdistDataEnum_InertiaUnitTypeEnum(_Enum):
	MWsMVA = 1
	kgm2 = 2

class _CymdistDataEnum_TorqueCurveModelTypeEnum(_Enum):
	ConstFunction = 1
	LinearFunction = 2
	QuadraticFunction = 3
	CentrifugalCompressor = 4
	ReciprocatingCompressor = 5
	UserEquation = 6
	CurvePoint = 7

class _CYMBaseDataEnum_UnitTypeEnum(_Enum):
	Undefined = 1
	Custom = 2
	NoUnit = 3
	SmallLength_mm = 4
	SmallLength_cm = 5
	MediumLength_m = 6
	Length_m = 7
	Temperature_C = 8
	LinearImpedance_ohmskm = 9
	LinearAdmittance_uSkm = 10
	Torque_Nm = 11
	Inertia_kgm2 = 12
	Speed_ms = 13
	RotationSpeed_RPM = 14
	PerUnit_pu = 15
	Percentage = 16
	PowerFactor = 17
	Current_Amps = 18
	Current_kA = 19
	Impedance_ohms = 20
	Impedance_mOhms = 21
	Capacitance_uF = 22
	Inductance_mH = 23
	Inductance_H = 24
	Voltage_V = 25
	Voltage_kV = 26
	Voltage_VLL = 27
	Voltage_kVLL = 28
	Voltage_VLN = 29
	Voltage_kVLN = 30
	RealPower_kW = 31
	ActiveEnergy_kWh = 32
	ActiveEnergy_MWh = 33
	ReactiveEnergy_kvarh = 34
	ReactiveEnergy_Mvarh = 35
	ApparentEnergy_kVAh = 36
	ApparentEnergy_MVAh = 37
	ConnectedCapacity_kVA = 38
	ReactivePower_kVAR = 39
	ApparentPower_kVA = 40
	ApparentPower_MVA = 41
	LinearActivePower_WattsPerMeter = 42
	Hours_h = 43
	Minutes_min = 44
	Seconds_s = 45
	Year = 46
	MilliSeconds_ms = 47
	NmPerRad = 48
	Money_Currency = 49
	Money_kCurrency = 50
	Money_MCurrency = 51
	Money_CurrencyPerMeter = 52
	Money_CurrencyPerKm = 53
	Money_kCurrencyPerKm = 54
	Money_MCurrencyPerKm = 55
	Money_CurrencyPerPhase = 56
	Money_kCurrencyPerPhase = 57
	Money_MCurrencyPerPhase = 58
	Money_CurrencyPerKW = 59
	Money_CurrencyPerManhour = 60
	Money_CurrencyPerCktMeter = 61
	Money_kCurrencyPerCktKm = 62
	Length_cktm = 63
	Angle_Degree = 64
	Rate_InterPerYear = 65
	Rate_InterPerYearPerKm = 66
	Cycle_cycle = 67
	Insolation_Wm2 = 68
	CircularArea_mm2 = 69
	Power_hp = 70
	Frequency_Hz = 71
	Ohm_m = 72
	E8Ohm_m = 73
	MOhm_km = 74
	LinearInductance_mHkm = 75
	Charge_Ah = 76
	LongLength_km = 77
	RealPower_W = 78
	RealPower_MW = 79
	ReactivePower_MVAR = 80
	Admittance_uS = 81
	Admittance_S = 82
	Energy_kJ = 83
	Energy_Jpercm2 = 84
	ReactivePower_var = 85
	PercentPerYear = 86
	ControlRatio_VoltPerHz = 87
	Time = 88
	DayTime = 89
	TypicalDays = 90
	Labor_Manhours = 91
	Labor_ManhoursPerCktMeter = 92
	Labor_ManhoursPerCktKm = 93
	Labor_ManhoursPerPhase = 94
	CustomerExposure_CustKm = 95

class _CymdistDataEnum_ControlRiseFallUnitEnum(_Enum):
	PercentPerMin = 1
	WattPerSec = 2

class _CymdistDataEnum_FaultContributionReferenceEnum(_Enum):
	PctOfActiveGeneration = 1
	PctOfRatedCurrent = 2
	PctOfInverterRating = 3

class _CymdistDataEnum_FaultContributionUnitTypeEnum(_Enum):
	Percent = 1
	Current = 2

class _CymdistDataEnum_SourceHarmonicModelEnum(_Enum):
	FrequencySource = 1
	Inverter = 2

class _CymdistDataEnum_MPPTChannelConfigurationEnum(_Enum):
	Individual = 1
	Parallel = 2

class _CymdistDataEnum_PhaseShifterSettingOptionEnum(_Enum):
	FlowControl = 1
	FixedTap = 2

class _CymdistDataEnum_SwitchableShuntBankTypeEnum(_Enum):
	Capacitors = 1
	Reactors = 2
	Mixed = 3

class _CymdistDataEnum_DCLinkControlModeEnum(_Enum):
	PowerControl = 1
	CurrentControl = 2

class _CymdistDataEnum_VFDControlModeEnum(_Enum):
	SpeedControlStarting = 1
	Starting = 2

class _CymdistDataEnum_ChargerControlTypeEnum(_Enum):
	FixedVoltage = 1
	FixedPowerFactor = 2
	FloatVoltage = 3
	EqualizationVoltage = 4

class _CymdistDataEnum_StorageControllerGridOutputEnum(_Enum):
	Controls = 1
	PythonScript = 2

class _CymdistDataEnum_VARCompensatorControlTypeEnum(_Enum):
	VoltageControlled = 1
	DiscreteVoltageControlled = 2
	PFControlled = 3
	FixedVar = 4
	VarControlled = 5
	VoltVar = 6

class _CymdistDataEnum_BehaviorAtLimitsTypeEnum(_Enum):
	ConstantCurrent = 1
	ConstantPower = 2
	ConstantImpedance = 3

class _CymdistDataEnum_RelayPolarizingModeEnum(_Enum):
	Voltage = 1
	Current = 2
	Dual = 3

class _CymTCCDataEnum_RelayOperationModeEnum(_Enum):
	TapRange = 1
	TapNoRange = 2
	NoTap = 3
	InstOnly = 4
	STInstOnly = 5
	MultipleOfFLC = 6

class _CymTCCDataEnum_RelayShortTimeModeEnum(_Enum):
	CTxTapS = 1
	CTxTapSxTapL = 2
	PrimaryAmps = 3

class _CymTCCDataEnum_RelayInstModeEnum(_Enum):
	CTxTapI = 1
	CTxTapIxTapL = 2
	PrimaryAmps = 3

class _CymTCCDataEnum_RelayOvertravelModeEnum(_Enum):
	Inverse = 1
	VeryInverse = 2
	ExtremelyInverse = 3
	UserDefined = 4

class _CymdistDataEnum_CCCSControlTypeEnum(_Enum):
	Voltage = 1
	var = 2
	Percent = 3
	PythonScript = 4

class _CymdistDataEnum_SwitchedCapacitorStatusEnum(_Enum):
	InitiallyOn = 1
	InitiallyOff = 2

class _CymdistDataEnum_AccuracyTypeEnum(_Enum):
	Percentage = 1
	Constant = 2

class _CymdistDataEnum_VoltageUnitEnum(_Enum):
	V = 1
	kV = 2
	PU = 3
	BaseVoltage = 4

class _CymdistDataEnum_VoltageUnitReferenceEnum(_Enum):
	LineToLine = 1
	LineToNeutral = 2

class _CymdistDataEnum_DistanceRelayGroupEnum(_Enum):
	Numerical = 1
	Electromechanical = 2

class _CymdistDataEnum_DistanceRelayTypeEnum(_Enum):
	Mho = 1
	KD10 = 2
	HZ = 3
	Quad = 4
	Polygon = 5
	RAZOA = 6
	GCXY51 = 7
	GCX51A = 8
	Reactance = 9
	PolygonMho = 10

class _CymdistDataEnum_CurrentUnitEnum(_Enum):
	A = 1
	kA = 2

class _CymdistDataEnum_ReactivePowerUnitEnum(_Enum):
	var = 1
	kvar = 2
	Mvar = 3

class _CymdistDataEnum_RealPowerUnitEnum(_Enum):
	W = 1
	kW = 2
	MW = 3

class _CymdistDataEnum_AFConnectedEquipTypeEnum(_Enum):
	OpenAir = 1
	SwitchGear = 2
	MCCOrPanel = 3
	Cable = 4
	LowVoltageSwitchgear = 5
	MediumVoltageSwitchgear = 6
	Panelboard = 7
	Other = 8

class _CymdistDataEnum_AFExposedCircuitTypeEnum(_Enum):
	Fixed = 1
	Movable = 2

class _CymdistDataEnum_ElectrodeConfigurationEnum(_Enum):
	VOA = 1
	HOA = 2
	VCB = 3
	VCBB = 4
	HCB = 5

class _CymdistDataEnum_EnclosureTypeEnum(_Enum):
	Deep = 1
	Shallow = 2

class _CymDataEnum_StandardEnum(_Enum):
	Undefined = 1
	ANSI = 2
	IEC = 3
	UL = 4
	BS = 5
	BS1361 = 6
	BS3036 = 7
	BSSTD88 = 8
	DIN = 9
	VFI = 10

class _CymDataEnum_DeviceComponentTypeEnum(_Enum):
	UnknownDeviceComponent = 1
	LoadCustomer = 2

class _CymDataEnum_InstrumentTypeEnum(_Enum):
	Unknown = 1
	PotentialTransformer = 2
	CurrentTransformer = 3
	VoltageRelay = 4
	FrequencyRelay = 5
	OverCurrentRelay = 6
	MotorRelay = 7
	GenericUDM = 8
	LoadSheddingRelayUDM = 9
	ImpedanceRelayUDM = 10
	CentralizedCapacitorControlSystem = 11
	VoltageMeter = 12
	DistanceRelay = 13
	FaultIndicator = 14
	Ammeter = 15
	Varmeter = 16
	Wattmeter = 17

class _CymdistDataEnum_ContingencyRankingReportType(_Enum):
	E_None = 1
	VoltageRangeViolation = 2
	VoltageDeviation = 3
	OverloadingViolation = 4
	LoadingDeviation = 5
	VoltageAngleDifference = 6

class _CymPluginEnum_ComponentTypeEnum(_Enum):
	DCBESSUsePowerControls = 1
	DCBESSGenKW = 2
	MPPTChannel4GenKW = 3
	MPPTChannel3GenKW = 4
	MPPTChannel2GenKW = 5
	MPPTChannel1GenKW = 6
	UseReactivePowerControls = 7
	UseActivePowerControls = 8
	RemoveMeter = 9
	MeterConversion = 10
	All = 11
	Unknown = 12
	Status = 13
	CreateMeter = 14
	MeterStatus = 15
	MeterByPhase = 16
	MeterValueA1 = 17
	MeterValueB1 = 18
	MeterValueC1 = 19
	MeterValueTotal1 = 20
	MeterValueA2 = 21
	MeterValueB2 = 22
	MeterValueC2 = 23
	MeterValueTotal2 = 24
	MeterPrecisionA1 = 25
	MeterPrecisionB1 = 26
	MeterPrecisionC1 = 27
	MeterPrecisionTotal1 = 28
	MeterPrecisionA2 = 29
	MeterPrecisionB2 = 30
	MeterPrecisionC2 = 31
	MeterPrecisionTotal2 = 32
	MeterReferenceTime = 33
	VoltageMeterValueA = 34
	VoltageMeterValueB = 35
	VoltageMeterValueC = 36
	VoltageMeterPrecisionA = 37
	VoltageMeterPrecisionB = 38
	VoltageMeterPrecisionC = 39
	VoltageMeterReferenceTimeA = 40
	VoltageMeterReferenceTimeB = 41
	VoltageMeterReferenceTimeC = 42
	ClosedPhase = 43
	OperatingVoltageMagA = 44
	OperatingVoltageMagB = 45
	OperatingVoltageMagC = 46
	OperatingVoltageAngleA = 47
	OperatingVoltageAngleB = 48
	OperatingVoltageAngleC = 49
	GenKW = 50
	GenPF = 51
	GenKVLL = 52
	NbOfGen = 53
	RegTapPositionA = 54
	RegTapPositionB = 55
	RegTapPositionC = 56
	RegForwardVoltageA = 57
	RegForwardVoltageB = 58
	RegForwardVoltageC = 59
	RegReverseVoltageA = 60
	RegReverseVoltageB = 61
	RegReverseVoltageC = 62
	LTCSetPoint = 63
	LTCTapPosition = 64
	LTCSetPoint1 = 65
	LTCTapPosition1 = 66
	LTCSetPoint2 = 67
	LTCTapPosition2 = 68
	LoadValueA1 = 69
	LoadValueB1 = 70
	LoadValueC1 = 71
	LoadValueTotal1 = 72
	LoadValueA2 = 73
	LoadValueB2 = 74
	LoadValueC2 = 75
	LoadValueTotal2 = 76
	ConsumptionA = 77
	ConsumptionB = 78
	ConsumptionC = 79
	ConsumptionTotal = 80
	MotorLoadFactor = 81
	MotorPF = 82
	NbOfMotor = 83
	ShuntCapFixedPhase = 84
	ShuntCapInitialStatus = 85
	ShuntReactFixedPhase = 86
	SVCDesiredVoltage = 87
	STATCOMDesiredVoltage = 88
	AmbientTemperature = 89
	Adjustment = 90
	AdjustmentA1 = 91
	AdjustmentB1 = 92
	AdjustmentC1 = 93
	AdjustmentTotal1 = 94
	AdjustmentA2 = 95
	AdjustmentB2 = 96
	AdjustmentC2 = 97
	AdjustmentTotal2 = 98

class _CymPluginEnum_ComponentUnitTypeEnum(_Enum):
	Unknown = 1
	E_None = 2
	W = 3
	kW = 4
	MW = 5
	VA = 6
	kVA = 7
	MVA = 8
	A = 9
	kA = 10
	var = 11
	kvar = 12
	Mvar = 13
	PF = 14
	kVLL = 15
	VLL = 16
	kVLN = 17
	VLN = 18
	pu = 19
	puLL = 20
	E_120V = 21
	E_120VLL = 22
	E_percent = 23
	deg = 24
	Celcius = 25
	Fahrenheit = 26
	kWh = 27

class _CymDataEnum_CoordCriteriaProtectionTypeEnum(_Enum):
	Phase = 1
	Ground = 2
	PhaseAndGround = 3

class _CymDataEnum_CoordCriteriaCurveEnum(_Enum):
	Fast = 1
	Slow = 2
	All = 3

class _CymDataEnum_CoordCriteriaApplyOnEnum(_Enum):
	Minimum = 1
	Maximum = 2
	Slowest = 3
	Fastest = 4
	CumulativeSlow = 5
	CumulativeFast = 6
	Cumulative = 7

class _CymdistDataEnum_UDMVariableTypeEnum(_Enum):
	UDMVariableTypeNumerical = 1
	UDMVariableTypeBusId = 2
	UDMVariableTypeGeneratorId = 3
	UDMVariableTypeInductionMotorId = 4
	UDMVariableTypeSVCId = 5
	UDMVariableTypeLineSendingEnd = 6
	UDMVariableTypeLineReceivingEnd = 7
	UDMVariableTypeLineCircuit = 8
	UDMVariableTypeDCLineSendingEnd = 9
	UDMVariableTypeDCLineReceivingEnd = 10
	UDMVariableTypeDCLineCircuit = 11
	UDMVariableTypeLineId = 12

class _CymdistDataEnum_UDMValidationRules(_Enum):
	NoRule = 1
	GreaterThanZero = 2
	GreaterOrEqualZero = 3
	ZeroOrOne = 4
	Between0And2 = 5
	Between0And4 = 6
	LessThanZero = 7
	LessOrEqualZero = 8

class _CymdistDataEnum_CableSheathBondingTypeEnum(_Enum):
	SinglePoint = 1
	TwoPoints = 2
	CrossBonded = 3

class _CymdistDataEnum_BundleConfigurationEnum(_Enum):
	TrefoilABC = 1
	TrefoilABCN = 2
	PhaseBundled = 3
	NotBundled = 4

class _CymdistDataEnum_CableSpacingEnum(_Enum):
	Even = 1
	Uneven = 2

class _CymdistDataEnum_CableMinorSectionLengthEnum(_Enum):
	Unknown = 1
	Equal = 2

class _CymdistDataEnum_CablePhaseEnum(_Enum):
	A = 1
	B = 2
	C = 3
	ABC = 4
	N1 = 5
	N2 = 6
	N3 = 7

class _CymdistDataEnum_CableDuctMaterialEnum(_Enum):
	E_None = 1
	MetallicNonMagnetic = 2
	PVC = 3
	MetallicMagnetic = 4
	Fibre = 5
	Asbestos = 6
	Polyethylene = 7
	Concrete = 8
	Earthenware = 9

class _CymdistDataEnum_MediumInDuctEnum(_Enum):
	Air = 1
	Water = 2
	Solid = 3

class _CymdistDataEnum_DuctStandardSizeEnum(_Enum):
	E_2Inches = 1
	E_3Inches = 2
	E_4Inches = 3
	E_5Inches = 4
	E_6Inches = 5
	E_8Inches = 6
	E_10Inches = 7
	NonStandard = 8

class _CymdistDataEnum_CableConfigurationEnum(_Enum):
	OldTrefoil = 1
	FlatTouching = 2
	FlatSpaced = 3
	Custom = 4

class _CymdistDataEnum_CapacitorSensorLocationEnum(_Enum):
	Capacitor = 1
	Remote = 2

class _CymdistDataEnum_PrecedenceEnum(_Enum):
	WattsOverVars = 1
	VarsOverWatts = 2

class _CymdistDataEnum_ConverterActivePowerReferenceEnum(_Enum):
	DeviceRating = 1
	ConverterRating = 2
	Difference = 3
	ActiveGeneration = 4

class _CymdistDataEnum_PhotovoltaicSystemComponentEnum(_Enum):
	Unknown = 1
	DCPhotovoltaic = 2
	DCBESS = 3
	DCACConverter = 4

class _CymdistDataEnum_PowerTriggerUnitEnum(_Enum):
	KWTotal = 1
	KWperPhase = 2
	KVATotal = 3
	KVAperPhase = 4
	A = 5

class _CymdistDataEnum_StorageControllerStatusEnum(_Enum):
	Charging = 1
	Discharging = 2
	Idling = 3

class _CymdistDataEnum_PowerFactorPriorityEnum(_Enum):
	ActivePower = 1
	PowerFactorAdjustment = 2

class _CymdistDataEnum_TripModeEnum(_Enum):
	Remote = 1
	Sensitive = 2
	TimeDelayed = 3
	Insensitive = 4
	SensitivePlusNonSensitive = 5
	WattVar = 6
	DelayedWattVar = 7

class _CymdistDataEnum_CloseModeEnum(_Enum):
	NormalReclose = 1
	CircularClosingCurve = 2
	RelaxedClosingCurve = 3

class _CymdistDataEnum_OperatingPointEnum(_Enum):
	Dependent = 1
	Independent = 2

class _CymdistDataEnum_AntiPumpingEnum(_Enum):
	Off = 1
	SmartAntiPump = 2
	MotorCutoff = 3

class _CymdistDataEnum_RemoteModeEnum(_Enum):
	Blocked = 1
	Auto = 2

class _CymdistDataEnum_RecloseAlgorithmEnum(_Enum):
	AverageAllPhases = 1
	AllPhasesANDd = 2
	AverageAllAngle1 = 3
	AverageAllAngle2 = 4
	AverageAllAngle3 = 5
	AllPhasesORd = 6

