# Development guide

## Test pyramid

| Layer | Command | What it proves |
|---|---|---|
| Corpus | `npx tree-sitter test` | intended tree per construct (`test/corpus/*.txt`) |
| Integration | `.venv/bin/pytest tests/` | error-freeness + losslessness over corpus and `examples/`, construct→node mapping vs the standard matrix, highlight-query validity, packaging |

Every grammar change ships with corpus coverage.

## Adding a construct (TDD)

1. Add the syntax to a dummy diagram in `examples/standard/` (or a new
   corpus file) and the intended tree to `test/corpus/`; if it comes
   from the reference, add its row to `CONSTRUCTS` in
   `tests/test_standard_coverage.py`. Run — RED.
2. Edit `grammar.js`; `npx tree-sitter generate`; iterate to GREEN.
3. Regression gates: full pytest + wild corpus.
4. GDD: REQ (or a REQ revision per CST-00022) + VER pointing at the
   test ids; node additions are minor semver, renames are major.

## tree-sitter gotchas (earned the hard way)

- **Lexical precedence beats match length.** A new keyword in
  `_unsupported_keyword_line` can steal the head of a structural rule;
  tree-sitter restricts tokens by parse state (`valid-symbols`), which
  is why `top`/`bottom` coexist with `note_position` — but verify with
  a corpus test, not by faith.
- **Anonymous optional `token.immediate` may leave no leaf** in the
  tree: bytes get consumed but uncovered — losslessness fails without
  an ERROR. Alias such tokens to a named node (that is why `role`
  exists).
- **Two readings of one prefix** (`~` = visibility or C++ destructor):
  share the same tokens in both rules, declare the GLR conflict, break
  the tie with `prec.dynamic`. A `token.immediate` in one branch kills
  the other lexically — don't.
- **Keep `relation_operator` a single token.** Splitting it invites
  conflicts with identifiers containing hyphens; consumers decode the
  token text instead.
- **A rule that only ends at a newline breaks on one-line bodies.** The
  parser recovers by inserting a hidden `MISSING` terminator, which no
  corpus test and no ERROR count can see — so a single one-line block
  looks perfect while the same block repeated collapses the whole file.
  Check `root_node.has_error`, not just ERROR nodes. The terminator to
  use is `_eos`, which also accepts the zero-width `_brace_ahead`.
- **An external token can out-rank a keyword where the grammar cannot.**
  At a statement head the lexer takes the keyword whenever the construct is
  valid there, and no precedence on the identifier changes that. The scanner
  can, because it runs first: it reads the word, looks at what follows, and
  emits a different token when the line is not that construct. Keep such a
  token to the word itself (`mark_end` before looking ahead), so the rest of
  the line is parsed by the ordinary rules.
- **A zero-width external token must not be reachable from a `repeat`.**
  `_newline` stays strict for exactly this reason: it is also the
  blank-line statement, and `repeat($._statement)` would spin on a
  zero-width match at the brace.

## wasm and packaging

- `npx tree-sitter build --wasm` — the CLI (≥0.26) auto-downloads
  wasi-sdk; no emscripten needed. CI does this on release tags.
- Release = tag `vX.Y.Z` on main **after** the MR merged. The tag
  pipeline publishes npm + PyPI wheels + the wasm to the generic
  registry (`packages/generic/wasm/vX.Y.Z/tree-sitter-plantuml.wasm`).
  Downstream pins: render (npm git tag), fmt/lsp (pip git tag), vscode
  (wasm file staged into `media/`), argos plugin (wheel range).

## Governance

Argos NA project: `input/` SREQs, `requirements/`, `verifications/`;
`argos diagnose` must stay at baseline. Every VER's `test_ids` must
resolve (`W-VER-DEAD-TEST-ID`).
