"""Every query file must reference only node types the grammar defines."""

import pytest
from conftest import ROOT, run_cli

QUERIES = sorted(p.name for p in (ROOT / "queries").glob("*.scm"))


def _query_runs(name: str) -> None:
    result = run_cli(
        "query",
        str(ROOT / "queries" / name),
        str(ROOT / "examples" / "classes.puml"),
    )
    assert result.returncode == 0, result.stdout + result.stderr


def test_highlights_reference_known_nodes():
    _query_runs("highlights.scm")


@pytest.mark.parametrize("name", [q for q in QUERIES if q != "highlights.scm"])
def test_editor_queries_reference_known_nodes(name):
    _query_runs(name)


def test_all_editor_queries_ship():
    assert {"highlights.scm", "folds.scm", "indents.scm"} <= set(QUERIES)
