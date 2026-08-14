"""Highlight queries must reference only node types the grammar defines."""

from conftest import ROOT, run_cli


def test_highlights_reference_known_nodes():
    result = run_cli(
        "query",
        str(ROOT / "queries" / "highlights.scm"),
        str(ROOT / "examples" / "classes.puml"),
    )
    assert result.returncode == 0, result.stdout + result.stderr
