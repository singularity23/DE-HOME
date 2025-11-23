import cympy
import webbrowser
import os
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass


def get_chrome():
    chrome_paths = [
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
        os.path.expanduser(
            "~\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"
        ),
    ]
    for path in chrome_paths:
        if os.path.exists(path):
            webbrowser.register("chrome", None, webbrowser.BackgroundBrowser(path))

    return webbrowser.get("chrome")


@dataclass
class StudyParameters:
    """Data class to hold study parameters"""

    customer_type: str
    connection: str
    disturbing: str
    customer_load_mw: float
    emission: str
    feeder_limit: float


class EmissionStudy:
    """Class for performing emission studies on power systems"""

    # Constants
    PATH = "http://pq.bchydro.bc.ca:100/pqtools_MVresults.php?"
    METHOD = 2
    SECTION = 0
    SPOT_DEV_TYPE = cympy.enums.DeviceType.SpotLoad

    # Lookup tables
    POWER_FACTORS: Dict[str, float] = {
        "Residential": 0.97,
        "Commercial": 0.95,
        "Industrial": 0.93,
    }

    FEEDER_LIMITS: Dict[float, float] = {
        4.16: 2.16,
        12.47: 6.48,
        24.94: 12.96,
    }

    CONNECTION_TYPES: Dict[str, int] = {
        "1PH": 1,
        "3PH Y": 34,
        "3PH D": 33,
    }

    DISTURBING_LOAD_TYPES: Dict[str, int] = {
        "YES": 2,
        "NO": 3,
    }

    # Input parameter names
    INPUT_PARAMETERS = [
        "Customer_Type",
        "Connection_Type",
        "Disturbing_Load",
        "Customer_Load",
        "Emission_Study",
        "Feeder_Limit",
    ]

    def __init__(
        self,
        poi: str,
        network_id: str,
        distance: float,
        r1: float,
        x1: float,
        r0: float,
        x0: float,
    ):
        """Initialize the emission study"""
        self.poi = poi
        self.feeder_id = network_id
        self.distance = distance
        self.impedance = (r1, x1, r0, x0)  # Group related parameters

        # Initialize instance variables
        self._initialize_variables()

    def _initialize_variables(self) -> None:
        """Initialize all instance variables with default values"""
        self.parameters: Optional[StudyParameters] = None
        self.kv_ll = 0.0
        self.phase_count = 0
        self.power_factor = 0.0
        self.customer_load_mva = 0.0
        self.current_load_smv = 0.0
        self.current_load_slv = 0.0
        self.slv_percentage = 0.0
        self.estimated_slv = 0.0
        self._variables: List[str] = []

    def run_study(self) -> None:
        """Main method to run the complete emission study"""
        try:
            self._get_input_parameters()
            self._get_system_parameters()
            self._calculate_loads()
            self._prepare_variables()
        except Exception as e:
            raise RuntimeError(f"Emission study failed: {e}") from e

    def _get_input_parameters(self) -> None:
        """Get all input parameters from CymDist"""
        inputs = map(cympy.GetInputParameter, self.INPUT_PARAMETERS)

        self.parameters = StudyParameters(*inputs)
        self.power_factor = self.POWER_FACTORS.get(
            str(self.parameters.customer_type), 0.95
        )

        # Calculate customer load in MVA
        self.customer_load_mva = self.parameters.customer_load_mw / self.power_factor

    def _get_system_parameters(self) -> None:
        """Get system parameters from the study"""
        self.phase_count = cympy.study.QueryInfoNode("PhaseCount", self.poi)
        self.kv_ll = cympy.study.QueryInfoNode("KVLLBase", self.poi)

        # Set feeder limit if not provided
        if not self.parameters.feeder_limit:
            self.parameters.feeder_limit = self.FEEDER_LIMITS.get(self.kv_ll, 0.0)

    def _calculate_loads(self) -> None:
        """Calculate current and estimated loads"""
        spot_loads = cympy.study.ListDevices(self.SPOT_DEV_TYPE, self.feeder_id)

        # Calculate current loads
        self._calculate_current_loads(spot_loads)

        # Calculate total MVA and SLV percentage
        total_mva = (
            self.current_load_smv + self.current_load_slv
        ) / 1000 + self.customer_load_mva

        self._calculate_slv_percentage(total_mva)
        self.estimated_slv = round(
            round(self.slv_percentage, 2) * self.parameters.feeder_limit, 3
        )

    def _calculate_current_loads(self, spot_loads: List) -> None:
        """Calculate current SMV and SLV loads from spot loads"""
        smv_load = 0.0
        slv_load = 0.0

        for spot in spot_loads:
            load_kva = float(
                cympy.study.QueryInfoDevice(
                    "SpotKVAT", spot.DeviceNumber, self.SPOT_DEV_TYPE
                )
            )

            if "INT_" in spot.DeviceNumber:
                smv_load += load_kva
            else:
                slv_load += load_kva

        self.current_load_smv = smv_load
        self.current_load_slv = slv_load

    def _calculate_slv_percentage(self, total_mva: float) -> None:
        """Calculate SLV percentage based on feeder limits"""
        if total_mva <= self.parameters.feeder_limit:
            print("Warning: The load will be over the feeder limit")
            total_current_load = self.current_load_slv + self.current_load_smv
            self.slv_percentage = (
                self.current_load_slv / total_current_load
                if total_current_load > 0
                else 0.0
            )
        else:
            self.slv_percentage = self.current_load_slv / (1000 * total_mva)

    def _prepare_variables(self) -> None:
        """Prepare variables for the report URL"""
        r1, x1, r0, x0 = self.impedance

        self._variables = [
            f"f={self.METHOD}",
            f"section={self.SECTION}",
            f"cct={self.feeder_id}",
            f"kV={self.kv_ll}",
            f"R1={r1}",
            f"X1={x1}",
            f"R0={r0}",
            f"X0={x0}",
            f"distance={self.distance}",
            f"phase={self.phase_count}",
            f"St={self.parameters.feeder_limit}",
            f"cPh={self.CONNECTION_TYPES.get(str(self.parameters.connection), 1)}",
            f"Si={round(self.customer_load_mva, 3)}",
            f"alpha={self.DISTURBING_LOAD_TYPES.get(str(self.parameters.disturbing), 3)}",
            f"Slv={self.estimated_slv}",
        ]

    def generate_report(self, output_file) -> None:
        """Generate and display the emission study report"""
        if not self._variables:
            raise RuntimeError("Study must be run before generating report")

        report_url = self.PATH + "&".join(self._variables)
        browser = get_chrome()
        browser.open_new(report_url)

        self._write_report(output_file, report_url)

    def _write_report(self, file, report_url: str) -> None:
        """Write formatted report to file and console"""
        report_data = self._prepare_report_data(report_url)

        file.write("\n" + "=" * 50 + "\n")
        file.write("        EMISSION STUDY REPORT\n")
        file.write("=" * 50 + "\n")

        for label, value in report_data:
            self._write_formatted_line(file, label, value)

    def _prepare_report_data(self, report_url: str) -> List[Tuple[str, str]]:
        """Prepare formatted report data"""
        return [
            ("Feeder:", self.feeder_id),
            ("Voltage (kV):", f"{self.kv_ll}"),
            ("Impedance R1/X1:", f"{self.impedance[0]}/{self.impedance[1]}"),
            ("Impedance R0/X0:", f"{self.impedance[2]}/{self.impedance[3]}"),
            ("Distance:", f"{self.distance}"),
            ("Phase:", f"{self.phase_count}"),
            ("Feeder Planning Limit (MVA):", f"{self.parameters.feeder_limit}"),
            ("Connection Type:", str(self.parameters.connection)),
            ("Customer Type:", str(self.parameters.customer_type)),
            ("Power Factor:", f"{self.power_factor:.3f}"),
            ("Customer Demand (MW):", f"{self.parameters.customer_load_mw:.3f}"),
            ("Customer Demand (MVA):", f"{self.customer_load_mva:.3f}"),
            ("Current LV Load (MVA):", f"{self.current_load_slv / 1000:.3f}"),
            ("Current MV Load (MVA):", f"{self.current_load_smv / 1000:.3f}"),
            ("Percentage of LV Load (%):", f"{self.slv_percentage * 100:.3f}"),
            ("Max. LV Load (MVA):", f"{self.estimated_slv:.3f}"),
            ("Disturbing Load:", str(self.parameters.disturbing)),
            ("Report Link:", f"\n{report_url}"),
        ]

    @staticmethod
    def _write_formatted_line(file, label: str, value: str) -> None:
        """Write a formatted line to file and console"""
        line = f"{label:<25} {value}\n"
        print(line, end="")
        file.write(line)


# Example usage
if __name__ == "__main__":
    # Initialize study
    study = EmissionStudy(
        poi="POI_001",
        network_id="FEEDER_123",
        distance=1.5,
        r1=0.1,
        x1=0.2,
        r0=0.3,
        x0=0.4,
    )

    # Run study and generate report
    try:
        study.run_study()

        with open("emission_report.txt", "w") as report_file:
            study.generate_report(report_file)

    except Exception as e:
        print(f"Error: {e}")
