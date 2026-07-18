#!/usr/bin/env python3
# ==========================================================
# Builder ID : HYP-BLD-000004
# Name       : Seed Discovery Builder
# Version    : 1.0.0
#
# Purpose
# --------
# Discovers external legacy assets and produces an
# institutional inventory without modifying them.
#
# Inputs
# ------
# External Legacy Assets Folder
#
# Outputs
# -------
# reports/discovery/
#     legacy_inventory.json
#     legacy_inventory.md
#
# Safe to Re-run
# --------------
# YES
#
# Repository
# ----------
# Sameh-Yassin-CairoDevelopers/Hypatia
# ==========================================================

from pathlib import Path
from datetime import datetime, UTC
import json
import os

ROOT = Path("Hypatia")

REPORT_DIR = ROOT / "reports" / "discovery"

REPORT_DIR.mkdir(parents=True, exist_ok=True)


EXTENSIONS = {

    ".json": "JSON",
    ".jsonl": "JSONL",
    ".md": "Markdown",
    ".txt": "Text",
    ".csv": "CSV",
    ".xlsx": "Excel",
    ".xml": "XML",
    ".yaml": "YAML",
    ".yml": "YAML",

    ".py": "Python",
    ".js": "JavaScript",
    ".html": "HTML",
    ".css": "CSS",

    ".pt": "PyTorch",
    ".bin": "Binary",

}


def detect_type(path: Path):

    return EXTENSIONS.get(
        path.suffix.lower(),
        "Unknown"
    )


legacy_root = input(
    "\nLegacy Assets Folder : "
).strip()

legacy_root = Path(legacy_root)

if not legacy_root.exists():

    print()

    print("ERROR")

    print("Folder not found.")

    raise SystemExit(1)


inventory = []

summary = {}

folders = set()

total_size = 0

print()

print("=" * 60)
print("Scanning...")
print("=" * 60)
print()


for file in legacy_root.rglob("*"):

    if file.is_file():

        relative = file.relative_to(legacy_root)

        folders.add(relative.parent)

        size = file.stat().st_size

        total_size += size

        file_type = detect_type(file)

        summary[file_type] = summary.get(file_type, 0) + 1

        inventory.append({

            "name": file.name,

            "relative_path": str(relative).replace("\\", "/"),

            "extension": file.suffix.lower(),

            "type": file_type,

            "size_bytes": size

        })

        print(relative)


report = {

    "builder": "HYP-BLD-000004",

    "generated": datetime.now(UTC).isoformat(),

    "legacy_root": str(legacy_root),

    "total_files": len(inventory),

    "total_folders": len(folders),

    "total_size_bytes": total_size,

    "summary": summary,

    "inventory": inventory

}


json_file = REPORT_DIR / "legacy_inventory.json"

with json_file.open(
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        report,
        f,
        indent=4,
        ensure_ascii=False
    )


md_file = REPORT_DIR / "legacy_inventory.md"

with md_file.open(
    "w",
    encoding="utf-8"
) as f:

    f.write("# Legacy Assets Inventory\n\n")

    f.write(
        f"Generated : {report['generated']}\n\n"
    )

    f.write(
        f"Legacy Root : {legacy_root}\n\n"
    )

    f.write(
        f"Total Files : {len(inventory)}\n"
    )

    f.write(
        f"Total Folders : {len(folders)}\n"
    )

    f.write(
        f"Total Size : {total_size:,} bytes\n\n"
    )

    f.write("## File Types\n\n")

    for k, v in sorted(summary.items()):

        f.write(f"- {k}: {v}\n")

    f.write("\n## Inventory\n\n")

    for item in inventory:

        f.write(

            f"- {item['relative_path']} "

            f"({item['type']}) "

            f"[{item['size_bytes']} bytes]\n"

        )


print()

print("=" * 60)
print("Discovery Completed")
print("=" * 60)
print()

print(f"Files     : {len(inventory)}")
print(f"Folders   : {len(folders)}")
print(f"JSON      : {json_file}")
print(f"Markdown  : {md_file}")
print()
