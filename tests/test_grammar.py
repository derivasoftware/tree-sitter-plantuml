"""Corpus conformance, one test function per feature corpus file.

One explicit function per feature (rather than a parametrized single
function) so each VER artefact links to a distinct indexed test case.
"""

from conftest import run_cli


def check_corpus(feature: str) -> None:
    result = run_cli("test", "--file-name", f"{feature}.txt")
    assert result.returncode == 0, result.stdout + result.stderr
    assert "failed parses: 0" in result.stdout


def test_corpus_envelope():
    check_corpus("envelope")


def test_corpus_declarations():
    check_corpus("declarations")


def test_corpus_members():
    check_corpus("members")


def test_corpus_relations():
    check_corpus("relations")


def test_corpus_grouping():
    check_corpus("grouping")


def test_corpus_comments():
    check_corpus("comments")


def test_corpus_frontier():
    check_corpus("frontier")


def test_corpus_notes():
    check_corpus("notes")


def test_corpus_display():
    check_corpus("display")


def test_corpus_separators():
    check_corpus("separators")


def test_corpus_names():
    check_corpus("names")
