#!/usr/bin/env python3
"""Evaluate the grammar against a wild corpus of .puml files.

Usage: .venv/bin/python scripts/eval_wild_corpus.py <root> [<root>...]

Reports the ERROR-free rate and the losslessness (token-span coverage)
rate over every .puml found under the given roots, plus the top failure
signatures (first two words of the first offending line) to guide the
next grammar milestone.
"""

import collections
import ctypes
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
LIB = ROOT / "build" / "plantuml.so"


def load_parser():
    from tree_sitter import Language, Parser

    if not LIB.exists():
        subprocess.run(
            ["npx", "tree-sitter", "build", "--output", str(LIB)],
            cwd=ROOT,
            check=True,
        )
    lib = ctypes.cdll.LoadLibrary(str(LIB))
    lib.tree_sitter_plantuml.restype = ctypes.c_void_p
    return Parser(Language(lib.tree_sitter_plantuml()))


def leaves(node):
    if node.child_count == 0:
        yield node
    for child in node.children:
        yield from leaves(child)


def lossless(src, tree):
    end = 0
    for leaf in leaves(tree.root_node):
        if leaf.is_missing or src[end : leaf.start_byte].strip():
            return False
        end = leaf.end_byte
    return not src[end:].strip()


def first_error_line(src, node):
    if node.type == "ERROR" or node.is_missing:
        return node.start_point[0]
    for child in node.children:
        if child.has_error:
            return first_error_line(src, child)
    return node.start_point[0]


def main(roots):
    parser = load_parser()
    files = [
        p
        for r in roots
        for p in pathlib.Path(r).rglob("*.puml")
        if ".venv" not in p.parts and "node_modules" not in p.parts
    ]
    if not files:
        print("no .puml files found under", roots)
        return 1
    clean = covered = 0
    signatures = collections.Counter()
    examples = {}
    for f in files:
        src = f.read_bytes()
        tree = parser.parse(src)
        if lossless(src, tree):
            covered += 1
        if not tree.root_node.has_error:
            clean += 1
            continue
        line_no = first_error_line(src, tree.root_node)
        line = src.split(b"\n")[line_no].decode(errors="replace").strip()
        key = " ".join(line.split()[:2])[:40] or "<empty>"
        signatures[key] += 1
        examples.setdefault(key, f"{f}:{line_no + 1}: {line[:70]}")
    print(
        f"files: {len(files)}  error-free: {clean} ({clean / len(files):.1%})"
        f"  lossless: {covered} ({covered / len(files):.1%})"
    )
    for key, n in signatures.most_common(20):
        print(f"{n:5}  {key!r:44} {examples[key]}")
    return 0 if clean == len(files) else 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:] or ["."]))
