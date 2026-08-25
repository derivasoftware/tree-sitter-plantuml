"""Standard conformance: the class-diagram constructs of the PlantUML
Language Reference (plantuml.com/class-diagram) parse without ERROR and
map to the intended node (REQ-00012-1, REQ-00021-1, REQ-00022-1,
REQ-00023-1).

examples/standard/*.puml is the dummy-diagram corpus: every construct
the reference documents appears at least once. Frontier policy applies:
a construct is either structural (dedicated node) or raw (lossless
pass-through) — ERROR is never acceptable (SREQ-00003).
"""

from pathlib import Path

import pytest
from conftest import EXAMPLES_DIR

pytestmark = pytest.mark.system

STANDARD_DIR = EXAMPLES_DIR / "standard"
FILES = sorted(p.name for p in STANDARD_DIR.glob("*.puml"))

# (file, line-prefix, expected statement-level node type)
CONSTRUCTS = [
    ("elements.puml", "annotation SuppressWarnings", "entity_declaration"),
    ("elements.puml", "exception OutOfRange", "entity_declaration"),
    ("elements.puml", "metaclass MetaCls", "entity_declaration"),
    ("elements.puml", "protocol Speaks", "entity_declaration"),
    ("elements.puml", "struct Point", "entity_declaration"),
    ("elements.puml", "record Pair", "entity_declaration"),
    ("elements.puml", "dataclass Config", "entity_declaration"),
    ("elements.puml", "entity Row", "participant_declaration"),
    ("elements.puml", "circle Dot", "raw_line"),
    ("elements.puml", "() DotShort", "raw_line"),
    ("elements.puml", "diamond Dec", "raw_line"),
    ("elements.puml", "<> DecShort", "raw_line"),
    ("elements.puml", "class $Dollar", "class_declaration"),
    ("elements.puml", 'class "$Quoted" as dollarQ', "class_declaration"),
    ("relations.puml", 'User "owner"/1 -- "0..n"/items Item', "relation"),
    ("relations.puml", "Aaa o--> Factory : #factory", "relation"),
    ("members.puml", "Object : equals()", "colon_member"),
    ("members.puml", "Object : -hash : int", "colon_member"),
    ("members.puml", "{field} A field", "member"),
    ("members.puml", "{method} Some method", "member"),
    ("members.puml", "~packagePrivateField : int", "member"),
    ("members.puml", "{classifier} String classId", "member"),
    ("members.puml", '-class "private Class"', "raw_line"),
    ("members.puml", "+class PublicClass", "raw_line"),
    ("stereotypes.puml", "class Tagged $tag13", "class_declaration"),
    ("stereotypes.puml", "class DoubleTag $tag1 $tag2", "class_declaration"),
    ("packages.puml", 'package "Classic Collections" #DDDDDD {', "package_block"),
    ("packages.puml", "foo1.foo2 +-- foo1.foo2.foo3", "relation"),
    ("packages.puml", "set separator ::", "raw_line"),
    ("packages.puml", "!pragma useIntermediatePackages false", "raw_line"),
    ("direction.puml", "left to right direction", "raw_line"),
    ("direction.puml", "top to bottom direction", "raw_line"),
    ("direction.puml", "foo -l-> b5", "relation"),
    ("direction.puml", "foo -d-> b6", "relation"),
    ("advanced-links.puml", "bar ()- foo", "relation"),
    ("advanced-links.puml", "bar2 ()-- foo", "relation"),
    ("advanced-links.puml", "foo -() bar3", "relation"),
    ("advanced-links.puml", "(Student, Course) .. Enrollment", "raw_line"),
    ("advanced-links.puml", "class1 [Qualifier] - class2", "relation"),
    ("advanced-links.puml", 'Shop [customerId] ---> "1" Customer', "relation"),
    ("advanced-links.puml", "Foo::field1 --> Bar::field3", "relation"),
    ("styling.puml", "foo -[bold]-> bar1", "relation"),
    ("styling.puml", "foo -[#red,dashed,thickness=2]-> bar8", "relation"),
    ("styling.puml", "foo --> bar9 #line:red;line.bold;text:red", "relation"),
    ("styling.puml", "class Demo3 #back:lightgreen\\yellow", "class_declaration"),
    ("skinparams.puml", "page 2x2", "raw_line"),
    (
        "skinparams.puml",
        "skinparam stereotypeCBackgroundColor<<Foo>> DimGray",
        "raw_line",
    ),
    ("special.puml", "json JSON {", "raw_line"),
    ("special.puml", '"fruit": "Apple",', "colon_member"),
    # sequence chapter (plantuml.com/sequence-diagram)
    ("sequence-arrows.puml", "Bob ->> Alice", "relation"),
    ("sequence-arrows.puml", "Bob -\\ Alice", "relation"),
    ("sequence-arrows.puml", "Bob ->x Alice", "relation"),
    ("sequence-arrows.puml", "Bob o->o Alice", "relation"),
    ("sequence-arrows.puml", "A ->(10) B", "relation"),
    ("sequence-participants.puml", "actor Bob #red", "participant_declaration"),
    (
        "sequence-participants.puml",
        "participant Last order 30",
        "participant_declaration",
    ),
    (
        "sequence-participants.puml",
        "participant Spot << (C,#ADD1B2) Testable >>",
        "participant_declaration",
    ),
    ("sequence-participants.puml", "participant Multi [", "participant_declaration"),
    ("sequence-lifecycle.puml", "Alice -> Bob ++ : activate target", "relation"),
    ("sequence-lifecycle.puml", "Alice -> Bob !! : destroy target", "relation"),
    ("sequence-lifecycle.puml", "activate Alice", "raw_line"),
    ("sequence-lifecycle.puml", "return result", "raw_line"),
    ("sequence-lifecycle.puml", "autonumber 10 5", "raw_line"),
    ("sequence-boundaries.puml", "[-> Bob : incoming", "relation"),
    ("sequence-boundaries.puml", "?-> Alice : short in", "relation"),
    ("sequence-boundaries.puml", "Bob ->] : outgoing", "relation"),
    ("sequence-boundaries.puml", "Bob ->? : short out", "relation"),
    ("sequence-boundaries.puml", "Bob x<-] : who knows", "raw_line"),
    ("sequence-structure.puml", "mainframe This is mainframe", "raw_line"),
    ("sequence-structure.puml", "ref over Alice : see other diagram", "raw_line"),
    ("sequence-structure.puml", "end ref", "raw_line"),
    ("sequence-structure.puml", "...5 minutes later...", "raw_line"),
    ("sequence-structure.puml", "||45||", "raw_line"),
    ("sequence-structure.puml", 'box "Internal Service" #LightBlue', "raw_line"),
    ("sequence-structure.puml", "end box", "raw_line"),
    ("sequence-notes.puml", "note right of Alice #aqua : colored", "note_statement"),
    ("sequence-notes.puml", "note across : spanning note", "note_statement"),
    ("sequence-notes.puml", "hnote over Alice : hexagon", "raw_line"),
    ("sequence-notes.puml", "/ note over Bob : aligned second", "raw_line"),
    # activity chapter (plantuml.com/activity-diagram-beta) — raw tier:
    # structural promotion waits for a consumer (renderer/LSP evidence)
    ("activity-flow.puml", ":first action;", "activity_action"),
    ("activity-flow.puml", "#pink:colored action;", "raw_line"),
    ("activity-flow.puml", "if (condition?) then (yes)", "raw_line"),
    ("activity-flow.puml", "elseif (other?) then (maybe)", "raw_line"),
    ("activity-flow.puml", "else (no)", "raw_line"),
    ("activity-flow.puml", "endif", "raw_line"),
    ("activity-flow.puml", "switch (test?)", "raw_line"),
    ("activity-flow.puml", "endswitch", "raw_line"),
    ("activity-flow.puml", "while (more?) is (yes)", "raw_line"),
    ("activity-flow.puml", "repeat while (again?)", "raw_line"),
    ("activity-flow.puml", "backward:go back;", "colon_member"),
    ("activity-flow.puml", "break", "raw_line"),
    ("activity-flow.puml", "stop", "raw_line"),
    ("activity-flow.puml", "end", "raw_line"),
    ("activity-parallel.puml", "fork again", "raw_line"),
    ("activity-parallel.puml", "end fork {or}", "raw_line"),
    ("activity-parallel.puml", "end merge", "raw_line"),
    ("activity-parallel.puml", "end split", "raw_line"),
    ("activity-parallel.puml", "label mylabel", "raw_line"),
    ("activity-parallel.puml", "goto mylabel", "raw_line"),
    ("activity-parallel.puml", "(A)", "raw_line"),
    ("activity-structure.puml", "|Swimlane1|", "swimlane"),
    ("activity-structure.puml", "-> arrow label;", "raw_line"),
    ("activity-structure.puml", "partition Initialization {", "raw_line"),
    ("activity-structure.puml", "group MyGroup {", "raw_line"),
    ("activity-structure.puml", "package Deployment {", "package_block"),
    ("activity-structure.puml", "floating note left : floating text", "raw_line"),
    (
        "activity-structure.puml",
        ":action with stereotype; <<procedure>>",
        "activity_action",
    ),
]


def parse(language, path: Path):
    from tree_sitter import Parser

    source = path.read_bytes()
    return source, Parser(language).parse(source)


@pytest.mark.parametrize("name", FILES)
def test_standard_file_is_error_free(language, name):
    source, tree = parse(language, STANDARD_DIR / name)
    assert not tree.root_node.has_error, tree.root_node


def statement_node(tree, row: int, col: int):
    """Innermost named node at (row, col), lifted to the statement level
    (direct child of diagram / a grouping body)."""
    node = tree.root_node.named_descendant_for_point_range((row, col), (row, col + 1))
    lifted = node
    while node is not None:
        if node.type in (
            "diagram",
            "entity_body",
            "package_block",
            "namespace_block",
            "together_block",
            "source_file",
        ):
            break
        lifted = node
        node = node.parent
    return lifted


@pytest.mark.parametrize("case", CONSTRUCTS, ids=lambda c: f"{c[0]}:{c[1][:28]}")
def test_construct_maps_to_intended_node(language, case):
    file, prefix, expected = case
    path = STANDARD_DIR / file
    source, tree = parse(language, path)
    lines = source.decode().split("\n")
    rows = [i for i, line in enumerate(lines) if line.strip().startswith(prefix)]
    assert rows, f"construct not found in {file}: {prefix!r}"
    row = rows[0]
    col = len(lines[row]) - len(lines[row].lstrip())
    node = statement_node(tree, row, col)
    assert node is not None and node.type == expected, (
        f"{file}:{rows[0] + 1} {prefix!r} -> "
        f"{node.type if node else None}, expected {expected}"
    )
