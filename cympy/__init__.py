# Copyright 2016 Eaton. 
# All rights reserved. 
# 
# Proprietary to Eaton in the U.S. and other countries. 
# You are not permitted to use this file without the prior written consent of 
# Eaton or without a valid contract with Eaton (CYME). 
# 
# For additional information, contact: cymesupport@eaton.com 
# 
# WARNING: Do not manually edit this file. 

"""
CYME Python main module.
Contains helper functions or functions that are not specific to a module.
"""

import sys
import cympy.app as app
import cympy.study as study
import cympy.enums as enums
import cympy.sim as sim
import cympy.err as err
import cympy.dm as dm

__all__ = ['app', 'study', 'enums', 'rm', 'sim', 'db', 'err', 'utils', 'eq', 'dm']

def GetParameterAsText(NameOrIndex):
	"""
	Gets the parameter as text.

	Module: cympy

	Args:
		NameOrIndex -> str or int

	Return type: 
		str
	"""
	if ( isinstance(NameOrIndex, int) ):
		return sys.argv[NameOrIndex]
	else:
		return app.GetParameterAsText(NameOrIndex)

__all__.append('GetParameterAsText')

def GetParameterCount():
	"""
	Gets the number of parameters.

	Module: cympy

	Args:
		None

	Return type: 
		int
	"""
	return len(sys.argv)

__all__.append('GetParameterCount')

def GetInputParameter(Name) -> "str" :
	"""
    GetInputParameter( Name ) -> str

	Gets the input parameter with the specified name.

	Module: cympy

	Args:
		Name -> str

	Return type: 
		str
	"""
	val = app.GetInputParameterAsText(Name)
	type = app.GetInputParameterType(Name)
	if ( type == enums.ParameterType.Number ):
		val = int(val)
	elif ( type == enums.ParameterType.Real ):
		val = float(val)
	elif ( type == enums.ParameterType.Boolean ):
		val = bool(val)
	return val

__all__.append('GetInputParameter')

def GetMessages(*args):
	"""
	Returns the messages encountered during the execution of the last command processed by CYME.

	Module: cympy.app

	Args:
		Severity -> cympy.enums.Severity (Optional, default: cympy.enums.Severity.All)

	Return type: 
		list of cympy.app.Message
	"""
	return app.GetMessages(*args)

__all__.append('GetMessages')

def QueryInfo(*args):
	"""
	Returns the value of the specified keyword for the specified network item.

	Module: cympy.study

	Args:
		KeywordID -> str
		
		NetworkItem -> cympy.study.Device, cympy.study.Instrument or cympy.study.CymPyNode
		
		Precision -> int (Optional, default: -1)
		
	Return type: 
		str
	"""
	return study.QueryInfo(*args)

__all__.append('QueryInfo')

def Describe(*args):
	"""
	Describe( ObjectType )

	Displays information about the data model object type.

	Module: cympy

	Args:
		ObjectType-> str

	Return type: 
		None
	"""
	print('\n'.join(str(d) for d in dm.Describe(*args)))

__all__.append('Describe')

env = app._EnvironmentSettings()
__all__.append('env')

version = app._GetVersionInfo()
__all__.append('version')

results = app._InternalResults()
__all__.append('results')
