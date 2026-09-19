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

Shared head fields on declarations: `name:`, `generics:`, `stereotype:`, `link:` (a `hyperlink`, `[[url]]` / `[[url{tooltip}]]` / `[[url label]]`),
`alias:` (`as X`), `extends:`/`implements:` (`entity_list`), `color:`,
and repeated `tag:` (`$tag`) children.

## Bodies

| Node | Meaning |
|---|---|
| `entity_body` | `{ … }` |
| `member` | one line; optional `visibility:` (`+ - # ~`) and repeated `modifier:` (`{static}` `{abstract}` `{field}` `{method}` `{classifier}`) |
| `method` | `name(params) : type`; name is `identifier` or `cpp_method_name` (destructors nest an `identifier`; operators are one token); an optional `template_parameters:` (`generics`) sits between the name and the parens (`get<T>(int i)`); a return type left of the name is `cpp_return_type`, or a plain `identifier` when the parameter paren is pinned to the name (`void execute()`, `T get<T>(int i)`) |
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
tags (`-[#red,dashed,thickness=2]->`), lollipops (`()-`, `-()`), the
package-hierarchy head (`+--`), and the sequence decorations — thin
(`->>`), lost (`->x`, `x->`), circle (`->o`, `o->`), half-arrows
(`-\`, `-/` and thin doubles), bidirectional composites (`<->o`) and
slanted suffixes (`->(10)`). Boundary messages (`[->`, `?->`, `->]`,
`->?`, `o-]`) parse as `relation` with the edge carried in the
operator and the missing endpoint absent. Sequence activation
shorthands land as an `activation` child (`++ -- ** !!`) with an
optional `color`. Decoding head/tail semantics from the token text is
the consumer's job (see plantuml-render's `decodeOperator` for a
reference implementation).

## Grouping and sequence

| Node | Meaning |
|---|---|
| `package_block` | `package X [<<stereo>>] [#color] { … }` |
| `namespace_block` | braced or bodyless |
| `together_block` | layout grouping |
| `frame_block` / `else_clause` | `alt`/`opt`/`loop`/`par`/`break`/`critical`/`group` … `end` |
| `divider` | `== section ==` at statement level |

## Sequence lifecycle

| Node | Meaning |
|---|---|
| `lifecycle_statement` | `activate`/`deactivate`/`destroy` X (`kind:`, `target:`, optional `color:`) and `create [participant-kind] X` (`participant_kind:`) |
| `return_statement` | `return [label]` (`label:`) |
| `reference` | `ref over A, B : text` (`target:` an `entity_list`, `label:`) or the `ref over … end ref` block, whose body lines are `raw_line` |
| `box_block` | `box "name" #color … end box` (`name:` a `string` with optional `color:`, or a free `label:`); the body holds statements |
| `delay` | `...text...`; the text is a `delay_text` child |
| `spacer` | `\|\|\|` and `\|\|n\|\|` |

`autonumber` and `autoactivate` lines stay `raw_line`.

## Activity control flow

| Node | Meaning |
|---|---|
| `activity_action` | `:text;` with the SDL terminators; an optional `#color` prefix rides inside the `action_text`, and `backward:text;` carries `direction:` |
| `activity_control` | one terminal or jump per line: `kind:` is `start`, `stop`, `end`, `kill`, `detach`, `break`, `label` or `goto` (the last two with a `target:` identifier) |
| `activity_arrow` | `-> label;` and `-[#color,dashed]->`; `operator:` (`arrow_operator`), optional `label:` |
| `connector` | `(A)` or `#color:(A)` on its own line |
| `if_block` | `if (cond) then (label)` … `endif`; `condition:`, optional `label:` (`branch_label`); `elseif_clause` and `else_clause` children carry their own condition and label |
| `while_block` | `while (cond) is (label) not (label)` … `endwhile (label)`; `condition:`, `label:`, `exit_label:`, `end_label:` |
| `repeat_block` | `repeat [:action;]` … `repeat while (cond) is (label) not (label)`; `action:`, `condition:`, `label:`, `exit_label:` |
| `switch_block` | `switch (test)` … `endswitch` with `case_clause` children (`condition:`) |
| `fork_block` | `fork` … `fork again` … `end fork {label}` or `end merge`; `fork_again` children, `join:` (`fork`/`merge`), optional `label:` (`fork_label`) |
| `split_block` | `split` … `split again` … `end split`; `split_again` children |
| `partition_block` | `partition [#color] Name { … }`; `name:` (identifier or string), optional `color:` |

`condition` and `branch_label` are parenthesised tokens, one nesting
level deep. `end` and bare `break` are terminals everywhere except
inside a sequence frame, where they keep closing (or opening) frames.
The legacy activity syntax and closers with no opener are `raw_line`.

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
