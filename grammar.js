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
      $.comment,
      $.raw_line,
      $.raw_block,
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
    ),

    _entity_name: $ => choice($.identifier, $.string),

    generics: $ => token(seq('<', /[^<>\n]+/, '>')),

    stereotype: $ => token(seq('<<', /[^>\n]+/, '>>')),

    entity_body: $ => seq(
      '{',
      repeat(choice($.member, $.comment, $._newline)),
      '}',
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
      optional(seq(':', field('type', $.type))),
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
    //   3. a single-line note (colon form)
    // A truly unknown identifier-headed statement still errors; hardening
    // this frontier (scanner-assisted fallback) is a roadmap item.
    raw_line: $ => seq(
      choice(
        token(prec(-2, /[^ \t\r\n][^\r\n]*/)),
        $._unsupported_keyword_line,
        token(prec(3, /note[ \t][^\n]*:[^\n]*/)),
      ),
      $._newline,
    ),

    _unsupported_keyword_line: $ => token(prec(2, seq(
      choice(
        'title', 'skinparam', 'hide', 'show', 'scale', 'caption',
        'autonumber', 'together', 'remove', 'restore', 'set',
        'header', 'footer', 'left', 'allowmixing', 'allow_mixing',
        'actor', 'participant', 'usecase', 'component', 'state',
        'object', 'database', 'collections', 'folder', 'frame',
        'cloud', 'node', 'rectangle', 'artifact', 'agent',
        'boundary', 'control', 'queue', 'card', 'file', 'stack',
        'circle',
      ),
      optional(/[ \t][^\n]*/),
    ))),

    // Multi-line note blocks: inside the body only raw lines and the
    // closing `end note` are valid tokens, so arbitrary text is safe.
    raw_block: $ => seq(
      alias(token(prec(3, /note([ \t][^\n:]*)?/)), $.raw_line),
      $._newline,
      repeat(choice(alias($._raw_block_line, $.raw_line), $._newline)),
      alias(token(prec(3, /end[ \t]*note/)), $.raw_line),
      $._newline,
    ),

    _raw_block_line: $ => seq(token(prec(-2, /[^ \t\r\n][^\r\n]*/)), $._newline),

    // ── Lexical ────────────────────────────────────────────────────────

    identifier: $ => /[A-Za-z_][\w.]*/,

    string: $ => token(seq('"', /[^"\n]*/, '"')),

    _to_eol: $ => token(prec(-1, /[^ \t\n][^\n]*/)),

    _newline: $ => /\r?\n/,
  },
});
