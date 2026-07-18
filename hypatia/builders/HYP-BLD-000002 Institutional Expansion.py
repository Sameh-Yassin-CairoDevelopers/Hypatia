#!/usr/bin/env python3
# ==========================================================
# HYP-BLD-000002
#
# Institutional Expansion
#
# Purpose
# --------
# Expands the Hypatia Repository after the initial bootstrap.
#
# This Builder adds institutional folders, governance files,
# GitHub workflow placeholders and workspace directories.
#
# Repository:
# Sameh-Yassin-CairoDevelopers/Hypatia
#
# ==========================================================

from pathlib import Path

ROOT = Path("Hypatia")

DIRECTORIES = [

    # --------------------------------------------------
    # Institutional Layer
    # --------------------------------------------------

    "institution",

    # --------------------------------------------------
    # Seed Assets
    # --------------------------------------------------

    "seed",

    "seed/dictionaries",

    "seed/corpora",

    "seed/metadata",

    "seed/models",

    "seed/scripts",

    "seed/ui",

    "seed/legacy",

    # --------------------------------------------------
    # Workspace
    # --------------------------------------------------

    "workspace",

    "workspace/cache",

    "workspace/generated",

    "workspace/temporary",

    # --------------------------------------------------
    # Documentation
    # --------------------------------------------------

    "docs/Architecture",

    "docs/Specifications",

    "docs/Implementation",

    "docs/Reports",

    # --------------------------------------------------
    # Reports
    # --------------------------------------------------

    "reports/build",

    "reports/validation",

    "reports/migration",

    # --------------------------------------------------
    # GitHub
    # --------------------------------------------------

    ".github",

    ".github/workflows",

    # --------------------------------------------------
    # VSCode
    # --------------------------------------------------

    ".vscode",

]

FILES = {

    # ==================================================
    # Institution
    # ==================================================

    "institution/institution.manifest.yaml":
"""institution:
  name: Hypatia
  status: Genesis
""",

    "institution/repository.identity.yaml":
"""repository:
  id: hypatia-hieroglyph
""",

    "institution/repository.profile.yaml":
"""profile:
  owner: Sameh-Yassin-CairoDevelopers
""",

    "institution/repository.version.yaml":
"""version:
  current: 0.1.0
""",

    # ==================================================
    # Documentation
    # ==================================================

    "CHANGELOG.md":
"# Changelog\n",

    "CONTRIBUTING.md":
"# Contributing\n",

    "CODE_OF_CONDUCT.md":
"# Code of Conduct\n",

    # ==================================================
    # GitHub Actions
    # ==================================================

    ".github/workflows/validation.yml":
"""name: Validation
on:
  workflow_dispatch:
jobs:
  validation:
    runs-on: ubuntu-latest
    steps:
      - run: echo Validation Placeholder
""",

    ".github/workflows/documentation.yml":
"""name: Documentation
on:
  workflow_dispatch:
jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - run: echo Documentation Placeholder
""",

    # ==================================================
    # VS Code
    # ==================================================

    ".vscode/settings.json":
"""{
    "files.encoding": "utf8"
}
"""
}


def create_directories():

    for directory in DIRECTORIES:

        path = ROOT / directory

        path.mkdir(parents=True, exist_ok=True)

        print(f"[DIR ] {path}")


def create_files():

    for filename, content in FILES.items():

        path = ROOT / filename

        path.parent.mkdir(parents=True, exist_ok=True)

        if not path.exists():

            path.write_text(
                content,
                encoding="utf-8"
            )

            print(f"[FILE] {path}")


def main():

    print()

    print("========================================")

    print("HYP-BLD-000002")

    print("Institutional Expansion")

    print("========================================")

    print()

    create_directories()

    create_files()

    print()

    print("Institution successfully expanded.")

    print()


if __name__ == "__main__":

    main()
