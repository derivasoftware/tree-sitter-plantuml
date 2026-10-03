"""The python wheel builds and carries the compiled binding (SREQ-00007-1)."""

import subprocess
import sys
import zipfile

import pytest
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


@pytest.mark.system
@pytest.mark.skipif(
    sys.platform != "linux", reason="the linux release wheel is built on linux"
)
def test_release_wheel_is_manylinux_tagged_and_installs(tmp_path):
    """The release script produces a wheel whose every platform tag is a
    manylinux tag — the build platform tag pip refuses to serve is gone —
    and that wheel installs and parses in a venv that never saw this
    source tree (REQ-00032-1)."""
    result = subprocess.run(
        [str(ROOT / "scripts" / "build_wheels.sh"), str(tmp_path)],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    wheels = list(tmp_path.glob("tree_sitter_plantuml-*.whl"))
    assert len(wheels) == 1, wheels
    interpreter, abi, platforms = wheels[0].name[: -len(".whl")].split("-")[-3:]
    assert (interpreter, abi) == ("cp310", "abi3"), wheels[0].name
    assert all(tag.startswith("manylinux") for tag in platforms.split(".")), platforms
    assert "smoke: parsed a class diagram" in result.stdout, result.stdout
