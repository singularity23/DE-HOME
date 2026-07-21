

class _LoadFlowPowerAdjustmentElementsChoices():
	LoadFlowElementExpSensitivity = 'LoadFlowElementExpSensitivity'
	LoadFlowElementGeneratorScaling = 'LoadFlowElementGeneratorScaling'
	LoadFlowElementMotorScaling = 'LoadFlowElementMotorScaling'
	LoadFlowElementPQ = 'LoadFlowElementPQ'
	LoadFlowElementZIPSensitivity = 'LoadFlowElementZIPSensitivity'

class _MeterModelsChoices():
	LowVoltageMeterModel = 'LowVoltageMeterModel'
	MeterModel = 'MeterModel'
	MeterModel = 'MeterModel'

class _LocationChoices():
	KeyDeviceComponent = 'KeyDeviceComponent'
	KeyDevice = 'KeyDevice'
	KeyInstrument = 'KeyInstrument'
	KeyNetworkItem = 'KeyNetworkItem'
	KeyTCCItem = 'KeyTCCItem'
	KeyEquipment = 'KeyEquipment'

class _MonitoringSelectionsChoices():
	ContingencyTabularReport = 'ContingencyTabularReport'
	MonitoringSelection = 'MonitoringSelection'

class _KeysChoices():
	KeyDeviceComponent = 'KeyDeviceComponent'
	KeyDevice = 'KeyDevice'
	KeyInstrument = 'KeyInstrument'
	KeyNetworkItem = 'KeyNetworkItem'
	KeyTCCItem = 'KeyTCCItem'
	KeyEquipment = 'KeyEquipment'

class _ItemsChoices():
	NetworkFaultMonitoredItemValue = 'NetworkFaultMonitoredItemValue'
	Item = 'Item'

class _DataPointsChoices():
	DataPointGroup = 'DataPointGroup'
	DataPoint = 'DataPoint'

class _CoordinationCriteriaConfigsChoices():
	ConductorDamageCriteriaConfig = 'ConductorDamageCriteriaConfig'
	CoordinationCriteriaConfig = 'CoordinationCriteriaConfig'
	CoordinationCriteriaConfig = 'CoordinationCriteriaConfig'

class _ShortCircuitSimultaneousFaultsChoices():
	ShortCircuitSimultaneousInterCircuitFault = 'ShortCircuitSimultaneousInterCircuitFault'
	ShortCircuitSimultaneousSeriesFault = 'ShortCircuitSimultaneousSeriesFault'
	ShortCircuitSimultaneousShuntFault = 'ShortCircuitSimultaneousShuntFault'
	ShortCircuitSimultaneousFault = 'ShortCircuitSimultaneousFault'

class _TransientEventsChoices():
	ApplyFaultEvent = 'ApplyFaultEvent'
	ClearFaultEvent = 'ClearFaultEvent'
	CloseEvent = 'CloseEvent'
	ConnectEvent = 'ConnectEvent'
	DisconnectEvent = 'DisconnectEvent'
	GlobalLoadModificationEvent = 'GlobalLoadModificationEvent'
	ModifyConverterEvent = 'ModifyConverterEvent'
	ModifyLoadEvent = 'ModifyLoadEvent'
	ModifyParametersEvent = 'ModifyParametersEvent'
	ModifyShuntEvent = 'ModifyShuntEvent'
	OpenEvent = 'OpenEvent'
	SinglePoleSwitchingEvent = 'SinglePoleSwitchingEvent'
	StartMotorEvent = 'StartMotorEvent'
	StopMotorEvent = 'StopMotorEvent'

class _UDMVariablesChoices():
	UDMVariableID = 'UDMVariableID'
	UDMVariableNumerical = 'UDMVariableNumerical'

class _ReverseFlowPropertyConstraintsChoices():
	ReverseFlowRelayTypeConstraint = 'ReverseFlowRelayTypeConstraint'
	ReverseFlowSensingModeConstraint = 'ReverseFlowSensingModeConstraint'

class _ValuesChoices():
	ComplexValue = 'ComplexValue'
	IndexValue = 'IndexValue'
	Integer64Value = 'Integer64Value'
	UnsignedInteger64Value = 'UnsignedInteger64Value'
	PtrValue = 'PtrValue'
	BooleanValue = 'BooleanValue'
	DoubleValue = 'DoubleValue'
	IntegerValue = 'IntegerValue'
	StringValue = 'StringValue'
	UnsignedIntegerValue = 'UnsignedIntegerValue'

class _CustomerTypeProfileSelectionsChoices():
	LongTermDynamicsLoadAdjustments = 'LongTermDynamicsLoadAdjustments'
	CustomerTypeProfileSelection = 'CustomerTypeProfileSelection'

class _DeviceProfileSelectionsChoices():
	LongTermDynamicsDeviceAdjustments = 'LongTermDynamicsDeviceAdjustments'
	DeviceProfileSelection = 'DeviceProfileSelection'

class _DeviceExtensionsChoices():
	FailureEventExtension = 'FailureEventExtension'
	RAMDeviceCalibrationExtension = 'RAMDeviceCalibrationExtension'

class _ValueChoices():
	ComplexValue = 'ComplexValue'
	IndexValue = 'IndexValue'
	Integer64Value = 'Integer64Value'
	UnsignedInteger64Value = 'UnsignedInteger64Value'
	PtrValue = 'PtrValue'
	BooleanValue = 'BooleanValue'
	DoubleValue = 'DoubleValue'
	IntegerValue = 'IntegerValue'
	StringValue = 'StringValue'
	UnsignedIntegerValue = 'UnsignedIntegerValue'

class _InstrumentsChoices():
	Ammeter = 'Ammeter'
	CurrentTransformer = 'CurrentTransformer'
	DistanceRelay = 'DistanceRelay'
	FaultIndicator = 'FaultIndicator'
	ImpedanceRelayUDM = 'ImpedanceRelayUDM'
	MotorRelay = 'MotorRelay'
	OverCurrentRelay = 'OverCurrentRelay'
	Varmeter = 'Varmeter'
	Wattmeter = 'Wattmeter'
	CentralizedCapacitorControlSystem = 'CentralizedCapacitorControlSystem'
	FrequencyRelay = 'FrequencyRelay'
	GenericUDM = 'GenericUDM'
	LoadSheddingRelayUDM = 'LoadSheddingRelayUDM'
	PotentialTransformer = 'PotentialTransformer'
	VoltageMeter = 'VoltageMeter'
	VoltageRelay = 'VoltageRelay'

class _InstallationChoices():
	MultiCircuitInstallation = 'MultiCircuitInstallation'
	SingleCircuitInstallation = 'SingleCircuitInstallation'

class _CustomerLoadValuesChoices():
	CenterTapCustomerLoadValue = 'CenterTapCustomerLoadValue'
	CustomerLoadValue = 'CustomerLoadValue'

class _CapacitorControlChoices():
	CapacitorPythonControl = 'CapacitorPythonControl'
	CurrentControlled = 'CurrentControlled'
	KVARControlled = 'KVARControlled'
	PFControlled = 'PFControlled'
	ReactiveCurrentControlled = 'ReactiveCurrentControlled'
	TemperatureControlled = 'TemperatureControlled'
	Time = 'Time'
	VoltageControlled = 'VoltageControlled'

class _DGGenerationModelsChoices():
	SynchronousGenerationModel = 'SynchronousGenerationModel'
	DGGenerationModel = 'DGGenerationModel'

class _IslandedControlChoices():
	IslandedControlDroop = 'IslandedControlDroop'
	IslandedControlFixed = 'IslandedControlFixed'
	IslandedControlIsochronous = 'IslandedControlIsochronous'

class _NonlinearModelChoices():
	NonlinearFaultContributionGeneric = 'NonlinearFaultContributionGeneric'
	NonlinearFaultContributionVCCS = 'NonlinearFaultContributionVCCS'

class _ConverterControlsChoices():
	ConverterControlPowerSmoothing = 'ConverterControlPowerSmoothing'
	ConverterControlWattVar = 'ConverterControlWattVar'
	ConverterControlChargingLevel = 'ConverterControlChargingLevel'
	ConverterControlDERDriven = 'ConverterControlDERDriven'
	ConverterControlDERLeveling = 'ConverterControlDERLeveling'
	ConverterControlDERSmoothing = 'ConverterControlDERSmoothing'
	ConverterControlDERSupport = 'ConverterControlDERSupport'
	ConverterControlLoadShape = 'ConverterControlLoadShape'
	ConverterControlPowerDriven = 'ConverterControlPowerDriven'
	ConverterControlPowerFollowing = 'ConverterControlPowerFollowing'
	ConverterControlPowerLeveling = 'ConverterControlPowerLeveling'
	ConverterControlPowerPeakShaving = 'ConverterControlPowerPeakShaving'
	ConverterControlTimeDriven = 'ConverterControlTimeDriven'
	ConverterControlVoltVarVV12 = 'ConverterControlVoltVarVV12'
	ConverterControlVoltVarVV13 = 'ConverterControlVoltVarVV13'
	ConverterControlVoltVarVV14 = 'ConverterControlVoltVarVV14'
	ConverterControlVoltWattVW52 = 'ConverterControlVoltWattVW52'
	ConverterControlGenerationLevel = 'ConverterControlGenerationLevel'
	ConverterControlPowerFactor = 'ConverterControlPowerFactor'
	ConverterControlReactiveCurrent = 'ConverterControlReactiveCurrent'
	ConverterControlVoltVarVV11 = 'ConverterControlVoltVarVV11'
	ConverterControlVoltWattVW51 = 'ConverterControlVoltWattVW51'
	ConverterControlWattPF = 'ConverterControlWattPF'
	ConverterControl = 'ConverterControl'

class _IslandedControlNoInverterChoices():
	IslandedControlDroop = 'IslandedControlDroop'
	IslandedControlFixed = 'IslandedControlFixed'
	IslandedControlIsochronous = 'IslandedControlIsochronous'

class _MPPTChannelsChoices():
	MPPTChannelDetailed = 'MPPTChannelDetailed'
	MPPTChannelSimplified = 'MPPTChannelSimplified'

class _BaseGenerationModelsChoices():
	DGGenerationModel = 'DGGenerationModel'
	SynchronousGenerationModel = 'SynchronousGenerationModel'
	BaseGenerationModel = 'BaseGenerationModel'

class _NPSettingsChoices():
	NetworkProtectorSettingsMNPR = 'NetworkProtectorSettingsMNPR'
	NetworkProtectorSettingsMPCV = 'NetworkProtectorSettingsMPCV'

class _DistanceRelayZonesChoices():
	DistanceRelayZoneMho = 'DistanceRelayZoneMho'
	DistanceRelayZonePolygon = 'DistanceRelayZonePolygon'
	DistanceRelayZoneQuad = 'DistanceRelayZoneQuad'
	DistanceRelayZoneReactance = 'DistanceRelayZoneReactance'

class _ArcFlashNodeChoices():
	ArcFlashNode = 'ArcFlashNode'
	DCArcFlashNode = 'DCArcFlashNode'

class _DevicesChoices():
	ShuntCapacitorUpdate = 'ShuntCapacitorUpdate'
	SeriesCapacitor = 'SeriesCapacitor'
	SeriesReactor = 'SeriesReactor'
	ShuntCapacitor = 'ShuntCapacitor'
	ShuntReactor = 'ShuntReactor'
	SwitchableShuntBank = 'SwitchableShuntBank'
	Battery = 'Battery'
	Charger = 'Charger'
	DCCable = 'DCCable'
	DCDCConverter = 'DCDCConverter'
	DCFuse = 'DCFuse'
	DCImpedance = 'DCImpedance'
	DCLoad = 'DCLoad'
	DCLVCB = 'DCLVCB'
	DCMotor = 'DCMotor'
	DCSwitch = 'DCSwitch'
	DCUPS = 'DCUPS'
	ArcFurnace = 'ArcFurnace'
	CTypeFilter = 'CTypeFilter'
	DoubleTunedFilter = 'DoubleTunedFilter'
	HighPassFilter = 'HighPassFilter'
	IdealConverter = 'IdealConverter'
	NonIdealConverter = 'NonIdealConverter'
	SeriesFrequencyDependentBranch = 'SeriesFrequencyDependentBranch'
	SeriesFrequencySource = 'SeriesFrequencySource'
	SeriesMutuallyCoupled3phBranch = 'SeriesMutuallyCoupled3phBranch'
	SeriesParallelRLCBranch = 'SeriesParallelRLCBranch'
	SeriesRLCBranch = 'SeriesRLCBranch'
	ShuntFrequencyDependentBranch = 'ShuntFrequencyDependentBranch'
	ShuntFrequencySource = 'ShuntFrequencySource'
	ShuntMutuallyCoupled3phBranch = 'ShuntMutuallyCoupled3phBranch'
	ShuntParallelRLCBranch = 'ShuntParallelRLCBranch'
	ShuntRLCBranch = 'ShuntRLCBranch'
	SingleTunedFilter = 'SingleTunedFilter'
	Busway = 'Busway'
	DoubleCircuitLine = 'DoubleCircuitLine'
	OverheadByPhase = 'OverheadByPhase'
	OverheadLine = 'OverheadLine'
	OverheadLineUnbalanced = 'OverheadLineUnbalanced'
	Cable = 'Cable'
	Miscellaneous = 'Miscellaneous'
	NetworkEquivalent = 'NetworkEquivalent'
	DistributedLoad = 'DistributedLoad'
	InductionMotor = 'InductionMotor'
	SpotLoad = 'SpotLoad'
	SynchronousMotor = 'SynchronousMotor'
	DcLink = 'DcLink'
	VARCompensator = 'VARCompensator'
	Statcom = 'Statcom'
	Upfc = 'Upfc'
	VariableFrequencyDrive = 'VariableFrequencyDrive'
	BESS = 'BESS'
	ElectronicConverterGenerator = 'ElectronicConverterGenerator'
	InductionGenerator = 'InductionGenerator'
	MicroTurbine = 'MicroTurbine'
	Photovoltaic = 'Photovoltaic'
	Sofc = 'Sofc'
	SVC = 'SVC'
	SynchronousGenerator = 'SynchronousGenerator'
	Wecs = 'Wecs'
	Breaker = 'Breaker'
	Fuse = 'Fuse'
	LVCB = 'LVCB'
	NetworkProtector = 'NetworkProtector'
	Recloser = 'Recloser'
	Sectionalizer = 'Sectionalizer'
	Switch = 'Switch'
	AutoTransformer = 'AutoTransformer'
	GroundingTransformer = 'GroundingTransformer'
	PhaseShifterTransformer = 'PhaseShifterTransformer'
	RegulatorByPhase = 'RegulatorByPhase'
	Regulator = 'Regulator'
	ThreeWindingAutoTransformer = 'ThreeWindingAutoTransformer'
	ThreeWindingTransformer = 'ThreeWindingTransformer'
	TransformerByPhase = 'TransformerByPhase'
	Transformer = 'Transformer'
	SourceSettings = 'SourceSettings'

class _LoadValueChoices():
	LoadValueAMP_PF = 'LoadValueAMP_PF'
	LoadValueKVA_PF = 'LoadValueKVA_PF'
	LoadValueKW_KVAR = 'LoadValueKW_KVAR'
	LoadValueKW_PF = 'LoadValueKW_PF'

class _LoadValue1NChoices():
	LoadValueAMP_PF = 'LoadValueAMP_PF'
	LoadValueKVA_PF = 'LoadValueKVA_PF'
	LoadValueKW_KVAR = 'LoadValueKW_KVAR'
	LoadValueKW_PF = 'LoadValueKW_PF'

class _LoadValue2NChoices():
	LoadValueAMP_PF = 'LoadValueAMP_PF'
	LoadValueKVA_PF = 'LoadValueKVA_PF'
	LoadValueKW_KVAR = 'LoadValueKW_KVAR'
	LoadValueKW_PF = 'LoadValueKW_PF'