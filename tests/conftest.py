"""Shared fixtures: repo paths, one-shot parser build, corpus extraction."""

import ctypes
import re
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
CORPUS_DIR = ROOT / "test" / "corpus"
EXAMPLES_DIR = ROOT / "examples"
LIB_PATH = ROOT / "build" / "plantuml.so"


def run_cli(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["npx", "tree-sitter", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )


@pytest.fixture(scope="session")
def language():
    """Build the shared library once and load it via py-tree-sitter."""
    from tree_sitter import Language

    build = run_cli("build", "--output", str(LIB_PATH))
    assert build.returncode == 0, build.stderr
    lib = ctypes.cdll.LoadLibrary(str(LIB_PATH))
    lib.tree_sitter_plantuml.restype = ctypes.c_void_p
    return Language(lib.tree_sitter_plantuml())


def corpus_inputs() -> dict[str, str]:
    """Extract every corpus test input (name -> source) from test/corpus."""
    cases: dict[str, str] = {}
    for path in sorted(CORPUS_DIR.glob("*.txt")):
        text = path.read_text()
        blocks = re.split(r"(?m)^={10,}\n(.+)\n={10,}\n", text)
        for i in range(1, len(blocks) - 1, 2):
            name = blocks[i].strip()
            body = blocks[i + 1]
            source = body.split("\n---\n", 1)[0]
            cases[f"{path.stem}::{name}"] = source
    return cases


def example_inputs() -> dict[str, str]:
    return {
        f"examples::{p.relative_to(EXAMPLES_DIR)}": p.read_text()
        for p in sorted(EXAMPLES_DIR.rglob("*.puml"))
    }
