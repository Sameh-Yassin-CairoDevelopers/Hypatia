#!/usr/bin/env python3
# ==========================================================
# Hypatia Repository Bootstrap
# Version : 0.1
# Purpose : Create the complete Hypatia Repository Structure
# ==========================================================

from pathlib import Path

ROOT = Path("Hypatia")

DIRECTORIES = [

    ".hypatia",

    "docs",

    "knowledge",

    "dictionaries",

    "corpus",

    "resolvers",

    "metadata",

    "ontology",

    "datasets",

    "models",

    "training",

    "runtime",

    "builders",

    "reports",

    "tests",

    "tools",

    "scripts",

    "assets",

    "configs",

    "logs",

    "hypatia",

    "hypatia/core",

    "hypatia/runtime",

    "hypatia/builders",

    "hypatia/planning",

    "hypatia/validation",

    "hypatia/reporting",

    "hypatia/utils",

]

FILES = {

    "README.md": "# Hypatia\n",

    "LICENSE": "",

    ".gitignore": "__pycache__/\n*.pyc\n.env\n",

    "requirements.txt": "pyyaml\nGitPython\nrich\n",

    "pyproject.toml":
"""
[project]
name = "hypatia"
version = "0.1.0"
requires-python = ">=3.13"
""",

    ".hypatia/project_state.yaml":
"""
project:

  name: Hypatia

  version: 0.1.0

goal:

  current: G002

status:

  repository: genesis

""",

    ".hypatia/build_state.yaml":
"""
build:

  initialized: true

""",

    ".hypatia/roadmap.yaml":
"""
roadmap:

  current_phase: Repository Genesis

""",

    "hypatia/__init__.py":
'''
__version__ = "0.1.0"
''',

    "hypatia/__main__.py":
'''
print("Hypatia Runtime Started")
'''
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

            path.write_text(content, encoding="utf-8")

            print(f"[FILE] {path}")


def main():

    ROOT.mkdir(exist_ok=True)

    create_directories()

    create_files()

    print()

    print("========================================")

    print("Hypatia Repository Created Successfully")

    print("========================================")


if __name__ == "__main__":

    main()
