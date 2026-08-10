import cympy
from cympy import dm

for prop in dm.Describe("Device"):   # try "Network", "Section", "Node", "Equipment", "Instrument"
    print(prop.Name, "->", prop.Type, ":", prop.Description)