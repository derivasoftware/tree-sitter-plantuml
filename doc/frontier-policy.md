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

Three lexical routes (in `grammar.js`):

1. A first character that cannot start any supported token
   (`!directives`, separators, …).
2. A line headed by a known-but-unsupported keyword
   (`skinparam`, `title`, `circle`, `json`, sequence lifecycle verbs, …).
3. Block heads (`legend`/`header`/`footer`/braced `skinparam`) open a
   `raw_block` whose body lines are all raw.

## Standard conformance

The class-diagram chapter of the reference is tracked as a
per-construct matrix (149 constructs, `examples/standard/*.puml`,
`tests/test_standard_coverage.py`): **125 structural, 24 deliberately
raw, 0 ERROR**. The deliberately-raw set is style/config surface
(`skinparam`, `set separator`, `page`, diagram-level direction), the
drawn-but-unmodeled shapes (`circle`, `diamond`) and `json` bodies.

## Known limitation

A truly unknown **identifier-headed** statement outside the reference
(e.g. `sprite foo bar`) still errors: the parser commits to the
relation rule after the leading identifier. Hardening this last gap is
REQ-00012-1 (DRAFT, backlog) — it needs a scanner-assisted fallback so
the guarantee holds for every possible head.

## Growing the frontier

Raw is not a dead end; it is the queue. A construct is promoted from
raw to structural when a consumer needs its content (evidence from a
real corpus), never speculatively. The promotion recipe is in
`development.md`.
