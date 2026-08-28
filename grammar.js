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

export default grammar({
  name: 'plantuml',

  word: $ => $.identifier,

  extras: $ => [/[ \t]/, $.block_comment],

  // The frontier fallback (src/scanner.c): _raw_statement claims an
  // identifier-headed line no structural rule can parse; the sentinel
  // is never produced — it detects error recovery inside the scanner.
  // The two member-level tokens need lookahead the internal lexer lacks
  // (issue #5, REQ-00028-2): see scanner.c. Both are aliased to
  // identifier at their use site, so the vocabulary does not grow.
  externals: $ => [
    $._raw_statement,
    $._template_method_name,
    $._plain_return_type,
    $._error_sentinel,
  ],

  // ~ opens both a visibility marker and a destructor name; GLR keeps
  // both readings alive until the following token decides.
  conflicts: $ => [
    [$.visibility, $.cpp_method_name],
    // bare `break` at diagram level: activity raw line vs an unlabeled
    // sequence break frame — GLR forks and the dynamic precedence on
    // the closer prefers raw when both parse (zero break frames in the
    // wild corpus; labeled break frames are unambiguous).
    [$._activity_closer, $.frame_block],
  ],

  rules: {
    source_file: $ => repeat(choice($.diagram, $._newline)),

    diagram: $ => seq(
      '@startuml',
      optional(field('name', alias($._to_eol, $.diagram_name))),
      $._newline,
      repeat(choice($._statement, alias($._activity_closer, $.raw_line))),
      '@enduml',
    ),

    // Activity flow-control lines that reuse frame tokens (`end`,
    // `else (label)`, bare `break`) are raw — but only at diagram
    // level, where no frame is open. Inside a frame the same tokens
    // keep their exact closing semantics, with no ambiguity: this
    // alternative simply is not part of a frame's body.
    _activity_closer: $ => seq(
      choice(
        'end',
        seq('else', optional($.label)),
        prec.dynamic(1, 'break'),
      ),
      $._newline,
    ),

    _statement: $ => choice(
      $.class_declaration,
      $.interface_declaration,
      $.enum_declaration,
      $.entity_declaration,
      $.relation,
      alias($.boundary_message, $.relation),
      $.colon_member,
      $.activity_action,
      $.swimlane,
      $.package_block,
      $.namespace_block,
      $.together_block,
      $.participant_declaration,
      $.frame_block,
      $.divider,
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
        optional(field('color', $.color)),
        $._note_body,
      ),
      // note over <entities> — the sequence-diagram attachment form
      seq(
        'note',
        field('position', alias('over', $.note_position)),
        field('target', $.entity_list),
        optional(field('color', $.color)),
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

    note_position: $ => choice('left', 'right', 'top', 'bottom', 'across'),

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
      choice(
        $._newline,
        seq(field('body', $.entity_body), $._newline),
        // Allman style: the opening brace on its own line. Without this
        // alternative the brace fell to a raw line and the closing one
        // was captured by the enclosing namespace_block, silently
        // corrupting every later entity's scope (issue #2).
        seq($._newline, field('body', $.entity_body), $._newline),
      ),
    ),

    interface_declaration: $ => seq(
      'interface',
      $._entity_head,
      choice(
        $._newline,
        seq(field('body', $.entity_body), $._newline),
        // Allman style: the opening brace on its own line. Without this
        // alternative the brace fell to a raw line and the closing one
        // was captured by the enclosing namespace_block, silently
        // corrupting every later entity's scope (issue #2).
        seq($._newline, field('body', $.entity_body), $._newline),
      ),
    ),

    enum_declaration: $ => seq(
      'enum',
      $._entity_head,
      choice(
        $._newline,
        seq(field('body', $.entity_body), $._newline),
        // Allman style: the opening brace on its own line. Without this
        // alternative the brace fell to a raw line and the closing one
        // was captured by the enclosing namespace_block, silently
        // corrupting every later entity's scope (issue #2).
        seq($._newline, field('body', $.entity_body), $._newline),
      ),
    ),

    // The remaining element keywords of the reference share one node;
    // `entity` stays a participant kind and circle/diamond stay raw.
    entity_declaration: $ => seq(
      field('kind', alias(choice(
        'annotation', 'exception', 'metaclass', 'protocol',
        'struct', 'record', 'dataclass',
      ), $.entity_kind)),
      $._entity_head,
      choice(
        $._newline,
        seq(field('body', $.entity_body), $._newline),
        // Allman style: the opening brace on its own line. Without this
        // alternative the brace fell to a raw line and the closing one
        // was captured by the enclosing namespace_block, silently
        // corrupting every later entity's scope (issue #2).
        seq($._newline, field('body', $.entity_body), $._newline),
      ),
    ),

    // Activity actions and swimlanes are structural — the consumer is
    // call-level correlation (an action invokes a method; the lane
    // names the receiver). Control flow stays deliberately raw until
    // native rendering demands it. Single-line actions only; multiline
    // bodies keep falling to the raw frontier.
    activity_action: $ => seq(
      field('text', alias(
        token(prec(1, /:[^;\n]*[;|<>/\\\]][^\n]*/)), $.action_text)),
      $._newline,
    ),

    swimlane: $ => seq(
      field('name', alias(
        token(prec(1, /\|(#[^|\n]+\|)?[^|\n]+\|[^\n]*/)), $.lane_text)),
      $._newline,
    ),

    // Entity : member — the single-line member form of the reference.
    colon_member: $ => seq(
      field('entity', $._entity_name),
      ':',
      field('member', $.label),
      $._newline,
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
      repeat(field('tag', $.tag)),
    ),

    tag: $ => token(/\$[\w-]+/),

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
      choice($.method, $.attribute, alias($.cpp_unclosed, $.raw_text)),
      $._newline,
    ),

    // Frontier inside class bodies, C++ edition: a scoped head whose
    // template bracket never closes on the line would otherwise commit
    // the lexer to a return type and die on the dangling `<`. This
    // token shares the return type's precedence, so the longest match
    // decides: any valid template out-lengths it, while on an unclosed
    // bracket it swallows the member whole as raw text, never an ERROR.
    cpp_unclosed: $ => token(prec(1, /[A-Za-z_]\w*(::\w+)+<[^>\n]*/)),

    visibility: $ => choice('+', '-', '#', '~'),

    modifier: $ => choice(
      '{static}', '{abstract}', '{field}', '{method}', '{classifier}',
    ),

    method: $ => seq(
      // C++-style signature: the return type sits left of the name.
      // A plain identifier (no C++ signal) may also stand there, but
      // only when the name carries a template clause — the scanner
      // confirms `T get<T>(` before claiming `T`, so prose members
      // (`Callable Protocol — called as …`) keep the attribute path.
      optional(field('type', choice(
        $.cpp_return_type,
        alias($._plain_return_type, $.identifier),
      ))),
      // `get<T>(` at member start is a name with template parameters,
      // not a templated return type: the scanner decides on the `(`
      // after the closing bracket, where the internal lexer would have
      // committed to cpp_return_type.
      field('name', choice(
        $.identifier,
        $.cpp_method_name,
        alias($._template_method_name, $.identifier),
      )),
      // Method-level template parameters (issue #5): `name<T>(…)`,
      // captured like class-level generics.
      optional(field('template_parameters', $.generics)),
      '(',
      optional(field('parameters', $.parameter_list)),
      ')',
      // C++ trailing qualifiers; before the canonical colon so
      // `name() const : type` (the cv-qualifier between the parens and
      // the PlantUML type) parses as written.
      optional(field('suffix', $.method_suffix)),
      // PlantUML canonical: the type after the colon (to end of line,
      // so a trailing `const` there stays part of the type text).
      optional(seq(':', field('type', $.type))),
    ),

    // A C++ type expression strong enough to sit left of a method name,
    // as one token: every alternative carries a C++ signal (a scope
    // path, template arguments, pointer/reference markers, or a leading
    // const), so prose members never match. Template nesting is
    // unrolled to four angle-bracket levels — beyond that the token
    // simply does not match and the line keeps its legacy parse, never
    // an ERROR. Inner template structure stays opaque on purpose: no
    // consumer reads it today, and a composed rule here traded the
    // frontier guarantee for a prettier tree.
    cpp_return_type: $ => {
      const id = /[A-Za-z_]\w*/.source;
      const scope = `(::${id})`;
      let angle = /<[^<>\n]*>/.source;
      for (let depth = 0; depth < 3; depth++) {
        angle = `<([^<>\n]|${angle})*>`;
      }
      const ptr = /[ \t]*[&*]+/.source;
      const konst = `const[ \t]+`;
      const core = [
        `${id}${scope}+(${angle})?(${ptr})?`,
        `${id}${angle}(${ptr})?`,
        `${id}${ptr}`,
      ].join('|');
      // A single-quoted type is the Python forward-reference form
      // ('Container[T]' create(), issue #4); without this branch the
      // line-comment token swallowed the quote and the rest of the line.
      // The quote must wrap something type-shaped — a dotted identifier
      // with an optional bracket suffix — so quoted prose keeps its old
      // parse instead of dragging the next line into a recovery.
      const quoted = /'[A-Za-z_][\w.]*(\[[^'\n\]]*\])?'/.source;
      return token(prec(1, new RegExp(`(${konst})?(${core})|${quoted}`)));
    },

    method_suffix: $ => choice(
      'const',
      'noexcept',
      'override',
      seq('=', choice('0', 'default', 'delete')),
    ),

    // C++ member names beyond plain identifiers (BOK-mirrored from the
    // argos-design-plantuml reader): destructors and operator overloads.
    cpp_method_name: $ => choice(
      // Destructor: tilde and name are the same tokens the ~ visibility
      // marker and identifiers use, so the parser can defer — ~name(
      // stays a destructor (dynamic precedence) while ~name : type
      // parses as a package-private attribute.
      prec.dynamic(1, seq('~', $.identifier)),
      // prec 2: `operator*` must out-rank the cpp_return_type token's
      // identifier-plus-pointer branch, or the lexer may read a return
      // type where an operator name stands (runtime tie-breaks differ).
      token(prec(2, choice(
      /operator\s*\(\s*\)/,
      /operator\s*\[\s*\]/,
      /operator\s+new(\s*\[\s*\])?/,
      /operator\s+delete(\s*\[\s*\])?/,
      /operator\s+\w+/,
      // ':' excluded from the opening symbol: C++ has no operator: or
      // operator::, and a field literally named operator (+ operator :
      // bool) must stay on the attribute path (issue #3).
      /operator\s*[^()\[\]\s\w:][^()\[\]\s]*/,
      ))),
    ),

    parameter_list: $ => sep1($.parameter, ','),

    // One nesting level of parentheses stays inside the parameter, so
    // callable types (`std::function<void(int, bool)>`) survive whole;
    // commas inside those inner parens do not split the list.
    parameter: $ => /([^,()\n]|\([^()\n]*\))+/,

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
      field('left', choice($._entity_name, $.member_ref)),
      optional(field('qualifier', $.qualifier)),
      optional(seq(
        field('left_cardinality', alias($.string, $.cardinality)),
        optional(field('left_role', alias(token.immediate(/\/[\w.-]+/), $.role))),
      )),
      field('operator', $.relation_operator),
      optional(seq(
        field('right_cardinality', alias($.string, $.cardinality)),
        optional(field('right_role', alias(token.immediate(/\/[\w.-]+/), $.role))),
      )),
      field('right', choice($._entity_name, $.member_ref)),
      optional(field('activation', $.activation)),
      optional(field('color', $.color)),
      optional(seq(':', field('label', $.label))),
      $._newline,
    ),

    // Sequence activation shorthands after the target: A -> B ++ #gold
    activation: $ => token(choice('++', '--', '**', '!!')),

    // Boundary messages: one endpoint is the diagram edge, expressed in
    // the operator itself ([->, ?->, ->], ->?, o-]). Aliased to relation
    // so the node vocabulary stays closed.
    boundary_message: $ => choice(
      seq(
        field('operator', alias(
          token(/[\[?][ox]?[-.]+(>>|>[xo]?|\\\\|\\|\/\/|\/)?/),
          $.relation_operator,
        )),
        field('right', $._entity_name),
        optional(seq(':', field('label', $.label))),
        $._newline,
      ),
      seq(
        field('left', $._entity_name),
        field('operator', alias(
          token(/(<\||<|\*|[ox])?[-.]+(>>|>[xo]?)?[\]?]/),
          $.relation_operator,
        )),
        optional(seq(':', field('label', $.label))),
        $._newline,
      ),
    ),

    // [Qualifier] — the qualified-association bracket after the left
    // endpoint.
    qualifier: $ => token(seq('[', /[^\]\n]+/, ']')),

    relation_operator: $ => token(choice(
      // dashed core:  --|> <|-- *-- --* o-- --o --> <-- -- () lollipops,
      // the + hierarchy head, [style,...] tags, embedded direction hints
      // (-left->, -l->), and the sequence decorations: >> thin, >x lost,
      // >o circle (x/o heads too), \ / half heads, (N) slant. The x/o
      // tails only lex when adjacent to the arrow (`->o Alice`), so a
      // spaced `-> owner` keeps its plain operator.
      /(<\||<|\*|[ox]|\(\)|\+)?-+(\[[^\]\n]+\]-*)?((left|right|up|down|l|r|u|d)-+)?(\|>|>>|>[xo]?|\*|o|x|\(\)|\+|\\\\|\\|\/\/|\/)?(\(\d+\))?/,
      // dotted core:  ..|> <|.. ..> <.. ..
      /(<\||<|\*|[ox]|\(\)|\+)?\.+(\[[^\]\n]+\]\.*)?((left|right|up|down|l|r|u|d)\.+)?(\|>|>>|>[xo]?|\*|o|x|\(\)|\+|\\\\|\\|\/\/|\/)?(\(\d+\))?/,
    )),

    label: $ => $._to_eol,

    // ── Grouping blocks ────────────────────────────────────────────────

    package_block: $ => seq(
      'package',
      field('name', $._entity_name),
      optional(field('stereotype', $.stereotype)),
      optional(field('color', $.color)),
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

    // ── Sequence diagrams ──────────────────────────────────────────────

    participant_declaration: $ => seq(
      field('kind', choice(
        'participant', 'actor', 'boundary', 'control', 'entity',
        'database', 'collections', 'queue',
      )),
      field('name', $._entity_name),
      optional(seq('as', field('alias', $._entity_name))),
      repeat(choice(
        field('stereotype', $.stereotype),
        field('color', $.color),
        seq('order', field('order', alias(token(/\d+/), $.number))),
      )),
      // multiline declaration body: participant P [ …creole lines… ]
      optional(seq(
        '[',
        $._newline,
        repeat(choice(alias($._raw_block_line, $.raw_line), $._newline)),
        ']',
      )),
      $._newline,
    ),

    // alt/else…end, loop…end, opt/par/break/critical/group frames.
    // Statements before the first else belong to the frame itself.
    frame_block: $ => seq(
      field('kind', choice(
        'alt', 'opt', 'loop', 'par', 'break', 'critical', 'group',
      )),
      optional(field('label', $.label)),
      $._newline,
      repeat($._statement),
      repeat($.else_clause),
      'end',
      $._newline,
    ),

    else_clause: $ => seq(
      'else',
      optional(field('label', $.label)),
      $._newline,
      repeat($._statement),
    ),

    // == section divider == (statement level; body separators are a
    // different construct inside entity bodies)
    divider: $ => seq(token(prec(1, /==[^\n]*/)), $._newline),

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
        // route 4: scanner-claimed identifier-headed unknowns
        $._raw_statement,
        // closers of keyword-raw blocks (ref/title/box open as raw
        // keyword lines; their `end X` must reach raw too, while a bare
        // frame `end` keeps closing frames)
        token(prec(3, /end[ \t]+(ref|title|box)([ \t][^\n]*)?/)),
        // activity `group X {` (braced) reaches raw through the
        // scanner, which claims group lines containing a brace; the
        // braceless sequence `group` frame keeps its structure.
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
        'usecase', 'component', 'state',
        'object', 'folder', 'frame',
        'cloud', 'node', 'rectangle', 'artifact', 'agent',
        'card', 'file', 'stack',
        'circle', 'diamond', 'page', 'json',
        'top', 'bottom',
        // sequence lifecycle verbs: raw until evidence demands
        // structure (zero occurrences in the wild corpus so far)
        'activate', 'deactivate', 'return', 'ref',
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
    identifier: $ => /\$?[A-Za-z_]\w*([.-]\w+)*/,

    string: $ => token(seq('"', /[^"\n]*/, '"')),

    _to_eol: $ => token(prec(-1, /[^ \t\n][^\n]*/)),

    _newline: $ => /\r?\n/,
  },
});
