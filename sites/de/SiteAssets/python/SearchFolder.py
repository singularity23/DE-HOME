import os
import re
import csv


# ------------------------------------------------------------
# 1. Search configuration – original full scan + city loops
# ------------------------------------------------------------
transfer = r"J:\Engineering\Distribution\0 EGBC Filing\0 Transfer\DESRT (ID–address–description)\LMN"
searches = [{"root": transfer, "filter": None}]

cities = ["Burnaby", "Coquitlam-Maple Ridge", "North Shore Coastal", "Vancouver"]
base_path = r"J:\Engineering\Distribution\0 EGBC Filing\1 General DRE\LMN"
filter_list = ["F24", "F25", "F26"]

for city in cities:
    root = os.path.join(base_path, city, "DESRT")
    searches.append({"root": root, "filter": filter_list})

# ------------------------------------------------------------
# 2. Output directory and filename with increment logic
# ------------------------------------------------------------
output_dir = r"J:\Engineering\Distribution\1 Staff\K. Tang\Transfer"
os.makedirs(output_dir, exist_ok=True)

base_name = "matching_folders"
ext = ".csv"
output_csv = os.path.join(output_dir, f"{base_name}{ext}")

# If the base file already exists, try _1, _2, …
counter = 1
while os.path.exists(output_csv):
    output_csv = os.path.join(output_dir, f"{base_name}_{counter}{ext}")
    counter += 1

# ------------------------------------------------------------
# 3. Compile regex (case‑insensitive)
# ------------------------------------------------------------
pattern = re.compile(r"non[-\s_](standard|std)", re.IGNORECASE)

# ------------------------------------------------------------
# 4. Walk each search root and collect matching folders
# ------------------------------------------------------------
matching_folders = []  # list of full_path

for cfg in searches:
    root = cfg["root"]
    allowed_subfolders = cfg["filter"]

    if not os.path.isdir(root):
        print(f"WARNING: Directory not found, skipping: {root}")
        continue

    for dirpath, dirnames, filenames in os.walk(root):
        # If we're at the root level and a filter is defined, prune branches
        if allowed_subfolders is not None and os.path.normpath(
            dirpath
        ) == os.path.normpath(root):
            dirnames[:] = [d for d in dirnames if d in allowed_subfolders]

        for dirname in dirnames:
            if pattern.search(dirname):
                full_path = os.path.join(dirpath, dirname)
                matching_folders.append(full_path)

# ------------------------------------------------------------
# 5. Write results to CSV with two columns
# ------------------------------------------------------------
with open(output_csv, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)

    # Headers
    writer.writerow(["Folder Link", "Folder Name"])

    for folder in matching_folders:
        # Column A: clickable hyperlink
        file_uri = "file:///" + folder.replace("\\", "/")
        formula = f'=HYPERLINK("{file_uri}","{folder}")'

        # Column B: just the leaf folder name
        folder_name = os.path.basename(folder)

        DESRT_NO = folder_name.split("-")[0]

        writer.writerow([formula, folder_name, DESRT_NO])

print(f"Found {len(matching_folders)} folders. Results saved to {output_csv}")
