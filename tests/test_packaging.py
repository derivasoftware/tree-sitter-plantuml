"""The python wheel builds and carries the compiled binding (SREQ-00007-1)."""

import subprocess
import sys
import zipfile

from conftest import ROOT


def test_wheel_builds(tmp_path):
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "wheel",
            str(ROOT),
            "--no-deps",
            "--no-build-isolation",
            "-w",
            str(tmp_path),
        ],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    wheels = list(tmp_path.glob("tree_sitter_plantuml-*.whl"))
    assert len(wheels) == 1, wheels
    names = zipfile.ZipFile(wheels[0]).namelist()
    assert any("_binding" in n and ".so" in n for n in names), names
    assert any(n.endswith("queries/highlights.scm") for n in names), names
