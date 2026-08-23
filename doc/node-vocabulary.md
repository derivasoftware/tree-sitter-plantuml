# Node vocabulary — the public API

The names of named nodes (and their field names) are this grammar's
public API, versioned under semver: **renaming or removing a node is a
breaking change**; adding nodes or fields is a minor. Consumers
(plantuml-fmt, plantuml-lsp, plantuml-render, the argos reader) match
on these names.

## Structure

| Node | Meaning |
|---|---|
| `source_file` | whole input; any number of diagrams |
| `diagram` | one `@startuml … @enduml` envelope; `name:` field on the header |
| `raw_line`, `raw_block` | the frontier — see `frontier-policy.md` |
| `comment`, `block_comment` | `' line` and `/' … '/` |

## Declarations

| Node | Meaning |
|---|---|
| `class_declaration` | `class` / `abstract class` (with `abstract` child) |
| `interface_declaration`, `enum_declaration` | as named |
| `entity_declaration` | the extended kinds; `kind:` field holds an `entity_kind` (`annotation`, `exception`, `metaclass`, `protocol`, `struct`, `record`, `dataclass`) |
| `colon_member` | single-line member: `Entity : member text` |
| `participant_declaration` | sequence participants (all eight kinds); `entity` is one of them |

Shared head fields on declarations: `name:`, `generics:`, `stereotype:`,
`alias:` (`as X`), `extends:`/`implements:` (`entity_list`), `color:`,
and repeated `tag:` (`$tag`) children.

## Bodies

| Node | Meaning |
|---|---|
| `entity_body` | `{ … }` |
| `member` | one line; optional `visibility:` (`+ - # ~`) and repeated `modifier:` (`{static}` `{abstract}` `{field}` `{method}` `{classifier}`) |
| `method` | `name(params) : type`; name is `identifier` or `cpp_method_name` (destructors nest an `identifier`; operators are one token) |
| `attribute` | `name : type`, or `name` plus opaque `raw_text` for free-text lines |
| `member_separator` | `--` `..` `==` `__ titled __` group separators |

## Relations

`relation` fields: `left:`/`right:` (entity name or `member_ref` —
`Entity::member`), `operator:` (`relation_operator`), optional
`qualifier:` (`[key]`), `left_cardinality:`/`right_cardinality:`
(`cardinality`) each with an optional `role` (`"owner"/items`),
optional `color:` (inline style suffix) and `label:`.

`relation_operator` is one token covering: the six core kinds and their
reversed forms, embedded direction hints (`-left->`, `-l->`), style
tags (`-[#red,dashed,thickness=2]->`), lollipops (`()-`, `-()`) and the
package-hierarchy head (`+--`). Decoding head/tail semantics from the
token text is the consumer's job (see plantuml-render's
`decodeOperator` for a reference implementation).

## Grouping and sequence

| Node | Meaning |
|---|---|
| `package_block` | `package X [<<stereo>>] [#color] { … }` |
| `namespace_block` | braced or bodyless |
| `together_block` | layout grouping |
| `frame_block` / `else_clause` | `alt`/`opt`/`loop`/`par`/`break`/`critical`/`group` … `end` |
| `divider` | `== section ==` at statement level |

## Notes and display

`note_statement` covers positional (`note left of X : t`), targeted at
members (`X::member`), `note on link`, floating (`note "t" as N`) and
block (`note as N … end note`) forms. `display_directive` covers
`hide`/`show`/`remove`/`restore` with the target kept as one
`display_target` token.

## Lexical

`identifier` allows dots, hyphens-into-word and a leading `$`
(`clients.argos-web`, `$C1`). `qualified_name` is
`"quoted.namespace".Member`; `member_ref` is `Entity::member`.
`string`, `generics` (`<…>`), `stereotype` (`<<…>>`), `color`
(`#…`, including gradients and `key:value;…` style lists), `tag`
(`$name`).
