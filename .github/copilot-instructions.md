# AI Coding Instructions for DE-HOME Project

## Project Overview
DE-HOME is a SharePoint-based Digital Workplace for Distribution Engineering (DE) at BC Hydro. It combines:
- **Frontend**: SharePoint-hosted HTML, CSS, and JavaScript for UI customization
- **Power Systems Analysis**: Python scripts using CymDist (cympy) for electrical grid analysis
- **Data Transformation**: Utilities for format conversion (HTML↔Markdown) and file operations
- **SharePoint Integration**: Custom scripts for ASPEN booking and asset management

## Architecture Patterns

### SharePoint-Specific Development
- **Master Pages**: [head.html](sites/de/head.html), [body.html](sites/de/body.html) define the site structure
- **Asset Loading**: CSS/JS loaded from `SiteAssets/` directory via SharePoint URL paths
- **URL Construction**: Uses prefix-based routing (`/sites/de/`), handles SharePoint download URLs with `?download=1` suffix
- **Popup System**: Custom overlay notifications in [popup.html](sites/de/popup.html) triggered by `showPopup(msg)` in [default.js](sites/de/SiteAssets/js/default.js#L61)
- **DOM Selectors**: Standardized through helper functions `qS()` and `qSA()` for querySelector access

### Power Systems Analysis (Python)
**Key Files**:
- [ShortCircuit_2.py](sites/de/SiteAssets/python/ShortCircuit_2.py) (1744 lines): Short circuit calculations with emission studies
- [LoadBalancing.py](sites/de/SiteAssets/python/LoadBalancing.py) (883 lines): Three-phase load distribution optimization
- [CapacityAnalysis.py](sites/de/SiteAssets/python/CapacityAnalysis.py): Spot load capacity planning
- Uses **CymDist (cympy)**: Power flow simulation library with `app`, `eq`, `sim`, `study`, `rm`, `enums` modules

**CymDist (cympy) API Patterns**:
- **Equipment Access**: `eq.GetEquipment(network_id, equipment_type)`, `eq.GetValue(keywords, eq_id, eq_type)` for retrieving device properties
- **Node/Device Queries**: `study.QueryInfoNode(keyword, node_id)`, `study.QueryInfoDevice(keyword, dev_number, dev_type)` (keywords often prefixed with `$` for system attributes like `$NetworkId$`, `$UpstreamSourceNodeID$`)
- **Device Creation**: `study.AddDevice(device_name, device_type, section_id)`, `study.GetDevice(name, device_type)` for managing equipment
- **Network Iteration**: `study.NetworkIterator(start_node, iteration_option)` with `.Next()`, `.GetSection()`, `.GetPhase()`, `.GetDevices()` for traversing network
- **Simulation Objects**:
  - `sim.LoadAllocation()` - Distributes customer loads across network; uses `.SetValue("Method", allocation_method)` for KVA vs KWH allocation
  - `sim.LoadFlow()` - Executes power flow; call `.Run([network_id])` to execute
  - `sim.Meter()` - Creates meters for measurement points
- **Enums**: `enums.DeviceType` (Transformer, Source, SeriesReactor, SpotLoad, etc.), `enums.Phase` (A, B, C, ABC), `enums.EquipmentType`, `enums.PhaseType.ThreePhase`
- **Reporting**: `rm.CustomReport()` with cell builders (`rm.SectionCell`, `rm.FloatCell`, `rm.StringCell`) for formatted output tables
- **SetValue Pattern**: Most cympy objects use `.SetValue(value, property_path)` where paths can be nested (e.g., `'CustomerLoads.Get(0).CustomerType'`)

**Utility Script Examples**:
- **QueryHelper Pattern** (Lines 144-181 in ShortCircuit_2.py): Fallback query mechanism that tries multiple keywords and handles locale conversion via `locale.atof()` for decimal parsing
- **Phase-specific Section Filtering** (LoadBalancing.py, `GetSinglePhaseSections`): Iterate through network and collect single-phase sections with current thresholds, avoiding duplicates across multiple study points
- **Impedance Calculation** (ShortCircuit_2.py, `ImpedanceCalculator`): Two-step formula - calculate magnitude from Z%, KVLL, KVA, then split into R and X using ratio; supports both device and equipment-level impedances
- **Section Balancing** (LoadBalancing.py, `ClosestSumOfSubset`): Dynamic programming to find optimal subset of sections whose current sum closest approaches imbalance target
- **Safe Parameter Loading** (LoadBalancing.py, `_initialize_parameters`): Use try/except with `GetInputParameter()` and provide sensible defaults to handle missing inputs gracefully

**Common Patterns**:
- Chrome browser handling via `ChromeBrowser.register_chrome()` for result visualization
- Three-phase power system modeling with `PhaseType` enum (A, B, C, AB, BC, AC, ABC)
- URL encoding for SharePoint result sharing via `urllib.parse.quote()`
- Exception handling with custom `LoadBalancingError` for domain-specific failures
- Network ID retrieval from node context via `QueryInfoNode("$NetworkId$", node_id)` for operating in active network

### Frontend Stack
- **CSS Organization**: Multiple files ([default.css](sites/de/SiteAssets/css/default.css), [design_system_styles.scss](sites/de/SiteAssets/css/design_system_styles.scss))
- **JS Architecture**: Modular functions with debouncing (100ms default in [default.js](sites/de/SiteAssets/js/default.js#L33))
- **Font System**: Custom GT-Haptik font faces (Black, Bold, Light, Medium, Regular) in vendor directory
- **Helper Libraries**: marked.min.js (Markdown parser), turndown.min.js (HTML→Markdown converter)

## Key Conventions

### Python
- **Type Hints**: Full use of `typing` module (Dict, List, Tuple, Optional, Any); Python 3.10+ union syntax (`float | str` and `List[Dict]`)
- **Dataclasses**: Used for structured data (`@dataclass` decorator) - example: `StudyParameters` in ShortCircuit_2.py holds customer_type, connection, disturbing, emission, feeder_limit
- **Error Tracking**: Include timestamps in comments for code history (e.g., `# by Kan Tang @2024-11-06`)
- **Fallback Logic**: `QueryHelper` pattern for handling missing CymDist data:
  ```python
  # Try multiple keywords in sequence, return parsed float or original string
  def query_with_fallback(query_func, keyword_list, *args):
    for keyword in keyword_list:
      result = query_func(keyword, *args)
      try:
        return locale.atof(result)  # Parse locale-aware decimal
      except (ValueError, TypeError):
        return result  # Return unparsed if conversion fails
  ```
- **Environment Setup**: Always call `app.ActivateRefresh(False)` at start to disable auto-refresh, reducing load on large networks
- **Locale Handling**: Use `locale.setlocale(locale.LC_NUMERIC, "")` for decimal parsing; cympy returns locale-aware number strings
- **Exception Handling**: Create custom exceptions (e.g., `LoadBalancingError`) for domain-specific errors; catch and log with traceback
- **Class Initialization Pattern**: Multi-step init (e.g., in LoadBalancing.__init__): call `_initialize_parameters()`, `_initialize_simulation()`, `_initialize_variables()`, etc. - breaks complex setup into testable units
- **Output Format**: Results typically exported as URLs to Chrome for visualization using `webbrowser.open_new()` after registering Chrome path

### Testing Pattern (Python)
- **Mock cympy imports** at module level before importing the module under test (see test_LoadBalancing.py lines 1-14):
  ```python
  cympy_mock = types.ModuleType('cympy')
  setattr(cympy_mock, "study", MagicMock())  # Mock all required modules
  sys.modules['cympy'] = cympy_mock
  ```
- **Patch utility functions** with side effects that return realistic values
- **Test core algorithms independently** of cympy (e.g., `ClosestSumOfSubset`, `CombineDicts`) - these have no cympy dependencies

### JavaScript
- **Query Selectors**: Always use `qS()` helper for single elements, `qSA()` for collections
- **Attribute Setting**: Use `setAttributes()` helper instead of direct setAttribute calls
- **Debouncing**: Wrap heavy operations in debounce to prevent UI blocking
- **Custom Elements**: Non-standard tags (`<new>`, `<update>`) used for dynamic tagging system
- **URL Constants**: Define as UPPERCASE module-level constants

### SharePoint-Specific
- **Path Format**: Use SharePoint-relative paths (`/sites/de/SiteAssets/...`)
- **Query IDs**: Element IDs follow SharePoint convention (`ctl00_PlaceHolderMain_...`)
- **ASPEN Integration**: Separate bookmarklet files for ASPEN (asset planning system) queries

## Workflow & Commands

### CymDist (cympy) API Deep Dive

**Setting Property Values** (most common pattern):
```python
# Simple property
device.SetValue(value, "PropertyName")
# Nested property with Get() index
spot_dev.SetValue(98, f'CustomerLoads.Get({cust}).CustomerLoadModels[0].LoadValue.PF')
# Equipment-level property
eq_obj.SetValue("Ohms", "ImpedanceUnit")
```

**Network Traversal with Iterator**:
```python
# Downstream iteration from a node
iterator = study.NetworkIterator(node_id, enums.IterationOption.Downstream)
while iterator.Next():
  section = iterator.GetSection()
  phase = iterator.GetPhase()  # Single phase (A/B/C) or three-phase (ABC)
  devices = iterator.GetDevices()  # Iterate over all devices in section
  for device in devices:
    if device.DeviceType == enums.DeviceType.Transformer:
      continue  # Skip transformers; they're study point boundaries
```

**Query with Fallback for Locale-Aware Parsing**:
```python
# Try multiple keywords; return parsed float or string if parsing fails
keywords = ["NominalKVLL", "DesiredKVLL", "OperatingVoltage"]
voltages = QueryHelper.get_value_equipment(keywords, network_id, enums.EquipmentType.Substation)
# Returns: [12.47, None, 12.6] if second keyword doesn't exist
```

**Load Allocation & Load Flow Execution**:
```python
LA = sim.LoadAllocation()
LA.SetValue("KVAMethod", "Method")  # vs "KWHMethod"
LA.Run([network_id])  # Distribute loads to all feeders

LF = sim.LoadFlow()
LF.Run([network_id])  # Calculate power flow; required before reading device currents

# After LF.Run(), read results from devices
current_a = study.QueryInfoDevice("IAout", device.DeviceNumber, device.DeviceType)
```

**Impedance Calculation Pattern**:
```python
# From percentage impedance to ohms: Z% → Z_ohms → split R/X
Z_ohms_magnitude = (Z_percent * 10 * KVLL**2) / KVA
R = Z_ohms_magnitude / (1 + X_R_ratio**2)
X = X_R_ratio * R
```

**Device Creation**:
```python
# Create section first, then add device to it
section = study.AddSection(section_id, network_id, cable_name, cable_dev_type, from_node, to_node)
device = study.AddDevice(device_name, device_type, section_id)

# Get created device for configuration
device = study.GetDevice(device_name, device_type)
device.SetValue(cable_id, 'CableID')
```

**Reporting with Custom Report**:
```python
report = rm.CustomReport()
report.addRow(
  rm.SectionCell(section),
  rm.FloatCell(value, decimal_places=2),
  rm.StringCell("text", cf=cell_format)
)
report.Show()
```

### Python Development
```bash
# Activate virtual environment (Windows)
.venv\Scripts\Activate.ps1

# Run power system analysis
python sites/de/SiteAssets/python/ShortCircuit_2.py

# Test load balancing
python sites/de/SiteAssets/python/test_LoadBalancing.py
```

### Code Formatting
- **Prettier**: Configured for code formatting (`prettier@3.0.0-alpha.6` in [package.json](package.json))
- **Run**: `prettier --write .` for consistent formatting

## Critical Cross-Component Patterns

### Algorithm Patterns in Utility Scripts

**ClosestSumOfSubset** (LoadBalancing.py): Dynamic programming algorithm to find subset of values whose sum is closest to a target. Used for picking which sections to transfer between phases to reduce imbalance:
```python
# Returns (closest_sum, list_of_indices)
closest_sum, indices = ClosestSumOfSubset([10, 20, 30, 40], target=45)
# May return (50, [1, 2]) meaning take items at indices 1,2 for sum=50
```

**GetSinglePhaseSections** (LoadBalancing.py): Collects single-phase sections from multiple study points while filtering duplicates. Key logic:
- Iterate through study points and main network separately
- For each new study point, filter out sections already seen in previous iterations
- Prevents duplicate section processing when network has cascading study points

**GetTarget** (LoadBalancing.py): Wrapper around ClosestSumOfSubset that converts dictionary of section→current into (section, current) pairs:
```python
d = {'Section_A': 50, 'Section_B': 30, 'Section_C': 70}
target = 60  # Imbalance to fix
result = GetTarget(d, target)  # Returns list of (key, value) pairs
```

**Impedance Splitting** (ShortCircuit_2.py): For transformers, calculate R and X from percentage impedance and X/R ratio:
```python
# Given: Z_percent, X_R_Ratio, KVLL, KVA
Z_mag = (Z_percent * 10 * KVLL**2) / KVA
R = sqrt(Z_mag^2) / (1 + X_R_Ratio^2)  # Denominator corrects for ratio
X = X_R_Ratio * R
```

**Safe Parameter Loading** (LoadBalancing.py): Pattern for reading user inputs with fallbacks:
```python
def safe_get_param(param_name, default_value=None):
  try:
    value = GetInputParameter(param_name)
    return float(value) if value else default_value
  except (ValueError, TypeError) as e:
    print(f"Warning: {param_name} error, using default: {default_value}")
    return default_value
```

### Data Flow

1. **Python analyses generate URLs** → Chrome browser opens results → **JavaScript handles SharePoint integration**
2. **Fallback Mechanism**: When CymDist queries fail, use QueryHelper's cascading keyword search before raising exceptions
3. **Three-Phase Balancing**: Always preserve phase-specific calculations (A/B/C) before combining results
4. **Browser Registration**: Detect OS (windows/darwin/linux) and register Chrome via webbrowser module before opening URLs


### Testing & Validation

- Test files follow pattern: `test_*.py` (e.g., [test_LoadBalancing.py](sites/de/SiteAssets/python/test_LoadBalancing.py))
- Mock data in [python/cympy/](sites/de/SiteAssets/python/cympy/) directory for offline testing
- JavaScript errors logged to browser console; use `console.log()` for debugging
- SharePoint element availability checked before DOM manipulation to prevent runtime errors

### Cympy Initialization & Common Setup Patterns

**Module-Level Setup** (CapacityAnalysis.py pattern):
```python
from cympy import *  # Import all cympy modules
import locale
locale.setlocale(locale.LC_NUMERIC, "")  # Enable locale-aware decimal parsing
app.ActivateRefresh(False)  # Disable auto-refresh to improve performance on large networks
```

**Class-Based Multi-Phase Setup** (LoadBalancing.py pattern):
```python
@dataclass
class StudyParameters:
  customer_type: str
  connection: str
  disturbing: str
  customer_load_mw: float

class LoadBalancing:
  def __init__(self):
    self._initialize_parameters()  # Read user inputs with safe_get_param()
    self._initialize_simulation()  # Create sim.LoadAllocation(), sim.LoadFlow() objects
    self._initialize_variables()  # Set up phase mappings and section tracking
    self._initialize_study_points()  # Collect all nodes starting with 'STUDY_POINT'
    self._initialize_documentation()  # Setup report filenames and formats
```

**Node/Section Query Pattern** (ShortCircuit_2.py):
```python
# Get network ID from node context (system attribute)
NetworkID = study.QueryInfoNode("$NetworkId$", fault_point)
# Get upstream source node
source_node = study.QueryInfoNode("$UpstreamSourceNodeID$", fault_point)
# Get voltage from equipment
voltage = eq.GetValue("NominalKVLL", network_id, enums.EquipmentType.Substation)
```

**Device Listing and Filtering** (LoadBalancing.py):
```python
# List all nodes; filter for study points
study_points = [node.ID for node in study.ListNodes() if node.ID.startswith("STUDY_POINT")]
# List devices of specific type in network
rx_devices = study.ListDevices(enums.DeviceType.SeriesReactor, network_id)
```



## ASPEN Integration Patterns

### ASPEN Query System (JavaScript)
[ASPEN_Query.js](sites/de/SiteAssets/js/ASPEN_Query.js) provides protection relay settings queries through SQL-based interface:

**Configuration Structure**:
```javascript
const CONFIG = {
  selectors: {
    searchContainerId: 'aspen-search-container',
    inputId: 'searchInput',
    buttonId: 'searchButton',
    resultGridId: 'QueryResultGrid',
  },
  patterns: {
    searchInput: /^\w{3}\s(4|12|25|35)[fF]\d{2,3}\w?$/i,  // Validates relay naming
  },
  sql: {
    settingNames: ['51P1P', '51P1TD', '51P1C', '50P1P', ...],  // Relay settings
  },
};
```

**SQL Generation Pattern**:
```javascript
// Dynamic SQL for relay queries - substitutes device ID and validates settings
SQL.generate(inputCode)  // e.g., '3HS' returns settings for all '3HS*' relays
// Uses TSETTING1, TSETTYPE1, TRELAY, TREQUEST tables
// Handles unit conversion (e.g., time dial seconds → minutes via /60)
```

**DOM Utilities**:
- `DOM.createElement()` - Creates styled elements with class/style injection
- `DOM.injectStyles()` - Avoids style duplication with ID checks
- State management through `state` object (headerRow, tableRows, isProcessing)

### ASPEN Bookmarklet Pattern
[ASPEN Bookmarklet.js](sites/de/SiteAssets/js/ASPEN_Bookmarklet.js) extracts protection details from ASPEN interface:
- Runs as browser bookmarklet in ASPEN web interface
- Extracts device ID, relay type, settings from DOM
- Passes data to query system for detailed analysis

## SharePoint API Integration Details

### URL Construction & Asset Loading
```javascript
// Asset paths use SharePoint relative URLs with ?download=1 suffix
const DOWNLOAD_URL_PREFIX = 'https://hydroshare.bchydro.bc.ca/sites/de/_layouts/download.aspx?SourceUrl=';
const PREFIX = '/sites/de/';
const SUFFIX = '?download=1';

// Load CSS/JS from SiteAssets directory
// Example: /sites/de/SiteAssets/css/default.css
// SharePoint automatically handles URL rewriting and caching
```

### DOM Manipulation for SharePoint Pages
```javascript
// SharePoint element IDs follow predictable pattern
const logo = qS('#ctl00_onetidHeadbnnr2');  // Site header logo
const title = qS('#DeltaPlaceHolderPageTitleInTitleArea');
const content = qS('#ctl00_PlaceHolderMain_ctl01__ControlWrapper_RichHtmlField');

// Always check element existence before manipulation
if (element) element.style.width = '85%';

// Custom tags for dynamic content management
qSA('new, update').forEach(tag => {
  tag.setAttribute('date', futureDate);  // Track tag expiration
  if (currentDate >= new Date(tagDate)) {
    tag.remove();  // Auto-remove expired tags
  }
});
```

### SharePoint Content Anchoring Pattern
```javascript
// Master page structure defines content insertion points
// head.html: Loads CSS/JS assets and favicon
// body.html: Defines main content placeholders
// popup.html: Custom notification overlay system

// Popup notification system
function showPopup(msg) {
  const popup = qS('.popup');
  if (!popup) return;  // Gracefully fail if popup not in DOM
  qS('.popup-content', popup).innerHTML = msg;
  popup.classList.add('show');
  setTimeout(() => popup.classList.remove('show'), 4000);  // Auto-dismiss
}
```

## Power System Analysis Error Handling Patterns

### Custom Exception Hierarchy
```python
# Domain-specific exceptions for graceful error reporting
class LoadBalancingError(Exception):
  """Custom exception for load balancing domain errors"""
  pass

# Usage in analysis workflows
try:
  device = study.GetDevice(network_id, enums.DeviceType.Breaker)
  except Exception as e:
    raise LoadBalancingError(
      f"No Breaker found for network: {network_id}. Error: {str(e)}"
    )
```

### Query Fallback with Logging
```python
# Multi-keyword fallback prevents analysis failure on missing single attribute
def QueryWithFallback(query_func, keyword_list, *args):
  """Try keywords in sequence; return first successful parse or original value"""
  results = []
  for keyword in keyword_list:
    try:
      result = query_func(keyword, *args)
      return locale.atof(result)  # Successful parse
    except (ValueError, TypeError, Exception):
      pass  # Continue to next keyword
  return None  # All keywords failed

# Example: KVLL may be "NominalKVLL", "DesiredKVLL", or "OperatingVoltage"
voltages = QueryHelper.get_value_equipment(
  ["NominalKVLL", "DesiredKVLL", "OperatingVoltage"],
  network_id, enums.EquipmentType.Substation
)
# Returns first successful result; safe if any keyword matches
```

### Numeric Validation Pattern
```python
# Type-safe filtering of cympy query results
def _is_valid_section(iterator) -> bool:
  """Check section is valid for processing (phase transition ABC→AB/AC/BC/A/B/C)"""
  return (
    iterator.GetPhase() != iterator.GetFromPhase()
    and iterator.GetFromPhase() == enums.Phase.ABC
  )

# Ensure currents are numeric before calculations
currents = QueryDevices(["IAout", "IBout", "ICout"], dev_number, dev_type)
for ph, current in zip(PHASES, currents):
  if isinstance(current, (int, float)) and float(current) > self.MINIMUM_CURRENT:
    dict_sec[ph][Section] = float(current)
```

### Equipment State Validation
```python
# Validate equipment exists and has expected properties before modification
try:
  # Multi-step validation pattern
  device = study.GetDevice(network_id, enums.DeviceType.Breaker)
  meter = study.GetMeter(network_id, enums.DeviceType.Breaker)
  
  # Check against import threshold before updating
  if MULTIPLIER * sum([IA, IB, IC]) > sum([IA_import, IB_import, IC_import]):
    self.UpdateMeter(device, meter, IA, IB, IC, PFA, PFB, PFC)
except Exception as e:
  raise LoadBalancingError(f"Meter update failed: {str(e)}")
  traceback.print_exc()  # Log full stack trace for debugging
```

### Report Generation with Error Handling
```python
# Try/except around optional equipment details to avoid report failure
def store_info(self, SCReport) -> None:
  """Store equipment info; gracefully handle missing optional details"""
  SCReport.write(f"\n[{self.Nameplate}]")
  
  try:
    equipment = Eqt.GetEquipment(self.EqID, self.EqType)
    comments = equipment.GetValue("Comments")
    if comments:
      SCReport.write(f"Comments: {textwrap.fill(comments, 80)}")
  except Exception:
    pass  # Optional detail not available; continue reporting
  
  # Critical info already written; optional info failure doesn't stop report
```

### Safe Parameter Input with Defaults
```python
# Defensive parameter handling for user inputs from CymDist UI
def safe_get_param(param_name, default_value=None):
  """Read parameter with fallback; warn user of missing input"""
  try:
    value = GetInputParameter(param_name)
    if isinstance(default_value, (int, float)):
      return float(value) if value else default_value
    return str(value) if value else str(default_value)
  except (ValueError, TypeError) as e:
    print(f"Warning: {param_name} error, using default: {default_value}")
    return default_value if default_value is not None else 0.0

# NetworkID is mandatory; others have sensible defaults
self.network_id = safe_get_param("NetworkID", "")
if not self.network_id:
  raise ValueError("NetworkID is required")  # Fail fast on critical input

self.IA = float(safe_get_param("ImaxA", 0.0))  # Phase currents default to 0
self.MINIMUM_CURRENT = float(safe_get_param("Min_Current", 5.0))  # Min threshold
```

## Documentation Sources
- **Important Reference**: [_Important_Read_Me.html](sites/de/SiteAssets/source/_Important_Read_Me.html) - Contains ASPEN/system configuration examples
- **Markdown Docs**: Source folder contains structured reference guides (1_Administrative, 2_Tools & Applications, etc.)

## Tips for New Contributors
- Before modifying JavaScript, check [default.js](sites/de/SiteAssets/js/default.js) for existing selectors and constants
- Power system changes: Always test with `LoadBalancing.py` test suite and verify phase calculations
- SharePoint URLs are environment-dependent; use relative paths where possible
- Python: Run with `cympy` module loaded; ensure IE11 compatibility for web display of results
- ASPEN integration: Test SQL generation with multiple device ID patterns; validate regex against real ASPEN naming conventions
- Always validate equipment exists before modification; use try/except with domain-specific exceptions
- Optional equipment details (comments, ratings) should never stop analysis; wrap in try/except
