# CYME / CymPy Cheat Sheet

## 1) Import and entry points

```python
import cympy
from cympy import app, study, enums, sim, eq, dm
```

Useful helpers:

- `cympy.GetInputParameter(name)`
- `cympy.GetParameterAsText(name)`
- `cympy.QueryInfo(keyword, obj)`
- `cympy.GetMessages()`

---

## 2) Study lifecycle

```python
study.New()
study.Open("path/to/file")
study.Save("path/to/file")
study.Close()
```

Project structure:

```python
study.NewProject("MyProject", enums.ProjectMode.Normal)
study.AddSubProject("Sub1", "TYPE_ID")
study.AddScenario("Scenario1")
```

Time/context:

```python
study.SetCurrentDate(datetime.datetime.now())
study.SetPosition("OBJECT_ID", enums.StudyPosition.Beginning)
```

---

## 3) Networks

```python
networks = study.ListNetworks()
network = study.GetNetwork("NET1")
```

```python
study.LoadNetwork("NET1")
study.UnloadNetwork("NET1")
```

```python
study.AddNetwork("NET1", enums.NetworkType.Substation)
```

---

## 4) Topology objects

### Nodes

```python
node = study.GetNode("NODE1")
node.ID
node.GetValue("PropertyName")
node.SetValue("Value", "PropertyName")
```

### Sections

```python
section = study.GetSection("SEC1")
section.ID
section.GetValue("PropertyName")
section.SetValue("Value", "PropertyName")
section.ListDevices()
```

### Devices

```python
device = study.GetDevice("DEV1", enums.DeviceType.Transformer)
device.DeviceNumber
device.DeviceType
device.GetValue("PropertyName")
device.SetValue("Value", "PropertyName")
```

### Instruments

```python
inst = study.GetInstrument("INST1", enums.InstrumentType.Voltmeter)
inst.GetValue("PropertyName")
inst.SetValue("Value", "PropertyName")
```

---

## 5) Build and edit the network

```python
study.AddSection("SEC1", "NET1", "DEV1", enums.DeviceType.Transformer, "NODE_A", "NODE_B")
study.Connect("NODE_A", "NODE_B")
study.Disconnect("SEC1", "NODE_A")
study.MoveDevice("DEV1", enums.DeviceType.Transformer, "SEC2")
study.DeleteDevice("DEV1", enums.DeviceType.Transformer)
```

---

## 6) Query values

```python
study.QueryInfoNode("NominalKVLL", "NODE1")
study.QueryInfoDevice("IAout", "DEV1", enums.DeviceType.Transformer)
study.QueryInfoSection("Length", "SEC1")
study.QueryInfo("SomeKeyword", device_or_node_or_instrument)
```

Generic object access:

```python
obj.GetValue("PropertyName")
obj.SetValue("Value", "PropertyName")
obj.GetUDD("KeywordID")
obj.SetUDD("Value", "KeywordID")
```

---

## 7) Loads and customers

```python
load = study.GetLoad("DEV1", enums.LoadType.Load)
load.GetValue("PropertyName")
load.SetValue("Value", "PropertyName", "CUSTOMER1", enums.Phase.A, "DEFAULT")
```

```python
study.ListCustomerTypes()
study.GetCustomerType("Residential")
```

---

## 8) Simulation

### Load flow

```python
lf = sim.LoadFlow()
lf.Run(["NET1"])
```

### Load allocation

```python
la = sim.LoadAllocation()
la.SetValue("Method", "Method")
la.Run(["NET1"])
```

### Short circuit

```python
sc = sim.ShortCircuit()
sc.Run(["NET1"])
```

### ANSI / IEC variants

```python
sc_ansi = sim.ShortCircuitANSI()
sc_ansi.Run(["NET1"])

sc_iec = sim.ShortCircuitIEC()
sc_iec.Run(["NET1"])
```

---

## 9) Equipment library

```python
eq_obj = eq.GetEquipment("EQ1", enums.EquipmentType.Transformer)
eq.Add("EQ2", enums.EquipmentType.Transformer)
eq.ListEquipments(enums.EquipmentType.Transformer)
eq.Delete("EQ2", enums.EquipmentType.Transformer)
```

---

## 10) Useful enums

```python
enums.DeviceType.Transformer
enums.DeviceType.Breaker
enums.DeviceType.Source
enums.EquipmentType.Transformer
enums.Phase.A
enums.Phase.BC
enums.Phase.ABC
enums.LoadType.Load
enums.NetworkType.Substation
```

---

## 11) Useful CYME helpers

```python
for prop in dm.Describe("Device"):
    print(prop.Name, "->", prop.Type, ":", prop.Description)

for kw in app.ListKeywords():
    print(kw)

kw = app.GetKeyword("NominalKVLL")
print(kw)
```

---

## 12) Beginner recipes

### Read a device property

```python
dev = study.GetDevice("DEV1", enums.DeviceType.Transformer)
print(dev.GetValue("NominalKVLL"))
```

### Read a node property

```python
node = study.GetNode("NODE1")
print(study.QueryInfoNode("$NetworkId$", "NODE1"))
```

### Run load flow

```python
lf = sim.LoadFlow()
lf.Run(["NET1"])
```

### List all devices

```python
for d in study.ListDevices():
    print(d.DeviceNumber, d.DeviceType)
```
```

---

## 13) Mental model

- `Study` = project container
- `Network` = electrical model
- `Node` / `Section` / `Device` = topology elements
- `GetValue` / `SetValue` = property access
- `QueryInfo*` = keyword-based read
- `Sim` objects = analysis engines
