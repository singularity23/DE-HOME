import os
import shutil
from datetime import datetime

FILING_DIR = r"J:\Engineering\Distribution\0 EGBC Filing\1 General DRE\LMN\Vancouver\DESRT"
DESRT_ID = "2728810"
LOCATION = "810 Evans Ave"
COPY_DIR = r"J:\Engineering\Distribution\1 Staff\K. Tang\_Settings & Configurations\Windows"

FILES_MAP = {1:{'ShortCircuit': [r"DISTRIBUTION ENGINEERING CHECK FORM.docx", r"SCL-2024-06.xlsm"]}}
FILES = FILES_MAP[1]

def create_folder():
    cal_year = datetime.now().year - 1999
    fis_year = f'F{cal_year}'

    folder_name = LOCATION.replace(' ', '_')
    full_name = f'{DESRT_ID} - {folder_name}_Vancouver'
    folder_path = os.path.join(FILING_DIR, fis_year, f"{full_name} - Fault_Study")

    if folder_path[-1] not in ["\\", "/"]:
      folder_path = os.path.join(folder_path, "/").replace("\\", "/")

    try:
        os.makedirs(folder_path, exist_ok=True)
        print(f"Folder created successfully: {folder_path}")
    except Exception as e:
        print(f"Error creating folder: {e}")

    for file in FILES:
        src_item = os.path.join(COPY_DIR, file)
        dst_item = os.path.join(folder_path, file)
        if not os.path.exists(dst_item):
            shutil.copy2(src_item, dst_item)
            file_name, file_ext = os.path.splitext(dst_item)
            new_file_name = "Check_Form" if file_ext == ".docx" else "Fault_Study"
            new_name = os.path.join(folder_path, f'{folder_name} - {new_file_name}{file_ext}')
            if not os.path.exists(new_name):
                os.rename(dst_item, new_name)
