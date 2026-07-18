#!/usr/bin/env python3
# ==========================================================
# HYP-BLD-000003
#
# Seed Registry Builder
#
# Purpose
# --------
# Creates the first institutional inventory of all Seed Assets.
#
# This Builder NEVER modifies Seed Assets.
# It only scans, classifies and registers them.
#
# Outputs
# -------
# reports/migration/seed_registry.json
# reports/migration/seed_registry.md
#
# Repository
# ----------
# Sameh-Yassin-CairoDevelopers/Hypatia
# ==========================================================

from pathlib import Path
import json
from datetime import datetime

ROOT = Path("Hypatia")

SEED = ROOT / "seed"

REPORTS = ROOT / "reports" / "migration"

REPORTS.mkdir(parents=True, exist_ok=True)

REGISTRY_JSON = REPORTS / "seed_registry.json"
REGISTRY_MD = REPORTS / "seed_registry.md"


EXTENSION_TYPES = {

    ".json": "JSON",

    ".jsonl": "JSONL",

    ".md": "Markdown",

    ".txt": "Text",

    ".csv": "CSV",

    ".xlsx": "Excel",

    ".xml": "XML",

    ".py": "Python",

    ".html": "HTML",

    ".js": "JavaScript",

    ".css": "CSS",

    ".yaml": "YAML",

    ".yml": "YAML",

    ".pt": "PyTorch",

    ".bin": "Binary",

}


def detect_type(path: Path):

    return EXTENSION_TYPES.get(path.suffix.lower(), "Unknown")


registry = []

summary = {}

print()

print("=" * 60)
print("HYP-BLD-000003")
print("Seed Registry Builder")
print("=" * 60)
print()

for file in SEED.rglob("*"):

    if file.is_file():

        relative = file.relative_to(ROOT)

        file_type = detect_type(file)

        size = file.stat().st_size

        item = {

            "path": str(relative).replace("\\", "/"),

            "name": file.name,

            "extension": file.suffix.lower(),

            "type": file_type,

            "size": size,

        }

        registry.append(item)

        summary[file_type] = summary.get(file_type, 0) + 1

        print(f"[SCAN] {relative}")

output = {

    "builder": "HYP-BLD-000003",

    "generated": datetime.utcnow().isoformat(),

    "total_files": len(registry),

    "summary": summary,

    "registry": registry,

}

with REGISTRY_JSON.open("w", encoding="utf-8") as f:

    json.dump(output, f, indent=4, ensure_ascii=False)

with REGISTRY_MD.open("w", encoding="utf-8") as f:

    f.write("# Seed Registry\n\n")

    f.write(f"Generated: {output['generated']}\n\n")

    f.write(f"Total Files: {len(registry)}\n\n")

    f.write("## Summary\n\n")

    for k, v in sorted(summary.items()):

        f.write(f"- {k}: {v}\n")

    f.write("\n## Files\n\n")

    for item in registry:

        f.write(
            f"- {item['path']} ({item['type']}, {item['size']} bytes)\n"
        )

print()

print("=" * 60)
print(f"Files Registered : {len(registry)}")
print(f"JSON Report      : {REGISTRY_JSON}")
print(f"Markdown Report  : {REGISTRY_MD}")
print("=" * 60)
print()
