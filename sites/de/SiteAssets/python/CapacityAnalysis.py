from cympy import *
import math
import os, sys, traceback, locale
from datetime import datetime

from pathlib import Path

locale.setlocale(locale.LC_NUMERIC, "")
app.ActivateRefresh(False)
spot_dev_type = enums.DeviceType.SpotLoad
spot_dev_name = "NEW_LOAD"

cable_dev_type = enums.DeviceType.Underground
cable_dev_name = "NEW_CABLE"
cable_id = "3P_G16_-_1/C_#1_AWG_AL_25_KV_XLPE"

section_id = "NEW_SECTION"

toNode_id = "SPOT_POINT_1"

spot_load_type = enums.LoadType.Spot
three_phase = enums.PhaseType.ThreePhase

variables = [
        "IAout",
        "IBout",
        "ICout",
        "IUnbalA",
        "IUnbalB",
        "IUnbalC",
        "PFA",
        "PFB",
        "PFC",
        ]

def ReadInputs():

    fromNode_id, CEC_KW, Connected_KVA, Cust_Type, Load_Balance = map(
        GetInputParameter,
        [
            "Node_ID",
            "CEC_KW",
            "Connected_KVA",
            "Cust_Type",
            "Load_Balance",
        ],
    )

    return [fromNode_id, CEC_KW, Connected_KVA, Cust_Type, Load_Balance]

def main():
    fromNode_id, CEC_KW, Connected_KVA, Cust_Type, Load_Balance = ReadInputs()

    fromNode = study.GetNode(fromNode_id)
    toNode = study.Node()

    if not fromNode:
        raise NameError ("Error: please pick a Node and change its ID to 'SPOT_POINT'")

    fromNode_X = fromNode.X
    toNode.ID = toNode_id
    toNode_X = fromNode.X + 15

    network_id = study.QueryInfoNode("UpstreamSourceID", fromNode.ID)
    LA = sim.LoadAllocation()
    LA.Run([network_id])

    if not study.GetSection(section_id):
        section = study.AddSection(section_id, network_id, cable_dev_name, cable_dev_type, fromNode_id, toNode_id)

    cable_dev = study.GetDevice(cable_dev_name, cable_dev_type)

    cable_dev.SetValue(cable_id, 'CableID')
    cable_dev.SetValue(15, 'Length')
    cable_dev.SetValue('SinglePoint', 'Installation.BondingType')
    cable_dev.SetValue('TrefoilABC', 'Installation.BundleConfiguration')
    cable_dev.SetValue('PVC', 'Installation.DuctMaterial')

    if not study.GetLoad(spot_dev_name, spot_load_type):

        spot_dev = study.AddDevice(spot_dev_name, spot_dev_type, section_id)
        spot_load = study.GetLoad(spot_dev_name, spot_load_type)
        spot_load.AddCustomerLoad(spot_dev_name)

    spot_dev = study.GetDevice(spot_dev_name, spot_dev_type)
    spot_load = study.GetLoad(spot_dev_name, spot_load_type)
    spot_load.SetPhaseType(three_phase)

    cust = spot_dev.DeviceNumber

    spot_dev.SetValue(Cust_Type, f'CustomerLoads.Get({cust}).CustomerType')
    spot_dev.SetValue('KW_PF', f'CustomerLoads.Get({cust}).CustomerLoadModels[0].LoadValueType')
    spot_dev.SetValue('To', 'Location')
    spot_dev.SetValue(Connected_KVA, f'CustomerLoads.Get({cust}).CustomerLoadModels[0].CustomerLoadValues[0].ConnectedKVA')
    spot_dev.SetValue(CEC_KW, f'CustomerLoads.Get({cust}).CustomerLoadModels[0].CustomerLoadValues[0].LoadValue.KW')
    spot_dev.SetValue(98, f'CustomerLoads.Get({cust}).CustomerLoadModels[0].CustomerLoadValues[0].LoadValue.PF')

    LF = sim.LoadFlow()


    LB = LoadBalancing(network=network_id)
    print(LB.network_id)
    LF.Run([network_id])

    IA, IB, IC, PFA, PFB, PFC = LB.GetLoadFlow(LB.network_id)
    demand = study.GetMeter(network_id, enums.DeviceType.Breaker)
    if Load_Balance == 1:
    #print(demand)
        LB.UpdateMeter(network_id, IA, IB, IC, PFA, PFB, PFC, demand)
        LB.Run()


if __name__ == "__main__":
    start = time.time()
    locale.setlocale(locale.LC_NUMERIC, "")
    locale.getdefaultlocale = (lambda *args: ['us_CA', 'utf8'])
    script_dir = GetInputParameter("Script_Location")
    sys.path.append(os.path.abspath(script_dir))
    app.ActivateRefresh(False)
    from LoadBalancing import *
    try:
        main()
    except Exception:
        traceback.print_exc()
    finally:
        study.ActivateModifications(True)
    print("Excution Time: {}s".format(time.time()-start))
