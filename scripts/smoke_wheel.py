"""Smoke-test an installed tree_sitter_plantuml wheel.

Run against the *installed* package, never the source tree: parse a class
diagram, assert the tree carries structure and no ERROR, and compile the
highlight queries that ship inside the wheel. Both publishing paths use
this one file — the release script after retagging, and cibuildwheel as
its per-platform test command — so "the artefact works" means the same
thing on every platform.
"""

from pathlib import Path

from tree_sitter import Language, Parser

import tree_sitter_plantuml as grammar

SOURCE = b"""@startuml
class Cafetera {
  + moler(granos: int) : Cafe
}
Cafetera --> Cafe
@enduml
"""


def main() -> None:
    language = Language(grammar.language())
    tree = Parser(language).parse(SOURCE)
    assert not tree.root_node.has_error, tree.root_node
    kinds = {node.type for node in tree.root_node.children[0].children}
    assert {"class_declaration", "relation"} <= kinds, kinds

    queries = Path(grammar.__path__[0], "queries", "highlights.scm")
    assert queries.is_file(), f"queries missing from the wheel: {queries}"
    try:  # py-tree-sitter >= 0.25
        from tree_sitter import Query

        Query(language, queries.read_text())
    except ImportError:  # pragma: no cover - older bindings
        language.query(queries.read_text())

    print("smoke: parsed a class diagram, compiled the highlight queries")


if __name__ == "__main__":
    main()
