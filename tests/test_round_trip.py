"""Losslessness: token spans cover every non-whitespace byte (SREQ-00004-1).

The syntax tree is lossless when nothing but whitespace lies outside its
leaf token spans and no node is missing (zero-width inventions). Together
with error-freeness this lets a consumer reconstruct the input from the
tree plus inter-token whitespace, byte-identically.
"""

import pytest
from conftest import corpus_inputs, example_inputs

CASES = {**corpus_inputs(), **example_inputs()}


def leaves(node):
    if node.child_count == 0:
        yield node
    for child in node.children:
        yield from leaves(child)


@pytest.mark.parametrize("name", sorted(CASES))
def test_token_coverage(language, name):
    from tree_sitter import Parser

    source = CASES[name].encode()
    tree = Parser(language).parse(source)

    assert not tree.root_node.has_error, tree.root_node.sexp()

    cursor = source
    end = 0
    for leaf in leaves(tree.root_node):
        assert not leaf.is_missing, f"missing zero-width node {leaf.type}"
        gap = cursor[end:leaf.start_byte]
        assert gap.strip() == b"", f"non-whitespace bytes outside tokens: {gap!r}"
        end = leaf.end_byte
    tail = cursor[end:]
    assert tail.strip() == b"", f"unparsed trailing bytes: {tail!r}"
