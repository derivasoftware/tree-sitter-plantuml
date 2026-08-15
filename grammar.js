/**
 * @file PlantUML grammar for tree-sitter
 * @license MIT
 *
 * Milestone 1 scope: the @startuml/@enduml envelope, comments, the
 * class-diagram core (class/abstract class/interface/enum declarations,
 * members with visibility and modifiers, the six relation kinds, package
 * and namespace blocks), and the raw_line frontier policy: any statement
 * outside the supported subset parses as a raw_line node so every input
 * survives round-trip intact.
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}

module.exports = grammar({
  name: 'plantuml',

  word: $ => $.identifier,

  extras: $ => [/[ \t]/, $.block_comment],

  rules: {
    source_file: $ => repeat(choice($.diagram, $._newline)),

    diagram: $ => seq(
      '@startuml',
      optional(field('name', alias($._to_eol, $.diagram_name))),
      $._newline,
      repeat($._statement),
      '@enduml',
    ),

    _statement: $ => choice(
      $.class_declaration,
      $.interface_declaration,
      $.enum_declaration,
      $.relation,
      $.package_block,
      $.namespace_block,
      $.together_block,
      $.note_statement,
      $.display_directive,
      $.comment,
      $.raw_line,
      $.raw_block,
      $._newline,
    ),

    // ── Notes ──────────────────────────────────────────────────────────

    note_statement: $ => choice(
      // note <position> of <entity> — attached to an entity or member
      seq(
        'note',
        field('position', $.note_position),
        'of',
        field('target', choice($._entity_name, $.member_ref)),
        $._note_body,
      ),
      // note over <entities> — the sequence-diagram attachment form
      seq(
        'note',
        field('position', alias('over', $.note_position)),
        field('target', $.entity_list),
        $._note_body,
      ),
      // note [<position>] on link — attached to the preceding relation
      seq('note', field('position', $.note_position), 'on', 'link', $._note_body),
      seq('note', 'on', 'link', $._note_body),
      // note <position> — attached to the preceding entity
      seq('note', field('position', $.note_position), $._note_body),
      // floating note: note "text" as N
      seq(
        'note',
        field('text', $.string),
        'as',
        field('alias', $.identifier),
        $._newline,
      ),
      // floating note with block body: note as N … end note
      seq('note', 'as', field('alias', $.identifier), $._note_body),
    ),

    _note_body: $ => choice(
      seq(':', field('text', $.label), $._newline),
      seq(
        $._newline,
        repeat(choice(alias($._raw_block_line, $.raw_line), $._newline)),
        alias(token(prec(3, /end[ \t]*note/)), 'end note'),
        $._newline,
      ),
    ),

    note_position: $ => choice('left', 'right', 'top', 'bottom'),

    // ── Display directives ─────────────────────────────────────────────

    display_directive: $ => seq(
      field('verb', choice('hide', 'show', 'remove', 'restore')),
      field('target', alias($._to_eol, $.display_target)),
      $._newline,
    ),

    // ── Entity declarations ────────────────────────────────────────────

    class_declaration: $ => seq(
      choice(seq(field('abstract', $.abstract), optional('class')), 'class'),
      $._entity_head,
      choice($._newline, seq(field('body', $.entity_body), $._newline)),
    ),

    interface_declaration: $ => seq(
      'interface',
      $._entity_head,
      choice($._newline, seq(field('body', $.entity_body), $._newline)),
    ),

    enum_declaration: $ => seq(
      'enum',
      $._entity_head,
      choice($._newline, seq(field('body', $.entity_body), $._newline)),
    ),

    abstract: $ => 'abstract',

    _entity_head: $ => seq(
      field('name', $._entity_name),
      optional(field('generics', $.generics)),
      optional(field('stereotype', $.stereotype)),
      optional(seq('as', field('alias', $._entity_name))),
      optional(seq('extends', field('extends', $.entity_list))),
      optional(seq('implements', field('implements', $.entity_list))),
      optional(field('color', $.color)),
    ),

    entity_list: $ => sep1($._entity_name, ','),

    color: $ => token(/#[\w;:.\/\\|-]+/),

    _entity_name: $ => choice($.identifier, $.string, $.qualified_name),

    // "namespace.path".Member — a quoted namespace qualifying a member.
    qualified_name: $ => seq($.string, token.immediate('.'), $.identifier),

    // Entity::member (or Entity::"member") — a member-qualified target.
    member_ref: $ => seq(
      $._entity_name,
      token.immediate('::'),
      choice($.identifier, $.string),
    ),

    generics: $ => token(seq('<', /[^<>\n]+/, '>')),

    stereotype: $ => token(seq('<<', /[^>\n]+/, '>>')),

    entity_body: $ => seq(
      '{',
      repeat(choice($.member, $.member_separator, $.comment, $._newline)),
      '}',
    ),

    // Group separators inside a body: --, .., ==, each with an optional
    // title; the underscore form requires a title (`__ text __`) so bare
    // dunder members (__init__) keep lexing as identifiers.
    member_separator: $ => seq(
      choice(
        token(prec(1, /--[^\n]*/)),
        token(prec(1, /\.\.[^\n]*/)),
        token(prec(1, /==[^\n]*/)),
        token(prec(1, /__[ \t][^\n]*/)),
      ),
      $._newline,
    ),

    // ── Members ────────────────────────────────────────────────────────

    member: $ => seq(
      optional(field('visibility', $.visibility)),
      repeat(field('modifier', $.modifier)),
      choice($.method, $.attribute),
      $._newline,
    ),

    visibility: $ => choice('+', '-', '#', '~'),

    modifier: $ => choice('{static}', '{abstract}'),

    method: $ => seq(
      field('name', $.identifier),
      '(',
      optional(field('parameters', $.parameter_list)),
      ')',
      optional(seq(':', field('type', $.type))),
    ),

    parameter_list: $ => sep1($.parameter, ','),

    parameter: $ => /[^,()\n]+/,

    attribute: $ => seq(
      field('name', $.identifier),
      optional(choice(
        seq(':', field('type', $.type)),
        // free-text member lines ("Callable Protocol — called as …"):
        // anything after the leading identifier that is not a typed
        // attribute or a method call stays as one opaque raw_text token.
        field('text', alias(token(prec(-1, /[^ \t\n:({][^\n]*/)), $.raw_text)),
      )),
    ),

    type: $ => $._to_eol,

    // ── Relations ──────────────────────────────────────────────────────

    relation: $ => seq(
      field('left', $._entity_name),
      optional(field('left_cardinality', alias($.string, $.cardinality))),
      field('operator', $.relation_operator),
      optional(field('right_cardinality', alias($.string, $.cardinality))),
      field('right', $._entity_name),
      optional(seq(':', field('label', $.label))),
      $._newline,
    ),

    relation_operator: $ => token(choice(
      // dashed core:  --|> <|-- *-- --* o-- --o --> <-- -- (with optional
      // embedded direction hint: -left-> etc.)
      /(<\||<|\*|o)?-+((left|right|up|down)-+)?(\|>|>|\*|o)?/,
      // dotted core:  ..|> <|.. ..> <.. ..
      /(<\||<|\*|o)?\.+((left|right|up|down)\.+)?(\|>|>|\*|o)?/,
    )),

    label: $ => $._to_eol,

    // ── Grouping blocks ────────────────────────────────────────────────

    package_block: $ => seq(
      'package',
      field('name', $._entity_name),
      optional(field('stereotype', $.stereotype)),
      '{',
      repeat($._statement),
      '}',
      $._newline,
    ),

    namespace_block: $ => seq(
      'namespace',
      field('name', $._entity_name),
      optional(field('stereotype', $.stereotype)),
      choice(
        seq('{', repeat($._statement), '}', $._newline),
        // bodyless declaration, common in HLD overviews
        $._newline,
      ),
    ),

    together_block: $ => seq(
      'together',
      '{',
      repeat($._statement),
      '}',
      $._newline,
    ),

    // ── Comments ───────────────────────────────────────────────────────

    // PlantUML line comments are whole lines starting with a quote, so
    // they are statements, not extras — a mid-line quote is literal text.
    comment: $ => seq(token(prec(1, /'[^\n]*/)), $._newline),

    block_comment: $ => token(seq(
      "/'",
      /[^']*'+([^/'][^']*'+)*/,
      '/',
    )),

    // ── Frontier policy ────────────────────────────────────────────────

    // Unsupported statements parse as raw_line / raw_block and must
    // survive round-trip byte-identical (frontier policy, SREQ-00003).
    // Three lexical routes reach raw_line:
    //   1. a line whose first character cannot start any supported token
    //      (preprocessor !directives, separators, …)
    //   2. a line headed by a known-but-unsupported PlantUML keyword
    //   3. a single-line header/footer (content on the head line)
    // A truly unknown identifier-headed statement still errors; hardening
    // this frontier (scanner-assisted fallback) is a roadmap item.
    raw_line: $ => seq(
      choice(
        token(prec(-2, /[^ \t\r\n][^\r\n]*/)),
        $._unsupported_keyword_line,
        // header/footer with inline content: same precedence as the bare
        // block heads below so the longer single-line match wins.
        token(prec(3, /header[ \t][^ \t\n][^\n]*/)),
        token(prec(3, /footer[ \t][^ \t\n][^\n]*/)),
      ),
      $._newline,
    ),

    _unsupported_keyword_line: $ => token(prec(2, seq(
      choice(
        'title', 'skinparam', 'scale', 'caption',
        'autonumber', 'set',
        'left', 'allowmixing', 'allow_mixing',
        'actor', 'participant', 'usecase', 'component', 'state',
        'object', 'database', 'collections', 'folder', 'frame',
        'cloud', 'node', 'rectangle', 'artifact', 'agent',
        'boundary', 'control', 'queue', 'card', 'file', 'stack',
        'circle',
        // sequence-diagram frames and lifecycle verbs: raw until
        // SREQ-00008-1 lands, so sequence diagrams parse without ERROR
        'loop', 'alt', 'else', 'opt', 'par', 'break', 'critical',
        'group', 'end', 'activate', 'deactivate', 'return', 'ref',
        'create', 'destroy', 'autoactivate', 'box',
      ),
      optional(/[ \t][^\n]*/),
    ))),

    // Multi-line raw blocks (legend/header/footer): inside the body only
    // raw lines and the closing token are valid, so arbitrary text is
    // safe. Notes used to route here; they are structured nodes now.
    raw_block: $ => choice(
      $._legend_block,
      $._header_block,
      $._footer_block,
      $._skinparam_block,
    ),

    // skinparam <name> { … }: the braced block form. The head token
    // requires the opening brace, so single-line skinparam stays a
    // keyword raw_line (lower precedence, no brace required).
    _skinparam_block: $ => seq(
      alias(token(prec(3, /skinparam[ \t][^\n]*\{[ \t]*/)), $.raw_line),
      $._newline,
      repeat(choice(alias($._raw_block_line, $.raw_line), $._newline)),
      alias('}', $.raw_line),
      $._newline,
    ),

    _legend_block: $ => seq(
      alias(token(prec(3, /legend([ \t][^\n]*)?/)), $.raw_line),
      $._newline,
      repeat(choice(alias($._raw_block_line, $.raw_line), $._newline)),
      alias(token(prec(3, /end[ \t]*legend/)), $.raw_line),
      $._newline,
    ),

    _header_block: $ => seq(
      alias(token(prec(3, 'header')), $.raw_line),
      $._newline,
      repeat(choice(alias($._raw_block_line, $.raw_line), $._newline)),
      alias(token(prec(3, /end[ \t]*header/)), $.raw_line),
      $._newline,
    ),

    _footer_block: $ => seq(
      alias(token(prec(3, 'footer')), $.raw_line),
      $._newline,
      repeat(choice(alias($._raw_block_line, $.raw_line), $._newline)),
      alias(token(prec(3, /end[ \t]*footer/)), $.raw_line),
      $._newline,
    ),

    _raw_block_line: $ => seq(token(prec(-2, /[^ \t\r\n][^\r\n]*/)), $._newline),

    // ── Lexical ────────────────────────────────────────────────────────

    // Dotted, optionally hyphenated segments (clients.argos-web.src).
    // A hyphen must be followed by a word character so unspaced relation
    // operators (A--|>B) never lex into the left identifier.
    identifier: $ => /[A-Za-z_]\w*([.-]\w+)*/,

    string: $ => token(seq('"', /[^"\n]*/, '"')),

    _to_eol: $ => token(prec(-1, /[^ \t\n][^\n]*/)),

    _newline: $ => /\r?\n/,
  },
});
