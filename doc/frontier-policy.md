# Frontier policy — raw, never ERROR

PlantUML has no formal grammar; its de-facto standard is the Language
Reference plus the Java implementation. This grammar therefore commits
to an explicit **frontier**: everything inside the supported subset
parses into structural nodes; everything outside parses as `raw_line`
(or `raw_block` for multi-line bodies) — **never** as an `ERROR` node —
and survives a round-trip byte-identical.

Consumers can rely on two invariants (both enforced by CI on every
change):

1. **Error-freeness** over the supported frontier: zero `ERROR`/
   `MISSING` nodes.
2. **Losslessness**: token spans cover every non-whitespace byte, so
   `tree + inter-token whitespace == input`.

## How a line reaches raw

Four routes:

1. A first character that cannot start any supported token
   (`!directives`, separators, …).
2. A line headed by a known-but-unsupported keyword
   (`skinparam`, `title`, `circle`, `json`, sequence lifecycle verbs, …).
3. Block heads (`legend`/`header`/`footer`/braced `skinparam`) open a
   `raw_block` whose body lines are all raw.
4. **The fallback** (`src/scanner.c`, REQ-00012-2): an external scanner
   claims an identifier-headed line whose head is not a statement
   keyword and whose continuation — looking past qualifiers (`[k]`)
   and cardinalities (`"1"/role`) — cannot open a relation or colon
   member. When in doubt it declines, so structural rules keep their
   exact behaviour; an error-recovery sentinel keeps it silent during
   recovery. Keyword-table drift fails loudly: a keyword added to
   `grammar.js` but missing from the C table turns its construct raw
   and its corpus test red.

## Standard conformance

The class-diagram chapter of the reference is tracked as a
per-construct matrix (149 constructs, `examples/standard/*.puml`,
`tests/test_standard_coverage.py`): **125 structural, 24 deliberately
raw, 0 ERROR**. The deliberately-raw set is style/config surface
(`skinparam`, `set separator`, `page`, diagram-level direction), the
drawn-but-unmodeled shapes (`circle`, `diamond`) and `json` bodies.

## Growing the frontier

Raw is not a dead end; it is the queue. A construct is promoted from
raw to structural when a consumer needs its content (evidence from a
real corpus), never speculatively. The promotion recipe is in
`development.md`.
